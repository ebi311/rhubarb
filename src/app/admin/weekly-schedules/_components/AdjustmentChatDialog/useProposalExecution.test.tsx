import type { ActionResult } from '@/app/actions/utils/actionResult';
import type {
	AiChatMutationProposal,
	ExecuteAiChatMutationResult,
	ProposalAllowlist,
} from '@/models/aiChatMutationProposal';
import { TEST_IDS } from '@/test/helpers/testIds';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CONFLICT_ERROR_MESSAGE,
	DEFAULT_ERROR_MESSAGE,
	useProposalExecution,
} from './useProposalExecution';

const executeAiChatMutationActionMock = vi.hoisted(() => vi.fn());
const handleActionResultMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/actions/aiChatMutation', () => ({
	executeAiChatMutationAction: executeAiChatMutationActionMock,
}));

vi.mock('@/hooks/useActionResultHandler', () => ({
	useActionResultHandler: () => ({
		handleActionResult: handleActionResultMock,
	}),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		refresh: refreshMock,
	}),
}));

const proposal: AiChatMutationProposal = {
	type: 'change_shift_staff',
	shiftId: TEST_IDS.SCHEDULE_1,
	toStaffId: TEST_IDS.STAFF_2,
};

const allowlist: ProposalAllowlist = {
	shiftIds: [TEST_IDS.SCHEDULE_1],
	staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
};

const createResult = (
	overrides: Partial<ActionResult<ExecuteAiChatMutationResult>>,
): ActionResult<ExecuteAiChatMutationResult> => ({
	data: {
		type: 'change_shift_staff',
		shiftId: TEST_IDS.SCHEDULE_1,
		officeId: TEST_IDS.OFFICE_1,
	},
	error: null,
	status: 200,
	...overrides,
});

const createDeferred = <T,>() => {
	let resolve: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return {
		promise,
		resolve: resolve!,
	};
};

describe('useProposalExecution', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		handleActionResultMock.mockImplementation((result, options) => {
			if (result.error) {
				options?.onError?.(result.error, result);
				return false;
			}
			options?.onSuccess?.(result.data ?? null);
			return true;
		});
	});

	it('成功時にrefreshとonSuccessが呼ばれ、isExecutingが切り替わる', async () => {
		const onSuccess = vi.fn();
		const deferred =
			createDeferred<ActionResult<ExecuteAiChatMutationResult>>();
		executeAiChatMutationActionMock.mockReturnValue(deferred.promise);

		const { result } = renderHook(() =>
			useProposalExecution({ proposal, allowlist, onSuccess }),
		);

		act(() => {
			void result.current.execute();
		});

		await waitFor(() => {
			expect(result.current.isExecuting).toBe(true);
		});

		deferred.resolve(createResult({}));

		await waitFor(() => {
			expect(result.current.isExecuting).toBe(false);
		});

		expect(executeAiChatMutationActionMock).toHaveBeenCalledWith({
			proposal,
			allowlist,
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
		expect(onSuccess).toHaveBeenCalledWith({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			officeId: TEST_IDS.OFFICE_1,
		});
	});

	it('500エラー時はrefreshしない', async () => {
		executeAiChatMutationActionMock.mockResolvedValue(
			createResult({ data: null, error: 'Internal Server Error', status: 500 }),
		);

		const { result } = renderHook(() =>
			useProposalExecution({ proposal, allowlist }),
		);

		await act(async () => {
			await result.current.execute();
		});

		expect(refreshMock).not.toHaveBeenCalled();
		expect(handleActionResultMock).toHaveBeenCalledWith(
			expect.objectContaining({ status: 500 }),
			expect.objectContaining({ errorMessage: DEFAULT_ERROR_MESSAGE }),
		);
	});

	it('409エラー時は専用メッセージを渡す', async () => {
		executeAiChatMutationActionMock.mockResolvedValue(
			createResult({ data: null, error: 'Conflict', status: 409 }),
		);

		const { result } = renderHook(() =>
			useProposalExecution({ proposal, allowlist }),
		);

		await act(async () => {
			await result.current.execute();
		});

		expect(handleActionResultMock).toHaveBeenCalledWith(
			expect.objectContaining({ status: 409 }),
			expect.objectContaining({ errorMessage: CONFLICT_ERROR_MESSAGE }),
		);
	});

	it('Actionが例外をthrowしてもデフォルトエラートーストを表示しisExecutingを戻す', async () => {
		executeAiChatMutationActionMock.mockRejectedValue(new Error('Unexpected'));

		const { result } = renderHook(() =>
			useProposalExecution({ proposal, allowlist }),
		);

		await act(async () => {
			await result.current.execute();
		});

		expect(handleActionResultMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: null,
				error: DEFAULT_ERROR_MESSAGE,
				status: 500,
			}),
			expect.objectContaining({ errorMessage: DEFAULT_ERROR_MESSAGE }),
		);
		expect(result.current.isExecuting).toBe(false);
	});

	it('実行中の二重送信を防止する', async () => {
		const deferred =
			createDeferred<ActionResult<ExecuteAiChatMutationResult>>();
		executeAiChatMutationActionMock.mockReturnValue(deferred.promise);

		const { result } = renderHook(() =>
			useProposalExecution({ proposal, allowlist }),
		);

		act(() => {
			void result.current.execute();
			void result.current.execute();
		});

		expect(executeAiChatMutationActionMock).toHaveBeenCalledTimes(1);

		deferred.resolve(createResult({}));
		await waitFor(() => {
			expect(result.current.isExecuting).toBe(false);
		});
	});

	it('proposalがnullならno-op', async () => {
		const { result } = renderHook(() =>
			useProposalExecution({ proposal: null, allowlist }),
		);

		await act(async () => {
			await result.current.execute();
		});

		expect(executeAiChatMutationActionMock).not.toHaveBeenCalled();
		expect(handleActionResultMock).not.toHaveBeenCalled();
		expect(result.current.isExecuting).toBe(false);
	});

	it('dismissでonDismissが呼ばれる', () => {
		const onDismiss = vi.fn();
		const { result } = renderHook(() =>
			useProposalExecution({ proposal, allowlist, onDismiss }),
		);

		act(() => {
			result.current.dismiss();
		});

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});

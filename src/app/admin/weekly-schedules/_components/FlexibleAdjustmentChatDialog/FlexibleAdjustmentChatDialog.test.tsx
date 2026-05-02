import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FlexibleAdjustmentChatDialog } from './FlexibleAdjustmentChatDialog';

const mockRefresh = vi.fn();
const mockSendMessage = vi.fn();
const mockStop = vi.fn();
const mockHandleActionResult = vi.fn();
const mockExecuteAiChatMutationBatchAction = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		refresh: mockRefresh,
	}),
}));

vi.mock('@/hooks/useActionResultHandler', () => ({
	useActionResultHandler: () => ({
		handleActionResult: mockHandleActionResult,
	}),
}));

vi.mock('@/app/actions/aiChatMutationBatch', () => ({
	executeAiChatMutationBatchAction: (...args: unknown[]) =>
		mockExecuteAiChatMutationBatchAction(...args),
}));

vi.mock(
	'@/app/admin/weekly-schedules/_components/AdjustmentChatDialog',
	async () => {
		const actual = await vi.importActual<
			typeof import('@/app/admin/weekly-schedules/_components/AdjustmentChatDialog')
		>('@/app/admin/weekly-schedules/_components/AdjustmentChatDialog');

		return {
			...actual,
			useAdjustmentChat: () => ({
				messages: [
					{
						id: 'assistant-1',
						role: 'assistant',
						content: '',
						timestamp: new Date(),
					},
				],
				rawMessages: [
					{
						id: 'assistant-1',
						role: 'assistant',
						parts: [
							{
								type: 'tool-proposeShiftChanges',
								toolCallId: 'call_1',
								state: 'output-available',
								input: {},
								output: {
									proposals: [
										{
											type: 'change_shift_staff',
											shiftId: TEST_IDS.SCHEDULE_1,
											toStaffId: TEST_IDS.STAFF_2,
											reason: '欠勤対応',
										},
									],
								},
							},
						],
					},
				],
				isStreaming: false,
				error: null,
				sendMessage: mockSendMessage,
				stop: mockStop,
			}),
		};
	},
);

describe('FlexibleAdjustmentChatDialog', () => {
	const allowlist = {
		shiftIds: [TEST_IDS.SCHEDULE_1],
		staffIds: [TEST_IDS.STAFF_2],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockExecuteAiChatMutationBatchAction.mockResolvedValue({
			data: {
				results: [
					{
						type: 'change_shift_staff',
						shiftId: TEST_IDS.SCHEDULE_1,
						officeId: TEST_IDS.OFFICE_1,
					},
				],
			},
			error: null,
			status: 200,
		});
	});

	it('対象期間を表示する', () => {
		render(
			<FlexibleAdjustmentChatDialog
				isOpen={true}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText('AIアシスタント')).toBeInTheDocument();
		expect(screen.getByText('2026-03-16 〜 2026-03-22')).toBeInTheDocument();
	});

	it('バッチ提案を表示して確定できる', async () => {
		const user = userEvent.setup();

		render(
			<FlexibleAdjustmentChatDialog
				isOpen={true}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '確定' }));

		expect(mockExecuteAiChatMutationBatchAction).toHaveBeenCalledWith({
			proposals: [
				{
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_2,
					reason: '欠勤対応',
				},
			],
			allowlist,
		});
		expect(mockHandleActionResult).toHaveBeenCalledTimes(1);
	});

	it('閉じると stop と onClose を呼ぶ', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(
			<FlexibleAdjustmentChatDialog
				isOpen={true}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={onClose}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '閉じる' }));

		expect(mockStop).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});

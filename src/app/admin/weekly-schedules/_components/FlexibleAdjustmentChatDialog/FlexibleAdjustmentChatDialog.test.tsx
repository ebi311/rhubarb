import { PROPOSAL_DISMISS_GUIDANCE_MESSAGE } from '@/app/admin/weekly-schedules/_components/AdjustmentChatDialog';
import { TEST_IDS } from '@/test/helpers/testIds';
import { fireEvent, render, screen } from '@testing-library/react';
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

	it('isOpen が false のときは何も描画しない', () => {
		render(
			<FlexibleAdjustmentChatDialog
				isOpen={false}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '閉じる' }),
		).not.toBeInTheDocument();
	});

	it('open 時は complementary landmark として見出しでラベル付けして表示する', () => {
		render(
			<FlexibleAdjustmentChatDialog
				isOpen={true}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={vi.fn()}
			/>,
		);

		const drawer = screen.getByRole('complementary', {
			name: 'AIアシスタント',
		});
		const heading = screen.getByRole('heading', {
			level: 2,
			name: 'AIアシスタント',
		});

		expect(drawer).toBeInTheDocument();
		expect(drawer).toHaveAttribute(
			'aria-labelledby',
			'flexible-chat-drawer-heading',
		);
		expect(heading).toHaveAttribute('id', 'flexible-chat-drawer-heading');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
		expect(
			screen.queryByText(PROPOSAL_DISMISS_GUIDANCE_MESSAGE),
		).not.toBeInTheDocument();
	});

	it('キャンセル後に再提案ガイダンスを表示する', async () => {
		const user = userEvent.setup();

		render(
			<FlexibleAdjustmentChatDialog
				isOpen={true}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'キャンセル' }));

		expect(
			screen.getByText(PROPOSAL_DISMISS_GUIDANCE_MESSAGE),
		).toBeInTheDocument();
	});

	it('Escape キーで stop と onClose を呼ぶ', () => {
		const onClose = vi.fn();
		render(
			<FlexibleAdjustmentChatDialog
				isOpen={true}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={onClose}
			/>,
		);

		fireEvent.keyDown(document, { key: 'Escape' });

		expect(mockStop).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('IME 変換中の Escape キーでは stop と onClose を呼ばない', () => {
		const onClose = vi.fn();
		render(
			<FlexibleAdjustmentChatDialog
				isOpen={true}
				weekRange={{ startDate: '2026-03-16', endDate: '2026-03-22' }}
				allowlist={allowlist}
				onClose={onClose}
			/>,
		);

		const event = new KeyboardEvent('keydown', { key: 'Escape' });
		Object.defineProperty(event, 'isComposing', { value: true });
		document.dispatchEvent(event);

		expect(mockStop).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it('閉じるボタンで stop と onClose を呼ぶ', async () => {
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

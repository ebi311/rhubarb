import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AdjustmentChatDialog } from './AdjustmentChatDialog';

// Vercel AI SDK useChat のモック
const mockUseChat = vi.fn();
const mockUseProposalExecution = vi.fn();

vi.mock('@ai-sdk/react', () => ({
	useChat: () => mockUseChat(),
}));

vi.mock('./useProposalExecution', () => ({
	useProposalExecution: (options: unknown) => mockUseProposalExecution(options),
}));

const shiftContext = {
	id: TEST_IDS.SCHEDULE_1,
	clientId: TEST_IDS.CLIENT_1,
	serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
	staffName: '山田太郎',
	clientName: '田中太郎',
	date: '2026-02-24',
	startTime: '10:00',
	endTime: '11:00',
};

const staffOptions = [
	{
		id: TEST_IDS.STAFF_1,
		name: '山田太郎',
		role: 'helper' as const,
		serviceTypeIds: [TEST_IDS.SERVICE_TYPE_1],
	},
	{
		id: TEST_IDS.STAFF_2,
		name: '鈴木花子',
		role: 'helper' as const,
		serviceTypeIds: [TEST_IDS.SERVICE_TYPE_1],
	},
];

// デフォルトのモック状態を生成（AI SDK v6 API）
const createMockUseChatReturn = (overrides: Record<string, unknown> = {}) => ({
	messages: [],
	status: 'ready', // v6: 'ready' | 'streaming' | 'submitted' | 'error'
	error: null,
	sendMessage: vi.fn(),
	setMessages: vi.fn(),
	stop: vi.fn(),
	...overrides,
});

const createProposalMessage = (proposalJson: string) => ({
	id: 'assistant-1',
	role: 'assistant',
	parts: [
		{
			type: 'text',
			text: `提案です
\`\`\`json
${proposalJson}
\`\`\``,
		},
	],
});

describe('AdjustmentChatDialog', () => {
	let mockSendMessage: Mock;
	let mockStop: Mock;
	let mockSetMessages: Mock;
	let mockExecuteProposal: Mock;
	let mockDismissProposal: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSendMessage = vi.fn();
		mockStop = vi.fn();
		mockSetMessages = vi.fn();
		mockExecuteProposal = vi.fn();
		mockDismissProposal = vi.fn();
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);
		mockUseProposalExecution.mockReturnValue({
			isExecuting: false,
			execute: mockExecuteProposal,
			dismiss: mockDismissProposal,
		});
	});

	it('ダイアログが開閉する', () => {
		const { rerender } = render(
			<AdjustmentChatDialog
				isOpen={false}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		rerender(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('シフト調整チャット')).toBeInTheDocument();
	});

	it('シフトコンテキストが表示される', () => {
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText(/田中太郎/)).toBeInTheDocument();
		expect(screen.getByText(/山田太郎/)).toBeInTheDocument();
		expect(screen.getByText(/10:00〜11:00/)).toBeInTheDocument();
	});

	it('メッセージを送信してAI応答を受け取る', async () => {
		// メッセージ送信後のレスポンス状態をシミュレート
		// AI SDK v6: messages は parts 配列を持つ UIMessage 形式
		mockUseChat
			.mockReturnValueOnce(
				createMockUseChatReturn({
					messages: [],
					sendMessage: mockSendMessage,
					stop: mockStop,
					setMessages: mockSetMessages,
				}),
			)
			.mockReturnValueOnce(
				createMockUseChatReturn({
					messages: [
						{
							id: '1',
							role: 'user',
							parts: [{ type: 'text', text: 'このシフトの担当を変更したい' }],
						},
						{
							id: '2',
							role: 'assistant',
							parts: [{ type: 'text', text: 'こんにちは' }],
						},
					],
					sendMessage: mockSendMessage,
					stop: mockStop,
					setMessages: mockSetMessages,
				}),
			);

		const user = userEvent.setup();
		const { rerender } = render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, 'このシフトの担当を変更したい');
		await user.click(screen.getByRole('button', { name: '送信' }));

		// sendMessage が呼ばれることを確認（v6: text フィールドを使用）
		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalledWith({
				text: 'このシフトの担当を変更したい',
			});
		});

		// リレンダリング後に応答が表示される
		rerender(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText('こんにちは')).toBeInTheDocument();
	});

	it('Enter キーでメッセージを送信する', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, 'テストメッセージ{enter}');

		await waitFor(() => {
			expect(mockSendMessage).toHaveBeenCalled();
		});
	});

	it('Shift+Enter で改行する（送信されない）', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, '1行目{Shift>}{enter}{/Shift}2行目');

		// 送信されていないことを確認
		expect(mockSendMessage).not.toHaveBeenCalled();
		expect(input).toHaveValue('1行目\n2行目');
	});

	it('空のメッセージは送信できない', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		const submitButton = screen.getByRole('button', { name: '送信' });
		expect(submitButton).toBeDisabled();

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, '   ');
		expect(submitButton).toBeDisabled();
	});

	it('閉じるボタンで onClose が呼ばれ、stop() も呼ばれる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={onClose}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '閉じる' }));
		expect(mockStop).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it('ストリーミング中は入力が無効化される', () => {
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				status: 'streaming', // v6: isLoading → status
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		// ストリーミング中は入力が無効
		expect(screen.getByPlaceholderText('メッセージを入力...')).toBeDisabled();
	});

	it('エラー時はエラーメッセージを表示する', () => {
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				error: new Error('AI service is not configured'),
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(
			screen.getByText(/AI service is not configured/),
		).toBeInTheDocument();
	});

	it('assistant の最新メッセージに提案 JSON があると ProposalConfirmCard を表示する', () => {
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				messages: [
					createProposalMessage(`{
  "type": "update_shift_time",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "startAt": "2026-02-24T10:00:00+09:00",
  "endAt": "2026-02-24T11:00:00+09:00"
}`),
				],
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText('時間変更')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '確定' })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'キャンセル' }),
		).toBeInTheDocument();
	});

	it('change_shift_staff の提案 JSON があると担当者変更カードを表示する', () => {
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				messages: [
					createProposalMessage(`{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}`),
				],
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText('担当者変更')).toBeInTheDocument();
		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('鈴木花子')).toBeInTheDocument();
	});

	it('確定ボタン押下で execute が呼ばれる', async () => {
		const user = userEvent.setup();
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				messages: [
					createProposalMessage(`{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}`),
				],
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '確定' }));

		expect(mockExecuteProposal).toHaveBeenCalledTimes(1);
	});

	it('キャンセル押下でカードが非表示になる', async () => {
		type UseProposalExecutionOptions = {
			onDismiss?: () => void;
		};
		const user = userEvent.setup();
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				messages: [
					createProposalMessage(`{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}`),
				],
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);
		mockUseProposalExecution.mockImplementation(
			(options: UseProposalExecutionOptions) => ({
				isExecuting: false,
				execute: mockExecuteProposal,
				dismiss: () => {
					options.onDismiss?.();
					mockDismissProposal();
				},
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'キャンセル' }));

		expect(mockDismissProposal).toHaveBeenCalledTimes(1);
		expect(screen.queryByText('担当者変更')).not.toBeInTheDocument();
	});

	it('isStreaming=true のとき確定ボタンが disabled になる', () => {
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				status: 'streaming',
				messages: [
					createProposalMessage(`{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}`),
				],
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('button', { name: '確定' })).toBeDisabled();
	});

	it('isExecuting=true のとき確定ボタンが disabled になる', () => {
		mockUseChat.mockReturnValue(
			createMockUseChatReturn({
				messages: [
					createProposalMessage(`{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}`),
				],
				sendMessage: mockSendMessage,
				stop: mockStop,
				setMessages: mockSetMessages,
			}),
		);
		mockUseProposalExecution.mockReturnValue({
			isExecuting: true,
			execute: mockExecuteProposal,
			dismiss: mockDismissProposal,
		});

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				staffOptions={staffOptions}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('button', { name: '確定' })).toBeDisabled();
	});

	it('detectedProposal の算出で reverse を呼ばずに最新 assistant を検出できる', () => {
		const reverseSpy = vi
			.spyOn(Array.prototype, 'reverse')
			.mockImplementation(() => {
				throw new Error('reverse should not be called');
			});

		try {
			mockUseChat.mockReturnValue(
				createMockUseChatReturn({
					messages: [
						createProposalMessage(`{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}`),
						{
							id: 'user-1',
							role: 'user',
							parts: [{ type: 'text', text: '確認お願いします' }],
						},
					],
					sendMessage: mockSendMessage,
					stop: mockStop,
					setMessages: mockSetMessages,
				}),
			);

			render(
				<AdjustmentChatDialog
					isOpen={true}
					shiftContext={shiftContext}
					staffOptions={staffOptions}
					onClose={vi.fn()}
				/>,
			);

			expect(screen.getByText('担当者変更')).toBeInTheDocument();
		} finally {
			reverseSpy.mockRestore();
		}
	});
});

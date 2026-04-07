import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatMessageList } from './ChatMessageList';
import type { ChatMessage } from './useAdjustmentChat';

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
	id: TEST_IDS.SCHEDULE_1,
	role: 'assistant',
	content: 'AI response',
	timestamp: new Date('2026-02-24T10:00:00.000Z'),
	...overrides,
});

describe('ChatMessageList', () => {
	const scrollIntoViewMock = vi.fn();
	const originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
		HTMLElement.prototype,
		'scrollIntoView',
	);

	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: scrollIntoViewMock,
			writable: true,
		});
	});

	afterAll(() => {
		if (originalScrollIntoViewDescriptor) {
			Object.defineProperty(
				HTMLElement.prototype,
				'scrollIntoView',
				originalScrollIntoViewDescriptor,
			);
			return;
		}

		Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
	});

	it('streaming 中は scrollIntoView を auto で呼ぶ', () => {
		render(<ChatMessageList messages={[createMessage()]} isStreaming={true} />);

		expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'auto' });
	});

	it('非 streaming で新規メッセージ追加時は scrollIntoView を smooth で呼ぶ', () => {
		const initialMessages = [createMessage()];
		const { rerender } = render(
			<ChatMessageList messages={initialMessages} isStreaming={false} />,
		);
		scrollIntoViewMock.mockClear();

		rerender(
			<ChatMessageList
				messages={[
					...initialMessages,
					createMessage({
						id: TEST_IDS.SCHEDULE_2,
						content: 'follow-up message',
					}),
				]}
				isStreaming={false}
			/>,
		);

		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
		expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
	});

	it('streaming 終了だけでは追加スクロールしない', () => {
		const messages = [createMessage()];
		const { rerender } = render(
			<ChatMessageList messages={messages} isStreaming={true} />,
		);
		scrollIntoViewMock.mockClear();

		rerender(<ChatMessageList messages={messages} isStreaming={false} />);

		expect(scrollIntoViewMock).not.toHaveBeenCalled();
	});

	it('assistant メッセージ内の JSON コードブロックは表示せず、JSON のみならプレースホルダを表示する', () => {
		render(
			<ChatMessageList
				messages={[
					createMessage({
						content: '```json\n{ "type": "update_shift_time" }\n```',
					}),
				]}
			/>,
		);

		expect(screen.queryByText(/```json/)).not.toBeInTheDocument();
		expect(screen.getByText('（提案を生成しました）')).toBeInTheDocument();
	});

	it('proposalMessageId に一致するメッセージの JSON のみ内容を非表示にする', () => {
		render(
			<ChatMessageList
				proposalMessageId={TEST_IDS.SCHEDULE_1}
				messages={[
					createMessage({
						content: '```json\n{ "type": "update_shift_time" }\n```',
					}),
				]}
			/>,
		);

		expect(
			screen.queryByText('（提案を生成しました）'),
		).not.toBeInTheDocument();
	});

	it('proposalMessageId に一致し assistant content が空文字のときは行を非表示にする', () => {
		render(
			<ChatMessageList
				proposalMessageId={TEST_IDS.SCHEDULE_1}
				messages={[
					createMessage({
						id: TEST_IDS.SCHEDULE_1,
						content: '',
					}),
				]}
			/>,
		);

		expect(screen.queryByText('AIアシスタント')).not.toBeInTheDocument();
	});

	it('proposalMessageId と異なる assistant の空 content 行は非表示にする', () => {
		render(
			<ChatMessageList
				proposalMessageId={TEST_IDS.SCHEDULE_1}
				messages={[
					createMessage({
						id: TEST_IDS.SCHEDULE_2,
						content: '',
					}),
					createMessage({
						id: TEST_IDS.CLIENT_1,
						role: 'user',
						content: '確認しました',
					}),
				]}
			/>,
		);

		expect(screen.queryByText('AIアシスタント')).not.toBeInTheDocument();
		expect(screen.getByText('あなた')).toBeInTheDocument();
		expect(
			document.querySelector('.loading.loading-sm.loading-dots'),
		).not.toBeInTheDocument();
	});

	it('streaming 中の最後の assistant 空 content 行は loading dots を表示する', () => {
		render(
			<ChatMessageList
				isStreaming={true}
				proposalMessageId={TEST_IDS.SCHEDULE_1}
				messages={[
					createMessage({
						id: TEST_IDS.SCHEDULE_2,
						content: '',
					}),
				]}
			/>,
		);

		expect(screen.getByText('AIアシスタント')).toBeInTheDocument();
		expect(
			document.querySelector('.loading.loading-sm.loading-dots'),
		).toBeInTheDocument();
	});

	it('proposalMessageId が異なる他のメッセージは非表示にしない', () => {
		render(
			<ChatMessageList
				proposalMessageId={TEST_IDS.SCHEDULE_1}
				messages={[
					// 現在の提案: 非表示
					createMessage({
						id: TEST_IDS.SCHEDULE_1,
						content: '```json\n{ "type": "update_shift_time" }\n```',
					}),
					// 過去の提案（別 ID）: 表示が残る
					createMessage({
						id: TEST_IDS.SCHEDULE_2,
						content: '```json\n{ "type": "change_shift_staff" }\n```',
					}),
				]}
			/>,
		);

		// 現在の提案はプレースホルダーも表示されない
		const placeholders = screen.queryAllByText('（提案を生成しました）');
		expect(placeholders).toHaveLength(1); // 過去の提案は残る
	});
});

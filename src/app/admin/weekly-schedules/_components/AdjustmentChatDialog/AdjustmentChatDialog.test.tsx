import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdjustmentChatDialog } from './AdjustmentChatDialog';

// global.fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockSSEResponse = (chunks: string[]) => {
	const encoder = new TextEncoder();
	const data = chunks
		.map((chunk) =>
			chunk === '[DONE]'
				? 'data: [DONE]\n\n'
				: `data: {"content":"${chunk}"}\n\n`,
		)
		.join('');

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(data));
			controller.close();
		},
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/event-stream' },
	});
};

const shiftContext = {
	id: TEST_IDS.SCHEDULE_1,
	staffName: '山田太郎',
	clientName: '田中太郎',
	date: '2026-02-24',
	startTime: '10:00',
	endTime: '11:00',
};

describe('AdjustmentChatDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue(
			createMockSSEResponse(['こん', 'にちは', '[DONE]']),
		);
	});

	it('ダイアログが開閉する', () => {
		const { rerender } = render(
			<AdjustmentChatDialog
				isOpen={false}
				shiftContext={shiftContext}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		rerender(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
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
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText(/田中太郎/)).toBeInTheDocument();
		expect(screen.getByText(/山田太郎/)).toBeInTheDocument();
		expect(screen.getByText(/10:00〜11:00/)).toBeInTheDocument();
	});

	it('メッセージを送信してAI応答を受け取る', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, 'このシフトの担当を変更したい');
		await user.click(screen.getByRole('button', { name: '送信' }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/chat/shift-adjustment',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('このシフトの担当を変更したい'),
				}),
			);
		});

		// ストリーミング応答が表示される
		await waitFor(() => {
			expect(screen.getByText('こんにちは')).toBeInTheDocument();
		});
	});

	it('Enter キーでメッセージを送信する', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, 'テストメッセージ{enter}');

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});
	});

	it('Shift+Enter で改行する（送信されない）', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, '1行目{Shift>}{enter}{/Shift}2行目');

		// 送信されていないことを確認
		expect(mockFetch).not.toHaveBeenCalled();
		expect(input).toHaveValue('1行目\n2行目');
	});

	it('空のメッセージは送信できない', async () => {
		const user = userEvent.setup();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				onClose={vi.fn()}
			/>,
		);

		const submitButton = screen.getByRole('button', { name: '送信' });
		expect(submitButton).toBeDisabled();

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, '   ');
		expect(submitButton).toBeDisabled();
	});

	it('閉じるボタンで onClose が呼ばれる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				onClose={onClose}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '閉じる' }));
		expect(onClose).toHaveBeenCalled();
	});

	it('ストリーミング中は入力が無効化される', async () => {
		const user = userEvent.setup();
		// 長時間待機するストリームをモック
		let resolveStream: (() => void) | undefined;
		mockFetch.mockImplementation(
			() =>
				new Promise<Response>((resolve) => {
					resolveStream = () =>
						resolve(createMockSSEResponse(['応答', '[DONE]']));
				}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, 'テスト');
		await user.click(screen.getByRole('button', { name: '送信' }));

		// ストリーミング中は入力が無効
		await waitFor(() => {
			expect(screen.getByPlaceholderText('メッセージを入力...')).toBeDisabled();
		});

		// ストリームを完了
		resolveStream?.();

		// ストリーミング完了後は入力が有効
		await waitFor(() => {
			expect(screen.getByPlaceholderText('メッセージを入力...')).toBeEnabled();
		});
	});

	it('エラー時はエラーメッセージを表示する', async () => {
		const user = userEvent.setup();
		mockFetch.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: 'AI service is not configured' }), {
				status: 500,
			}),
		);

		render(
			<AdjustmentChatDialog
				isOpen={true}
				shiftContext={shiftContext}
				onClose={vi.fn()}
			/>,
		);

		const input = screen.getByPlaceholderText('メッセージを入力...');
		await user.type(input, 'テスト');
		await user.click(screen.getByRole('button', { name: '送信' }));

		await waitFor(() => {
			expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
		});
	});
});

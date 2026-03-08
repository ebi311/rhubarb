import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

// Gemini API のモック
const mockSendMessageStream = vi.fn();

vi.mock('@google/generative-ai', () => {
	return {
		GoogleGenerativeAI: class MockGoogleGenerativeAI {
			constructor(_apiKey: string) {
				// APIキーを受け取るが、テストでは使用しない
			}
			getGenerativeModel() {
				return {
					startChat: () => ({
						sendMessageStream: mockSendMessageStream,
					}),
				};
			}
		},
	};
});

// 環境変数のモック
vi.stubEnv('GEMINI_API_KEY', 'test-api-key');

describe('POST /api/chat/shift-adjustment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('正常なリクエストに対してストリーミングレスポンスを返す', async () => {
		// テスト用のストリームレスポンスをモック
		const mockStream = {
			async *[Symbol.asyncIterator]() {
				yield { text: () => 'テスト' };
				yield { text: () => 'レスポンス' };
			},
		};
		mockSendMessageStream.mockResolvedValue({ stream: mockStream });

		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'スタッフAが休みになりました' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe(
			'text/event-stream; charset=utf-8',
		);

		// レスポンスボディを読み取る
		const reader = response.body?.getReader();
		const decoder = new TextDecoder();
		let result = '';

		if (reader) {
			let done = false;
			while (!done) {
				const { value, done: d } = await reader.read();
				done = d;
				if (value) {
					result += decoder.decode(value);
				}
			}
		}

		expect(result).toContain('data:');
		expect(result).toContain('テスト');
	});

	it('messages が空の場合は 400 エラーを返す', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages: [] }),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBeDefined();
	});

	it('messages が無い場合は 400 エラーを返す', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
	});

	it('無効なJSONの場合は 400 エラーを返す', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json',
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
	});

	it('Gemini API エラー時は 500 エラーを返す', async () => {
		mockSendMessageStream.mockRejectedValue(new Error('API Error'));

		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'テストメッセージ' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBeDefined();
		// 内部エラー詳細はクライアントに露出しないこと
		expect(body.details).toBeUndefined();
	});

	it('context (シフトデータ) を含むリクエストを処理できる', async () => {
		const mockStream = {
			async *[Symbol.asyncIterator]() {
				yield { text: () => '提案内容' };
			},
		};
		mockSendMessageStream.mockResolvedValue({ stream: mockStream });

		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: '調整してください' }],
				context: {
					shifts: [
						{
							id: '550e8400-e29b-41d4-a716-446655440001',
							staffName: 'スタッフA',
							clientName: '利用者B',
							date: '2025-01-20',
							startTime: '09:00',
							endTime: '11:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
	});

	it('GEMINI_API_KEY が未設定の場合は 500 エラーを返す', async () => {
		// 環境変数を一時的にクリア
		const originalKey = process.env.GEMINI_API_KEY;
		delete process.env.GEMINI_API_KEY;

		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'テスト' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBe('AI service is not configured');

		// 環境変数を復元
		process.env.GEMINI_API_KEY = originalKey;
	});
});

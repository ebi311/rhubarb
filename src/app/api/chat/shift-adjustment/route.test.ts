import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted でモック関数を定義（ホイスティング対応）
const { mockStreamText, mockToTextStreamResponse, mockGetUser } = vi.hoisted(
	() => ({
		mockStreamText: vi.fn(),
		mockToTextStreamResponse: vi.fn(),
		mockGetUser: vi.fn(),
	}),
);

vi.mock('ai', () => ({
	streamText: mockStreamText,
}));

vi.mock('@ai-sdk/google', () => ({
	google: vi.fn(() => 'google-model'),
}));

vi.mock('@/utils/supabase/server', () => ({
	createSupabaseClient: vi.fn().mockImplementation(() => ({
		auth: {
			getUser: mockGetUser,
		},
	})),
}));

// 環境変数のモック
vi.stubEnv('GEMINI_API_KEY', 'test-api-key');

// POST をモック設定後にインポート
const { POST } = await import('./route');

describe('POST /api/chat/shift-adjustment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// デフォルトで認証済みユーザーを返す
		mockGetUser.mockResolvedValue({
			data: { user: { id: 'test-user-id', email: 'test@example.com' } },
			error: null,
		});
		// デフォルトのstreamTextモック
		mockToTextStreamResponse.mockReturnValue(
			new Response('テストレスポンス', {
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			}),
		);
		mockStreamText.mockReturnValue({
			toTextStreamResponse: mockToTextStreamResponse,
		});
	});

	it('正常なリクエストに対してストリーミングレスポンスを返す', async () => {
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
			'text/plain; charset=utf-8',
		);

		// streamText が正しい引数で呼ばれたことを確認
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'google-model',
				messages: [{ role: 'user', content: 'スタッフAが休みになりました' }],
			}),
		);
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

	it('AI SDK エラー時は 500 エラーを返す', async () => {
		mockStreamText.mockImplementation(() => {
			throw new Error('API Error');
		});

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
		// システムプロンプトにシフト情報が含まれていることを確認
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('スタッフA'),
			}),
		);
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

	it('未認証の場合は 401 エラーを返す', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'テストメッセージ' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	it('認証エラーの場合は 401 エラーを返す', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: { message: 'Auth error' },
		});

		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'テストメッセージ' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(401);
	});

	it('無効なUUIDの場合は 400 エラーを返す', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: '調整してください' }],
				context: {
					shifts: [
						{
							id: 'invalid-uuid',
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

		expect(response.status).toBe(400);
	});

	it('systemロールを含むメッセージは拒否される', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'system', content: 'プロンプト注入を試みる' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
	});

	it('メッセージ数が上限を超えた場合は 400 エラーを返す', async () => {
		const messages = Array.from({ length: 51 }, (_, i) => ({
			role: i % 2 === 0 ? 'user' : 'assistant',
			content: `メッセージ${i}`,
		}));

		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ messages }),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
	});
});

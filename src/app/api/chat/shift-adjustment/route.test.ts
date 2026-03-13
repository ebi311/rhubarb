import { TEST_IDS } from '@/test/helpers/testIds';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted でモック関数を定義（ホイスティング対応）
const {
	mockStreamText,
	mockToTextStreamResponse,
	mockGetUser,
	mockSupabaseFrom,
	mockCreateSearchAvailableHelpersTool,
	mockCreateProcessStaffAbsenceTool,
	mockCreateSearchStaffsTool,
	mockStepCountIs,
} = vi.hoisted(() => ({
	mockStreamText: vi.fn(),
	mockToTextStreamResponse: vi.fn(),
	mockGetUser: vi.fn(),
	mockSupabaseFrom: vi.fn(),
	mockCreateSearchAvailableHelpersTool: vi.fn(),
	mockCreateProcessStaffAbsenceTool: vi.fn(),
	mockCreateSearchStaffsTool: vi.fn(),
	mockStepCountIs: vi.fn((n: number) => ({ type: 'stepCountIs', count: n })),
}));

vi.mock('ai', () => ({
	streamText: mockStreamText,
	stepCountIs: mockStepCountIs,
}));

vi.mock('@ai-sdk/google', () => ({
	createGoogleGenerativeAI: vi.fn(() => vi.fn(() => 'google-model')),
}));

vi.mock('@/utils/supabase/server', () => ({
	createSupabaseClient: vi.fn().mockImplementation(() => ({
		auth: {
			getUser: mockGetUser,
		},
		from: mockSupabaseFrom,
	})),
}));

vi.mock('@/backend/tools/searchAvailableHelpers', () => ({
	createSearchAvailableHelpersTool: mockCreateSearchAvailableHelpersTool,
}));

vi.mock('@/backend/tools/processStaffAbsence', () => ({
	createProcessStaffAbsenceTool: mockCreateProcessStaffAbsenceTool,
}));

vi.mock('@/backend/tools/searchStaffs', () => ({
	createSearchStaffsTool: mockCreateSearchStaffsTool,
}));

// 環境変数のモック
vi.stubEnv('GEMINI_API_KEY', 'test-api-key');

// POST をモック設定後にインポート
const { POST } = await import('./route');

describe('POST /api/chat/shift-adjustment', () => {
	const mockStaffSelect = vi.fn();
	const mockStaffEq = vi.fn();
	const mockStaffMaybeSingle = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// デフォルトで認証済みユーザーを返す
		mockGetUser.mockResolvedValue({
			data: { user: { id: 'test-user-id', email: 'test@example.com' } },
			error: null,
		});

		// スタッフ情報取得のモック（office_id, role 取得用）
		mockStaffMaybeSingle.mockResolvedValue({
			data: { office_id: TEST_IDS.OFFICE_1, role: 'admin' },
			error: null,
		});
		mockStaffEq.mockImplementation((column: string, value: string) => {
			// auth_user_id カラムで検索されることを検証
			expect(column).toBe('auth_user_id');
			expect(value).toBe('test-user-id');
			return { maybeSingle: mockStaffMaybeSingle };
		});
		mockStaffSelect.mockReturnValue({ eq: mockStaffEq });
		mockSupabaseFrom.mockReturnValue({ select: mockStaffSelect });

		// Tool モックを返す
		mockCreateSearchAvailableHelpersTool.mockReturnValue({
			description: 'mock search tool',
		});
		mockCreateProcessStaffAbsenceTool.mockReturnValue({
			description: 'mock process absence tool',
		});
		mockCreateSearchStaffsTool.mockReturnValue({
			description: 'mock search staffs tool',
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

	it('assistant の parts に non-text が混在していても 400 にならず text のみを送る', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{ role: 'user', content: '調整をお願いします' },
					{
						role: 'assistant',
						parts: [
							{ type: 'reasoning', reasoning: '内部推論' },
							{
								type: 'tool-searchStaffs',
								toolCallId: 'call_1',
								state: 'output-available',
								output: { staffs: [] },
							},
							{ type: 'text', text: '候補を確認しました。' },
						],
					},
				],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					{ role: 'user', content: '調整をお願いします' },
					{ role: 'assistant', content: '候補を確認しました。' },
				],
			}),
		);
	});

	it('parts に text が無い場合でも空文字として処理する', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{ role: 'user', content: '続けてください' },
					{
						role: 'assistant',
						parts: [
							{
								type: 'tool-searchStaffs',
								toolCallId: 'call_2',
								state: 'output-available',
								output: { staffs: [] },
							},
						],
					},
				],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					{ role: 'user', content: '続けてください' },
					{ role: 'assistant', content: '' },
				],
			}),
		);
	});

	it('non-text parts のみで content がある場合は content にフォールバックする', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'assistant',
						parts: [{ type: 'step-start' }],
						content: 'フォールバックコンテンツ',
					},
					{ role: 'user', content: '続けてください' },
				],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [
					{ role: 'assistant', content: 'フォールバックコンテンツ' },
					{ role: 'user', content: '続けてください' },
				],
			}),
		);
	});

	it('content なしで parts のみでも正常に処理する', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'user',
						parts: [{ type: 'text', text: 'parts だけのメッセージです' }],
					},
				],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				messages: [{ role: 'user', content: 'parts だけのメッセージです' }],
			}),
		);
	});

	it('text part が 10000 文字を超える場合は 400 エラーを返す', async () => {
		const tooLongText = 'a'.repeat(10001);
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'user',
						parts: [{ type: 'text', text: tooLongText }],
					},
				],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(mockStreamText).not.toHaveBeenCalled();
	});

	it('複数 text part の合計が 10000 文字を超える場合は 400 エラーを返す', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'user',
						parts: [
							{ type: 'text', text: 'a'.repeat(6000) },
							{ type: 'text', text: 'b'.repeat(4001) },
						],
					},
				],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(mockStreamText).not.toHaveBeenCalled();
	});

	it('parts の件数が 50 を超える場合は 400 エラーを返す', async () => {
		const parts = Array.from({ length: 51 }, (_, i) => ({
			type: 'text',
			text: `part ${i}`,
		}));
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', parts }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(mockStreamText).not.toHaveBeenCalled();
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
							id: TEST_IDS.SCHEDULE_1,
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_2,
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
		// システムプロンプトにシフト情報と clientId/serviceTypeId が含まれていることを確認
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(TEST_IDS.CLIENT_1),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(TEST_IDS.SERVICE_TYPE_2),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'コンテキストに clientId と serviceTypeId が含まれている',
				),
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
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
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

	describe('Tool integration', () => {
		it('streamText に tools と stopWhen が渡される', async () => {
			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [
							{ role: 'user', content: '明日9時に空いているヘルパーを探して' },
						],
					}),
				},
			);

			await POST(request);

			// streamText が tools と stopWhen を含んで呼ばれたことを確認
			expect(mockStreamText).toHaveBeenCalledWith(
				expect.objectContaining({
					tools: expect.objectContaining({
						searchAvailableHelpers: expect.anything(),
						processStaffAbsence: expect.anything(),
						searchStaffs: expect.anything(),
					}),
					stopWhen: expect.anything(),
				}),
			);
		});

		it('createSearchAvailableHelpersTool が正しい引数で呼ばれる', async () => {
			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [{ role: 'user', content: 'ヘルパー検索' }],
					}),
				},
			);

			await POST(request);

			// Tool が正しい引数で作成されたことを確認
			expect(mockCreateSearchAvailableHelpersTool).toHaveBeenCalledWith({
				supabase: expect.anything(),
				officeId: TEST_IDS.OFFICE_1,
			});
		});

		it('createProcessStaffAbsenceTool が正しい引数で呼ばれる', async () => {
			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [
							{ role: 'user', content: 'スタッフAが休みになりました' },
						],
					}),
				},
			);

			await POST(request);

			// Tool が正しい引数で作成されたことを確認
			expect(mockCreateProcessStaffAbsenceTool).toHaveBeenCalledWith({
				supabase: expect.anything(),
				userId: 'test-user-id',
			});
		});

		it('スタッフが見つからない場合は 404 エラーを返す', async () => {
			mockStaffMaybeSingle.mockResolvedValue({
				data: null,
				error: null,
			});

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [{ role: 'user', content: 'テスト' }],
					}),
				},
			);

			const response = await POST(request);

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toBe('Staff not found');
		});

		it('スタッフ取得エラー時は 500 エラーを返す', async () => {
			mockStaffMaybeSingle.mockResolvedValue({
				data: null,
				error: { message: 'Database error' },
			});

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [{ role: 'user', content: 'テスト' }],
					}),
				},
			);

			const response = await POST(request);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Failed to resolve staff context');
		});

		it('admin 権限がない場合は 403 エラーを返す', async () => {
			mockStaffMaybeSingle.mockResolvedValue({
				data: { office_id: TEST_IDS.OFFICE_1, role: 'helper' },
				error: null,
			});

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [{ role: 'user', content: 'テスト' }],
					}),
				},
			);

			const response = await POST(request);

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe('Forbidden');
			// AI ツールが呼ばれないことを確認
			expect(mockStreamText).not.toHaveBeenCalled();
		});

		it('システムプロンプトに Tool の使用方法が含まれる', async () => {
			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [{ role: 'user', content: 'テスト' }],
					}),
				},
			);

			await POST(request);

			expect(mockStreamText).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining('searchAvailableHelpers'),
				}),
			);
			expect(mockStreamText).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining('processStaffAbsence'),
				}),
			);
			expect(mockStreamText).toHaveBeenCalledWith(
				expect.objectContaining({
					system: expect.stringContaining('searchStaffs'),
				}),
			);
		});

		it('createSearchStaffsTool が正しい引数で呼ばれる', async () => {
			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [{ role: 'user', content: '田中さんを検索して' }],
					}),
				},
			);

			await POST(request);

			// Tool が正しい引数で作成されたことを確認
			expect(mockCreateSearchStaffsTool).toHaveBeenCalledWith({
				supabase: expect.anything(),
				officeId: TEST_IDS.OFFICE_1,
			});
		});
	});
});

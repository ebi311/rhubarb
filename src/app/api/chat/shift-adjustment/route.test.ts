import { TEST_IDS, createTestId } from '@/test/helpers/testIds';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted でモック関数を定義（ホイスティング対応）
const {
	mockStreamText,
	mockToUIMessageStreamResponse,
	mockToTextStreamResponse,
	mockConvertToModelMessages,
	mockTool,
	mockGetUser,
	mockSupabaseFrom,
	mockShiftSelect,
	mockShiftEq,
	mockShiftMaybeSingle,
	mockCreateSearchAvailableHelpersTool,
	mockCreateProcessStaffAbsenceTool,
	mockCreateSearchStaffsTool,
	mockStepCountIs,
} = vi.hoisted(() => ({
	mockStreamText: vi.fn(),
	mockToUIMessageStreamResponse: vi.fn(),
	mockToTextStreamResponse: vi.fn(),
	mockConvertToModelMessages: vi.fn(),
	mockTool: vi.fn((definition: unknown) => definition),
	mockGetUser: vi.fn(),
	mockSupabaseFrom: vi.fn(),
	mockShiftSelect: vi.fn(),
	mockShiftEq: vi.fn(),
	mockShiftMaybeSingle: vi.fn(),
	mockCreateSearchAvailableHelpersTool: vi.fn(),
	mockCreateProcessStaffAbsenceTool: vi.fn(),
	mockCreateSearchStaffsTool: vi.fn(),
	mockStepCountIs: vi.fn((n: number) => ({ type: 'stepCountIs', count: n })),
}));

vi.mock('ai', () => ({
	streamText: mockStreamText,
	stepCountIs: mockStepCountIs,
	convertToModelMessages: mockConvertToModelMessages,
	tool: mockTool,
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

const SECRET_PII_MARKER = 'SECRET_PII_MARKER';

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

		mockShiftMaybeSingle.mockResolvedValue({
			data: { id: TEST_IDS.SCHEDULE_1 },
			error: null,
		});
		mockShiftEq.mockReturnValue({ maybeSingle: mockShiftMaybeSingle });
		mockShiftSelect.mockReturnValue({ eq: mockShiftEq });

		mockSupabaseFrom.mockImplementation((table: string) => {
			if (table === 'staffs') {
				return { select: mockStaffSelect };
			}
			if (table === 'shifts') {
				return { select: mockShiftSelect };
			}

			throw new Error('Unexpected table');
		});

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
		mockToUIMessageStreamResponse.mockReturnValue(
			new Response('テストレスポンス', {
				headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
			}),
		);
		mockConvertToModelMessages.mockImplementation(async (messages: unknown[]) =>
			messages.map((message) => {
				const typedMessage = message as {
					role: 'user' | 'assistant';
					content?: string;
					parts?: Array<{ type: string; text?: string }>;
				};

				if (!typedMessage.parts?.length) {
					return {
						role: typedMessage.role,
						content: typedMessage.content ?? '',
					};
				}

				const text = typedMessage.parts
					.flatMap((part) =>
						part.type === 'text' && typeof part.text === 'string'
							? [part.text]
							: [],
					)
					.join('');

				return {
					role: typedMessage.role,
					content: text || typedMessage.content || '',
				};
			}),
		);
		mockToTextStreamResponse.mockReturnValue(
			new Response('テストレスポンス', {
				headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
			}),
		);
		mockStreamText.mockReturnValue({
			toUIMessageStreamResponse: mockToUIMessageStreamResponse,
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
			'text/event-stream; charset=utf-8',
		);
		expect(mockToTextStreamResponse).toHaveBeenCalledTimes(1);

		expect(mockConvertToModelMessages).toHaveBeenCalledWith(
			[{ role: 'user', content: 'スタッフAが休みになりました', parts: [] }],
			expect.objectContaining({
				tools: expect.objectContaining({
					searchAvailableHelpers: expect.anything(),
					processStaffAbsence: expect.anything(),
					searchStaffs: expect.anything(),
				}),
			}),
		);

		// streamText が正しい引数で呼ばれたことを確認
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'google-model',
				messages: [{ role: 'user', content: 'スタッフAが休みになりました' }],
			}),
		);
	});

	it('x-ai-response-format: uimessage ヘッダー指定時は UIMessage ストリームで返す', async () => {
		const shiftId = TEST_IDS.SCHEDULE_1;
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-ai-response-format': 'uimessage',
			},
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'シフトを変更してください' }],
				context: {
					shifts: [
						{
							id: shiftId,
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: 'physical-care',
							date: '2026-03-16',
							startTime: '09:00',
							endTime: '10:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		// UIMessage モードでは toUIMessageStreamResponse が呼ばれる
		expect(mockToUIMessageStreamResponse).toHaveBeenCalledTimes(1);
		expect(mockToTextStreamResponse).not.toHaveBeenCalled();
		// proposeShiftChange ツールが tools に含まれていること
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: expect.objectContaining({
					proposeShiftChange: expect.anything(),
				}),
			}),
		);
		// proposeShiftChange 関連のプロンプト指示が system に含まれていること
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'assistant の本文に JSON を直接書かず、必ず proposeShiftChange ツールを呼び出して返す',
				),
			}),
		);
	});

	it('x-ai-response-format: uimessage かつ context.shifts が空なら、JSONコードブロック必須ではなく質問を促す指示を使う', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-ai-response-format': 'uimessage',
			},
			body: JSON.stringify({
				messages: [{ role: 'user', content: '提案してください' }],
				context: { shifts: [] },
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockToUIMessageStreamResponse).toHaveBeenCalledTimes(1);
		expect(mockToTextStreamResponse).not.toHaveBeenCalled();
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: expect.not.objectContaining({
					proposeShiftChange: expect.anything(),
				}),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'assistant 本文に JSON やコードブロックを出力してはならない',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.not.stringContaining(
					'必ず assistant メッセージ内に 1 つの json コードブロックを含める',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'必要な情報をユーザーに質問して対象シフトを特定する',
				),
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

	it('non-text part の JSON サイズが上限を超える場合は 400 エラーを返す', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'assistant',
						parts: [
							{
								type: 'tool-searchStaffs',
								toolCallId: 'call_too_large',
								state: 'output-available',
								output: {
									payload: 'x'.repeat(20001),
								},
							},
						],
					},
				],
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
					'対象シフトが1件に特定できる場合（context.shifts が1件）',
				),
			}),
		);
	});

	it('context.shifts.date が YYYY-MM-DD 形式でない場合は 400 エラーを返す', async () => {
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
							date: '2025/01/20',
							startTime: '09:00',
							endTime: '11:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(mockStreamText).not.toHaveBeenCalled();
	});

	it('context.shifts.date が存在しない日付の場合は 400 エラーを返す', async () => {
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
							date: '2025-02-31',
							startTime: '09:00',
							endTime: '11:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(mockStreamText).not.toHaveBeenCalled();
	});

	it('context.shifts.startTime/endTime が HH:mm 形式でない場合は 400 エラーを返す', async () => {
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
							startTime: '9:00',
							endTime: '11:0',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(mockStreamText).not.toHaveBeenCalled();
	});

	it('context.shifts.startTime が endTime 以上の場合は 400 エラーを返す', async () => {
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
							startTime: '11:00',
							endTime: '10:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(mockStreamText).not.toHaveBeenCalled();
	});

	it('単一シフトでは日時/サービス/利用者の確認質問不要の指示を system に含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'このシフトの代替を探して' }],
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
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'このシフトを対象として扱い、日時・サービス内容・利用者の追加確認は行わないでください',
				),
			}),
		);
	});

	it('serviceTypeId が physical-care のとき表示名「身体介護」を system に含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: '詳細を確認して' }],
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
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					`身体介護（serviceTypeId: ${TEST_IDS.SERVICE_TYPE_2}）`,
				),
			}),
		);
	});

	it('SYSTEM_PROMPT にサービス種別IDと表示名の対応表を含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'テスト' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('サービス種別IDと表示名の対応'),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('life-support: 生活支援'),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('physical-care: 身体介護'),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('commute-support: 通院サポート'),
			}),
		);
	});

	it('SYSTEM_PROMPT に proposeShiftChange tool 利用ルールを含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-ai-response-format': 'uimessage',
			},
			body: JSON.stringify({
				messages: [{ role: 'user', content: '提案してください' }],
				context: {
					shifts: [
						{
							id: TEST_IDS.SCHEDULE_1,
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
							date: '2026-03-16',
							startTime: '09:00',
							endTime: '10:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'assistant の本文に JSON を直接書かず、必ず proposeShiftChange ツールを呼び出して返す',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'proposeShiftChange の入力は次のいずれか 1 つの形式に厳密に従う',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('change_shift_staff'),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('update_shift_time'),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining('タイムゾーンオフセット必須'),
			}),
		);
	});

	it('SYSTEM_PROMPT に proposeShiftChange は成功断言ではないルールを含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-ai-response-format': 'uimessage',
			},
			body: JSON.stringify({
				messages: [{ role: 'user', content: '調整案を出して' }],
				context: {
					shifts: [
						{
							id: TEST_IDS.SCHEDULE_1,
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
							date: '2026-03-16',
							startTime: '09:00',
							endTime: '10:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'proposeShiftChange の呼び出しは成功断言ではありません',
				),
			}),
		);
	});

	it('SYSTEM_PROMPT に shiftId 不足時の丸投げ禁止と聞き返しルールを含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: 'shiftId が分からない' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'「システム上で shiftId を確認してください」のような丸投げをしてはならない',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'UI 上の候補（日時・利用者名・スタッフ名など）を示して対象特定を促すか、会話で必要情報を聞き返してください',
				),
			}),
		);
	});

	it('SYSTEM_PROMPT に proposeShiftChange 必須条件と情報不足時の質問許可ルールを含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-ai-response-format': 'uimessage',
			},
			body: JSON.stringify({
				messages: [{ role: 'user', content: '未確定時の対応を確認したい' }],
				context: {
					shifts: [
						{
							id: TEST_IDS.SCHEDULE_1,
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
							date: '2026-03-16',
							startTime: '09:00',
							endTime: '10:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'対象シフト（shiftId）が特定でき、シフト変更の提案を提示する段階では、proposeShiftChange の呼び出し（ツール実行）は必須であり、省略してはならない',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'対象シフト（shiftId）が未特定など情報不足時は、proposeShiftChange を無理に呼び出さず、必要な確認質問のみを行ってよい',
				),
			}),
		);
	});

	it('SYSTEM_PROMPT にツール未実行時の成功断言禁止ルールを含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-ai-response-format': 'uimessage',
			},
			body: JSON.stringify({
				messages: [{ role: 'user', content: '対応を完了して' }],
				context: {
					shifts: [
						{
							id: TEST_IDS.SCHEDULE_1,
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
							date: '2026-03-16',
							startTime: '09:00',
							endTime: '10:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'ツール未実行の状態で、処理が完了した・確定した・変更できた等の成功断言をしてはならない',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'対象シフト（shiftId）が未特定など情報不足時は、proposeShiftChange を無理に呼び出さず、必要な確認質問のみを行ってよい',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'proposeShiftChange 呼び出し後は、まだ未確定であることを明示し、UI の確定操作（例: 確定ボタン）で確定するよう案内する',
				),
			}),
		);
	});

	it('SYSTEM_PROMPT にツール失敗時の成功断言禁止ルールを含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: '失敗時の案内を確認して' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'ツール実行が失敗した場合、成功断言をしてはならない',
				),
			}),
		);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'失敗した事実を必ず明示し、再実行（リトライ）または次に取るべき具体的アクションへ誘導する',
				),
			}),
		);
	});

	it('SYSTEM_PROMPT にツール成功時のみ成功断言を許可するルールを含める', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: '成功時のルールを確認して' }],
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		expect(mockStreamText).toHaveBeenCalledWith(
			expect.objectContaining({
				system: expect.stringContaining(
					'ツール実行が成功した場合に限り、成功断言を許可する',
				),
			}),
		);
	});

	it('複数シフトの場合は単一シフト向けの確認不要指示を含めない', async () => {
		const request = new Request('http://localhost/api/chat/shift-adjustment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [{ role: 'user', content: '対象を調整して' }],
				context: {
					shifts: [
						{
							id: TEST_IDS.SCHEDULE_1,
							clientId: TEST_IDS.CLIENT_1,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
							staffName: 'スタッフA',
							clientName: '利用者B',
							date: '2025-01-20',
							startTime: '09:00',
							endTime: '11:00',
						},
						{
							id: TEST_IDS.SCHEDULE_2,
							clientId: TEST_IDS.CLIENT_2,
							serviceTypeId: TEST_IDS.SERVICE_TYPE_2,
							staffName: 'スタッフC',
							clientName: '利用者D',
							date: '2025-01-21',
							startTime: '10:00',
							endTime: '12:00',
						},
					],
				},
			}),
		});

		const response = await POST(request);

		expect(response.status).toBe(200);
		const streamTextCall = mockStreamText.mock.calls[0]?.[0];
		expect(streamTextCall.system).toContain(
			'どのシフトを対象にするかをユーザーに確認してください',
		);
		expect(streamTextCall.system).not.toContain(
			'このシフトを対象として扱い、日時・サービス内容・利用者の追加確認は行わないでください',
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
					headers: {
						'Content-Type': 'application/json',
						'x-ai-response-format': 'uimessage',
					},
					body: JSON.stringify({
						messages: [
							{ role: 'user', content: '明日9時に空いているヘルパーを探して' },
						],
						context: {
							shifts: [
								{
									id: TEST_IDS.SCHEDULE_1,
									clientId: TEST_IDS.CLIENT_1,
									serviceTypeId: 'physical-care',
									date: '2026-03-16',
									startTime: '09:00',
									endTime: '10:00',
								},
							],
						},
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
						proposeShiftChange: expect.anything(),
					}),
					stopWhen: expect.anything(),
				}),
			);
			expect(mockConvertToModelMessages).toHaveBeenCalledTimes(1);
			expect(mockStepCountIs).toHaveBeenCalledWith(5);
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

		it('proposeShiftChange tool は context.shifts の shiftId allowlist を検証する', async () => {
			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-ai-response-format': 'uimessage',
					},
					body: JSON.stringify({
						messages: [{ role: 'user', content: '提案して' }],
						context: {
							shifts: [
								{
									id: TEST_IDS.SCHEDULE_1,
									clientId: TEST_IDS.CLIENT_1,
									serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
									date: '2025-01-20',
									startTime: '09:00',
									endTime: '10:00',
								},
							],
						},
					}),
				},
			);

			await POST(request);

			const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
				tools?: {
					proposeShiftChange?: {
						execute?: (input: {
							type: 'change_shift_staff';
							shiftId: string;
							toStaffId: string;
						}) => Promise<unknown>;
					};
				};
			};

			expect(streamTextCall.tools?.proposeShiftChange).toBeDefined();
			const execute = streamTextCall.tools?.proposeShiftChange?.execute;
			expect(execute).toBeDefined();

			await expect(
				execute?.({
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_2,
					toStaffId: TEST_IDS.STAFF_1,
				}),
			).rejects.toThrow('シフトIDが不正です');

			await expect(
				execute?.({
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_1,
				}),
			).resolves.toEqual({
				proposal: {
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_1,
				},
			});

			expect(mockSupabaseFrom).toHaveBeenCalledWith('shifts');
			expect(mockShiftSelect).toHaveBeenCalledWith('id');
			expect(mockShiftEq).toHaveBeenCalledWith('id', TEST_IDS.SCHEDULE_1);
		});

		it('proposeShiftChange tool の allowlist 違反時に診断ログを構造化で出力する', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-ai-response-format': 'uimessage',
					},
					body: JSON.stringify({
						messages: [{ role: 'user', content: '提案して' }],
						context: {
							shifts: [
								{
									id: TEST_IDS.SCHEDULE_1,
									clientId: TEST_IDS.CLIENT_1,
									serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
									date: '2025-01-20',
									startTime: '09:00',
									endTime: '10:00',
								},
							],
						},
					}),
				},
			);

			await POST(request);

			const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
				tools?: {
					proposeShiftChange?: {
						execute?: (input: {
							type: 'change_shift_staff';
							shiftId: string;
							toStaffId: string;
						}) => Promise<unknown>;
					};
				};
			};

			await expect(
				streamTextCall.tools?.proposeShiftChange?.execute?.({
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_2,
					toStaffId: TEST_IDS.STAFF_1,
				}),
			).rejects.toThrow('シフトIDが不正です');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					endpoint: '/api/chat/shift-adjustment',
					method: 'POST',
					errorType: 'allowlist_violation',
					toolName: 'proposeShiftChange',
					proposalShiftId: TEST_IDS.SCHEDULE_2,
				}),
			);

			consoleErrorSpy.mockRestore();
		});

		it('AI_CHAT_VERBOSE_LOG 未設定時、診断ログの shiftIds は最大 3 件に抑制される', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);

			const previous = process.env.AI_CHAT_VERBOSE_LOG;
			delete process.env.AI_CHAT_VERBOSE_LOG;

			try {
				const shifts = [
					{
						id: TEST_IDS.SCHEDULE_1,
						clientId: TEST_IDS.CLIENT_1,
						serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
						date: '2025-01-20',
						startTime: '09:00',
						endTime: '10:00',
					},
					...Array.from({ length: 9 }, () => ({
						id: createTestId(),
						clientId: TEST_IDS.CLIENT_1,
						serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
						date: '2025-01-20',
						startTime: '09:00',
						endTime: '10:00',
					})),
				];

				const request = new Request(
					'http://localhost/api/chat/shift-adjustment',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-ai-response-format': 'uimessage',
						},
						body: JSON.stringify({
							messages: [{ role: 'user', content: '提案して' }],
							context: { shifts },
						}),
					},
				);

				await POST(request);

				const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
					tools?: {
						proposeShiftChange?: {
							execute?: (input: {
								type: 'change_shift_staff';
								shiftId: string;
								toStaffId: string;
							}) => Promise<unknown>;
						};
					};
				};

				await expect(
					streamTextCall.tools?.proposeShiftChange?.execute?.({
						type: 'change_shift_staff',
						shiftId: TEST_IDS.SCHEDULE_2,
						toStaffId: TEST_IDS.STAFF_1,
					}),
				).rejects.toThrow('シフトIDが不正です');

				const allowlistLog = consoleErrorSpy.mock.calls
					.map((args) => args[1])
					.find(
						(payload) =>
							typeof payload === 'object' &&
							payload !== null &&
							'errorType' in payload &&
							(payload as { errorType?: unknown }).errorType ===
								'allowlist_violation',
					) as { shiftIds?: string[]; shiftsCount?: number } | undefined;

				expect(allowlistLog?.shiftsCount).toBe(shifts.length);
				expect(allowlistLog?.shiftIds).toHaveLength(3);
			} finally {
				if (previous === undefined) {
					delete process.env.AI_CHAT_VERBOSE_LOG;
				} else {
					process.env.AI_CHAT_VERBOSE_LOG = previous;
				}
				consoleErrorSpy.mockRestore();
			}
		});

		it('AI_CHAT_VERBOSE_LOG=true のとき、診断ログの shiftIds は最大 10 件まで出力される', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);

			const previous = process.env.AI_CHAT_VERBOSE_LOG;
			process.env.AI_CHAT_VERBOSE_LOG = 'true';

			try {
				const shifts = [
					{
						id: TEST_IDS.SCHEDULE_1,
						clientId: TEST_IDS.CLIENT_1,
						serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
						date: '2025-01-20',
						startTime: '09:00',
						endTime: '10:00',
					},
					...Array.from({ length: 9 }, () => ({
						id: createTestId(),
						clientId: TEST_IDS.CLIENT_1,
						serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
						date: '2025-01-20',
						startTime: '09:00',
						endTime: '10:00',
					})),
				];

				const request = new Request(
					'http://localhost/api/chat/shift-adjustment',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-ai-response-format': 'uimessage',
						},
						body: JSON.stringify({
							messages: [{ role: 'user', content: '提案して' }],
							context: { shifts },
						}),
					},
				);

				await POST(request);

				const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
					tools?: {
						proposeShiftChange?: {
							execute?: (input: {
								type: 'change_shift_staff';
								shiftId: string;
								toStaffId: string;
							}) => Promise<unknown>;
						};
					};
				};

				await expect(
					streamTextCall.tools?.proposeShiftChange?.execute?.({
						type: 'change_shift_staff',
						shiftId: TEST_IDS.SCHEDULE_2,
						toStaffId: TEST_IDS.STAFF_1,
					}),
				).rejects.toThrow('シフトIDが不正です');

				const allowlistLog = consoleErrorSpy.mock.calls
					.map((args) => args[1])
					.find(
						(payload) =>
							typeof payload === 'object' &&
							payload !== null &&
							'errorType' in payload &&
							(payload as { errorType?: unknown }).errorType ===
								'allowlist_violation',
					) as { shiftIds?: string[]; shiftsCount?: number } | undefined;

				expect(allowlistLog?.shiftsCount).toBe(shifts.length);
				expect(allowlistLog?.shiftIds).toHaveLength(10);
			} finally {
				if (previous === undefined) {
					delete process.env.AI_CHAT_VERBOSE_LOG;
				} else {
					process.env.AI_CHAT_VERBOSE_LOG = previous;
				}
				consoleErrorSpy.mockRestore();
			}
		});

		it('診断ログに requestId として x-request-id を含める', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);
			const requestId = 'req-150-test-id';

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-ai-response-format': 'uimessage',
						'x-request-id': requestId,
					},
					body: JSON.stringify({
						messages: [{ role: 'user', content: '提案して' }],
						context: {
							shifts: [
								{
									id: TEST_IDS.SCHEDULE_1,
									clientId: TEST_IDS.CLIENT_1,
									serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
									date: '2025-01-20',
									startTime: '09:00',
									endTime: '10:00',
								},
							],
						},
					}),
				},
			);

			await POST(request);

			const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
				tools?: {
					proposeShiftChange?: {
						execute?: (input: {
							type: 'change_shift_staff';
							shiftId: string;
							toStaffId: string;
						}) => Promise<unknown>;
					};
				};
			};

			await expect(
				streamTextCall.tools?.proposeShiftChange?.execute?.({
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_2,
					toStaffId: TEST_IDS.STAFF_1,
				}),
			).rejects.toThrow('シフトIDが不正です');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					endpoint: '/api/chat/shift-adjustment',
					method: 'POST',
					requestId,
				}),
			);

			consoleErrorSpy.mockRestore();
		});

		it('診断ログに本文の PII が含まれない', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-ai-response-format': 'uimessage',
					},
					body: JSON.stringify({
						messages: [{ role: 'user', content: SECRET_PII_MARKER }],
						context: {
							shifts: [
								{
									id: TEST_IDS.SCHEDULE_1,
									clientId: TEST_IDS.CLIENT_1,
									serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
									date: '2025-01-20',
									startTime: '09:00',
									endTime: '10:00',
								},
							],
						},
					}),
				},
			);

			await POST(request);

			const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
				tools?: {
					proposeShiftChange?: {
						execute?: (input: {
							type: 'change_shift_staff';
							shiftId: string;
							toStaffId: string;
						}) => Promise<unknown>;
					};
				};
			};

			await expect(
				streamTextCall.tools?.proposeShiftChange?.execute?.({
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_2,
					toStaffId: TEST_IDS.STAFF_1,
				}),
			).rejects.toThrow('シフトIDが不正です');

			const loggedText = consoleErrorSpy.mock.calls
				.flatMap((args) => args.map((arg) => JSON.stringify(arg)))
				.join('\n');
			expect(loggedText).not.toContain(SECRET_PII_MARKER);

			consoleErrorSpy.mockRestore();
		});

		it('proposeShiftChange tool は shift がDBに存在しない場合エラーを返す', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);
			mockShiftMaybeSingle.mockResolvedValue({ data: null, error: null });

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-ai-response-format': 'uimessage',
					},
					body: JSON.stringify({
						messages: [{ role: 'user', content: '提案して' }],
						context: {
							shifts: [
								{
									id: TEST_IDS.SCHEDULE_1,
									clientId: TEST_IDS.CLIENT_1,
									serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
									date: '2025-01-20',
									startTime: '09:00',
									endTime: '10:00',
								},
							],
						},
					}),
				},
			);

			await POST(request);

			const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
				tools?: {
					proposeShiftChange?: {
						execute?: (input: {
							type: 'change_shift_staff';
							shiftId: string;
							toStaffId: string;
						}) => Promise<unknown>;
					};
				};
			};

			const execute = streamTextCall.tools?.proposeShiftChange?.execute;
			await expect(
				execute?.({
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_1,
				}),
			).rejects.toThrow(
				'指定されたシフトを確認できませんでした。対象シフトを確認して再度お試しください。',
			);
			expect(consoleErrorSpy.mock.calls.at(-1)?.[1]).toEqual(
				expect.objectContaining({ errorType: 'shift_verification_failed' }),
			);
			consoleErrorSpy.mockRestore();
		});

		it('proposeShiftChange tool は shift 取得エラー時にログを残して汎用エラーを返す', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);
			mockShiftMaybeSingle.mockResolvedValue({
				data: null,
				error: { message: 'network error', code: '57014' },
			});

			const request = new Request(
				'http://localhost/api/chat/shift-adjustment',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-ai-response-format': 'uimessage',
					},
					body: JSON.stringify({
						messages: [{ role: 'user', content: '提案して' }],
						context: {
							shifts: [
								{
									id: TEST_IDS.SCHEDULE_1,
									clientId: TEST_IDS.CLIENT_1,
									serviceTypeId: TEST_IDS.SERVICE_TYPE_1,
									date: '2025-01-20',
									startTime: '09:00',
									endTime: '10:00',
								},
							],
						},
					}),
				},
			);

			await POST(request);

			const streamTextCall = mockStreamText.mock.calls.at(-1)?.[0] as {
				tools?: {
					proposeShiftChange?: {
						execute?: (input: {
							type: 'change_shift_staff';
							shiftId: string;
							toStaffId: string;
						}) => Promise<unknown>;
					};
				};
			};

			const execute = streamTextCall.tools?.proposeShiftChange?.execute;
			await expect(
				execute?.({
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_1,
				}),
			).rejects.toThrow(
				'対象シフトの確認中にエラーが発生しました。時間をおいて再度お試しください。',
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to verify shift in proposeShiftChange tool',
				expect.objectContaining({
					endpoint: '/api/chat/shift-adjustment',
					method: 'POST',
					errorType: 'shift_verification_failed',
					message:
						'対象シフトの確認中にエラーが発生しました。時間をおいて再度お試しください。',
					stack: expect.any(String),
					shiftErrorCode: '57014',
				}),
			);
			consoleErrorSpy.mockRestore();
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

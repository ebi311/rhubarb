import { createProcessStaffAbsenceTool } from '@/backend/tools/processStaffAbsence';
import { createSearchAvailableHelpersTool } from '@/backend/tools/searchAvailableHelpers';
import { createSearchStaffsTool } from '@/backend/tools/searchStaffs';
import { createJstDateStringSchema } from '@/models/valueObjects/jstDate';
import {
	ServiceTypeIdSchema,
	ServiceTypeLabels,
} from '@/models/valueObjects/serviceTypeId';
import { createSupabaseClient } from '@/utils/supabase/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { stepCountIs, streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// AI SDK v6 の UIMessage 形式（parts 配列）をサポート
const CHAT_MESSAGE_CONTENT_MAX_LENGTH = 10000;
const CHAT_MESSAGE_PARTS_MAX_COUNT = 50;

const TextPartSchema = z.object({
	type: z.literal('text'),
	text: z.string().max(CHAT_MESSAGE_CONTENT_MAX_LENGTH),
});

const NonTextPartSchema = z
	.object({
		type: z.string().min(1),
	})
	.strip()
	.refine((part) => part.type !== 'text', {
		message: "Part type must not be 'text'",
	});

const MessagePartSchema = z.union([TextPartSchema, NonTextPartSchema]);

// Vercel AI SDK v6 は parts 配列形式でメッセージを送信
const ChatMessageSchema = z
	.object({
		role: z.enum(['user', 'assistant']),
		// v6: parts 配列形式（content は後方互換性のため optional）
		parts: z
			.array(MessagePartSchema)
			.max(CHAT_MESSAGE_PARTS_MAX_COUNT)
			.optional(),
		content: z.string().max(CHAT_MESSAGE_CONTENT_MAX_LENGTH).optional(),
	})
	.refine(
		(message) => {
			if (!message.parts?.length) {
				return true;
			}

			const totalTextLength = message.parts.reduce((sum, part) => {
				if (part.type !== 'text' || !('text' in part)) {
					return sum;
				}

				return sum + part.text.length;
			}, 0);

			return totalTextLength <= CHAT_MESSAGE_CONTENT_MAX_LENGTH;
		},
		{
			message: `Total text length in parts must be at most ${CHAT_MESSAGE_CONTENT_MAX_LENGTH} characters`,
			path: ['parts'],
		},
	);

// メッセージからテキストコンテンツを抽出
const extractContent = (msg: z.infer<typeof ChatMessageSchema>): string => {
	if (!msg.parts?.length) {
		return msg.content ?? '';
	}

	const textFromParts = msg.parts
		.flatMap((part) =>
			part.type === 'text' && 'text' in part && typeof part.text === 'string'
				? [part.text]
				: [],
		)
		.join('');

	return textFromParts || msg.content || '';
};

const SHIFT_CONTEXT_TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const toMinutesFromTime = (time: string): number => {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
};

const ShiftContextItemSchema = z
	.object({
		id: z.string().uuid(),
		clientId: z.string().uuid(),
		serviceTypeId: ServiceTypeIdSchema,
		staffName: z.string().optional(),
		clientName: z.string().optional(),
		date: createJstDateStringSchema({
			formatMessage: 'date must be in YYYY-MM-DD format',
			invalidDateMessage: 'date must be a valid date',
		}),
		startTime: z.string().regex(SHIFT_CONTEXT_TIME_REGEX, {
			message: 'startTime must be in HH:mm format',
		}),
		endTime: z.string().regex(SHIFT_CONTEXT_TIME_REGEX, {
			message: 'endTime must be in HH:mm format',
		}),
	})
	.refine(
		(shift) =>
			toMinutesFromTime(shift.startTime) < toMinutesFromTime(shift.endTime),
		{
			message: 'startTime must be earlier than endTime',
			path: ['endTime'],
		},
	);

const ChatRequestSchema = z.object({
	messages: z.array(ChatMessageSchema).min(1).max(50),
	context: z
		.object({
			shifts: z.array(ShiftContextItemSchema).max(10).optional(),
		})
		.optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

const SERVICE_TYPE_LABELS_PROMPT = Object.entries(ServiceTypeLabels)
	.map(([serviceTypeId, label]) => `- ${serviceTypeId}: ${label}`)
	.join('\n');

const SYSTEM_PROMPT = `あなたは訪問介護事業所のシフト調整をサポートするAIアシスタントです。

## あなたの役割
- スタッフの急な休み、利用者の予定変更などに対応したシフト調整の提案
- シフトの重複や空き時間の確認
- 代替スタッフの候補提案

## 対応方針
1. まず状況を正確に把握する
2. 影響を受けるシフトを特定する
3. 実行可能な調整案を提示する
4. 各案のメリット・デメリットを説明する

## サービス種別IDと表示名の対応
${SERVICE_TYPE_LABELS_PROMPT}

## 利用可能なツール
- searchAvailableHelpers: 指定した日時に空きのあるヘルパーを検索できます
  - 代替スタッフを探す際に使用してください
  - date は日付(YYYY-MM-DD)、startTime / endTime は { hour, minute } 形式のオブジェクトで指定します
    - 例: { date: "2024-04-01", startTime: { hour: 9, minute: 0 }, endTime: { hour: 10, minute: 0 } }
  - clientId を指定する場合は、必ず対応する serviceTypeId（サービス種別ID）も一緒に指定してください
    - 例: { clientId: "<利用者ID>", serviceTypeId: "<サービス種別ID>" }
  - 対象シフトが1件に特定できる場合（context.shifts が1件）は、ユーザーに確認せず clientId / serviceTypeId を直接ツール呼び出しに使用してください
  - 対象シフトが複数ある場合は、どのシフトを対象にするかをユーザーに確認してからツールを呼び出してください
- processStaffAbsence: スタッフの欠勤を登録し、影響シフトと代替候補を取得します
  - スタッフが休みになった場合に使用してください
  - staffId（UUID）、startDate、endDate（YYYY-MM-DD）を指定します
  - 最大14日間まで指定可能です
  - 任意項目 memo には、可能な限り欠勤理由や補足情報を日本語で簡潔に記載してください
    - 例: { staffId: "<スタッフID>", startDate: "2024-04-01", endDate: "2024-04-03", memo: "体調不良のため" }
- searchStaffs: スタッフを名前で検索します
  - スタッフIDがわからない場合に使用してください
  - 入力: { query: "検索文字列" }
  - 出力: { staffs: [{ id, name, role, serviceTypeIds }] }
  - processStaffAbsence と連携する場合、検索結果の id を staffId として使用してください
    - 例: { query: "田中" }

## 制約
- 提案は具体的かつ実行可能なものにする
- 不明な点があれば確認を求める
- スタッフや利用者の負担を考慮する
- シフト変更の提案を出す場合は、必ず assistant メッセージ内に 1 つの \`\`\`json コードブロックを含める
- JSON は次のいずれか 1 つの形式に厳密に従う
  - { "type": "change_shift_staff", "shiftId": "<UUID>", "toStaffId": "<UUID>", "reason": "<任意の理由>" }
  - { "type": "update_shift_time", "shiftId": "<UUID>", "startAt": "<ISO datetime>", "endAt": "<ISO datetime>", "reason": "<任意の理由>" }

日本語で丁寧に対応してください。`;

const buildContextPrompt = (context: ChatRequest['context']): string => {
	if (!context?.shifts?.length) {
		return '';
	}

	const shiftLines = context.shifts.map((s) => {
		const serviceTypeLabel = ServiceTypeLabels[s.serviceTypeId];

		return `- ${s.date} ${s.startTime}〜${s.endTime}: ${s.clientName ?? '(利用者不明)'} / ${s.staffName ?? '(未割当)'} (${serviceTypeLabel}（serviceTypeId: ${s.serviceTypeId}）, clientId: ${s.clientId})`;
	});

	const shiftSelectionPrompt =
		context.shifts.length === 1
			? `

## 対象シフトの扱い（重要）
- context.shifts[0] が今回の対象シフトです。
- このシフトを対象として扱い、日時・サービス内容・利用者の追加確認は行わないでください。
- context.shifts[0] の date / clientId / serviceTypeId をそのまま tool 入力に使用してください。
- startTime / endTime は文字列（例: "09:00"）を { hour, minute } オブジェクトに変換して tool 入力してください。
  例: "09:00" → { hour: 9, minute: 0 }、"10:30" → { hour: 10, minute: 30 }
- ユーザーが代替ヘルパーの提案・空きヘルパーの探索を求めている場合は、追加質問なしで即座に searchAvailableHelpers を呼び出してください。`
			: `

## 対象シフトの確認（重要）
- context.shifts に複数シフトがあるため、どのシフトを対象にするかをユーザーに確認してください。`;

	return `

## 現在のシフト情報
${shiftLines.join('\n')}${shiftSelectionPrompt}`;
};

export const POST = async (request: Request): Promise<Response> => {
	try {
		// 認証チェック
		const supabase = await createSupabaseClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json().catch(() => null);

		if (!body) {
			return NextResponse.json(
				{ error: 'Invalid JSON in request body' },
				{ status: 400 },
			);
		}

		const parseResult = ChatRequestSchema.safeParse(body);

		if (!parseResult.success) {
			return NextResponse.json(
				{ error: 'Invalid request', issues: parseResult.error.issues },
				{ status: 400 },
			);
		}

		const { messages, context } = parseResult.data;

		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			console.error('GEMINI_API_KEY is not configured');
			return NextResponse.json(
				{ error: 'AI service is not configured' },
				{ status: 500 },
			);
		}

		// スタッフの office_id と role を取得（Tool と認可で必要）
		const { data: staffData, error: staffError } = await supabase
			.from('staffs')
			.select('office_id, role')
			.eq('auth_user_id', user.id)
			.maybeSingle<{ office_id: string; role: 'admin' | 'helper' }>();

		if (staffError) {
			console.error('Failed to fetch staff:', staffError);
			return NextResponse.json(
				{ error: 'Failed to resolve staff context' },
				{ status: 500 },
			);
		}

		if (!staffData) {
			return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
		}

		// 認可チェック: admin ロールのみ許可
		if (staffData.role !== 'admin') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const systemPrompt = SYSTEM_PROMPT + buildContextPrompt(context);

		// GEMINI_API_KEY を使用して Google AI プロバイダーを初期化
		const google = createGoogleGenerativeAI({ apiKey });

		// Tool を作成
		const searchAvailableHelpersTool = createSearchAvailableHelpersTool({
			supabase,
			officeId: staffData.office_id,
		});
		const processStaffAbsenceTool = createProcessStaffAbsenceTool({
			supabase,
			userId: user.id,
		});
		const searchStaffsTool = createSearchStaffsTool({
			supabase,
			officeId: staffData.office_id,
		});

		// Vercel AI SDK の streamText を使用
		// messages の型は streamText が受け入れる形式に変換
		// v6: parts 配列または content から文字列を抽出
		const result = streamText({
			model: google('gemini-2.5-flash'),
			system: systemPrompt,
			messages: messages.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: extractContent(m),
			})),
			tools: {
				searchAvailableHelpers: searchAvailableHelpersTool,
				processStaffAbsence: processStaffAbsenceTool,
				searchStaffs: searchStaffsTool,
			},
			stopWhen: stepCountIs(3),
		});

		// テキストストリームレスポンスを返す（TextStreamChatTransport 用）
		return result.toTextStreamResponse();
	} catch (error) {
		console.error('Chat API error:', error);
		// 内部エラーの詳細はクライアントに露出しない
		return NextResponse.json(
			{ error: 'Failed to process chat request' },
			{ status: 500 },
		);
	}
};

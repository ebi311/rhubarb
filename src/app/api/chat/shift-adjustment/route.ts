import { createSupabaseClient } from '@/utils/supabase/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// AI SDK v6 の UIMessage 形式（parts 配列）をサポート
const TextPartSchema = z.object({
	type: z.literal('text'),
	text: z.string(),
});

// Vercel AI SDK v6 は parts 配列形式でメッセージを送信
const ChatMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	// v6: parts 配列形式（content は後方互換性のため optional）
	parts: z.array(TextPartSchema).optional(),
	content: z.string().max(10000).optional(),
});

// メッセージからテキストコンテンツを抽出
const extractContent = (msg: z.infer<typeof ChatMessageSchema>): string => {
	// parts 配列がある場合はそこからテキストを抽出
	if (msg.parts && msg.parts.length > 0) {
		return msg.parts
			.filter((p) => p.type === 'text')
			.map((p) => p.text)
			.join('');
	}
	// fallback: content フィールド
	return msg.content ?? '';
};

const ShiftContextItemSchema = z.object({
	id: z.string().uuid(),
	staffName: z.string().optional(),
	clientName: z.string().optional(),
	date: z.string(),
	startTime: z.string(),
	endTime: z.string(),
});

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

## 制約
- 提案は具体的かつ実行可能なものにする
- 不明な点があれば確認を求める
- スタッフや利用者の負担を考慮する

日本語で丁寧に対応してください。`;

const buildContextPrompt = (context: ChatRequest['context']): string => {
	if (!context?.shifts?.length) {
		return '';
	}

	const shiftLines = context.shifts.map(
		(s) =>
			`- ${s.date} ${s.startTime}〜${s.endTime}: ${s.clientName ?? '(利用者不明)'} / ${s.staffName ?? '(未割当)'}`,
	);

	return `\n\n## 現在のシフト情報\n${shiftLines.join('\n')}`;
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

		const systemPrompt = SYSTEM_PROMPT + buildContextPrompt(context);

		// GEMINI_API_KEY を使用して Google AI プロバイダーを初期化
		const google = createGoogleGenerativeAI({ apiKey });

		// Vercel AI SDK の streamText を使用
		// messages の型は streamText が受け入れる形式に変換
		// v6: parts 配列または content から文字列を抽出
		const result = streamText({
			model: google('gemini-3-flash'),
			system: systemPrompt,
			messages: messages.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: extractContent(m),
			})),
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

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ChatMessageSchema = z.object({
	role: z.enum(['user', 'assistant', 'system']),
	content: z.string().min(1),
});

const ShiftContextItemSchema = z.object({
	id: z.string(),
	staffName: z.string().optional(),
	clientName: z.string().optional(),
	date: z.string(),
	startTime: z.string(),
	endTime: z.string(),
});

const ChatRequestSchema = z.object({
	messages: z.array(ChatMessageSchema).min(1),
	context: z
		.object({
			shifts: z.array(ShiftContextItemSchema).optional(),
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

const convertToGeminiHistory = (
	messages: ChatMessage[],
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> => {
	return messages.map((msg) => ({
		role: msg.role === 'assistant' ? 'model' : 'user',
		parts: [{ text: msg.content }],
	}));
};

export const POST = async (request: Request): Promise<Response> => {
	try {
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

		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

		const systemInstruction = SYSTEM_PROMPT + buildContextPrompt(context);
		const history = convertToGeminiHistory(messages.slice(0, -1));
		const lastMessage = messages[messages.length - 1];

		const chat = model.startChat({
			history,
			systemInstruction,
		});

		const result = await chat.sendMessageStream(lastMessage.content);

		// ストリーミングレスポンスを作成
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of result.stream) {
						const text = chunk.text();
						if (text) {
							controller.enqueue(
								encoder.encode(
									`data: ${JSON.stringify({ content: text })}\n\n`,
								),
							);
						}
					}
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (error) {
					console.error('Stream error:', error);
					controller.error(error);
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream; charset=utf-8',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.error('Chat API error:', error);
		// 内部エラーの詳細はクライアントに露出しない
		return NextResponse.json(
			{ error: 'Failed to process chat request' },
			{ status: 500 },
		);
	}
};

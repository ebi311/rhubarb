import { createProcessStaffAbsenceTool } from '@/backend/tools/processStaffAbsence';
import { createSearchAvailableHelpersTool } from '@/backend/tools/searchAvailableHelpers';
import { createSearchStaffsTool } from '@/backend/tools/searchStaffs';
import { AiChatMutationProposalSchema } from '@/models/aiChatMutationProposal';
import { createJstDateStringSchema } from '@/models/valueObjects/jstDate';
import {
	ServiceTypeIdSchema,
	ServiceTypeLabels,
} from '@/models/valueObjects/serviceTypeId';
import { createSupabaseClient } from '@/utils/supabase/server';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// AI SDK v6 の UIMessage 形式（parts 配列）をサポート
const CHAT_MESSAGE_CONTENT_MAX_LENGTH = 10000;
const CHAT_MESSAGE_PARTS_MAX_COUNT = 50;
const NON_TEXT_PART_JSON_MAX_LENGTH = 20000;

const TextPartSchema = z.object({
	type: z.literal('text'),
	text: z.string().max(CHAT_MESSAGE_CONTENT_MAX_LENGTH),
});

const NonTextPartSchema = z
	.object({
		type: z.string().min(1),
	})
	.passthrough()
	.refine((part) => part.type !== 'text', {
		message: "Part type must not be 'text'",
	})
	.refine(
		(part) => JSON.stringify(part).length <= NON_TEXT_PART_JSON_MAX_LENGTH,
		{
			message: `Non-text part JSON size must be at most ${NON_TEXT_PART_JSON_MAX_LENGTH} characters`,
		},
	);

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
				if (part.type !== 'text' || typeof part.text !== 'string') {
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

type ChatErrorCode =
	| 'allowlist_violation'
	| 'shift_verification_failed'
	| 'stream_error'
	| 'unexpected_error';

type LoggedChatError = Error & {
	__logged?: boolean;
	__errorCode?: ChatErrorCode;
};

type RequestLogContext = {
	requestId: string;
	endpoint?: string;
	method?: string;
	userId?: string;
	officeId?: string;
	mode?: 'uimessage' | 'legacy';
	useProposalTool?: boolean;
	shiftsCount?: number;
	shiftIds?: string[];
	allowlistedShiftIdsSize?: number;
};

const getMaxShiftIdsInLog = (): number =>
	process.env.AI_CHAT_VERBOSE_LOG === 'true' ? 10 : 3;

const classifyError = (error: unknown): ChatErrorCode => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'__errorCode' in error &&
		typeof (error as { __errorCode?: unknown }).__errorCode === 'string'
	) {
		return (error as { __errorCode: ChatErrorCode }).__errorCode;
	}

	return 'unexpected_error';
};

const markLoggedError = (
	error: unknown,
	errorCode: ChatErrorCode,
): LoggedChatError => {
	if (error instanceof Error) {
		const typedError = error as LoggedChatError;
		typedError.__errorCode = typedError.__errorCode ?? errorCode;
		typedError.__logged = true;
		return typedError;
	}

	const wrappedError = new Error(
		typeof error === 'string' ? error : 'Unknown error',
	) as LoggedChatError;
	wrappedError.__errorCode = errorCode;
	wrappedError.__logged = true;

	return wrappedError;
};

const logChatError = (
	message: string,
	error: unknown,
	logContext: RequestLogContext,
	extra: Partial<{
		toolName: string;
		proposalShiftId: string;
		shiftErrorCode: string;
	}> = {},
): void => {
	const errorMessage =
		error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: typeof error === 'object' &&
					  error !== null &&
					  'message' in error &&
					  typeof (error as { message?: unknown }).message === 'string'
					? (error as { message: string }).message
					: 'Unknown error';

	console.error(message, {
		requestId: logContext.requestId,
		endpoint: logContext.endpoint,
		method: logContext.method,
		errorType: classifyError(error),
		message: errorMessage,
		errorMessage,
		userId: logContext.userId,
		officeId: logContext.officeId,
		mode: logContext.mode,
		useProposalTool: logContext.useProposalTool,
		shiftsCount: logContext.shiftsCount,
		shiftIds: logContext.shiftIds?.slice(0, getMaxShiftIdsInLog()),
		allowlistedShiftIdsSize: logContext.allowlistedShiftIdsSize,
		toolName: extra.toolName,
		proposalShiftId: extra.proposalShiftId,
		shiftErrorCode: extra.shiftErrorCode,
		stack: error instanceof Error ? error.stack : undefined,
	});
};

const SERVICE_TYPE_LABELS_PROMPT = Object.entries(ServiceTypeLabels)
	.map(([serviceTypeId, label]) => `- ${serviceTypeId}: ${label}`)
	.join('\n');

// ===== レガシーモード（TextStreamChatTransport 向け）=====
// x-ai-response-format: uimessage ヘッダーなし → 従来の JSON コードブロック形式

const LEGACY_PROPOSAL_TOOL_PROMPT = `
- proposeShiftChange ツールは利用できません
- シフト変更の提案を出す場合は、必ず assistant メッセージ内に 1 つの \`\`\`json コードブロックを含める
- JSON は次のいずれか 1 つの形式に厳密に従う
  - { "type": "change_shift_staff", "shiftId": "<UUID>", "toStaffId": "<UUID>", "reason": "<任意の理由>" }
  - { "type": "change_shift_staff", "shiftId": "<UUID>", "toStaffId": "<UUID>" }
  - { "type": "update_shift_time", "shiftId": "<UUID>", "startAt": "<ISO datetime with timezone offset>", "endAt": "<ISO datetime with timezone offset>", "reason": "<任意の理由>" }
  - { "type": "update_shift_time", "shiftId": "<UUID>", "startAt": "<ISO datetime with timezone offset>", "endAt": "<ISO datetime with timezone offset>" }
- reason は任意。不明なら省略し、空文字は使わない（空白のみも不可）
- update_shift_time の startAt / endAt はタイムゾーンオフセット必須（+09:00 または末尾 Z も可）

## proposal(JSON) と成功断言の区別（重要）
- proposal(JSON) の提示は成功断言ではありません
- 対象シフト（shiftId）が特定でき、シフト変更の提案を提示する段階では、proposal(JSON) の提示は必須であり、省略してはならない
- ただし対象シフト（shiftId）が未特定など情報不足時は、proposal(JSON) を無理に出力せず、必要な確認質問のみを行ってよい
- proposal(JSON) を提示した後は、まだ未確定であることを明示し、UI の確定操作（例: 確定ボタン）で確定するよう案内する`;

// ===== UIMessage モード（新クライアント向け）=====
// x-ai-response-format: uimessage ヘッダーあり → proposeShiftChange ツール使用

const PROPOSAL_TOOL_PROMPT = `
- proposeShiftChange: シフト変更提案の内容を返却します（永続化は行いません）
  - シフト変更の提案を返すときは assistant 本文に JSON を書かず、必ずこのツールを呼び出してください
  - 入力は change_shift_staff または update_shift_time の形式に厳密に従ってください

## proposeShiftChange と成功断言の区別（重要）
- proposeShiftChange の呼び出しは成功断言ではありません
- 対象シフト（shiftId）が特定でき、シフト変更の提案を提示する段階では、proposeShiftChange の呼び出し（ツール実行）は必須であり、省略してはならない
- ただし対象シフト（shiftId）が未特定など情報不足時は、proposeShiftChange を無理に呼び出さず、必要な確認質問のみを行ってよい
- proposeShiftChange 呼び出し後は、まだ未確定であることを明示し、UI の確定操作（例: 確定ボタン）で確定するよう案内する`;
const UI_MESSAGE_NO_PROPOSAL_PROMPT = `
- proposeShiftChange ツールは利用できません
- assistant 本文に JSON やコードブロックを出力してはならない
- シフト変更の提案を行う前に、必要な情報をユーザーに質問して対象シフトを特定する
- 対象シフト（shiftId）が未特定など情報不足時は、必要な確認質問のみを行う
- proposeShiftChange が使えない前提で、確定操作前の候補案は自然文で簡潔に説明する`;

const BASE_SYSTEM_PROMPT = `あなたは訪問介護事業所のシフト調整をサポートするAIアシスタントです。

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
  - 出力: { staffs: [{ staffId, name, role, serviceTypeIds }] }
  - processStaffAbsence と連携する場合、検索結果の staffId をそのまま staffId として使用してください
    - 例: { query: "田中" }`;

const COMMON_CONSTRAINTS_PROMPT = `

## 制約
- 提案は具体的かつ実行可能なものにする
- 不明な点があれば確認を求める
- スタッフや利用者の負担を考慮する`;

const SHIFT_ID_MISSING_PROMPT = `

## shiftId が不足している場合の対応（重要）
- 「システム上で shiftId を確認してください」のような丸投げをしてはならない
- UI 上の候補（日時・利用者名・スタッフ名など）を示して対象特定を促すか、会話で必要情報を聞き返してください`;

const SUCCESS_ASSERTION_PROMPT = `

## 成功断言に関する厳格ルール（必ず遵守）
- ツール未実行の状態で、処理が完了した・確定した・変更できた等の成功断言をしてはならない
- ツール実行が失敗した場合、成功断言をしてはならない
  - 失敗した事実を必ず明示し、再実行（リトライ）または次に取るべき具体的アクションへ誘導する
- ツール実行が成功した場合に限り、成功断言を許可する

日本語で丁寧に対応してください。`;

// UIMessage モードか否かに応じてシステムプロンプトを切り替える
const buildSystemPromptBase = (
	useUIMessageStream: boolean,
	useProposalTool: boolean,
): string =>
	BASE_SYSTEM_PROMPT +
	(useProposalTool
		? PROPOSAL_TOOL_PROMPT
		: useUIMessageStream
			? UI_MESSAGE_NO_PROPOSAL_PROMPT
			: LEGACY_PROPOSAL_TOOL_PROMPT) +
	COMMON_CONSTRAINTS_PROMPT +
	(useProposalTool
		? `
- シフト変更の提案は assistant の本文に JSON を直接書かず、必ず proposeShiftChange ツールを呼び出して返す
- proposeShiftChange の入力は次のいずれか 1 つの形式に厳密に従う
  - { "type": "change_shift_staff", "shiftId": "<UUID>", "toStaffId": "<UUID>", "reason": "<任意の理由>" }
  - { "type": "change_shift_staff", "shiftId": "<UUID>", "toStaffId": "<UUID>" }
  - { "type": "update_shift_time", "shiftId": "<UUID>", "startAt": "<ISO datetime with timezone offset>", "endAt": "<ISO datetime with timezone offset>", "reason": "<任意の理由>" }
  - { "type": "update_shift_time", "shiftId": "<UUID>", "startAt": "<ISO datetime with timezone offset>", "endAt": "<ISO datetime with timezone offset>" }
- reason は任意。不明なら省略し、空文字は使わない（空白のみも不可）
- update_shift_time の startAt / endAt はタイムゾーンオフセット必須（+09:00 または末尾 Z も可）
  - 例1: 2026-03-16T09:00:00+09:00
  - 例2: 2026-03-16T00:00:00Z`
		: '') +
	SHIFT_ID_MISSING_PROMPT +
	SUCCESS_ASSERTION_PROMPT;

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

const createProposeShiftChangeTool = (
	supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
	shifts: Array<{ id: string }> | undefined,
	logContext: RequestLogContext,
) => {
	const allowlistedShiftIds = new Set((shifts ?? []).map((shift) => shift.id));
	logContext.allowlistedShiftIdsSize = allowlistedShiftIds.size;

	return tool({
		description:
			'シフト変更提案の内容を返却します（永続化は行いません）。shiftId は context.shifts に含まれる値のみ指定できます。',
		inputSchema: AiChatMutationProposalSchema,
		execute: async (proposal) => {
			if (!allowlistedShiftIds.has(proposal.shiftId)) {
				const allowlistError = new Error(
					'シフトIDが不正です。候補に含まれているシフトから選択してください。',
				) as LoggedChatError;
				allowlistError.__errorCode = 'allowlist_violation';
				allowlistError.__logged = true;
				logChatError('AI chat tool error', allowlistError, logContext, {
					toolName: 'proposeShiftChange',
					proposalShiftId: proposal.shiftId,
				});
				throw allowlistError;
			}

			const { data: shiftData, error: shiftError } = await supabase
				.from('shifts')
				.select('id')
				.eq('id', proposal.shiftId)
				.maybeSingle<{ id: string }>();
			if (shiftError) {
				const verificationError = new Error(
					'対象シフトの確認中にエラーが発生しました。時間をおいて再度お試しください。',
				) as LoggedChatError;
				verificationError.__errorCode = 'shift_verification_failed';
				verificationError.__logged = true;
				logChatError(
					'Failed to verify shift in proposeShiftChange tool',
					verificationError,
					logContext,
					{
						toolName: 'proposeShiftChange',
						proposalShiftId: proposal.shiftId,
						shiftErrorCode: shiftError.code,
					},
				);
				throw verificationError;
			}

			if (!shiftData) {
				const shiftNotFoundError = new Error(
					'指定されたシフトを確認できませんでした。対象シフトを確認して再度お試しください。',
				) as LoggedChatError;
				shiftNotFoundError.__errorCode = 'shift_verification_failed';
				shiftNotFoundError.__logged = true;
				logChatError(
					'Shift not found in proposeShiftChange tool',
					shiftNotFoundError,
					logContext,
					{
						toolName: 'proposeShiftChange',
						proposalShiftId: proposal.shiftId,
					},
				);
				throw shiftNotFoundError;
			}

			return { proposal };
		},
	});
};

const normalizeMessages = (
	messages: ChatMessage[],
): Parameters<typeof convertToModelMessages>[0] =>
	messages.map((m) => ({ ...m, parts: m.parts ?? [] })) as Parameters<
		typeof convertToModelMessages
	>[0];

type AdminStaffResult =
	| { ok: true; staffData: { office_id: string; role: 'admin' | 'helper' } }
	| { ok: false; response: Response };

type ParseChatRequestResult =
	| { ok: true; data: ChatRequest }
	| { ok: false; response: Response };

type AuthenticatedUserResult =
	| {
			ok: true;
			supabase: Awaited<ReturnType<typeof createSupabaseClient>>;
			user: { id: string };
	  }
	| { ok: false; response: Response };

const getAuthenticatedUser = async (): Promise<AuthenticatedUserResult> => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return {
			ok: false,
			response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
		};
	}

	return { ok: true, supabase, user: { id: user.id } };
};

type ApiKeyResult =
	| { ok: true; apiKey: string }
	| { ok: false; response: Response };

const getApiKey = (): ApiKeyResult => {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		console.error('GEMINI_API_KEY is not configured');
		return {
			ok: false,
			response: NextResponse.json(
				{ error: 'AI service is not configured' },
				{ status: 500 },
			),
		};
	}

	return { ok: true, apiKey };
};

const parseChatRequest = async (
	request: Request,
): Promise<ParseChatRequestResult> => {
	const body = await request.json().catch(() => null);

	if (!body) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: 'Invalid JSON in request body' },
				{ status: 400 },
			),
		};
	}

	const parseResult = ChatRequestSchema.safeParse(body);

	if (!parseResult.success) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: 'Invalid request', issues: parseResult.error.issues },
				{ status: 400 },
			),
		};
	}

	return { ok: true, data: parseResult.data };
};

const fetchAdminStaff = async (
	supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
	userId: string,
): Promise<AdminStaffResult> => {
	const { data: staffData, error: staffError } = await supabase
		.from('staffs')
		.select('office_id, role')
		.eq('auth_user_id', userId)
		.maybeSingle<{ office_id: string; role: 'admin' | 'helper' }>();

	if (staffError) {
		console.error('Failed to fetch staff:', staffError);
		return {
			ok: false,
			response: NextResponse.json(
				{ error: 'Failed to resolve staff context' },
				{ status: 500 },
			),
		};
	}

	if (!staffData) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: 'Staff not found' },
				{ status: 404 },
			),
		};
	}

	if (staffData.role !== 'admin') {
		return {
			ok: false,
			response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
		};
	}

	return { ok: true, staffData };
};

const buildTools = (
	supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
	baseTools: {
		searchAvailableHelpers: ReturnType<typeof createSearchAvailableHelpersTool>;
		processStaffAbsence: ReturnType<typeof createProcessStaffAbsenceTool>;
		searchStaffs: ReturnType<typeof createSearchStaffsTool>;
	},
	shifts: Array<{ id: string }> | undefined,
	useProposalTool: boolean,
	logContext: RequestLogContext,
) => {
	// UIMessage モードかつ context.shifts が存在する場合のみ proposeShiftChange ツールを提供する。
	// 1) レガシークライアントは JSON コードブロック方式を使うためツール不要
	// 2) allowlist が空の状態で提供すると LLM が常に失敗し無限ループする恐れがあるため
	const shiftList = shifts ?? [];
	if (!useProposalTool || shiftList.length === 0) {
		return baseTools;
	}

	return {
		...baseTools,
		proposeShiftChange: createProposeShiftChangeTool(
			supabase,
			shiftList,
			logContext,
		),
	};
};

const resolveStreamMode = (
	request: Request,
	context: ChatRequest['context'],
) => {
	const useUIMessageStream =
		request.headers.get('x-ai-response-format') === 'uimessage';
	const useProposalTool =
		useUIMessageStream && (context?.shifts?.length ?? 0) > 0;

	return {
		useUIMessageStream,
		useProposalTool,
		systemPrompt:
			buildSystemPromptBase(useUIMessageStream, useProposalTool) +
			buildContextPrompt(context),
	};
};

const toChatResponse = (
	result: {
		toUIMessageStreamResponse: () => Response;
		toTextStreamResponse: () => Response;
	},
	useUIMessageStream: boolean,
): Response => {
	if (useUIMessageStream) {
		return result.toUIMessageStreamResponse();
	}

	return result.toTextStreamResponse();
};

const handlePost = async (
	request: Request,
	logContext: RequestLogContext,
): Promise<Response> => {
	const authResult = await getAuthenticatedUser();
	if (!authResult.ok) {
		return authResult.response;
	}
	const { supabase, user } = authResult;
	logContext.userId = user.id;

	const parsedRequest = await parseChatRequest(request);
	if (!parsedRequest.ok) {
		return parsedRequest.response;
	}

	const { messages, context } = parsedRequest.data;
	const shiftIds = (context?.shifts ?? []).map((shift) => shift.id);
	logContext.shiftsCount = shiftIds.length;
	logContext.shiftIds = shiftIds;

	const apiKeyResult = getApiKey();
	if (!apiKeyResult.ok) {
		return apiKeyResult.response;
	}
	const { apiKey } = apiKeyResult;

	const staffResult = await fetchAdminStaff(supabase, user.id);
	if (!staffResult.ok) {
		return staffResult.response;
	}
	const { staffData } = staffResult;
	logContext.officeId = staffData.office_id;

	const { useUIMessageStream, useProposalTool, systemPrompt } =
		resolveStreamMode(request, context);
	logContext.mode = useUIMessageStream ? 'uimessage' : 'legacy';
	logContext.useProposalTool = useProposalTool;

	const google = createGoogleGenerativeAI({ apiKey });
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
	const tools = buildTools(
		supabase,
		{
			searchAvailableHelpers: searchAvailableHelpersTool,
			processStaffAbsence: processStaffAbsenceTool,
			searchStaffs: searchStaffsTool,
		},
		context?.shifts,
		useProposalTool,
		logContext,
	);

	const modelMessages = await convertToModelMessages(
		normalizeMessages(messages),
		{
			tools,
		},
	);

	const result = streamText({
		model: google('gemini-2.5-flash'),
		system: systemPrompt,
		messages: modelMessages,
		tools,
		stopWhen: stepCountIs(5),
		onError: ({ error }) => {
			if (
				typeof error === 'object' &&
				error !== null &&
				'__logged' in error &&
				(error as { __logged?: boolean }).__logged === true
			) {
				return;
			}

			logChatError(
				'AI chat stream error',
				markLoggedError(error, 'stream_error'),
				logContext,
			);
		},
	});

	return toChatResponse(result, useUIMessageStream);
};

export const POST = async (request: Request): Promise<Response> => {
	const requestId =
		request.headers.get('x-request-id') ??
		request.headers.get('x-vercel-id') ??
		crypto.randomUUID();
	const logContext: RequestLogContext = {
		requestId,
		endpoint: '/api/chat/shift-adjustment',
		method: request.method,
	};

	try {
		return await handlePost(request, logContext);
	} catch (error) {
		logChatError(
			'Chat API error',
			markLoggedError(error, 'unexpected_error'),
			logContext,
		);
		// 内部エラーの詳細はクライアントに露出しない
		return NextResponse.json(
			{ error: 'Failed to process chat request' },
			{ status: 500 },
		);
	}
};

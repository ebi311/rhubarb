'use server';

import { AiOperationLogService } from '@/backend/services/aiOperationLogService';
import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import type {
	AiChatMutationProposal,
	ExecuteAiChatMutationBatchInput,
	ExecuteAiChatMutationBatchResult,
} from '@/models/aiChatMutationProposal';
import {
	ExecuteAiChatMutationBatchInputSchema,
	ExecuteAiChatMutationBatchResultSchema,
} from '@/models/aiChatMutationProposal';
import {
	ActionResult,
	errorResult,
	logServerError,
	successResult,
} from './utils/actionResult';
import {
	getAuthUser,
	isTestRuntime,
	shouldSkipAuditLog,
} from './utils/aiActionHelpers';

const BATCH_OPERATION_TYPE = 'batch_mutation';

const extractUniqueShiftIds = (
	proposals: AiChatMutationProposal[],
): string[] => [...new Set(proposals.map((proposal) => proposal.shiftId))];

const handleServiceError = async (
	error: ServiceError,
	service: ShiftService,
	aiOperationLogService: AiOperationLogService,
	userId: string,
	request: ExecuteAiChatMutationBatchInput,
): Promise<ActionResult<ExecuteAiChatMutationBatchResult>> => {
	const actorOfficeId = shouldSkipAuditLog(error.status)
		? null
		: await service.findActorOfficeId(userId).catch(() => null);

	if (actorOfficeId) {
		await aiOperationLogService.logSilently({
			office_id: actorOfficeId,
			actor_user_id: userId,
			operation_type: BATCH_OPERATION_TYPE,
			targets: {
				shiftIds: extractUniqueShiftIds(request.proposals),
			},
			proposal: {
				proposals: request.proposals,
			},
			request,
			result: {
				status: 'error',
				error: error.message,
				errorStatus: error.status,
			},
		});
	}

	if (error.status >= 500) {
		logServerError(error);
		return errorResult(error.message, error.status);
	}

	if (isTestRuntime() === false) {
		console.warn('[executeAiChatMutationBatchAction] ServiceError', {
			status: error.status,
			message: error.message,
			proposalCount: request.proposals.length,
		});
	}

	return errorResult(error.message, error.status, error.details);
};

export const executeAiChatMutationBatchAction = async (
	input: unknown,
): Promise<ActionResult<ExecuteAiChatMutationBatchResult>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || user == null) return errorResult('Unauthorized', 401);

	const parsed = ExecuteAiChatMutationBatchInputSchema.safeParse(input);
	if (!parsed.success) {
		if (isTestRuntime() === false) {
			console.warn('[executeAiChatMutationBatchAction] Validation failed', {
				issues: parsed.error.flatten(),
			});
		}
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}

	const request = parsed.data;

	const service = new ShiftService(supabase);
	const aiOperationLogService = new AiOperationLogService();

	try {
		const result = await service.executeAiChatMutationBatchProposal(
			user.id,
			request.proposals,
			request.allowlist,
		);

		const [firstResult] = result.results;
		if (firstResult === undefined) {
			const noResultError = new Error('No mutation result found');
			logServerError(noResultError);
			return errorResult(noResultError.message, 500);
		}

		await aiOperationLogService.logSilently({
			office_id: firstResult.officeId,
			actor_user_id: user.id,
			operation_type: BATCH_OPERATION_TYPE,
			targets: {
				shiftIds: extractUniqueShiftIds(request.proposals),
			},
			proposal: {
				proposals: request.proposals,
			},
			request,
			result: {
				status: 'success',
			},
		});

		return successResult(ExecuteAiChatMutationBatchResultSchema.parse(result));
	} catch (error) {
		if (error instanceof ServiceError) {
			return handleServiceError(
				error,
				service,
				aiOperationLogService,
				user.id,
				request,
			);
		}
		logServerError(error);
		throw error;
	}
};

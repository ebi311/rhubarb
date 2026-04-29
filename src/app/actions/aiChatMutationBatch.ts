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
import { createSupabaseClient } from '@/utils/supabase/server';
import { ZodError } from 'zod';
import {
	ActionResult,
	errorResult,
	logServerError,
	successResult,
} from './utils/actionResult';

const BATCH_OPERATION_TYPE = 'batch_mutation';

const getCurrentUser = async () => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	return { supabase, user, error } as const;
};

const shouldSkipAuditLog = (status: number): boolean =>
	status === 401 || status === 403;

const isTestRuntime = (): boolean =>
	process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

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
	const { supabase, user, error } = await getCurrentUser();
	if (error || user == null) return errorResult('Unauthorized', 401);

	let parsedInput: ExecuteAiChatMutationBatchInput;
	try {
		parsedInput = ExecuteAiChatMutationBatchInputSchema.parse(input);
	} catch (error) {
		if (error instanceof ZodError) {
			if (isTestRuntime() === false) {
				console.warn('[executeAiChatMutationBatchAction] Validation failed', {
					issues: error.flatten(),
				});
			}
			return errorResult('Validation failed', 400, error.flatten());
		}
		logServerError(error);
		throw error;
	}

	const service = new ShiftService(supabase);
	const aiOperationLogService = new AiOperationLogService();

	try {
		const result = await service.executeAiChatMutationBatchProposal(
			user.id,
			parsedInput.proposals,
			parsedInput.allowlist,
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
				shiftIds: extractUniqueShiftIds(parsedInput.proposals),
			},
			proposal: {
				proposals: parsedInput.proposals,
			},
			request: parsedInput,
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
				parsedInput,
			);
		}
		logServerError(error);
		throw error;
	}
};

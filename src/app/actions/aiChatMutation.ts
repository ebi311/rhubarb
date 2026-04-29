'use server';

import { AiOperationLogService } from '@/backend/services/aiOperationLogService';
import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import type {
	ExecuteAiChatMutationInput,
	ExecuteAiChatMutationResult,
} from '@/models/aiChatMutationProposal';
import {
	ExecuteAiChatMutationInputSchema,
	ExecuteAiChatMutationResultSchema,
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

const handleServiceError = async (
	error: ServiceError,
	service: ShiftService,
	aiOperationLogService: AiOperationLogService,
	userId: string,
	request: ExecuteAiChatMutationInput,
): Promise<ActionResult<ExecuteAiChatMutationResult>> => {
	const actorOfficeId = !shouldSkipAuditLog(error.status)
		? await service.findActorOfficeId(userId).catch(() => null)
		: null;

	if (actorOfficeId) {
		await aiOperationLogService.logSilently({
			office_id: actorOfficeId,
			actor_user_id: userId,
			operation_type: request.proposal.type,
			targets: {
				shiftId: request.proposal.shiftId,
			},
			proposal: request.proposal,
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

	if (!isTestRuntime()) {
		console.warn('[executeAiChatMutationAction] ServiceError', {
			status: error.status,
			message: error.message,
			proposalType: request.proposal.type,
		});
	}

	return errorResult(error.message, error.status, error.details);
};

export const executeAiChatMutationAction = async (
	input: unknown,
): Promise<ActionResult<ExecuteAiChatMutationResult>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = ExecuteAiChatMutationInputSchema.safeParse(input);
	if (!parsedInput.success) {
		if (!isTestRuntime()) {
			console.warn('[executeAiChatMutationAction] Validation failed', {
				issues: parsedInput.error.flatten(),
			});
		}
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	const aiOperationLogService = new AiOperationLogService();

	try {
		const result = await service.executeAiChatMutationProposal(
			user.id,
			parsedInput.data.proposal,
			parsedInput.data.allowlist,
		);

		await aiOperationLogService.logSilently({
			office_id: result.officeId,
			actor_user_id: user.id,
			operation_type: result.type,
			targets: {
				shiftId: result.shiftId,
			},
			proposal: parsedInput.data.proposal,
			request: parsedInput.data,
			result: { status: 'success' },
		});

		return successResult(ExecuteAiChatMutationResultSchema.parse(result));
	} catch (error) {
		if (error instanceof ServiceError) {
			return handleServiceError(
				error,
				service,
				aiOperationLogService,
				user.id,
				parsedInput.data,
			);
		}
		logServerError(error);
		throw error;
	}
};

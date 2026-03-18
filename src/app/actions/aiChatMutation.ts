'use server';

import { AiOperationLogService } from '@/backend/services/aiOperationLogService';
import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import type { ExecuteAiChatMutationResult } from '@/models/aiChatMutationProposal';
import {
	ExecuteAiChatMutationInputSchema,
	ExecuteAiChatMutationResultSchema,
} from '@/models/aiChatMutationProposal';
import { createSupabaseClient } from '@/utils/supabase/server';
import {
	ActionResult,
	errorResult,
	logServerError,
	successResult,
} from './utils/actionResult';

const getAuthUser = async () => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	return { supabase, user, error } as const;
};

const shouldSkipAuditLog = (status: number): boolean =>
	status === 401 || status === 403;

export const executeAiChatMutationAction = async (
	input: unknown,
): Promise<ActionResult<ExecuteAiChatMutationResult>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = ExecuteAiChatMutationInputSchema.safeParse(input);
	if (!parsedInput.success) {
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
			const actorOfficeId = !shouldSkipAuditLog(error.status)
				? await service.findActorOfficeId(user.id).catch(() => null)
				: null;

			if (actorOfficeId) {
				await aiOperationLogService.logSilently({
					office_id: actorOfficeId,
					actor_user_id: user.id,
					operation_type: parsedInput.data.proposal.type,
					targets: {
						shiftId: parsedInput.data.proposal.shiftId,
					},
					proposal: parsedInput.data.proposal,
					request: parsedInput.data,
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
			return errorResult(error.message, error.status, error.details);
		}
		logServerError(error);
		throw error;
	}
};

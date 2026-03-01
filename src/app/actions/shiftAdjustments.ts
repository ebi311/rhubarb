'use server';

import {
	ServiceError,
	ShiftAdjustmentSuggestionService,
} from '@/backend/services/shiftAdjustmentSuggestionService';
import type {
	ClientDatetimeChangeActionInput,
	SuggestClientDatetimeChangeAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import {
	ClientDatetimeChangeInputSchema,
	SuggestClientDatetimeChangeAdjustmentsOutputSchema,
} from '@/models/shiftAdjustmentActionSchemas';
import { createSupabaseClient } from '@/utils/supabase/server';
import {
	ActionResult,
	errorResult,
	logServerError,
	successResult,
} from './utils/actionResult';

const toSanitizedIssues = (
	issues: Array<{ path: PropertyKey[]; code: string; message: string }>,
) =>
	issues.map((issue) => ({
		path: issue.path,
		code: issue.code,
		message: issue.message,
	}));

const getAuthUser = async () => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	return { supabase, user, error } as const;
};

const handleServiceError = <T>(error: unknown): ActionResult<T> => {
	if (error instanceof ServiceError) {
		if (error.status >= 500) {
			logServerError(error);
			return {
				data: null,
				error: error.message,
				status: error.status,
			};
		}
		return errorResult<T>(error.message, error.status, error.details);
	}
	logServerError(error);
	throw error;
};

/**
 * 利用者都合の日時変更に対する「代替案（提案）」を取得する（Phase 2）
 */
export const suggestClientDatetimeChangeAdjustmentsAction = async (
	input: ClientDatetimeChangeActionInput,
): Promise<ActionResult<SuggestClientDatetimeChangeAdjustmentsOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = ClientDatetimeChangeInputSchema.safeParse(input);
	if (!parsedInput.success) {
		const issues = toSanitizedIssues(parsedInput.error.issues);
		console.error(
			'suggestClientDatetimeChangeAdjustmentsAction validation failed',
			{ issues },
		);
		return errorResult('Validation failed', 400, issues);
	}

	const service = new ShiftAdjustmentSuggestionService(supabase);
	try {
		const result = await service.suggestClientDatetimeChangeAdjustments(
			user.id,
			parsedInput.data,
		);
		return successResult(
			SuggestClientDatetimeChangeAdjustmentsOutputSchema.parse(result),
		);
	} catch (err) {
		return handleServiceError<SuggestClientDatetimeChangeAdjustmentsOutput>(
			err,
		);
	}
};

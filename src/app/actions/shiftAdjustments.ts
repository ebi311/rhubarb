'use server';

import {
	ServiceError,
	ShiftAdjustmentSuggestionService,
} from '@/backend/services/shiftAdjustmentSuggestionService';
import type {
	StaffAbsenceActionInput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import {
	StaffAbsenceInputSchema,
	SuggestShiftAdjustmentsOutputSchema,
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
 * スタッフ急休に対する「代替案（提案）」を取得する（MVP-1）
 */
export const suggestStaffAbsenceAdjustmentsAction = async (
	input: StaffAbsenceActionInput,
): Promise<ActionResult<SuggestShiftAdjustmentsOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = StaffAbsenceInputSchema.safeParse(input);
	if (!parsedInput.success) {
		const issues = toSanitizedIssues(parsedInput.error.issues);
		console.error('suggestStaffAbsenceAdjustmentsAction validation failed', {
			issues,
		});
		return errorResult('Validation failed', 400, issues);
	}

	const service = new ShiftAdjustmentSuggestionService(supabase);
	try {
		const result = await service.suggestStaffAbsenceAdjustments(
			user.id,
			parsedInput.data,
		);
		return successResult(SuggestShiftAdjustmentsOutputSchema.parse(result));
	} catch (err) {
		return handleServiceError<SuggestShiftAdjustmentsOutput>(err);
	}
};

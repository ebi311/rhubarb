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
		}
		return errorResult<T>(error.message, error.status, error.details);
	}
	logServerError(error);
	throw error;
};

/**
 * スタッフ急休に対する「担当者変更案（提案）」を取得する（Phase 1: 提案のみ）
 */
export const suggestShiftAdjustmentsAction = async (
	input: StaffAbsenceActionInput,
): Promise<ActionResult<SuggestShiftAdjustmentsOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = StaffAbsenceInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftAdjustmentSuggestionService(supabase);
	try {
		const result = await service.suggestShiftAdjustments(
			user.id,
			parsedInput.data,
		);
		return successResult(SuggestShiftAdjustmentsOutputSchema.parse(result));
	} catch (err) {
		return handleServiceError<SuggestShiftAdjustmentsOutput>(err);
	}
};

'use server';

import {
	ServiceError,
	ShiftAdjustmentSuggestionService,
} from '@/backend/services/shiftAdjustmentSuggestionService';
import type {
	ClientDatetimeChangeActionInput,
	StaffAbsenceActionInput,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import {
	ClientDatetimeChangeInputSchema,
	StaffAbsenceInputSchema,
	SuggestClientDatetimeChangeAdjustmentsOutputSchema,
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
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
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

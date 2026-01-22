'use server';

import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import type {
	CancelShiftInput,
	ChangeShiftStaffInput,
	ChangeShiftStaffOutput,
	ValidateStaffAvailabilityInput,
	ValidateStaffAvailabilityOutput,
} from '@/models/shiftActionSchemas';
import {
	CancelShiftInputSchema,
	ChangeShiftStaffInputSchema,
	ValidateStaffAvailabilityInputSchema,
} from '@/models/shiftActionSchemas';
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
 * シフトの担当者を変更する
 */
export const changeShiftStaffAction = async (
	input: ChangeShiftStaffInput,
): Promise<ActionResult<ChangeShiftStaffOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = ChangeShiftStaffInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const result = await service.changeStaffAssignment(
			user.id,
			parsedInput.data.shiftId,
			parsedInput.data.newStaffId,
			parsedInput.data.reason,
		);
		return successResult(result);
	} catch (err) {
		return handleServiceError<ChangeShiftStaffOutput>(err);
	}
};

/**
 * シフトをキャンセルする
 */
export const cancelShiftAction = async (
	input: CancelShiftInput,
): Promise<ActionResult<null>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = CancelShiftInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		await service.cancelShift(
			user.id,
			parsedInput.data.shiftId,
			parsedInput.data.reason,
			parsedInput.data.category,
		);
		return successResult(null);
	} catch (err) {
		return handleServiceError<null>(err);
	}
};

/**
 * スタッフの時間帯における可用性を検証する
 */
export const validateStaffAvailabilityAction = async (
	input: ValidateStaffAvailabilityInput,
): Promise<ActionResult<ValidateStaffAvailabilityOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = ValidateStaffAvailabilityInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const startTime = new Date(parsedInput.data.startTime);
		const endTime = new Date(parsedInput.data.endTime);

		const result = await service.validateStaffAvailability(
			parsedInput.data.staffId,
			startTime,
			endTime,
			parsedInput.data.excludeShiftId,
		);

		// conflictingShifts を API 用の形式に変換
		if (result.conflictingShifts) {
			return successResult({
				available: result.available,
				conflictingShifts: result.conflictingShifts.map((shift) => ({
					id: shift.id,
					clientName: shift.clientName,
					startTime: shift.startTime,
					endTime: shift.endTime,
				})),
			});
		}

		return successResult({ available: result.available });
	} catch (err) {
		return handleServiceError<ValidateStaffAvailabilityOutput>(err);
	}
};

'use server';

import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import type { Shift } from '@/models/shift';
import type {
	CancelShiftInput,
	ChangeShiftStaffInput,
	ChangeShiftStaffOutput,
	CreateOneOffShiftActionInput,
	RestoreShiftInput,
	ShiftRecord,
	ValidateStaffAvailabilityInput,
	ValidateStaffAvailabilityOutput,
} from '@/models/shiftActionSchemas';
import {
	CancelShiftInputSchema,
	ChangeShiftStaffInputSchema,
	CreateOneOffShiftInputSchema,
	RestoreShiftInputSchema,
	ShiftRecordSchema,
	ValidateStaffAvailabilityInputSchema,
} from '@/models/shiftActionSchemas';
import { createSupabaseClient } from '@/utils/supabase/server';
import { ZodError } from 'zod';
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

const toShiftRecord = (shift: Shift): ShiftRecord => ({
	id: shift.id,
	client_id: shift.client_id,
	service_type_id: shift.service_type_id,
	staff_id: shift.staff_id ?? null,
	date: shift.date,
	start_time: shift.time.start,
	end_time: shift.time.end,
	status: shift.status,
	is_unassigned: shift.is_unassigned,
	canceled_reason: shift.canceled_reason ?? null,
	canceled_category: shift.canceled_category ?? null,
	canceled_at: shift.canceled_at ?? null,
	created_at: shift.created_at,
	updated_at: shift.updated_at,
});

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
 * キャンセル済みシフトを復元する
 */
export const restoreShiftAction = async (
	input: RestoreShiftInput,
): Promise<ActionResult<null>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = RestoreShiftInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		await service.restoreShift(user.id, parsedInput.data.shiftId);
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

/**
 * 単発シフトを作成する
 */
export const createOneOffShiftAction = async (
	input: CreateOneOffShiftActionInput,
): Promise<ActionResult<ShiftRecord>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	let parsedInput: (typeof CreateOneOffShiftInputSchema)['_output'];
	try {
		parsedInput = CreateOneOffShiftInputSchema.parse(input);
	} catch (err) {
		if (err instanceof ZodError) {
			return errorResult('Validation failed', 400, err.flatten());
		}
		throw err;
	}

	const service = new ShiftService(supabase);
	try {
		const { weekStartDate: _weekStartDate, ...serviceInput } = parsedInput;
		const created = await service.createOneOffShift(user.id, serviceInput);
		return successResult(ShiftRecordSchema.parse(toShiftRecord(created)), 201);
	} catch (err) {
		return handleServiceError<ShiftRecord>(err);
	}
};

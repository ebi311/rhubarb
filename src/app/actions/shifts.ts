'use server';

import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import type { Shift } from '@/models/shift';
import type {
	AssignStaffWithCascadeInput,
	AssignStaffWithCascadeOutput,
	CancelShiftInput,
	ChangeShiftStaffInput,
	ChangeShiftStaffOutput,
	CreateOneOffShiftActionInput,
	RestoreShiftInput,
	ShiftRecord,
	SuggestCandidateStaffForShiftInput,
	SuggestCandidateStaffForShiftOutput,
	SuggestCandidateStaffForShiftWithNewDatetimeInput,
	UpdateDatetimeAndAssignWithCascadeInput,
	UpdateShiftScheduleActionInput,
	UpdateShiftScheduleOutput,
	ValidateStaffAvailabilityInput,
	ValidateStaffAvailabilityOutput,
} from '@/models/shiftActionSchemas';
import {
	AssignStaffWithCascadeInputSchema,
	AssignStaffWithCascadeOutputSchema,
	CancelShiftInputSchema,
	ChangeShiftStaffInputSchema,
	CreateOneOffShiftInputSchema,
	RestoreShiftInputSchema,
	ShiftRecordSchema,
	SuggestCandidateStaffForShiftInputSchema,
	SuggestCandidateStaffForShiftOutputSchema,
	SuggestCandidateStaffForShiftWithNewDatetimeInputSchema,
	UpdateDatetimeAndAssignWithCascadeInputSchema,
	UpdateShiftScheduleInputSchema,
	UpdateShiftScheduleOutputSchema,
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
			return errorResult<T>(error.message, error.status);
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
 * シフトの日付/開始/終了（必要に応じて担当者）を更新する
 */
export const updateShiftScheduleAction = async (
	input: UpdateShiftScheduleActionInput,
): Promise<ActionResult<UpdateShiftScheduleOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = UpdateShiftScheduleInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const result = await service.updateShiftSchedule(
			user.id,
			parsedInput.data.shiftId,
			parsedInput.data.newStartTime,
			parsedInput.data.newEndTime,
			parsedInput.data.staffId,
			parsedInput.data.reason,
		);
		return successResult(UpdateShiftScheduleOutputSchema.parse(result));
	} catch (err) {
		return handleServiceError<UpdateShiftScheduleOutput>(err);
	}
};

/**
 * シフトの候補スタッフを提案する
 */
export const suggestCandidateStaffForShiftAction = async (
	input: SuggestCandidateStaffForShiftInput,
): Promise<ActionResult<SuggestCandidateStaffForShiftOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = SuggestCandidateStaffForShiftInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const result = await service.suggestCandidateStaffForShift(
			user.id,
			parsedInput.data.shiftId,
		);
		return successResult(
			SuggestCandidateStaffForShiftOutputSchema.parse(result),
		);
	} catch (err) {
		return handleServiceError<SuggestCandidateStaffForShiftOutput>(err);
	}
};

/**
 * シフトへスタッフを割り当て、競合シフトを連鎖解除する
 */
export const assignStaffWithCascadeUnassignAction = async (
	input: AssignStaffWithCascadeInput,
): Promise<ActionResult<AssignStaffWithCascadeOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput = AssignStaffWithCascadeInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const result = await service.assignStaffWithCascadeUnassign(
			user.id,
			parsedInput.data.shiftId,
			parsedInput.data.newStaffId,
			parsedInput.data.reason,
		);
		return successResult(AssignStaffWithCascadeOutputSchema.parse(result));
	} catch (err) {
		return handleServiceError<AssignStaffWithCascadeOutput>(err);
	}
};

/**
 * 新しい日時でシフト候補スタッフを提案する
 */
export const suggestCandidateStaffForShiftWithNewDatetimeAction = async (
	input: SuggestCandidateStaffForShiftWithNewDatetimeInput,
): Promise<ActionResult<SuggestCandidateStaffForShiftOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput =
		SuggestCandidateStaffForShiftWithNewDatetimeInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const result = await service.suggestCandidateStaffForShiftWithNewDatetime(
			user.id,
			parsedInput.data,
		);
		return successResult(
			SuggestCandidateStaffForShiftOutputSchema.parse(result),
		);
	} catch (err) {
		return handleServiceError<SuggestCandidateStaffForShiftOutput>(err);
	}
};

/**
 * シフト日時変更と担当再割当を行い、競合シフトを連鎖解除する
 */
export const updateDatetimeAndAssignWithCascadeUnassignAction = async (
	input: UpdateDatetimeAndAssignWithCascadeInput,
): Promise<ActionResult<AssignStaffWithCascadeOutput>> => {
	const { supabase, user, error } = await getAuthUser();
	if (error || !user) return errorResult('Unauthorized', 401);

	const parsedInput =
		UpdateDatetimeAndAssignWithCascadeInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const result =
			await service.updateShiftScheduleAndAssignWithCascadeUnassign(
				user.id,
				parsedInput.data,
			);
		return successResult(AssignStaffWithCascadeOutputSchema.parse(result));
	} catch (err) {
		return handleServiceError<AssignStaffWithCascadeOutput>(err);
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

	const parsedInput = CreateOneOffShiftInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return errorResult('Validation failed', 400, parsedInput.error.flatten());
	}

	const service = new ShiftService(supabase);
	try {
		const { weekStartDate: _weekStartDate, ...serviceInput } = parsedInput.data;
		const created = await service.createOneOffShift(user.id, serviceInput);
		return successResult(ShiftRecordSchema.parse(toShiftRecord(created)), 201);
	} catch (err) {
		return handleServiceError<ShiftRecord>(err);
	}
};

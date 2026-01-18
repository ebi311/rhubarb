'use server';

import { ServiceError, WeeklyScheduleService } from '@/backend/services/weeklyScheduleService';
import type { Shift } from '@/models/shift';
import {
	GenerateResultSchema,
	GenerateWeeklyShiftsInputSchema,
	MyShiftFiltersSchema,
	ShiftFiltersSchema,
	type GenerateResult,
	type ShiftRecord,
} from '@/models/shiftActionSchemas';
import { createSupabaseClient } from '@/utils/supabase/server';
import { ActionResult, errorResult, successResult } from './utils/actionResult';

/**
 * Shift エンティティを ShiftRecord に変換
 */
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
	created_at: shift.created_at,
	updated_at: shift.updated_at,
});

/**
 * 週間シフトを生成
 * @param weekStartDate 週の開始日（月曜日）を表す ISO 文字列 (YYYY-MM-DD)
 */
export const generateWeeklyShiftsAction = async (
	weekStartDate: string,
): Promise<ActionResult<GenerateResult>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsed = GenerateWeeklyShiftsInputSchema.safeParse({ weekStartDate });
	if (!parsed.success) {
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}

	const service = new WeeklyScheduleService(supabase);
	try {
		const result = await service.generateWeeklyShifts(user.id, parsed.data.weekStartDate);
		return successResult(GenerateResultSchema.parse(result), 201);
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

/**
 * シフト一覧を取得（管理者用）
 */
export const listShiftsAction = async (filters: {
	startDate: string;
	endDate: string;
	staffId?: string;
}): Promise<ActionResult<ShiftRecord[]>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsed = ShiftFiltersSchema.safeParse(filters);
	if (!parsed.success) {
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}

	const service = new WeeklyScheduleService(supabase);
	try {
		const shifts = await service.listShifts(user.id, parsed.data);
		return successResult(shifts.map(toShiftRecord));
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

/**
 * 自分のシフト一覧を取得（ヘルパー用）
 */
export const listMyShiftsAction = async (filters: {
	startDate: string;
	endDate: string;
}): Promise<ActionResult<ShiftRecord[]>> => {
	const supabase = await createSupabaseClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) return errorResult('Unauthorized', 401);

	const parsed = MyShiftFiltersSchema.safeParse(filters);
	if (!parsed.success) {
		return errorResult('Validation failed', 400, parsed.error.flatten());
	}

	const service = new WeeklyScheduleService(supabase);
	try {
		const shifts = await service.listMyShifts(user.id, parsed.data);
		return successResult(shifts.map(toShiftRecord));
	} catch (e) {
		if (e instanceof ServiceError) {
			return errorResult(e.message, e.status, e.details);
		}
		throw e;
	}
};

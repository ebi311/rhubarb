import {
	ShiftRepository,
	type ShiftWithNames,
} from '@/backend/repositories/shiftRepository';
import { isValidDate } from '@/backend/tools/_shared/dateValidation';
import { Database } from '@/backend/types/supabase';
import { setJstTime } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Tool, ToolExecutionOptions } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';

export const GetShiftsParametersSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.refine(isValidDate, { message: '実在する日付を指定してください' })
		.describe('YYYY-MM-DD 形式の日付'),
	staffId: z.uuid().optional().describe('絞り込むスタッフID（省略可）'),
});

export type GetShiftsParameters = z.infer<typeof GetShiftsParametersSchema>;

export type GetShiftsResult = {
	shifts: Array<{
		id: string;
		clientId: string;
		clientName: string;
		staffId: string | null;
		staffName: string;
		serviceType: string;
		startAt: string;
		endAt: string;
		status: string;
	}>;
};

type CreateGetShiftsToolOptions = {
	supabase: SupabaseClient<Database>;
	shiftRepository?: Pick<ShiftRepository, 'list'>;
};

const resolveOfficeId = (context: unknown): string => {
	if (
		typeof context !== 'object' ||
		context === null ||
		!('officeId' in context) ||
		typeof context.officeId !== 'string' ||
		context.officeId.length === 0
	) {
		throw new Error('officeId is required in tool context');
	}

	return context.officeId;
};

const resolveName = (
	shift: ShiftWithNames,
	key: 'client_name' | 'staff_name',
	label: 'clientName' | 'staffName',
): string => {
	const value = shift[key];
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`${label} is required for shift ${shift.id}`);
	}

	return value;
};

const resolveStaffName = (shift: ShiftWithNames): string => {
	if (shift.staff_id === null) {
		return '未割当';
	}

	return resolveName(shift, 'staff_name', 'staffName');
};

export const createGetShiftsTool = (
	options: CreateGetShiftsToolOptions,
): Tool<GetShiftsParameters, GetShiftsResult> => {
	const { supabase, shiftRepository } = options;
	const repository = shiftRepository ?? new ShiftRepository(supabase);

	return tool({
		description:
			'指定した日付のシフト一覧を取得します。staffId を指定した場合はそのスタッフのシフトに絞り込みます。',
		inputSchema: GetShiftsParametersSchema,
		execute: async (
			params: GetShiftsParameters,
			toolOptions: ToolExecutionOptions,
		): Promise<GetShiftsResult> => {
			const officeId = resolveOfficeId(toolOptions.experimental_context);
			const shifts = await repository.list({
				officeId,
				date: params.date,
				includeNames: true,
				...(params.staffId ? { staffId: params.staffId } : {}),
			});

			return {
				shifts: shifts.map((shift) => ({
					id: shift.id,
					clientId: shift.client_id,
					clientName: resolveName(shift, 'client_name', 'clientName'),
					staffId: shift.staff_id ?? null,
					staffName: resolveStaffName(shift),
					serviceType: shift.service_type_id,
					startAt: setJstTime(
						shift.date,
						shift.time.start.hour,
						shift.time.start.minute,
					).toISOString(),
					endAt: setJstTime(
						shift.date,
						shift.time.end.hour,
						shift.time.end.minute,
					).toISOString(),
					status: shift.status,
				})),
			};
		},
	});
};

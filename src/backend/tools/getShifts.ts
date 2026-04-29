import { ShiftRepository } from '@/backend/repositories/shiftRepository';
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
		staffName: string | null;
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
			toolOptions: ToolExecutionOptions & { context?: unknown },
		): Promise<GetShiftsResult> => {
			const officeId = resolveOfficeId(toolOptions.context);
			const shifts = await repository.list({
				officeId,
				date: params.date,
				...(params.staffId ? { staffId: params.staffId } : {}),
			});

			return {
				shifts: shifts.map((shift) => ({
					id: shift.id,
					clientId: shift.client_id,
					clientName: '不明',
					staffId: shift.staff_id ?? null,
					staffName: shift.staff_id ? '不明' : null,
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

import { getJstDayOfWeek } from '@/utils/date';
import { z } from 'zod';
import { ShiftStatusSchema } from './shift';
import { JstDateInputSchema } from './valueObjects/jstDate';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeValueSchema } from './valueObjects/time';
import { TimestampSchema } from './valueObjects/timestamp';

// 週間シフト生成入力スキーマ
export const GenerateWeeklyShiftsInputSchema = z.object({
	weekStartDate: JstDateInputSchema.refine((date) => getJstDayOfWeek(date) === 1, {
		message: 'weekStartDate must be a Monday',
	}),
});
export type GenerateWeeklyShiftsInput = z.infer<typeof GenerateWeeklyShiftsInputSchema>;

// 生成結果スキーマ
export const GenerateResultSchema = z.object({
	created: z.number().int().min(0),
	skipped: z.number().int().min(0),
	total: z.number().int().min(0),
});
export type GenerateResult = z.infer<typeof GenerateResultSchema>;

// シフト一覧取得フィルタスキーマ
export const ShiftFiltersSchema = z
	.object({
		startDate: JstDateInputSchema,
		endDate: JstDateInputSchema,
		staffId: z.uuid().optional(),
	})
	.refine((data) => data.startDate <= data.endDate, {
		message: 'startDate must be before or equal to endDate',
		path: ['endDate'],
	});
export type ShiftFilters = z.infer<typeof ShiftFiltersSchema>;

// マイシフト取得フィルタスキーマ（staffId なし）
export const MyShiftFiltersSchema = z
	.object({
		startDate: JstDateInputSchema,
		endDate: JstDateInputSchema,
	})
	.refine((data) => data.startDate <= data.endDate, {
		message: 'startDate must be before or equal to endDate',
		path: ['endDate'],
	});
export type MyShiftFilters = z.infer<typeof MyShiftFiltersSchema>;

// シフトレコードスキーマ（API レスポンス用）
export const ShiftRecordSchema = z.object({
	id: z.uuid(),
	client_id: z.uuid(),
	service_type_id: ServiceTypeIdSchema,
	staff_id: z.uuid().nullable(),
	date: z.coerce.date(),
	start_time: TimeValueSchema,
	end_time: TimeValueSchema,
	status: ShiftStatusSchema,
	is_unassigned: z.boolean(),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});
export type ShiftRecord = z.infer<typeof ShiftRecordSchema>;

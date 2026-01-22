import { getJstDayOfWeek } from '@/utils/date';
import { z } from 'zod';
import { ShiftStatusSchema } from './shift';
import { JstDateInputSchema } from './valueObjects/jstDate';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeValueSchema } from './valueObjects/time';
import { TimestampSchema } from './valueObjects/timestamp';

// 週間シフト生成入力スキーマ
export const GenerateWeeklyShiftsInputSchema = z.object({
	weekStartDate: JstDateInputSchema.refine(
		(date) => getJstDayOfWeek(date) === 1,
		{
			message: 'weekStartDate must be a Monday',
		},
	),
});
export type GenerateWeeklyShiftsInput = z.infer<
	typeof GenerateWeeklyShiftsInputSchema
>;

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

// changeShiftStaffAction の入力スキーマ
export const ChangeShiftStaffInputSchema = z.object({
	shiftId: z.string().uuid(),
	newStaffId: z.string().uuid(),
	reason: z.string().optional(),
});

export type ChangeShiftStaffInput = z.infer<typeof ChangeShiftStaffInputSchema>;

// changeShiftStaffAction の出力スキーマ
export const ChangeShiftStaffOutputSchema = z.object({
	oldStaffName: z.string(),
	newStaffName: z.string(),
});

export type ChangeShiftStaffOutput = z.infer<
	typeof ChangeShiftStaffOutputSchema
>;

// cancelShiftAction の入力スキーマ
export const CancelShiftCategorySchema = z.enum(['client', 'staff', 'other']);

export type CancelShiftCategory = z.infer<typeof CancelShiftCategorySchema>;

export const CancelShiftInputSchema = z.object({
	shiftId: z.string().uuid(),
	reason: z.string().min(1, 'キャンセル理由は必須です'),
	category: CancelShiftCategorySchema,
});

export type CancelShiftInput = z.infer<typeof CancelShiftInputSchema>;

// validateStaffAvailabilityAction の入力スキーマ
export const ValidateStaffAvailabilityInputSchema = z.object({
	staffId: z.string().uuid(),
	startTime: z.string(),
	endTime: z.string(),
	excludeShiftId: z.string().uuid().optional(),
});

export type ValidateStaffAvailabilityInput = z.infer<
	typeof ValidateStaffAvailabilityInputSchema
>;

// validateStaffAvailabilityAction の出力スキーマ
export const ValidateStaffAvailabilityOutputSchema = z.object({
	available: z.boolean(),
	conflictingShifts: z
		.array(
			z.object({
				id: z.string().uuid(),
				clientName: z.string(),
				startTime: z.coerce.date(),
				endTime: z.coerce.date(),
			}),
		)
		.optional(),
});

export type ValidateStaffAvailabilityOutput = z.infer<
	typeof ValidateStaffAvailabilityOutputSchema
>;

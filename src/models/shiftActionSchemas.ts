import {
	addJstDays,
	formatJstDateString,
	getJstDateOnly,
	getJstDayOfWeek,
	getJstHours,
	getJstMinutes,
	parseJstDateString,
	setJstTime,
	stringToTimeObject,
} from '@/utils/date';
import { z } from 'zod';
import { ShiftStatusSchema } from './shift';
import { JstDateInputSchema, JstDateSchema } from './valueObjects/jstDate';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeValueSchema } from './valueObjects/time';
import { TimeRangeSchema } from './valueObjects/timeRange';
import { TimestampSchema } from './valueObjects/timestamp';

// 週間シフト生成入力スキーマ
export const GenerateWeeklyShiftsInputSchema = z.object({
	weekStartDate: JstDateInputSchema.refine(
		(date) => getJstDayOfWeek(date) === 1,
		{
			message: 'weekStartDate は月曜日の日付を指定してください',
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
	canceled_reason: z.string().nullable(),
	canceled_category: z.string().nullable(),
	canceled_at: TimestampSchema.nullable(),
	created_at: TimestampSchema,
	updated_at: TimestampSchema,
});
export type ShiftRecord = z.infer<typeof ShiftRecordSchema>;

const withTimeRangeValidation = <
	T extends { start_time: unknown; end_time: unknown },
>(
	schema: z.ZodType<T>,
) =>
	schema.superRefine((val, ctx) => {
		const parsed = TimeRangeSchema.safeParse({
			start: val.start_time,
			end: val.end_time,
		});
		if (!parsed.success) {
			parsed.error.issues.forEach((issue) => {
				const mappedPath = issue.path.map((p) =>
					p === 'start' ? 'start_time' : p === 'end' ? 'end_time' : p,
				);
				ctx.addIssue({ ...issue, path: mappedPath });
			});
		}
	});

// 単発シフト作成入力スキーマ
export const CreateOneOffShiftInputSchema = withTimeRangeValidation(
	z.object({
		weekStartDate: JstDateSchema.refine((date) => getJstDayOfWeek(date) === 1, {
			message: 'weekStartDate は月曜日の日付を指定してください',
		}),
		client_id: z.uuid({ message: 'client_id は UUID 形式で指定してください' }),
		service_type_id: ServiceTypeIdSchema,
		staff_id: z
			.uuid({ message: 'staff_id は UUID 形式で指定してください' })
			.nullable()
			.optional(),
		date: JstDateSchema,
		start_time: TimeValueSchema,
		end_time: TimeValueSchema,
	}),
).superRefine((val, ctx) => {
	const weekStart = getJstDateOnly(val.weekStartDate);
	const weekEnd = addJstDays(weekStart, 6);
	const shiftDate = getJstDateOnly(val.date);

	if (shiftDate < weekStart || shiftDate > weekEnd) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'date は表示中の週の範囲内で指定してください',
			path: ['date'],
		});
	}
});

// Action 外部入力: transform 前の入力型（weekStartDate/date は YYYY-MM-DD の string）
export type CreateOneOffShiftActionInput = z.input<
	typeof CreateOneOffShiftInputSchema
>;

// parse 後（transform 後）の型（weekStartDate/date は Date）
export type CreateOneOffShiftInput = z.output<
	typeof CreateOneOffShiftInputSchema
>;

// Service 用 DTO: Action で weekStartDate の整合性は検証済みなので渡さない
export type CreateOneOffShiftServiceInput = Omit<
	CreateOneOffShiftInput,
	'weekStartDate'
>;

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

// restoreShiftAction の入力スキーマ
export const RestoreShiftInputSchema = z.object({
	shiftId: z.string().uuid(),
});

export type RestoreShiftInput = z.infer<typeof RestoreShiftInputSchema>;

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

// updateShiftScheduleAction の入力スキーマ
const DateStrSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'dateStr は YYYY-MM-DD 形式で指定してください')
	.refine(
		(v) => {
			try {
				return formatJstDateString(parseJstDateString(v)) === v;
			} catch {
				return false;
			}
		},
		{ message: 'dateStr が不正です' },
	);

const TimeStrSchema = z
	.string()
	.regex(/^\d{2}:\d{2}$/, '時刻は HH:mm 形式で指定してください')
	.refine((v) => stringToTimeObject(v) !== null, {
		message: '時刻が不正です',
	});

export const UpdateShiftScheduleInputSchema = z
	.object({
		shiftId: z.string().uuid(),
		staffId: z.string().uuid().nullable().optional(),
		dateStr: DateStrSchema,
		startTimeStr: TimeStrSchema,
		endTimeStr: TimeStrSchema,
		reason: z.string().optional(),
	})
	.superRefine((val, ctx) => {
		const start = stringToTimeObject(val.startTimeStr);
		const end = stringToTimeObject(val.endTimeStr);
		if (!start || !end) return;

		const parsed = TimeRangeSchema.safeParse({ start, end });
		if (!parsed.success) {
			parsed.error.issues.forEach((issue) => {
				const mappedPath = issue.path.map((p) =>
					p === 'start' ? 'startTimeStr' : p === 'end' ? 'endTimeStr' : p,
				);
				ctx.addIssue({ ...issue, path: mappedPath });
			});
		}
	})
	.transform((val) => {
		const baseDate = parseJstDateString(val.dateStr);
		const start = stringToTimeObject(val.startTimeStr);
		const end = stringToTimeObject(val.endTimeStr);
		if (!start || !end) {
			// refine 済みのため通常ここには到達しない
			return {
				shiftId: val.shiftId,
				staffId: val.staffId,
				newStartTime: baseDate,
				newEndTime: baseDate,
				reason: val.reason,
			};
		}
		return {
			shiftId: val.shiftId,
			staffId: val.staffId,
			newStartTime: setJstTime(baseDate, start.hour, start.minute),
			newEndTime: setJstTime(baseDate, end.hour, end.minute),
			reason: val.reason,
		};
	});

export type UpdateShiftScheduleActionInput = z.input<
	typeof UpdateShiftScheduleInputSchema
>;
export type UpdateShiftScheduleInput = z.output<
	typeof UpdateShiftScheduleInputSchema
>;

export const UpdateShiftScheduleOutputSchema = z.object({
	shiftId: z.string().uuid(),
});
export type UpdateShiftScheduleOutput = z.infer<
	typeof UpdateShiftScheduleOutputSchema
>;

// UI での初期値作成などに使うユーティリティ
export const toJstTimeStr = (date: Date): string => {
	const h = getJstHours(date);
	const m = getJstMinutes(date);
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

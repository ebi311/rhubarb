import { dateJst } from '@/utils/date';
import { z } from 'zod';
import { ShiftStatusSchema } from './shift';
import { JstDateInputSchema } from './valueObjects/jstDate';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeValueSchema } from './valueObjects/time';
import { TimeRangeSchema } from './valueObjects/timeRange';

const toJstDay = (date: Date) => dateJst(date).startOf('day');

/**
 * staff_absence（スタッフ急休）入力（Phase 1: DB永続化なし）
 */
export const StaffAbsenceInputSchema = z
	.object({
		staffId: z.uuid(),
		startDate: JstDateInputSchema,
		endDate: JstDateInputSchema,
		memo: z.string().max(500).optional(),
	})
	.refine((v) => !toJstDay(v.startDate).isAfter(toJstDay(v.endDate)), {
		message: 'startDate must be before or equal to endDate',
		path: ['endDate'],
	})
	.refine(
		(v) => {
			const start = toJstDay(v.startDate);
			const end = toJstDay(v.endDate);
			const diffDays = end.diff(start, 'day');
			// start=1日目, end=14日目 を許容するため diffDays<=13
			return diffDays <= 13;
		},
		{
			message: 'Date range must be within 14 days',
			path: ['endDate'],
		},
	);

export type StaffAbsenceInput = z.output<typeof StaffAbsenceInputSchema>;
export type StaffAbsenceActionInput = z.input<typeof StaffAbsenceInputSchema>;

/**
 * client_datetime_change（利用者都合の日時変更）入力（Phase 1: 提案のみ）
 */
export const ClientDatetimeChangeInputSchema = z
	.object({
		shiftId: z.uuid(),
		newDate: JstDateInputSchema,
		newStartTime: TimeValueSchema,
		newEndTime: TimeValueSchema,
		memo: z.string().max(500).optional(),
	})
	.superRefine((val, ctx) => {
		const parsed = TimeRangeSchema.safeParse({
			start: val.newStartTime,
			end: val.newEndTime,
		});
		if (!parsed.success) {
			parsed.error.issues.forEach((issue) => {
				const mappedPath = issue.path.map((p) =>
					p === 'start' ? 'newStartTime' : p === 'end' ? 'newEndTime' : p,
				);
				ctx.addIssue({ ...issue, path: mappedPath });
			});
		}
	});

export type ClientDatetimeChangeInput = z.output<
	typeof ClientDatetimeChangeInputSchema
>;
export type ClientDatetimeChangeActionInput = z.input<
	typeof ClientDatetimeChangeInputSchema
>;

/**
 * request（変更リクエスト）
 */
export const ShiftAdjustmentRequestSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('staff_absence'),
		payload: StaffAbsenceInputSchema,
	}),
	z.object({
		type: z.literal('client_datetime_change'),
		payload: ClientDatetimeChangeInputSchema,
	}),
]);

export type ShiftAdjustmentRequest = z.infer<
	typeof ShiftAdjustmentRequestSchema
>;

/**
 * 提案対象シフト（表示/検証用の最小スナップショット）
 */
export const ShiftSnapshotSchema = z.object({
	// ShiftRecordSchema の最小版
	id: z.uuid(),
	client_id: z.uuid(),
	service_type_id: ServiceTypeIdSchema,
	staff_id: z.uuid().nullable(),
	date: z.coerce.date(),
	start_time: TimeValueSchema,
	end_time: TimeValueSchema,
	status: ShiftStatusSchema,
});
export type ShiftSnapshot = z.infer<typeof ShiftSnapshotSchema>;

/**
 * 操作（Phase 1: change_staff のみ、1手のみ）
 */
const ChangeStaffShiftAdjustmentOperationSchema = z.object({
	type: z.literal('change_staff'),
	shift_id: z.uuid(),
	from_staff_id: z.uuid(),
	to_staff_id: z.uuid(),
});

const UpdateShiftScheduleShiftAdjustmentOperationSchema = z
	.object({
		type: z.literal('update_shift_schedule'),
		shift_id: z.uuid(),
		new_date: JstDateInputSchema,
		new_start_time: TimeValueSchema,
		new_end_time: TimeValueSchema,
	})
	.superRefine((val, ctx) => {
		const parsed = TimeRangeSchema.safeParse({
			start: val.new_start_time,
			end: val.new_end_time,
		});
		if (!parsed.success) {
			parsed.error.issues.forEach((issue) => {
				const mappedPath = issue.path.map((p) =>
					p === 'start' ? 'new_start_time' : p === 'end' ? 'new_end_time' : p,
				);
				ctx.addIssue({ ...issue, path: mappedPath });
			});
		}
	});

export const ShiftAdjustmentOperationSchema = z.discriminatedUnion('type', [
	ChangeStaffShiftAdjustmentOperationSchema,
	UpdateShiftScheduleShiftAdjustmentOperationSchema,
]);
export type ShiftAdjustmentOperation = z.infer<
	typeof ShiftAdjustmentOperationSchema
>;

/**
 * rationale（Phase 1: 最小限の理由コードとメッセージ）
 */
export const ShiftAdjustmentRationaleItemSchema = z.object({
	code: z.string().min(1).max(50),
	message: z.string().min(1).max(200),
});
export type ShiftAdjustmentRationaleItem = z.infer<
	typeof ShiftAdjustmentRationaleItemSchema
>;

/**
 * 提案（Phase 2: operations は1〜2件）
 */
export const ShiftAdjustmentSuggestionSchema = z.object({
	operations: z.array(ShiftAdjustmentOperationSchema).min(1).max(2),
	rationale: z.array(ShiftAdjustmentRationaleItemSchema).min(1).max(5),
});
export type ShiftAdjustmentSuggestion = z.infer<
	typeof ShiftAdjustmentSuggestionSchema
>;

export const ShiftAdjustmentShiftSuggestionSchema = z.object({
	shift: ShiftSnapshotSchema,
	suggestions: z.array(ShiftAdjustmentSuggestionSchema).max(3),
});
export type ShiftAdjustmentShiftSuggestion = z.infer<
	typeof ShiftAdjustmentShiftSuggestionSchema
>;

export const SuggestShiftAdjustmentsOutputSchema = z.object({
	meta: z
		.object({
			timedOut: z.boolean().optional(),
		})
		.optional(),
	absence: StaffAbsenceInputSchema,
	affected: z.array(ShiftAdjustmentShiftSuggestionSchema),
});
export type SuggestShiftAdjustmentsOutput = z.infer<
	typeof SuggestShiftAdjustmentsOutputSchema
>;

import { dateJst } from '@/utils/date';
import { z } from 'zod';
import { ShiftStatusSchema } from './shift';
import {
	createJstDateInputSchema,
	createJstDateStringSchema,
	JstDateInputSchema,
} from './valueObjects/jstDate';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeValueSchema } from './valueObjects/time';
import { TimeRangeSchema } from './valueObjects/timeRange';

const toJstDay = (date: Date) => dateJst(date).startOf('day');

export const STAFF_ABSENCE_MAX_DAYS = 14;
export const STAFF_ABSENCE_DATE_FORMAT_MESSAGE =
	'日付はYYYY-MM-DD形式で指定してください';
export const STAFF_ABSENCE_INVALID_DATE_MESSAGE =
	'存在する日付を指定してください';
export const STAFF_ABSENCE_DATE_ORDER_MESSAGE =
	'開始日は終了日以前に設定してください';
export const STAFF_ABSENCE_MAX_RANGE_MESSAGE = `欠勤期間は最大${STAFF_ABSENCE_MAX_DAYS}日間までです`;
const STAFF_ABSENCE_PROCESSED_COUNT_EXCEEDS_TOTAL_MESSAGE =
	'processedCount は totalCount 以下である必要があります';
const STAFF_ABSENCE_PROCESSED_COUNT_MISMATCH_MESSAGE =
	'timedOut が false の場合、processedCount は totalCount と一致する必要があります';

const StaffAbsenceDateInputSchema = createJstDateInputSchema({
	formatMessage: STAFF_ABSENCE_DATE_FORMAT_MESSAGE,
	invalidDateMessage: STAFF_ABSENCE_INVALID_DATE_MESSAGE,
});
const StaffAbsenceDateStringSchema = createJstDateStringSchema({
	formatMessage: STAFF_ABSENCE_DATE_FORMAT_MESSAGE,
	invalidDateMessage: STAFF_ABSENCE_INVALID_DATE_MESSAGE,
});

export const addStaffAbsenceDateRangeValidationIssues = (params: {
	ctx: z.core.$RefinementCtx;
	startDate: unknown;
	endDate: unknown;
	startField?: string;
	endField?: string;
}) => {
	const startField = params.startField ?? 'startDate';
	const endField = params.endField ?? 'endDate';
	const parsedStartDate = StaffAbsenceDateInputSchema.safeParse(
		params.startDate,
	);
	const parsedEndDate = StaffAbsenceDateInputSchema.safeParse(params.endDate);

	if (!parsedStartDate.success || !parsedEndDate.success) {
		return;
	}

	const start = toJstDay(parsedStartDate.data);
	const end = toJstDay(parsedEndDate.data);

	if (start.isAfter(end)) {
		params.ctx.addIssue({
			code: 'custom',
			message: STAFF_ABSENCE_DATE_ORDER_MESSAGE,
			path: [startField],
		});
	}

	const diffDays = end.diff(start, 'day');
	if (diffDays > STAFF_ABSENCE_MAX_DAYS - 1) {
		params.ctx.addIssue({
			code: 'custom',
			message: STAFF_ABSENCE_MAX_RANGE_MESSAGE,
			path: [endField],
		});
	}
};

const addTimeRangeValidationIssues = (
	ctx: z.core.$RefinementCtx,
	start: unknown,
	end: unknown,
	startField: string,
	endField: string,
) => {
	const parsed = TimeRangeSchema.safeParse({ start, end });
	if (!parsed.success) {
		parsed.error.issues.forEach((issue) => {
			const mappedPath = issue.path.map((p) =>
				p === 'start' ? startField : p === 'end' ? endField : p,
			);
			ctx.addIssue({ ...issue, path: mappedPath });
		});
	}
};

/**
 * staff_absence（スタッフ急休）入力（Phase 1: DB永続化なし）
 */
export const StaffAbsenceInputSchema = z
	.object({
		staffId: z.uuid(),
		startDate: StaffAbsenceDateInputSchema,
		endDate: StaffAbsenceDateInputSchema,
		memo: z.string().max(500).optional(),
	})
	.superRefine((value, ctx) => {
		addStaffAbsenceDateRangeValidationIssues({
			ctx,
			startDate: value.startDate,
			endDate: value.endDate,
		});
	});

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
		addTimeRangeValidationIssues(
			ctx,
			val.newStartTime,
			val.newEndTime,
			'newStartTime',
			'newEndTime',
		);
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
 * 操作（`change_staff` または `update_shift_schedule`）
 *
 * - `ShiftAdjustmentOperationSchema` は上記2種類の discriminated union
 * - 提案（ShiftAdjustmentSuggestion）では operations が最大2件になり得る
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
		addTimeRangeValidationIssues(
			ctx,
			val.new_start_time,
			val.new_end_time,
			'new_start_time',
			'new_end_time',
		);
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

export const StaffCandidatePrioritySchema = z.enum([
	'past_assigned',
	'assigned',
	'available',
]);
export type StaffCandidatePriority = z.infer<
	typeof StaffCandidatePrioritySchema
>;

export const StaffCandidateSchema = z.object({
	staffId: z.uuid(),
	staffName: z.string().min(1),
	priority: StaffCandidatePrioritySchema,
});
export type StaffCandidate = z.infer<typeof StaffCandidateSchema>;

export const AffectedShiftWithCandidatesSchema = z.object({
	shift: ShiftSnapshotSchema,
	candidates: z.array(StaffCandidateSchema),
});
export type AffectedShiftWithCandidates = z.infer<
	typeof AffectedShiftWithCandidatesSchema
>;

export const StaffAbsenceProcessMetaSchema = z
	.object({
		timedOut: z.boolean(),
		processedCount: z.number().int().min(0),
		totalCount: z.number().int().min(0),
	})
	.superRefine((meta, ctx) => {
		if (meta.processedCount > meta.totalCount) {
			ctx.addIssue({
				code: 'custom',
				message: STAFF_ABSENCE_PROCESSED_COUNT_EXCEEDS_TOTAL_MESSAGE,
				path: ['processedCount'],
			});
		}

		if (!meta.timedOut && meta.processedCount !== meta.totalCount) {
			ctx.addIssue({
				code: 'custom',
				message: STAFF_ABSENCE_PROCESSED_COUNT_MISMATCH_MESSAGE,
				path: ['processedCount'],
			});
		}
	});
export type StaffAbsenceProcessMeta = z.infer<
	typeof StaffAbsenceProcessMetaSchema
>;

export const StaffAbsenceProcessResultSchema = z.object({
	meta: StaffAbsenceProcessMetaSchema,
	absenceStaffId: z.uuid(),
	absenceStaffName: z.string().min(1),
	startDate: StaffAbsenceDateStringSchema,
	endDate: StaffAbsenceDateStringSchema,
	affectedShifts: z.array(AffectedShiftWithCandidatesSchema),
	summary: z.string().min(1),
});
export type StaffAbsenceProcessResult = z.infer<
	typeof StaffAbsenceProcessResultSchema
>;

export const SuggestShiftAdjustmentsOutputSchema = z.object({
	meta: z
		.object({
			// 後方互換のため optional（旧クライアントでもパースできるようにする）
			timedOut: z.boolean().optional(),
		})
		.optional(),
	absence: StaffAbsenceInputSchema,
	affected: z.array(ShiftAdjustmentShiftSuggestionSchema),
});
export type SuggestShiftAdjustmentsOutput = z.infer<
	typeof SuggestShiftAdjustmentsOutputSchema
>;

export const SuggestClientDatetimeChangeAdjustmentsOutputSchema = z.object({
	meta: z
		.object({
			timedOut: z.boolean().optional(),
		})
		.optional(),
	change: ClientDatetimeChangeInputSchema,
	target: z.object({
		shift: ShiftSnapshotSchema,
		suggestions: z.array(ShiftAdjustmentSuggestionSchema),
	}),
});
export type SuggestClientDatetimeChangeAdjustmentsOutput = z.infer<
	typeof SuggestClientDatetimeChangeAdjustmentsOutputSchema
>;

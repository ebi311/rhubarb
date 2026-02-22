import { z } from 'zod';
import { ShiftStatusSchema } from './shift';
import { JstDateInputSchema } from './valueObjects/jstDate';
import { ServiceTypeIdSchema } from './valueObjects/serviceTypeId';
import { TimeValueSchema } from './valueObjects/time';
import { getJstDateOnly } from '@/utils/date';

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
	.refine((v) => v.startDate <= v.endDate, {
		message: 'startDate must be before or equal to endDate',
		path: ['endDate'],
	})
	.refine(
		(v) => {
			const start = getJstDateOnly(v.startDate);
			const end = getJstDateOnly(v.endDate);
			const diffDays = Math.floor(
				(end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
			);
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
export const ShiftAdjustmentOperationSchema = z.object({
	type: z.literal('change_staff'),
	shift_id: z.uuid(),
	from_staff_id: z.uuid(),
	to_staff_id: z.uuid(),
});
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
	absence: StaffAbsenceInputSchema,
	affected: z.array(ShiftAdjustmentShiftSuggestionSchema),
});
export type SuggestShiftAdjustmentsOutput = z.infer<
	typeof SuggestShiftAdjustmentsOutputSchema
>;

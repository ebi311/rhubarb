import { ShiftAdjustmentSuggestionService } from '@/backend/services/shiftAdjustmentSuggestionService';
import type { Database } from '@/backend/types/supabase';
import {
	addStaffAbsenceDateRangeValidationIssues,
	STAFF_ABSENCE_DATE_FORMAT_MESSAGE,
	STAFF_ABSENCE_INVALID_DATE_MESSAGE,
	STAFF_ABSENCE_MAX_DAYS,
	StaffAbsenceProcessResult,
	StaffAbsenceProcessResultSchema,
} from '@/models/shiftAdjustmentActionSchemas';
import { createJstDateStringSchema } from '@/models/valueObjects/jstDate';
import { parseJstDateString } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';

export const ProcessStaffAbsenceParametersSchema = z
	.object({
		staffId: z.string().uuid().describe('欠勤するスタッフのID'),
		startDate: createJstDateStringSchema({
			formatMessage: STAFF_ABSENCE_DATE_FORMAT_MESSAGE,
			invalidDateMessage: STAFF_ABSENCE_INVALID_DATE_MESSAGE,
		}).describe('欠勤開始日 (YYYY-MM-DD)'),
		endDate: createJstDateStringSchema({
			formatMessage: STAFF_ABSENCE_DATE_FORMAT_MESSAGE,
			invalidDateMessage: STAFF_ABSENCE_INVALID_DATE_MESSAGE,
		}).describe('欠勤終了日 (YYYY-MM-DD)'),
		memo: z.string().max(500).optional().describe('メモ（任意）'),
	})
	.superRefine((data, ctx) => {
		addStaffAbsenceDateRangeValidationIssues({
			ctx,
			startDate: data.startDate,
			endDate: data.endDate,
			startField: 'startDate',
			endField: 'endDate',
		});
	});

export type ProcessStaffAbsenceParameters = z.infer<
	typeof ProcessStaffAbsenceParametersSchema
>;

type CreateProcessStaffAbsenceToolOptions = {
	supabase: SupabaseClient<Database>;
	userId: string;
};

/**
 * スタッフ欠勤処理 Tool を作成する
 * Vercel AI SDK v6 の tool 関数を使用
 */
export const createProcessStaffAbsenceTool = (
	options: CreateProcessStaffAbsenceToolOptions,
): Tool<ProcessStaffAbsenceParameters, StaffAbsenceProcessResult> => {
	const { supabase, userId } = options;

	return tool({
		description: `スタッフの欠勤を登録し、影響するシフトと代替候補スタッフを取得します。欠勤期間は最大${STAFF_ABSENCE_MAX_DAYS}日間まで指定できます。`,
		inputSchema: ProcessStaffAbsenceParametersSchema,
		outputSchema: StaffAbsenceProcessResultSchema,
		execute: async (
			params: ProcessStaffAbsenceParameters,
		): Promise<StaffAbsenceProcessResult> => {
			const service = new ShiftAdjustmentSuggestionService(supabase);

			// 日付文字列を Date に変換して Service に渡す
			const startDate = parseJstDateString(params.startDate);
			const endDate = parseJstDateString(params.endDate);

			const result = await service.processStaffAbsence(userId, {
				staffId: params.staffId,
				startDate,
				endDate,
				memo: params.memo,
			});

			return StaffAbsenceProcessResultSchema.parse(result);
		},
	});
};

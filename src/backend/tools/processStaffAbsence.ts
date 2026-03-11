import {
	ShiftAdjustmentSuggestionService,
	StaffAbsenceProcessResult,
} from '@/backend/services/shiftAdjustmentSuggestionService';
import { getDaysDifference, isValidDate } from '@/backend/tools/_shared';
import { Database } from '@/backend/types/supabase';
import { parseJstDateString } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';

/** 欠勤期間の最大日数 */
const MAX_ABSENCE_DAYS = 14;

export const ProcessStaffAbsenceParametersSchema = z
	.object({
		staffId: z.string().uuid().describe('欠勤するスタッフのID'),
		startDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定してください')
			.refine(isValidDate, '存在する日付を指定してください')
			.describe('欠勤開始日 (YYYY-MM-DD)'),
		endDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定してください')
			.refine(isValidDate, '存在する日付を指定してください')
			.describe('欠勤終了日 (YYYY-MM-DD)'),
		memo: z.string().max(500).optional().describe('メモ（任意）'),
	})
	.refine((data) => data.startDate <= data.endDate, {
		message: '開始日は終了日以前に設定してください',
		path: ['startDate'],
	})
	.refine(
		(data) =>
			getDaysDifference(data.startDate, data.endDate) <= MAX_ABSENCE_DAYS,
		{
			message: '欠勤期間は最大14日間までです',
			path: ['endDate'],
		},
	);

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
		description:
			'スタッフの欠勤を登録し、影響するシフトと代替候補スタッフを取得します。欠勤期間は最大14日間まで指定できます。',
		inputSchema: ProcessStaffAbsenceParametersSchema,
		execute: async (
			params: ProcessStaffAbsenceParameters,
		): Promise<StaffAbsenceProcessResult> => {
			const service = new ShiftAdjustmentSuggestionService(supabase);

			// 日付文字列を Date に変換して Service に渡す
			const startDate = parseJstDateString(params.startDate);
			const endDate = parseJstDateString(params.endDate);

			return service.processStaffAbsence(userId, {
				staffId: params.staffId,
				startDate,
				endDate,
				memo: params.memo,
			});
		},
	});
};

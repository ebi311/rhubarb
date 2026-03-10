import {
	AvailableHelper,
	ShiftAdjustmentSuggestionService,
} from '@/backend/services/shiftAdjustmentSuggestionService';
import { Database } from '@/backend/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { tool, Tool } from 'ai';
import dayjs from 'dayjs';
import { z } from 'zod';

const TimeSchema = z.object({
	hour: z.number().int().min(0).max(23),
	minute: z.number().int().min(0).max(59),
});

const timeToMinutes = (time: { hour: number; minute: number }): number =>
	time.hour * 60 + time.minute;

/**
 * 日付文字列が実在する日付かどうかを検証する
 * 正規表現で形式は確認済みの前提で、dayjs の strict parsing で実在性をチェック
 */
const isValidDate = (dateStr: string): boolean => {
	const parsed = dayjs(dateStr, 'YYYY-MM-DD', true);
	// strict parsing で isValid() かつ、parse した結果が元の文字列と一致することを確認
	return parsed.isValid() && parsed.format('YYYY-MM-DD') === dateStr;
};

export const SearchAvailableHelpersParametersSchema = z
	.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定してください')
			.refine(isValidDate, '存在する日付を指定してください'),
		startTime: TimeSchema.describe('開始時刻'),
		endTime: TimeSchema.describe('終了時刻'),
		clientId: z
			.string()
			.uuid()
			.optional()
			.describe('利用者ID（指定時はその利用者に割当可能なスタッフに絞る）'),
	})
	.refine(
		(data) => timeToMinutes(data.startTime) < timeToMinutes(data.endTime),
		{
			message: '開始時刻は終了時刻より前に設定してください',
			path: ['startTime'],
		},
	);

export type SearchAvailableHelpersParameters = z.infer<
	typeof SearchAvailableHelpersParametersSchema
>;

type CreateSearchAvailableHelpersToolOptions = {
	supabase: SupabaseClient<Database>;
	officeId: string;
};

/**
 * 空きヘルパー検索 Tool を作成する
 * Vercel AI SDK v6 の tool 関数を使用
 */
export const createSearchAvailableHelpersTool = (
	options: CreateSearchAvailableHelpersToolOptions,
): Tool<SearchAvailableHelpersParameters, AvailableHelper[]> => {
	const { supabase, officeId } = options;

	return tool({
		description:
			'指定した日時に空きのあるヘルパーを検索します。最大5人まで返却されます。利用者IDを指定すると、その利用者に割当可能なスタッフに絞り込まれます。',
		inputSchema: SearchAvailableHelpersParametersSchema,
		execute: async (
			params: SearchAvailableHelpersParameters,
		): Promise<AvailableHelper[]> => {
			const service = new ShiftAdjustmentSuggestionService(supabase);
			return service.findAvailableHelpers(officeId, {
				date: params.date,
				startTime: params.startTime,
				endTime: params.endTime,
				clientId: params.clientId,
			});
		},
	});
};

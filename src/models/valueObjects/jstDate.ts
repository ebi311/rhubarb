import { parseJstDateString } from '@/utils/date';
import { z } from 'zod';

/**
 * YYYY-MM-DD 形式の文字列を JST として解釈し Date に変換するスキーマ
 * 例: "2026-01-19" → JST 2026-01-19 00:00:00 の Date
 *
 * 訪問介護の業務は日本時間で行われるため、日付は常に JST として解釈する
 */
export const JstDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD')
	.transform((str) => parseJstDateString(str));

export type JstDate = z.infer<typeof JstDateSchema>;

/**
 * Date または YYYY-MM-DD 形式の文字列を受け付け、JST として Date に変換するスキーマ
 * フォームからは Date が、API からは文字列が来る可能性があるため両対応
 */
export const JstDateInputSchema = z
	.union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')])
	.transform((val) => {
		if (val instanceof Date) return val;
		return parseJstDateString(val);
	});

export type JstDateInput = z.infer<typeof JstDateInputSchema>;

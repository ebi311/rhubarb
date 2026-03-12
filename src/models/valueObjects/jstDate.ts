import { parseJstDateString } from '@/utils/date';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

export const JST_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type JstDateValidationMessages = {
	formatMessage?: string;
	invalidDateMessage?: string;
};

const DEFAULT_JST_DATE_FORMAT_MESSAGE =
	'Invalid date format. Expected YYYY-MM-DD';
const DEFAULT_JST_DATE_INVALID_MESSAGE = 'Invalid date';

/**
 * 日付文字列が実在する日付かどうかを検証する
 * UTC 固定で解析することで、環境のタイムゾーンに依存しない判定を行う
 */
export const isValidJstDateString = (dateStr: string): boolean => {
	const parsed = dayjs.utc(dateStr, 'YYYY-MM-DD', true);
	return parsed.isValid() && parsed.format('YYYY-MM-DD') === dateStr;
};

/**
 * 2つの日付文字列の日数差を計算する（終了日 - 開始日 + 1）
 */
export const getInclusiveJstDateRangeDays = (
	startDate: string,
	endDate: string,
): number => {
	const start = dayjs.utc(startDate, 'YYYY-MM-DD', true);
	const end = dayjs.utc(endDate, 'YYYY-MM-DD', true);
	return end.diff(start, 'day') + 1;
};

export const createJstDateStringSchema = (
	messages: JstDateValidationMessages = {},
) => {
	const formatMessage =
		messages.formatMessage ?? DEFAULT_JST_DATE_FORMAT_MESSAGE;
	const invalidDateMessage =
		messages.invalidDateMessage ?? DEFAULT_JST_DATE_INVALID_MESSAGE;

	return z
		.string()
		.regex(JST_DATE_REGEX, formatMessage)
		.refine(isValidJstDateString, invalidDateMessage);
};

export const JstDateStringSchema = createJstDateStringSchema();

/**
 * YYYY-MM-DD 形式の文字列を JST として解釈し Date に変換するスキーマ
 * 例: "2026-01-19" → JST 2026-01-19 00:00:00 の Date
 *
 * 訪問介護の業務は日本時間で行われるため、日付は常に JST として解釈する
 */
export const JstDateSchema = JstDateStringSchema.transform((str) =>
	parseJstDateString(str),
);

export type JstDate = z.infer<typeof JstDateSchema>;

/**
 * Date または YYYY-MM-DD 形式の文字列を受け付け、JST として Date に変換するスキーマ
 * フォームからは Date が、API からは文字列が来る可能性があるため両対応
 */
export const createJstDateInputSchema = (
	messages: JstDateValidationMessages = {},
) =>
	z.union([z.date(), createJstDateStringSchema(messages)]).transform((val) => {
		if (val instanceof Date) return val;
		return parseJstDateString(val);
	});

export const JstDateInputSchema = createJstDateInputSchema();

export type JstDateInput = z.infer<typeof JstDateInputSchema>;

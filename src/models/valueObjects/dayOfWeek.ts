import { z } from 'zod';

const dayOfWeekValues = [
	'Mon',
	'Tue',
	'Wed',
	'Thu',
	'Fri',
	'Sat',
	'Sun',
] as const;
export const DayOfWeekSchema = z.enum(dayOfWeekValues);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

/** 曜日の配列（月〜日の順序） */
export const WEEKDAYS: readonly DayOfWeek[] = dayOfWeekValues;

/** 曜日の日本語ラベル（短縮形） */
export const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
	Mon: '月',
	Tue: '火',
	Wed: '水',
	Thu: '木',
	Fri: '金',
	Sat: '土',
	Sun: '日',
};

/** 曜日の完全な日本語ラベル */
export const WEEKDAY_FULL_LABELS: Record<DayOfWeek, string> = {
	Mon: '月曜日',
	Tue: '火曜日',
	Wed: '水曜日',
	Thu: '木曜日',
	Fri: '金曜日',
	Sat: '土曜日',
	Sun: '日曜日',
};

/**
 * JavaScript の Date.getDay() のインデックス (0=日曜, 1=月曜, ..., 6=土曜) に対応する日本語ラベル
 * getJstDayOfWeek() の戻り値をそのまま使用できる
 */
export const DAY_OF_WEEK_LABELS_BY_INDEX: readonly string[] = [
	'日',
	'月',
	'火',
	'水',
	'木',
	'金',
	'土',
];

import { z } from 'zod';
import { timeToMinutes, TimeValueSchema } from './time';

export const TimeRangeSchema = z
	.object({
		start: TimeValueSchema,
		end: TimeValueSchema,
	})
	.refine(
		(data) => {
			const start = timeToMinutes(data.start);
			const end = timeToMinutes(data.end);
			return start < end;
		},
		{
			message: '開始時間は終了時間より前である必要があります',
			path: ['end'],
		},
	);

export type TimeRange = z.infer<typeof TimeRangeSchema>;

/**
 * TimeRangeの開始・終了時刻を0時からの経過分数に変換します。
 * @param range - 変換する時間範囲
 * @returns 開始・終了時刻の経過分数
 * @example
 * timeRangeToMinutes({ start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 30 } })
 * // => { start: 540, end: 750 }
 */
export const timeRangeToMinutes = (
	range: TimeRange,
): { start: number; end: number } => {
	return {
		start: timeToMinutes(range.start),
		end: timeToMinutes(range.end),
	};
};

/**
 * 2つの時間範囲が重複しているかを判定します。
 * 開始時刻または終了時刻が一致する場合は重複とみなしません。
 * @param range1 - 時間範囲1
 * @param range2 - 時間範囲2
 * @returns 重複している場合true
 * @example
 * isTimeRangeOverlap(
 *   { start: { hour: 9, minute: 0 }, end: { hour: 12, minute: 0 } },
 *   { start: { hour: 11, minute: 0 }, end: { hour: 14, minute: 0 } }
 * ) // => true
 */
export const isTimeRangeOverlap = (
	range1: TimeRange,
	range2: TimeRange,
): boolean => {
	const r1 = timeRangeToMinutes(range1);
	const r2 = timeRangeToMinutes(range2);
	return r1.start < r2.end && r2.start < r1.end;
};

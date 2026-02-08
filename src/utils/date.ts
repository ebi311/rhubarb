import { TimeValue } from '@/models/valueObjects/time';
import dayjs, { Dayjs } from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('UTC');
dayjs.extend(advancedFormat);
dayjs.extend(isoWeek);

const JST = 'Asia/Tokyo';

/**
 * Date を JST の dayjs オブジェクトに変換
 */
export const dateJst = (date: Date): Dayjs => {
	return dayjs(date).tz(JST);
};

/**
 * YYYY-MM-DD 形式の文字列を JST として解釈し Date に変換
 * 例: "2026-01-19" → JST 2026-01-19 00:00:00 の Date
 */
export const parseJstDateString = (dateStr: string): Date => {
	// ISO 形式の場合、dayjs にわたすと、タイムゾーンの指定が無視されるので、	Date に変換してから渡す
	let ds: string | Date = dateStr;
	if (/^T[\d:]+[z+-]/i.test(dateStr)) {
		ds = new Date(dateStr);
	}
	return dayjs.tz(ds, JST).toDate();
};

/**
 * Date を JST の YYYY-MM-DD 形式の文字列に変換
 */
export const formatJstDateString = (date: Date): string => {
	return dayjs(date).tz(JST).format('YYYY-MM-DD');
};

/**
 * Date から JST での時 (0-23) を取得
 */
export const getJstHours = (date: Date): number => {
	return dayjs(date).tz(JST).hour();
};

/**
 * Date から JST での分 (0-59) を取得
 */
export const getJstMinutes = (date: Date): number => {
	return dayjs(date).tz(JST).minute();
};

/**
 * 指定した Date の JST 日付部分に、指定した時刻を設定した Date を返す
 * 例: date が JST 2026-01-19 15:30 で、hours=9, minutes=0 なら
 *     JST 2026-01-19 09:00:00 を返す
 */
export const setJstTime = (
	date: Date,
	hours: number,
	minutes: number,
): Date => {
	return dayjs(date)
		.tz(JST)
		.startOf('day')
		.hour(hours)
		.minute(minutes)
		.toDate();
};

/**
 * Date から JST での曜日を取得 (0=日, 1=月, 2=火, ..., 6=土)
 */
export const getJstDayOfWeek = (date: Date): number => {
	return dayjs(date).tz(JST).day();
};

/**
 * 指定した Date の JST 日付部分のみの Date を返す（時刻は 00:00:00）
 */
export const getJstDateOnly = (date: Date): Date => {
	return dayjs(date).tz(JST).startOf('day').toDate();
};

/**
 * 指定した Date に日数を加算した Date を返す（JST ベース）
 */
export const addJstDays = (date: Date, days: number): Date => {
	return dayjs(date).tz(JST).add(days, 'day').toDate();
};

/**
 * time with time zone 形式の文字列を HH:mm 形式にフォーマット
 * 例: "09:00:00+00" -> "09:00"
 * 例: "13:30:00+09" -> "13:30"
 */
export const formatTime = (timeString: string): string => {
	if (!/^\d{2}:\d{2}(:\d{2})?[+-](\d{2}|\d{4}|\d{2}:\d{2})$/.test(timeString)) {
		throw new Error(`Invalid time string: ${timeString}`);
	}
	// 最後が [+-]HH$ の場合は、末尾に "00" を追加する
	const normalizedTimeString = timeString.replace(/([+-]\d{2})$/, '$100');
	const dt = dayjs(`1970-01-01T${normalizedTimeString}`);
	if (!dt.isValid()) {
		throw new Error(`Invalid time string: ${timeString}`);
	}
	const dtJST = dt.tz(JST);
	return dtJST.format('HH:mm');
};

export const parseTimeString = (
	timeString: string,
): { hour: number; minute: number } => {
	const formatted = formatTime(timeString);
	const [hourStr, minuteStr] = formatted.split(':');
	return {
		hour: parseInt(hourStr, 10),
		minute: parseInt(minuteStr, 10),
	};
};

export const timeObjectToString = (time: TimeValue): string => {
	const hourStr = time.hour.toString().padStart(2, '0');
	const minuteStr = time.minute.toString().padStart(2, '0');
	return `${hourStr}:${minuteStr}`;
};

/**
 * HH:mm 形式の文字列を TimeValue オブジェクトに変換
 * 例: "09:30" -> { hour: 9, minute: 30 }
 * 不正な形式の場合は null を返す
 */
export const stringToTimeObject = (timeString: string): TimeValue | null => {
	const match = timeString.match(/^(\d{2}):(\d{2})$/);
	if (!match) {
		return null;
	}
	const hour = parseInt(match[1], 10);
	const minute = parseInt(match[2], 10);
	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return null;
	}
	return { hour, minute };
};
export const timeObjectToStringWithTimezone = (time: TimeValue): string => {
	const hourStr = time.hour.toString().padStart(2, '0');
	const minuteStr = time.minute.toString().padStart(2, '0');
	return `${hourStr}:${minuteStr}+09:00`;
};

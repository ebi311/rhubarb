import { getJstDateOnly, getJstDayOfWeek, parseJstDateString } from '@/utils/date';
import dayjs from 'dayjs';

/**
 * 指定日を含む週の月曜日を取得（JST ベース）
 * 日曜日(0)は前週の月曜日を返す
 */
export const getMonday = (date: Date): Date => {
	const dayOfWeek = getJstDayOfWeek(date);
	// 日曜日(0)の場合は-6日、月曜日(1)は0日、火曜日(2)は-1日、...、土曜日(6)は-5日
	const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
	const mondayDate = getJstDateOnly(date);
	// dayjs で日数を引く
	return dayjs(mondayDate).subtract(daysToSubtract, 'day').toDate();
};

/**
 * Next.js page の searchParams の型
 */
export type SearchParams = {
	[key: string]: string | string[] | undefined;
};

/**
 * searchParams をパースした結果
 */
export type ParsedSearchParams = {
	weekStartDate: Date | null;
	isValid: boolean;
	error?: 'invalid_date' | 'not_monday';
};

/**
 * Next.js page の searchParams をパースする
 */
export const parseSearchParams = (params: SearchParams): ParsedSearchParams => {
	const weekRaw = params.week;
	const week = typeof weekRaw === 'string' ? weekRaw : undefined;

	// week 未指定または空文字
	if (!week) {
		return {
			weekStartDate: null,
			isValid: false,
		};
	}

	// YYYY-MM-DD 形式チェック（正規表現で厳密に）
	const datePattern = /^\d{4}-\d{2}-\d{2}$/;
	if (!datePattern.test(week) || !dayjs(week, 'YYYY-MM-DD', true).isValid()) {
		return {
			weekStartDate: null,
			isValid: false,
			error: 'invalid_date',
		};
	}

	// 日付としてパース
	const parsedDate = parseJstDateString(week);

	// 月曜日かどうかチェック
	const dayOfWeek = getJstDayOfWeek(parsedDate);
	if (dayOfWeek !== 1) {
		return {
			weekStartDate: parsedDate,
			isValid: false,
			error: 'not_monday',
		};
	}

	return {
		weekStartDate: parsedDate,
		isValid: true,
	};
};

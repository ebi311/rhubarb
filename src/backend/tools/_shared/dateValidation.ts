import {
	getInclusiveJstDateRangeDays,
	isValidJstDateString,
} from '@/models/valueObjects/jstDate';

/**
 * 日付文字列が実在する日付かどうかを検証する
 */
export const isValidDate = (dateStr: string): boolean => {
	return isValidJstDateString(dateStr);
};

/**
 * 2つの日付間の日数差を計算する（終了日 - 開始日 + 1）
 * @returns 日数（両端含む）
 */
export const getDaysDifference = (
	startDate: string,
	endDate: string,
): number => {
	return getInclusiveJstDateRangeDays(startDate, endDate);
};

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';

// customParseFormat プラグインを有効化（strict parsing に必要）
dayjs.extend(customParseFormat);
// UTC プラグインを有効化
dayjs.extend(utc);

/**
 * 日付文字列が実在する日付かどうかを検証する
 * UTC 固定で解析することで、環境のタイムゾーンに依存しない判定を行う
 * 正規表現で形式は確認済みの前提で、dayjs の strict parsing で実在性をチェック
 */
export const isValidDate = (dateStr: string): boolean => {
	// UTC 固定でパースし、タイムゾーンの影響を排除
	const parsed = dayjs.utc(dateStr, 'YYYY-MM-DD', true);
	// strict parsing で isValid() かつ、parse した結果が元の文字列と一致することを確認
	return parsed.isValid() && parsed.format('YYYY-MM-DD') === dateStr;
};

/**
 * 2つの日付間の日数差を計算する（終了日 - 開始日 + 1）
 * @returns 日数（両端含む）
 */
export const getDaysDifference = (
	startDate: string,
	endDate: string,
): number => {
	const start = dayjs.utc(startDate, 'YYYY-MM-DD', true);
	const end = dayjs.utc(endDate, 'YYYY-MM-DD', true);
	return end.diff(start, 'day') + 1;
};

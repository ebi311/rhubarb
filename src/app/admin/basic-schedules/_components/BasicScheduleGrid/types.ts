import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';

/** グリッド表示用のセル情報 */
export interface BasicScheduleCell {
	id: string;
	timeRange: string; // "HH:MM - HH:MM"
	serviceTypeId: ServiceTypeId;
	staffNames: string[];
	note: string | null;
}

/** 利用者 × 曜日のマトリクス構造 */
export interface BasicScheduleGridViewModel {
	clientId: string;
	clientName: string;
	schedulesByWeekday: {
		Mon?: BasicScheduleCell[];
		Tue?: BasicScheduleCell[];
		Wed?: BasicScheduleCell[];
		Thu?: BasicScheduleCell[];
		Fri?: BasicScheduleCell[];
		Sat?: BasicScheduleCell[];
		Sun?: BasicScheduleCell[];
	};
}

/** 曜日の配列（月〜日の順序） */
export const WEEKDAYS: readonly DayOfWeek[] = [
	'Mon',
	'Tue',
	'Wed',
	'Thu',
	'Fri',
	'Sat',
	'Sun',
] as const;

/** 曜日の日本語ラベル */
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

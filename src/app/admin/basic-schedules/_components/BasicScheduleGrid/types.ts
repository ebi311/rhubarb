import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';

// 曜日定数は @/models/valueObjects/dayOfWeek から再エクスポート
export {
	WEEKDAY_FULL_LABELS,
	WEEKDAY_LABELS,
	WEEKDAYS,
} from '@/models/valueObjects/dayOfWeek';

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

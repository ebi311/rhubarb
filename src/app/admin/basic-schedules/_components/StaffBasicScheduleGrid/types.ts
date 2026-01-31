import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';

/** スタッフ別グリッド表示用のセル情報 */
export interface StaffScheduleCell {
	id: string;
	timeRange: string; // "HH:mm - HH:mm"
	serviceTypeId: ServiceTypeId;
	clientName: string;
	note: string | null;
}

/** スタッフ × 曜日のマトリクス構造 */
export interface StaffBasicScheduleGridViewModel {
	/** スタッフID（未割り当ての場合はnull） */
	staffId: string | null;
	/** スタッフ名（未割り当ての場合は「未割り当て」） */
	staffName: string;
	/** 曜日ごとのスケジュール */
	schedulesByWeekday: {
		Mon?: StaffScheduleCell[];
		Tue?: StaffScheduleCell[];
		Wed?: StaffScheduleCell[];
		Thu?: StaffScheduleCell[];
		Fri?: StaffScheduleCell[];
		Sat?: StaffScheduleCell[];
		Sun?: StaffScheduleCell[];
	};
}

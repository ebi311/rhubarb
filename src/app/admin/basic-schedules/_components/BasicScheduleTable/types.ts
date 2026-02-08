import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';

/** テーブル表示用の基本スケジュールビューモデル */
export interface BasicScheduleViewModel {
	id: string;
	clientId: string;
	clientName: string;
	serviceTypeId: ServiceTypeId;
	weekday: DayOfWeek;
	timeRange: string; // "HH:MM - HH:MM"
	staffNames: string[];
	note: string | null;
}

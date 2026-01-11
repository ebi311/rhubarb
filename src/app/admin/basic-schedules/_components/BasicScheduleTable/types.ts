import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';

/** テーブル表示用の基本スケジュールビューモデル */
export interface BasicScheduleViewModel {
	id: string;
	clientName: string;
	serviceTypeName: string;
	weekday: DayOfWeek;
	timeRange: string; // "HH:MM - HH:MM"
	staffNames: string[];
	note: string | null;
}

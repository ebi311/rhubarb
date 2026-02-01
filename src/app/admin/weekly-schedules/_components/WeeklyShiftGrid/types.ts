import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import type { ShiftStatus } from '../ShiftTable';

// 曜日定数は @/models/valueObjects/dayOfWeek から再エクスポート
export {
	WEEKDAY_FULL_LABELS,
	WEEKDAY_LABELS,
	WEEKDAYS,
} from '@/models/valueObjects/dayOfWeek';

/** グリッド表示用のセル情報 */
export interface WeeklyShiftCell {
	id: string;
	date: Date;
	timeRange: string; // "HH:MM - HH:MM"
	serviceTypeId: ServiceTypeId;
	staffId: string | null;
	staffName: string | null;
	status: ShiftStatus;
	isUnassigned: boolean;
	cancelReason?: string | null;
	cancelCategory?: string | null;
}

/** 利用者 × 日付のマトリクス構造 */
export interface WeeklyShiftGridViewModel {
	clientId: string;
	clientName: string;
	shiftsByDate: {
		[dateKey: string]: WeeklyShiftCell[]; // キーは 'YYYY-MM-DD'
	};
}

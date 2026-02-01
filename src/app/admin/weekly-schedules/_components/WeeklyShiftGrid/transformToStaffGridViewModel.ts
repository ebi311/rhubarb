import { formatJstDateString } from '@/utils/date';
import type { ShiftDisplayRow } from '../ShiftTable';
import type {
	StaffWeeklyShiftCell,
	StaffWeeklyShiftGridViewModel,
} from './types';

/**
 * 時間を HH:MM 形式にフォーマット
 */
const formatTime = (time: { hour: number; minute: number }): string => {
	return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
};

/**
 * ShiftDisplayRow から StaffWeeklyShiftCell を作成
 */
const createStaffShiftCell = (
	shift: ShiftDisplayRow,
): StaffWeeklyShiftCell => ({
	id: shift.id,
	date: shift.date,
	timeRange: `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`,
	serviceTypeId: shift.serviceTypeId,
	clientName: shift.clientName,
	status: shift.status,
	cancelReason: shift.cancelReason,
	cancelCategory: shift.cancelCategory,
});

/**
 * スタッフごとにシフトをグルーピング
 */
const groupShiftsByStaff = (shifts: ShiftDisplayRow[]) => {
	const staffMap = new Map<string, ShiftDisplayRow[]>();
	const unassignedShifts: ShiftDisplayRow[] = [];

	for (const shift of shifts) {
		if (!shift.staffId || !shift.staffName) {
			unassignedShifts.push(shift);
			continue;
		}

		const key = shift.staffId;
		const existing = staffMap.get(key);
		if (existing) {
			existing.push(shift);
		} else {
			staffMap.set(key, [shift]);
		}
	}

	return { staffMap, unassignedShifts };
};

/**
 * シフトを日付ごとにグルーピングし、時刻順にソート
 */
const groupShiftsByDate = (
	shifts: ShiftDisplayRow[],
): StaffWeeklyShiftGridViewModel['shiftsByDate'] => {
	const shiftsByDate: StaffWeeklyShiftGridViewModel['shiftsByDate'] = {};

	for (const shift of shifts) {
		const dateKey = formatJstDateString(shift.date);
		const cell = createStaffShiftCell(shift);

		if (shiftsByDate[dateKey]) {
			shiftsByDate[dateKey].push(cell);
		} else {
			shiftsByDate[dateKey] = [cell];
		}
	}

	// 各日付のセルを開始時刻でソート
	for (const dateKey of Object.keys(shiftsByDate)) {
		shiftsByDate[dateKey].sort((a, b) =>
			a.timeRange.localeCompare(b.timeRange, 'ja'),
		);
	}

	return shiftsByDate;
};

/**
 * リスト形式のシフトデータをスタッフ別グリッド形式に変換する
 * @param shifts - リスト形式のシフトデータ
 * @returns スタッフ別グリッド形式のシフトデータ（スタッフ名昇順、未割当は最後）
 */
export const transformToStaffGridViewModel = (
	shifts: ShiftDisplayRow[],
): StaffWeeklyShiftGridViewModel[] => {
	const { staffMap, unassignedShifts } = groupShiftsByStaff(shifts);

	const gridViewModels: StaffWeeklyShiftGridViewModel[] = [];

	// スタッフごとのビューモデルを作成
	for (const [staffId, staffShifts] of staffMap.entries()) {
		const staffName = staffShifts[0].staffName!;
		gridViewModels.push({
			staffId,
			staffName,
			shiftsByDate: groupShiftsByDate(staffShifts),
		});
	}

	// スタッフ名でソート（日本語対応）
	gridViewModels.sort((a, b) => a.staffName.localeCompare(b.staffName, 'ja'));

	// 未割当シフトがあれば最後に追加
	if (unassignedShifts.length > 0) {
		gridViewModels.push({
			staffId: null,
			staffName: '未割当',
			shiftsByDate: groupShiftsByDate(unassignedShifts),
		});
	}

	return gridViewModels;
};

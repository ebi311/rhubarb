import { formatJstDateString } from '@/utils/date';
import type { ShiftDisplayRow } from '../ShiftTable';
import type { WeeklyShiftCell, WeeklyShiftGridViewModel } from './types';

/**
 * 時間を HH:MM 形式にフォーマット
 */
const formatTime = (time: { hour: number; minute: number }): string => {
	return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
};

/**
 * リスト形式のシフトデータをグリッド形式に変換する
 * @param shifts - リスト形式のシフトデータ
 * @returns グリッド形式のシフトデータ（利用者名昇順）
 */
export const transformToGridViewModel = (
	shifts: ShiftDisplayRow[],
): WeeklyShiftGridViewModel[] => {
	// 利用者ごとにグルーピング（キーは clientId）
	const clientMap = new Map<
		string,
		{ clientName: string; shifts: ShiftDisplayRow[] }
	>();

	for (const shift of shifts) {
		const key = shift.clientId;
		const existing = clientMap.get(key);
		if (existing) {
			existing.shifts.push(shift);
		} else {
			clientMap.set(key, { clientName: shift.clientName, shifts: [shift] });
		}
	}

	// グリッド形式に変換
	const gridViewModels: WeeklyShiftGridViewModel[] = [];

	for (const [clientId, clientGroup] of clientMap.entries()) {
		const clientName = clientGroup.clientName;
		const clientShifts = clientGroup.shifts;
		// 日付ごとにグルーピング
		const shiftsByDate: WeeklyShiftGridViewModel['shiftsByDate'] = {};

		for (const shift of clientShifts) {
			const dateKey = formatJstDateString(shift.date);
			const cell: WeeklyShiftCell = {
				id: shift.id,
				date: shift.date,
				timeRange: `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`,
				serviceTypeId: shift.serviceTypeId,
				staffId: shift.staffId,
				staffName: shift.staffName,
				status: shift.status,
				isUnassigned: shift.isUnassigned,
				cancelReason: shift.cancelReason,
				cancelCategory: shift.cancelCategory,
			};

			if (shiftsByDate[dateKey]) {
				shiftsByDate[dateKey].push(cell);
			} else {
				shiftsByDate[dateKey] = [cell];
			}
		}

		// 各日付のセルを開始時刻でソート
		for (const dateKey of Object.keys(shiftsByDate)) {
			const cells = shiftsByDate[dateKey];
			if (cells) {
				cells.sort((a, b) => {
					// timeRange は "HH:MM - HH:MM" の形式
					const timeA = a.timeRange.split(' - ')[0];
					const timeB = b.timeRange.split(' - ')[0];
					return timeA.localeCompare(timeB);
				});
			}
		}

		gridViewModels.push({
			clientId,
			clientName,
			shiftsByDate,
		});
	}

	// 利用者名でソート（日本語対応）
	gridViewModels.sort((a, b) => a.clientName.localeCompare(b.clientName, 'ja'));

	return gridViewModels;
};

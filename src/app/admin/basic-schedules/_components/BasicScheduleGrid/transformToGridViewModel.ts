import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import type { BasicScheduleCell, BasicScheduleGridViewModel } from './types';

/**
 * リスト形式のスケジュールデータをグリッド形式に変換する
 * @param schedules - リスト形式のスケジュールデータ
 * @returns グリッド形式のスケジュールデータ（利用者名昇順）
 */
export const transformToGridViewModel = (
	schedules: BasicScheduleViewModel[],
): BasicScheduleGridViewModel[] => {
	// 利用者ごとにグルーピング
	const clientMap = new Map<string, BasicScheduleViewModel[]>();

	for (const schedule of schedules) {
		const key = `${schedule.clientName}`;
		const existing = clientMap.get(key);
		if (existing) {
			existing.push(schedule);
		} else {
			clientMap.set(key, [schedule]);
		}
	}

	// グリッド形式に変換
	const gridViewModels: BasicScheduleGridViewModel[] = [];

	for (const [clientName, clientSchedules] of clientMap.entries()) {
		// 曜日ごとにグルーピング
		const schedulesByWeekday: BasicScheduleGridViewModel['schedulesByWeekday'] =
			{};

		for (const schedule of clientSchedules) {
			const cell: BasicScheduleCell = {
				id: schedule.id,
				timeRange: schedule.timeRange,
				serviceTypeId: schedule.serviceTypeId,
				staffNames: schedule.staffNames,
				note: schedule.note,
			};

			if (schedulesByWeekday[schedule.weekday]) {
				schedulesByWeekday[schedule.weekday]!.push(cell);
			} else {
				schedulesByWeekday[schedule.weekday] = [cell];
			}
		}

		// 各曜日のセルを開始時刻でソート
		for (const weekday of Object.keys(
			schedulesByWeekday,
		) as (keyof typeof schedulesByWeekday)[]) {
			const cells = schedulesByWeekday[weekday];
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
			clientId: clientSchedules[0].id, // 仮のclientId（実際は取得が必要）
			clientName,
			schedulesByWeekday,
		});
	}

	// 利用者名でソート（日本語対応）
	gridViewModels.sort((a, b) => a.clientName.localeCompare(b.clientName, 'ja'));

	return gridViewModels;
};

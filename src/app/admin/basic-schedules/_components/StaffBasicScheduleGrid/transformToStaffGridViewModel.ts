import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import type {
	StaffBasicScheduleGridViewModel,
	StaffScheduleCell,
} from './types';

/**
 * スケジュールデータをBasicScheduleViewModelからStaffScheduleCellに変換
 */
const createStaffScheduleCell = (
	schedule: BasicScheduleViewModel,
): StaffScheduleCell => ({
	id: schedule.id,
	timeRange: schedule.timeRange,
	serviceTypeId: schedule.serviceTypeId,
	clientName: schedule.clientName,
	note: schedule.note,
});

/**
 * スケジュールを曜日ごとにグルーピングし、時刻順にソート
 */
const groupSchedulesByWeekday = (
	schedules: BasicScheduleViewModel[],
): StaffBasicScheduleGridViewModel['schedulesByWeekday'] => {
	const schedulesByWeekday: StaffBasicScheduleGridViewModel['schedulesByWeekday'] =
		{};

	for (const schedule of schedules) {
		const cell = createStaffScheduleCell(schedule);

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
		schedulesByWeekday[weekday]!.sort((a, b) =>
			a.timeRange.localeCompare(b.timeRange, 'ja'),
		);
	}

	return schedulesByWeekday;
};

/**
 * 単一スタッフのグリッドビューモデルを構築
 */
const buildStaffGridViewModel = (
	staffName: string,
	schedules: BasicScheduleViewModel[],
): StaffBasicScheduleGridViewModel => ({
	staffId: null, // 現在のデータ構造ではスタッフIDが取得できないため null
	staffName,
	schedulesByWeekday: groupSchedulesByWeekday(schedules),
});

/**
 * スタッフごとにスケジュールをグルーピング
 */
const groupSchedulesByStaff = (schedules: BasicScheduleViewModel[]) => {
	const staffMap = new Map<string, BasicScheduleViewModel[]>();
	const unassignedSchedules: BasicScheduleViewModel[] = [];

	for (const schedule of schedules) {
		// スタッフが割り当てられていない場合
		if (schedule.staffNames.length === 0) {
			unassignedSchedules.push(schedule);
			continue;
		}

		// 各スタッフに対してスケジュールを追加
		for (const staffName of schedule.staffNames) {
			const existing = staffMap.get(staffName);
			if (existing) {
				existing.push(schedule);
			} else {
				staffMap.set(staffName, [schedule]);
			}
		}
	}

	return { staffMap, unassignedSchedules };
};

/**
 * スタッフ名でソート（日本語順、未割り当ては最後）
 */
const sortByStaffName = (
	a: StaffBasicScheduleGridViewModel,
	b: StaffBasicScheduleGridViewModel,
): number => {
	if (a.staffName === '未割り当て') return 1;
	if (b.staffName === '未割り当て') return -1;
	return a.staffName.localeCompare(b.staffName, 'ja');
};

/**
 * リスト形式のスケジュールデータをスタッフ別グリッド形式に変換する
 * @param schedules - リスト形式のスケジュールデータ
 * @returns スタッフ別グリッド形式のスケジュールデータ（スタッフ名昇順、未割り当ては最後）
 */
export const transformToStaffGridViewModel = (
	schedules: BasicScheduleViewModel[],
): StaffBasicScheduleGridViewModel[] => {
	const { staffMap, unassignedSchedules } = groupSchedulesByStaff(schedules);
	const gridViewModels: StaffBasicScheduleGridViewModel[] = [];

	// 割り当て済みスタッフ
	for (const [staffName, staffSchedules] of staffMap.entries()) {
		gridViewModels.push(buildStaffGridViewModel(staffName, staffSchedules));
	}

	// 未割り当てスケジュール
	if (unassignedSchedules.length > 0) {
		gridViewModels.push(
			buildStaffGridViewModel('未割り当て', unassignedSchedules),
		);
	}

	return gridViewModels.sort(sortByStaffName);
};

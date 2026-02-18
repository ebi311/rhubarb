import {
	ShiftFilters,
	ShiftRepository,
} from '@/backend/repositories/shiftRepository';
import type {
	AlertItem,
	DashboardStats,
	TodayTimelineItem,
} from '@/models/dashboardActionSchemas';
import { Shift } from '@/models/shift';
import { timeToMinutes } from '@/models/valueObjects/time';
import {
	addJstDays,
	dateJst,
	setJstTime,
	timeObjectToString,
	toAbsMinutesFrom0600,
} from '@/utils/date';

export interface DashboardServiceDeps {
	shiftRepository: ShiftRepository;
	serviceTypeMap: Map<string, string>;
	clientMap: Map<string, string>;
	staffMap: Map<string, string>;
}

/**
 * 週の開始日（月曜日）を取得
 */
const getWeekStartDate = (date: Date): Date => {
	return dateJst(date).startOf('isoWeek').toDate();
};

/**
 * 週の終了日（日曜日）を取得
 */
const getWeekEndDate = (date: Date): Date => {
	return dateJst(date).endOf('isoWeek').toDate();
};

export class DashboardService {
	private shiftRepository: ShiftRepository;
	private serviceTypeMap: Map<string, string>;
	private clientMap: Map<string, string>;
	private staffMap: Map<string, string>;

	constructor(deps: DashboardServiceDeps) {
		this.shiftRepository = deps.shiftRepository;
		this.serviceTypeMap = deps.serviceTypeMap;
		this.clientMap = deps.clientMap;
		this.staffMap = deps.staffMap;
	}

	/**
	 * ダッシュボード統計データを取得
	 *
	 * 注意: todayShiftCount は暦日（00:00〜23:59）でフィルタされるため、
	 * getTodayTimeline（06:00〜翌06:00）とは対象シフトが異なる場合がある。
	 * 例: 深夜 02:00 のシフトは Stats では翌日扱いだが、Timeline では当日扱いになる。
	 */
	async getDashboardStats(
		officeId: string,
		today: Date,
	): Promise<DashboardStats> {
		const weekStart = getWeekStartDate(today);
		const weekEnd = getWeekEndDate(today);

		// 今日のシフト
		const todayFilters: ShiftFilters = {
			officeId,
			startDate: today,
			endDate: today,
		};
		const todayShifts = await this.shiftRepository.list(todayFilters);

		// 今週のシフト
		const weekFilters: ShiftFilters = {
			officeId,
			startDate: weekStart,
			endDate: weekEnd,
		};
		const weekShifts = await this.shiftRepository.list(weekFilters);

		// 未割当シフト（今週以降）
		const unassignedFilters: ShiftFilters = {
			officeId,
			startDate: today,
		};
		const allUpcomingShifts =
			await this.shiftRepository.list(unassignedFilters);
		const unassignedShifts = allUpcomingShifts.filter(
			(shift) => shift.is_unassigned,
		);

		return {
			todayShiftCount: todayShifts.length,
			weekShiftCount: weekShifts.length,
			unassignedCount: unassignedShifts.length,
		};
	}

	/**
	 * 今日のタイムラインを取得（06:00〜翌06:00）
	 */
	async getTodayTimeline(
		officeId: string,
		today: Date,
	): Promise<TodayTimelineItem[]> {
		const rangeStart = setJstTime(today, 6, 0);
		const rangeEnd = setJstTime(addJstDays(today, 1), 6, 0);

		const filters: ShiftFilters = {
			officeId,
			startDateTime: rangeStart,
			endDateTime: rangeEnd,
		};
		const shifts = await this.shiftRepository.list(filters);

		const items = shifts.map((shift) => this.toTimelineItem(shift));

		// 06:00起点でソート
		return items.sort((a, b) => {
			const aAbs = toAbsMinutesFrom0600(timeToMinutes(a.startTime));
			const bAbs = toAbsMinutesFrom0600(timeToMinutes(b.startTime));
			return aAbs - bAbs;
		});
	}

	/**
	 * アラート一覧を取得
	 */
	async getAlerts(officeId: string, today: Date): Promise<AlertItem[]> {
		const filters: ShiftFilters = {
			officeId,
			startDate: today,
		};
		const allUpcomingShifts = await this.shiftRepository.list(filters);
		const unassignedShifts = allUpcomingShifts.filter(
			(shift) => shift.is_unassigned,
		);

		const alerts = unassignedShifts.map((shift) => this.toAlertItem(shift));

		// 日時順でソート
		return alerts.sort((a, b) => {
			const dateCompare = a.date.getTime() - b.date.getTime();
			if (dateCompare !== 0) return dateCompare;
			return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
		});
	}

	private toTimelineItem(shift: Shift): TodayTimelineItem {
		const clientName = this.clientMap.get(shift.client_id) ?? '不明';
		const staffName = shift.staff_id
			? (this.staffMap.get(shift.staff_id) ?? '不明')
			: null;
		const serviceTypeName =
			this.serviceTypeMap.get(shift.service_type_id) ?? '不明';

		return {
			id: shift.id,
			startTime: shift.time.start,
			endTime: shift.time.end,
			clientName,
			staffName,
			isUnassigned: shift.is_unassigned,
			serviceTypeName,
		};
	}

	private toAlertItem(shift: Shift): AlertItem {
		const clientName = this.clientMap.get(shift.client_id) ?? '不明';
		const timeStr = timeObjectToString(shift.time.start);

		return {
			id: shift.id,
			type: 'unassigned',
			date: shift.date,
			startTime: shift.time.start,
			clientName,
			message: `${clientName}様の${timeStr}からの予定にスタッフが割り当てられていません`,
		};
	}
}

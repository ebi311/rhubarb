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
import { dateJst, timeObjectToString } from '@/utils/date';

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
	 * 今日のタイムラインを取得
	 */
	async getTodayTimeline(
		officeId: string,
		today: Date,
	): Promise<TodayTimelineItem[]> {
		const filters: ShiftFilters = {
			officeId,
			startDate: today,
			endDate: today,
		};
		const shifts = await this.shiftRepository.list(filters);

		const items = shifts.map((shift) => this.toTimelineItem(shift));

		// 開始時間でソート
		return items.sort((a, b) => {
			return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
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

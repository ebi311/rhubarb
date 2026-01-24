import { getServiceUsersAction } from '@/app/actions/serviceUsers';
import { listStaffsAction } from '@/app/actions/staffs';
import { listShiftsAction } from '@/app/actions/weeklySchedules';
import { addJstDays, formatJstDateString } from '@/utils/date';
import type { ShiftDisplayRow } from '../ShiftTable';
import { WeeklySchedulePage } from '../WeeklySchedulePage';

export interface WeeklyScheduleContentProps {
	weekStartDate: Date;
}

export const WeeklyScheduleContent = async ({
	weekStartDate,
}: WeeklyScheduleContentProps) => {
	const weekEndDate = addJstDays(weekStartDate, 6);

	// データ取得を並列実行
	const [shiftsResult, clientsResult, staffsResult] = await Promise.all([
		listShiftsAction({
			startDate: formatJstDateString(weekStartDate),
			endDate: formatJstDateString(weekEndDate),
		}),
		getServiceUsersAction('all'),
		listStaffsAction(),
	]);

	// 名前解決用のマップを作成
	const clientNameMap = new Map<string, string>();
	if (clientsResult.data) {
		for (const client of clientsResult.data) {
			clientNameMap.set(client.id, client.name);
		}
	}

	const staffNameMap = new Map<string, string>();
	if (staffsResult.data) {
		for (const staff of staffsResult.data) {
			staffNameMap.set(staff.id, staff.name);
		}
	}

	// ShiftDisplayRow に変換
	const shifts: ShiftDisplayRow[] = (shiftsResult.data ?? []).map((shift) => ({
		id: shift.id,
		date: shift.date,
		startTime: shift.start_time,
		endTime: shift.end_time,
		clientName: clientNameMap.get(shift.client_id) ?? '不明な利用者',
		serviceTypeId: shift.service_type_id,
		staffId: shift.staff_id,
		staffName: shift.staff_id
			? (staffNameMap.get(shift.staff_id) ?? '不明なスタッフ')
			: null,
		status: shift.status,
		isUnassigned: !shift.staff_id,
		cancelReason: shift.canceled_reason,
		cancelCategory: shift.canceled_category,
	}));

	// スタッフオプションをピッカー用に変換
	const staffOptions = (staffsResult.data ?? []).map((staff) => ({
		id: staff.id,
		name: staff.name,
		role: staff.role,
		serviceTypeIds: staff.service_type_ids,
	}));

	return (
		<WeeklySchedulePage
			weekStartDate={weekStartDate}
			initialShifts={shifts}
			staffOptions={staffOptions}
		/>
	);
};

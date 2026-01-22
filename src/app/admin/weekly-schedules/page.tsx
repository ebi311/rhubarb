import { getServiceUsersAction } from '@/app/actions/serviceUsers';
import { listStaffsAction } from '@/app/actions/staffs';
import { listShiftsAction } from '@/app/actions/weeklySchedules';
import { addJstDays, formatJstDateString } from '@/utils/date';
import { redirect } from 'next/navigation';
import type { ShiftDisplayRow } from './_components/ShiftTable';
import { WeeklySchedulePage } from './_components/WeeklySchedulePage';
import { getMonday, parseSearchParams, type SearchParams } from './helpers';

interface WeeklySchedulesPageProps {
	searchParams: Promise<SearchParams>;
}

const WeeklySchedulesPage = async ({
	searchParams,
}: WeeklySchedulesPageProps) => {
	const params = await searchParams;
	const parsed = parseSearchParams(params);

	// week パラメータが未指定または無効な場合
	if (!parsed.isValid) {
		let mondayDate: Date;

		if (parsed.error === 'not_monday' && parsed.weekStartDate) {
			// 月曜日以外の場合は、その週の月曜日を計算
			mondayDate = getMonday(parsed.weekStartDate);
		} else {
			// 未指定または無効な日付の場合は今週の月曜日
			mondayDate = getMonday(new Date());
		}

		const weekStr = formatJstDateString(mondayDate);
		redirect(`/admin/weekly-schedules?week=${weekStr}`);
	}

	const weekStartDate = parsed.weekStartDate!;
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
		staffName: shift.staff_id
			? (staffNameMap.get(shift.staff_id) ?? '不明なスタッフ')
			: null,
		status: shift.status,
		isUnassigned: !shift.staff_id,
	}));

	// スタッフオプションをピッカー用に変換
	const staffOptions = (staffsResult.data ?? []).map((staff) => ({
		id: staff.id,
		name: staff.name,
		role: staff.role,
		serviceTypeIds: staff.service_type_ids,
	}));

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<section className="space-y-2">
				<p className="text-sm font-semibold tracking-widest text-primary uppercase">
					シフト管理
				</p>
				<h1 className="text-3xl font-bold">週間スケジュール</h1>
				<p className="text-sm text-base-content/70">
					週ごとのシフトを確認・生成できます。
				</p>
			</section>

			<WeeklySchedulePage
				weekStartDate={weekStartDate}
				initialShifts={shifts}
				staffOptions={staffOptions}
			/>
		</div>
	);
};

export default WeeklySchedulesPage;

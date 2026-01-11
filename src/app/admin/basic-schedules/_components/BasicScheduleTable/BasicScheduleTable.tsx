import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import type { BasicScheduleFilterState } from '../BasicScheduleFilterBar/types';
import { fetchBasicSchedules } from './fetchBasicSchedules';
import type { BasicScheduleViewModel } from './types';

interface BasicScheduleTableProps {
	filters: BasicScheduleFilterState;
}

const WEEKDAY_LABELS: Record<DayOfWeek, string> = {
	Mon: '月曜日',
	Tue: '火曜日',
	Wed: '水曜日',
	Thu: '木曜日',
	Fri: '金曜日',
	Sat: '土曜日',
	Sun: '日曜日',
};

const TableRow = ({ schedule }: { schedule: BasicScheduleViewModel }) => (
	<tr>
		<td>{schedule.clientName}</td>
		<td>{schedule.serviceTypeName}</td>
		<td>{WEEKDAY_LABELS[schedule.weekday]}</td>
		<td>{schedule.timeRange}</td>
		<td>{schedule.staffNames.length > 0 ? schedule.staffNames.join(', ') : '-'}</td>
		<td>{schedule.note ?? '-'}</td>
	</tr>
);

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center py-12 text-base-content/60">
		<p>スケジュールが登録されていません</p>
	</div>
);

export const BasicScheduleTable = async ({ filters }: BasicScheduleTableProps) => {
	const schedules = await fetchBasicSchedules(filters);

	if (schedules.length === 0) {
		return <EmptyState />;
	}

	return (
		<div className="overflow-x-auto">
			<table className="table">
				<thead>
					<tr>
						<th>利用者</th>
						<th>サービス区分</th>
						<th>曜日</th>
						<th>時間帯</th>
						<th>担当者</th>
						<th>備考</th>
					</tr>
				</thead>
				<tbody>
					{schedules.map((schedule) => (
						<TableRow key={schedule.id} schedule={schedule} />
					))}
				</tbody>
			</table>
		</div>
	);
};

import { classNameConsts } from '@/app/_components/classNameConsts';
import { ServiceTypeBadge } from '@/app/admin/_components/ServiceTypeBadges';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import classNames from 'classnames';
import Link from 'next/link';
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

const rowClassName = classNames(
	'grid-cols-[6rem_4rem_6rem_1fr]',
	'grid-areas-["client_client_client_client""service-type_weekday_time-range_staff-names""note_note_note_note"]',
	classNameConsts.selectableRow,
	'md:grid-cols-[10rem_6rem_auto_auto_1fr]',
	'md:grid-areas-["client_service-type_weekday_time-range_staff-names""note_note_note_note_note"]',
);

const TableRow = ({ schedule }: { schedule: BasicScheduleViewModel }) => (
	<Link href="" className={rowClassName}>
		<div className="text-lg font-bold grid-area-[client]">{schedule.clientName}</div>
		<div className="grid-area-[service-type]">
			<ServiceTypeBadge serviceTypeId={schedule.serviceTypeId} />
		</div>
		<div className="text-sm text-base-content/75 grid-area-[weekday]">
			{WEEKDAY_LABELS[schedule.weekday]}
		</div>
		<div className="text-sm text-base-content/75 grid-area-[time-range]">{schedule.timeRange}</div>
		<div className="text-sm text-base-content/75 grid-area-[staff-names]">
			{schedule.staffNames.length > 0 ? schedule.staffNames.join(', ') : '-'}
		</div>
		<div className="overflow-clip text-sm whitespace-nowrap grid-area-[note]">
			{schedule.note ?? '-'}
		</div>
	</Link>
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
		<div>
			{schedules.map((schedule) => (
				<TableRow key={schedule.id} schedule={schedule} />
			))}
		</div>
	);
};

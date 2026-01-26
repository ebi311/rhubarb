import type { BasicScheduleFilterState } from '../BasicScheduleFilterBar/types';
import { BasicScheduleList } from '../BasicScheduleList';
import { fetchBasicSchedules } from './fetchBasicSchedules';
import type { BasicScheduleViewModel } from './types';

interface BasicScheduleTableProps {
	filters: BasicScheduleFilterState;
	render?: (schedules: BasicScheduleViewModel[]) => React.ReactNode;
}

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center py-12 text-base-content/60">
		<p>スケジュールが登録されていません</p>
	</div>
);

export const BasicScheduleTable = async ({
	filters,
	render = (schedules) => <BasicScheduleList schedules={schedules} />,
}: BasicScheduleTableProps) => {
	const schedules = await fetchBasicSchedules(filters);

	if (schedules.length === 0) {
		return <EmptyState />;
	}

	// renderプロップが指定されている場合はそれを使用
	return <>{render(schedules)}</>;
};

import type { DashboardStats as DashboardStatsType } from '@/models/dashboardActionSchemas';

type Props = DashboardStatsType;

export const DashboardStats = ({
	todayShiftCount,
	weekShiftCount,
	unassignedCount,
}: Props) => {
	return (
		<div className="stats w-full stats-vertical shadow sm:stats-horizontal">
			<div className="stat">
				<div className="stat-title">今日の予定</div>
				<div className="stat-value text-primary">{todayShiftCount}</div>
				<div className="stat-desc">件</div>
			</div>

			<div className="stat">
				<div className="stat-title">今週の予定</div>
				<div className="stat-value text-secondary">{weekShiftCount}</div>
				<div className="stat-desc">件</div>
			</div>

			<div className="stat">
				<div className="stat-title">未割当</div>
				<div
					className={`stat-value ${unassignedCount > 0 ? 'text-warning' : ''}`}
				>
					{unassignedCount}
				</div>
				<div className="stat-desc">件</div>
			</div>
		</div>
	);
};

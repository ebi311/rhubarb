import { DashboardStats } from '@/app/_components/DashboardStats';
import type { DashboardData } from '@/models/dashboardActionSchemas';

type Props = {
	data: DashboardData;
};

/**
 * 時刻を "HH:MM" 形式にフォーマット
 */
const formatTime = (time: { hour: number; minute: number }) => {
	return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
};

export const Dashboard = ({ data }: Props) => {
	const { stats, timeline, alerts } = data;

	return (
		<div
			className="container mx-auto space-y-6 p-4"
			data-testid="dashboard-container"
		>
			{/* 統計カードセクション */}
			<section>
				<DashboardStats {...stats} />
			</section>

			{/* 今日のタイムライン */}
			<section className="card bg-base-200">
				<div className="card-body">
					<h2 className="card-title">今日のスケジュール</h2>
					{timeline.length === 0 ? (
						<p className="text-base-content/60">今日の予定はありません</p>
					) : (
						<ul className="timeline timeline-vertical timeline-snap-icon">
							{timeline.map((item, index) => (
								<li key={item.id}>
									{index > 0 && <hr />}
									<div className="timeline-middle">
										<span
											className={`h-3 w-3 rounded-full ${item.isUnassigned ? 'bg-warning' : 'bg-primary'}`}
										/>
									</div>
									<div
										className={`timeline-end timeline-box ${item.isUnassigned ? 'border-warning' : ''}`}
									>
										<div className="text-sm font-semibold">
											{formatTime(item.startTime)} - {formatTime(item.endTime)}
										</div>
										<div className="font-bold">{item.clientName}</div>
										<div className="text-sm">
											{item.isUnassigned ? (
												<span className="badge badge-sm badge-warning">
													未割当
												</span>
											) : (
												<span>{item.staffName}</span>
											)}
										</div>
										<div className="text-xs text-base-content/60">
											{item.serviceTypeName}
										</div>
									</div>
									{index < timeline.length - 1 && <hr />}
								</li>
							))}
						</ul>
					)}
				</div>
			</section>

			{/* アラートセクション */}
			{alerts.length > 0 && (
				<section className="space-y-2">
					<h2 className="text-lg font-bold">注意が必要な予定</h2>
					{alerts.map((alert) => (
						<div
							key={alert.id}
							role="alert"
							className={`alert ${alert.type === 'unassigned' ? 'alert-warning' : 'alert-error'}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6 shrink-0 stroke-current"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
							<div>
								<div className="font-bold">
									{alert.clientName} - {formatTime(alert.startTime)}
								</div>
								<div className="text-sm">{alert.message}</div>
							</div>
						</div>
					))}
				</section>
			)}
		</div>
	);
};

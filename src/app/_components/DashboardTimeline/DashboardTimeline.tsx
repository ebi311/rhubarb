import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import { timeObjectToString } from '@/utils/date';

type Props = {
	timeline: TodayTimelineItem[];
};

export const DashboardTimeline = ({ timeline }: Props) => {
	return (
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
										{timeObjectToString(item.startTime)} -{' '}
										{timeObjectToString(item.endTime)}
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
	);
};

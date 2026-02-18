import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import { timeObjectToString } from '@/utils/date';
import {
	PX_PER_MINUTE,
	SLOT_HEIGHT,
	toGridMinutes,
} from './DashboardTimeline.utils';

type Props = {
	item: TodayTimelineItem;
};

/** シフトボックスコンポーネント */
export const ShiftBox = ({ item }: Props) => {
	const startGrid = toGridMinutes(item.startTime.hour, item.startTime.minute);
	const endGrid = toGridMinutes(item.endTime.hour, item.endTime.minute);
	const height = Math.max((endGrid - startGrid) * PX_PER_MINUTE, SLOT_HEIGHT);
	const top = startGrid * PX_PER_MINUTE;

	const box = (
		<div
			className="card w-full overflow-hidden rounded-sm bg-base-100 p-1 text-xs leading-tight card-border"
			style={{ height: `${height}px` }}
		>
			<div className="truncate font-semibold">
				{timeObjectToString(item.startTime)} -{' '}
				{timeObjectToString(item.endTime)}
			</div>
			<div className="truncate font-bold">{item.clientName}</div>
			<div className="truncate text-base-content/60">
				{item.serviceTypeName}
			</div>
		</div>
	);

	if (item.isUnassigned) {
		return (
			<div
				className="absolute right-0 left-0 px-0.5"
				style={{ top: `${top}px` }}
			>
				<div className="indicator w-full">
					<span className="indicator-item badge badge-xs badge-warning">
						未割当
					</span>
					{box}
				</div>
			</div>
		);
	}

	return (
		<div className="absolute right-0 left-0 px-0.5" style={{ top: `${top}px` }}>
			{box}
		</div>
	);
};

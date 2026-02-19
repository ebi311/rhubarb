import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import { timeObjectToString } from '@/utils/date';
import classNames from 'classnames';
import {
	PX_PER_MINUTE,
	SLOT_HEIGHT,
	toGridMinutes,
} from './DashboardTimeline.utils';

type Props = {
	item: TodayTimelineItem;
};

const boxClassName = classNames(
	// Component
	'card',
	// Layout
	'grid grid-cols-1 grid-rows-[auto_auto_1fr] gap-0.5 grid-areas-["client""time""service-type"]',
	'w-full',
	// Overflow
	'overflow-hidden',
	// Border & radius
	'rounded-sm',
	'card-border',
	// Background
	'bg-base-100',
	// Spacing / Padding
	'p-1',
	// Typography
	'text-xs',
	'leading-tight',
);

/** シフトボックスコンポーネント */
export const ShiftBox = ({ item }: Props) => {
	const startGrid = toGridMinutes(item.startTime.hour, item.startTime.minute);
	const endGrid = toGridMinutes(item.endTime.hour, item.endTime.minute);
	const height = Math.max((endGrid - startGrid) * PX_PER_MINUTE, SLOT_HEIGHT);
	const top = startGrid * PX_PER_MINUTE;

	const box = (
		<div className={boxClassName} style={{ height: `${height}px` }}>
			<div className="truncate font-semibold grid-area-[time]">
				{timeObjectToString(item.startTime)} -{' '}
				{timeObjectToString(item.endTime)}
			</div>
			<div className="truncate font-bold grid-area-[client]">
				{item.clientName}
			</div>
			<div className="truncate text-base-content/60 grid-area-[service-type]">
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

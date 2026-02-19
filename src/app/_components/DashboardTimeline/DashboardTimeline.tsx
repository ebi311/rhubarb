import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import {
	buildColumns,
	GRID_HEIGHT,
	SLOT_HEIGHT,
	TIME_SLOTS,
} from './DashboardTimeline.utils';
import { ShiftBox } from './ShiftBox';

type Props = {
	timeline: TodayTimelineItem[];
};

export const DashboardTimeline = ({ timeline }: Props) => {
	const columns = buildColumns(timeline);

	return (
		<section className="card bg-base-200">
			<div className="card-body">
				<h2 className="card-title">今日のスケジュール</h2>
				{timeline.length === 0 ? (
					<p className="text-base-content/60">今日の予定はありません</p>
				) : (
					<div className="max-h-[600px] overflow-auto">
						{/* ヘッダー行 */}
						<div
							className="sticky top-0 z-10 grid gap-px bg-base-200"
							style={{
								gridTemplateColumns: `3rem repeat(${columns.length}, minmax(6rem, 1fr))`,
							}}
						>
							<div className="p-1 text-xs font-semibold" />
							{columns.map((col) => (
								<div
									key={col.key}
									className="truncate p-1 text-center text-xs font-semibold"
								>
									{col.label}
								</div>
							))}
						</div>

						{/* 本文 (時刻罫線 + シフトボックス) */}
						<div
							className="relative grid gap-px"
							style={{
								gridTemplateColumns: `3rem repeat(${columns.length}, minmax(6rem, 1fr))`,
								height: `${GRID_HEIGHT}px`,
							}}
						>
							{/* 時刻ラベル列 */}
							<div className="relative" style={{ height: `${GRID_HEIGHT}px` }}>
								{TIME_SLOTS.map((slot, i) => (
									<div
										key={slot}
										data-testid="time-slot-label"
										className="absolute right-0 left-0 text-xs leading-none text-base-content/60"
										style={{ top: `${i * SLOT_HEIGHT - 6}px` }}
									>
										{/00$/.test(slot) ? slot : ''}
									</div>
								))}
							</div>

							{/* スタッフ列 */}
							{columns.map((col) => {
								const colItems = timeline.filter((item) =>
									col.isUnassigned
										? item.isUnassigned || !item.staffName
										: item.staffName === col.label,
								);
								return (
									<div
										key={col.key}
										className="relative border-l border-base-300"
										style={{ height: `${GRID_HEIGHT}px` }}
									>
										{/* 30分罫線 */}
										{TIME_SLOTS.map((slot, i) => (
											<div
												key={slot}
												className="absolute right-0 left-0 border-t border-base-300/40"
												style={{ top: `${i * SLOT_HEIGHT}px` }}
											/>
										))}
										{/* シフトボックス */}
										{colItems.map((item) => (
											<ShiftBox key={item.id} item={item} />
										))}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</section>
	);
};

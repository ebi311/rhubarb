import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import { timeObjectToString } from '@/utils/date';

type Props = {
	timeline: TodayTimelineItem[];
};

/** 06:00 を起点とした分数(0~1440)に変換 */
const toAbsMinutes = (hour: number, minute: number): number => {
	const m = hour * 60 + minute;
	return m < 360 ? m + 1440 : m;
};

/** 06:00 起点の相対分数 (0~1440) */
const toGridMinutes = (hour: number, minute: number): number => {
	return toAbsMinutes(hour, minute) - 360;
};

/** 1分あたりの高さ (px)。1スロット(30分) = 24px → 0.8px/min */
const PX_PER_MINUTE = 0.8;
const SLOT_HEIGHT = 30 * PX_PER_MINUTE; // 24px
const TOTAL_SLOTS = 48;
const GRID_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT; // 1152px

/** 06:00〜翌06:00 の30分刻み時刻ラベルを生成 */
const generateTimeSlots = (): string[] => {
	const slots: string[] = [];
	for (let i = 0; i < TOTAL_SLOTS; i++) {
		const totalMinutes = 360 + i * 30; // 06:00起点
		const hour = Math.floor(totalMinutes / 60) % 24;
		const minute = totalMinutes % 60;
		slots.push(
			`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
		);
	}
	return slots;
};

const TIME_SLOTS = generateTimeSlots();

/** スタッフ列情報 */
type StaffColumn = {
	key: string;
	label: string;
	isUnassigned: boolean;
};

/** タイムラインからユニークなスタッフ列を生成 */
const buildColumns = (timeline: TodayTimelineItem[]): StaffColumn[] => {
	const staffNames = new Map<string, string>();
	let hasUnassigned = false;

	for (const item of timeline) {
		if (item.isUnassigned || !item.staffName) {
			hasUnassigned = true;
		} else {
			staffNames.set(item.staffName, item.staffName);
		}
	}

	const columns: StaffColumn[] = [];
	for (const [key, label] of staffNames) {
		columns.push({ key, label, isUnassigned: false });
	}
	if (hasUnassigned) {
		columns.push({
			key: '__unassigned__',
			label: '未割当',
			isUnassigned: true,
		});
	}
	return columns;
};

/** シフトボックスコンポーネント */
const ShiftBox = ({ item }: { item: TodayTimelineItem }) => {
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
										style={{ top: `${i * SLOT_HEIGHT}px` }}
									>
										{slot}
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

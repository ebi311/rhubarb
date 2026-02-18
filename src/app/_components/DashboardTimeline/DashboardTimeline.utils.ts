import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import { toAbsMinutesFrom0600 } from '@/utils/date';

/** 06:00 起点の相対分数 (0~1440) */
export const toGridMinutes = (hour: number, minute: number): number => {
	return toAbsMinutesFrom0600(hour * 60 + minute);
};

/** 1分あたりの高さ (px)。1スロット(30分) = 24px → 0.8px/min */
export const PX_PER_MINUTE = 0.8;
export const SLOT_HEIGHT = 30 * PX_PER_MINUTE; // 24px
export const TOTAL_SLOTS = 48;
export const GRID_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT; // 1152px

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

export const TIME_SLOTS = generateTimeSlots();

/** スタッフ列情報 */
export type StaffColumn = {
	key: string;
	label: string;
	isUnassigned: boolean;
};

/**
 * タイムラインからユニークなスタッフ列を生成
 *
 * 注意: スタッフ列は staffName をキーにしているため、
 * 同姓同名のスタッフが存在する場合、同一列に合流します。
 * 現時点ではスタッフ ID がタイムラインアイテムに含まれないため、
 * この制約を受け入れています。
 */
export const buildColumns = (timeline: TodayTimelineItem[]): StaffColumn[] => {
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

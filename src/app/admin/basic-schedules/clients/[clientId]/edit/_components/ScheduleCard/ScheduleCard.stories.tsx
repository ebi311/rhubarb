import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type {
	EditableSchedule,
	ScheduleData,
} from '../ClientWeeklyScheduleEditor/types';
import { ScheduleCard } from './ScheduleCard';

const createTestScheduleData = (
	overrides: Partial<ScheduleData> = {},
): ScheduleData => ({
	weekday: 'Mon',
	serviceTypeId: 'life-support',
	staffIds: ['staff-1'],
	staffNames: ['山田太郎'],
	startTime: { hour: 9, minute: 0 },
	endTime: { hour: 10, minute: 0 },
	note: null,
	...overrides,
});

const createTestSchedule = (
	overrides: Partial<EditableSchedule> = {},
): EditableSchedule => ({
	id: 'test-id-1',
	originalId: 'test-id-1',
	status: 'unchanged',
	data: createTestScheduleData(),
	...overrides,
});

const meta: Meta<typeof ScheduleCard> = {
	title: 'Admin/BasicSchedules/BatchEdit/ScheduleCard',
	component: ScheduleCard,
	tags: ['autodocs'],
	args: {
		onClick: fn(),
		onDelete: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-40 bg-base-200 p-4">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ScheduleCard>;

/**
 * 変更なしの状態
 */
export const Unchanged: Story = {
	args: {
		schedule: createTestSchedule({ status: 'unchanged' }),
	},
};

/**
 * 新規追加の状態
 */
export const New: Story = {
	args: {
		schedule: createTestSchedule({
			id: 'temp-123',
			originalId: undefined,
			status: 'new',
		}),
	},
};

/**
 * 変更ありの状態
 */
export const Modified: Story = {
	args: {
		schedule: createTestSchedule({ status: 'modified' }),
	},
};

/**
 * 削除済みの状態
 */
export const Deleted: Story = {
	args: {
		schedule: createTestSchedule({ status: 'deleted' }),
	},
};

/**
 * 身体介護（青色）
 */
export const PhysicalCare: Story = {
	args: {
		schedule: createTestSchedule({
			data: createTestScheduleData({
				serviceTypeId: 'physical-care',
			}),
		}),
	},
};

/**
 * 通院サポート（紫色）
 */
export const CommuteSupport: Story = {
	args: {
		schedule: createTestSchedule({
			data: createTestScheduleData({
				serviceTypeId: 'commute-support',
			}),
		}),
	},
};

/**
 * 複数担当者
 */
export const MultipleStaffs: Story = {
	args: {
		schedule: createTestSchedule({
			data: createTestScheduleData({
				staffNames: ['山田太郎', '鈴木花子', '佐藤次郎'],
			}),
		}),
	},
};

/**
 * 担当者未設定
 */
export const NoStaff: Story = {
	args: {
		schedule: createTestSchedule({
			data: createTestScheduleData({
				staffIds: [],
				staffNames: [],
			}),
		}),
	},
};

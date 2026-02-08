import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type {
	EditableSchedule,
	ScheduleData,
} from '../ClientWeeklyScheduleEditor/types';
import { DayColumn } from './DayColumn';

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

const meta: Meta<typeof DayColumn> = {
	title: 'Admin/BasicSchedules/BatchEdit/DayColumn',
	component: DayColumn,
	tags: ['autodocs'],
	args: {
		onAddClick: fn(),
		onCardClick: fn(),
		onCardDelete: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-48 bg-base-300">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof DayColumn>;

/**
 * 空の状態
 */
export const Empty: Story = {
	args: {
		weekday: 'Mon',
		schedules: [],
	},
};

/**
 * スケジュールあり
 */
export const WithSchedules: Story = {
	args: {
		weekday: 'Tue',
		schedules: [
			createTestSchedule({
				id: 'schedule-1',
				data: createTestScheduleData({
					weekday: 'Tue',
					startTime: { hour: 9, minute: 0 },
					endTime: { hour: 10, minute: 0 },
					serviceTypeId: 'life-support',
				}),
			}),
			createTestSchedule({
				id: 'schedule-2',
				data: createTestScheduleData({
					weekday: 'Tue',
					startTime: { hour: 14, minute: 0 },
					endTime: { hour: 15, minute: 30 },
					serviceTypeId: 'physical-care',
					staffNames: ['鈴木花子'],
				}),
			}),
		],
	},
};

/**
 * 多数のスケジュール
 */
export const ManySchedules: Story = {
	args: {
		weekday: 'Wed',
		schedules: [
			createTestSchedule({
				id: 'schedule-1',
				data: createTestScheduleData({
					weekday: 'Wed',
					startTime: { hour: 8, minute: 0 },
					endTime: { hour: 9, minute: 0 },
					serviceTypeId: 'life-support',
				}),
			}),
			createTestSchedule({
				id: 'schedule-2',
				status: 'new',
				data: createTestScheduleData({
					weekday: 'Wed',
					startTime: { hour: 10, minute: 0 },
					endTime: { hour: 11, minute: 0 },
					serviceTypeId: 'physical-care',
				}),
			}),
			createTestSchedule({
				id: 'schedule-3',
				status: 'modified',
				data: createTestScheduleData({
					weekday: 'Wed',
					startTime: { hour: 13, minute: 0 },
					endTime: { hour: 14, minute: 0 },
					serviceTypeId: 'commute-support',
				}),
			}),
			createTestSchedule({
				id: 'schedule-4',
				status: 'deleted',
				data: createTestScheduleData({
					weekday: 'Wed',
					startTime: { hour: 15, minute: 0 },
					endTime: { hour: 16, minute: 0 },
					serviceTypeId: 'life-support',
				}),
			}),
		],
	},
};

/**
 * 週末
 */
export const Weekend: Story = {
	args: {
		weekday: 'Sat',
		schedules: [
			createTestSchedule({
				id: 'schedule-1',
				data: createTestScheduleData({
					weekday: 'Sat',
					startTime: { hour: 10, minute: 0 },
					endTime: { hour: 12, minute: 0 },
				}),
			}),
		],
	},
};

import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ClientWeeklyScheduleEditor } from './ClientWeeklyScheduleEditor';
import type { InitialScheduleData } from './types';

const createSchedule = (
	id: string,
	weekday: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun',
	serviceTypeId: ServiceTypeId,
	startHour: number,
	endHour: number,
): InitialScheduleData => ({
	id,
	data: {
		weekday,
		serviceTypeId,
		staffIds: ['staff-1'],
		staffNames: ['田中太郎'],
		startTime: { hour: startHour, minute: 0 },
		endTime: { hour: endHour, minute: 0 },
		note: null,
	},
});

const serviceTypeOptions = [
	{ id: 'physical-care' as ServiceTypeId, name: '身体介護' },
	{ id: 'life-support' as ServiceTypeId, name: '生活支援' },
	{ id: 'commute-support' as ServiceTypeId, name: '通院サポート' },
];

const staffs = [
	{
		id: 'staff-1',
		office_id: 'office-1',
		name: '田中太郎',
		role: 'helper' as const,
		service_type_ids: ['physical-care', 'life-support'] as ServiceTypeId[],
		created_at: new Date('2024-01-01T00:00:00Z'),
		updated_at: new Date('2024-01-01T00:00:00Z'),
	},
	{
		id: 'staff-2',
		office_id: 'office-1',
		name: '佐藤花子',
		role: 'admin' as const,
		service_type_ids: ['life-support'] as ServiceTypeId[],
		created_at: new Date('2024-01-01T00:00:00Z'),
		updated_at: new Date('2024-01-01T00:00:00Z'),
	},
];

const meta: Meta<typeof ClientWeeklyScheduleEditor> = {
	title: 'Admin/BasicSchedules/ClientWeeklyScheduleEditor',
	component: ClientWeeklyScheduleEditor,
	tags: ['autodocs'],
	parameters: {
		layout: 'padded',
	},
	args: {
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeOptions,
		staffs,
		onSave: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof ClientWeeklyScheduleEditor>;

/**
 * 初期データなし（空の状態）
 */
export const Empty: Story = {
	args: {
		initialSchedules: [],
	},
};

/**
 * いくつかのスケジュールがある状態
 */
export const WithSchedules: Story = {
	args: {
		initialSchedules: [
			createSchedule('schedule-1', 'Mon', 'physical-care', 9, 10),
			createSchedule('schedule-2', 'Mon', 'life-support', 14, 15),
			createSchedule('schedule-3', 'Wed', 'physical-care', 10, 11),
			createSchedule('schedule-4', 'Fri', 'commute-support', 13, 15),
		],
	},
};

/**
 * 全曜日にスケジュールがある状態
 */
export const FullWeek: Story = {
	args: {
		initialSchedules: [
			createSchedule('schedule-1', 'Mon', 'physical-care', 9, 10),
			createSchedule('schedule-2', 'Tue', 'life-support', 10, 11),
			createSchedule('schedule-3', 'Wed', 'physical-care', 11, 12),
			createSchedule('schedule-4', 'Thu', 'commute-support', 13, 14),
			createSchedule('schedule-5', 'Fri', 'physical-care', 14, 15),
			createSchedule('schedule-6', 'Sat', 'life-support', 15, 16),
			createSchedule('schedule-7', 'Sun', 'physical-care', 9, 10),
		],
	},
};

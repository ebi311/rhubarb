import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ScheduleEditFormModal } from './ScheduleEditFormModal';

const serviceTypeOptions = [
	{ id: 'life-support' as ServiceTypeId, name: '生活支援' },
	{ id: 'physical-care' as ServiceTypeId, name: '身体介護' },
	{ id: 'commute-support' as ServiceTypeId, name: '通院サポート' },
];

const meta: Meta<typeof ScheduleEditFormModal> = {
	title: 'Admin/BasicSchedules/BatchEdit/ScheduleEditFormModal',
	component: ScheduleEditFormModal,
	tags: ['autodocs'],
	args: {
		isOpen: true,
		weekday: 'Mon',
		serviceTypeOptions,
		onClose: fn(),
		onSubmit: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof ScheduleEditFormModal>;

/**
 * 新規追加モード
 */
export const NewSchedule: Story = {
	args: {},
};

/**
 * 編集モード
 */
export const EditSchedule: Story = {
	args: {
		initialData: {
			weekday: 'Tue',
			serviceTypeId: 'physical-care',
			staffIds: ['staff-1'],
			staffNames: ['山田太郎'],
			startTime: { hour: 14, minute: 30 },
			endTime: { hour: 16, minute: 0 },
			note: '訪問介護のテストメモです。',
		},
	},
};

/**
 * 閉じた状態
 */
export const Closed: Story = {
	args: {
		isOpen: false,
	},
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ShiftInfoCard } from './ShiftInfoCard';

const meta: Meta<typeof ShiftInfoCard> = {
	title: 'Admin/WeeklySchedules/ShiftInfoCard',
	component: ShiftInfoCard,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ShiftInfoCard>;

const baseShift = {
	clientName: '山田太郎',
	serviceTypeName: '身体介護',
	date: new Date('2024-01-15'),
	startTime: new Date('2024-01-15T09:00:00'),
	endTime: new Date('2024-01-15T10:00:00'),
	currentStaffName: '佐藤花子',
};

export const Default: Story = {
	args: {
		shift: baseShift,
	},
};

export const WithCustomStaffLabel: Story = {
	args: {
		shift: baseShift,
		staffLabel: '担当スタッフ',
	},
};

export const LongServiceName: Story = {
	args: {
		shift: {
			...baseShift,
			serviceTypeName: '訪問介護（身体介護・生活援助）',
		},
	},
};

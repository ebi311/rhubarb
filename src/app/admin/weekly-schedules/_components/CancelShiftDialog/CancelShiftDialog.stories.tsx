import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CancelShiftDialog } from './CancelShiftDialog';

const meta: Meta<typeof CancelShiftDialog> = {
	title: 'Admin/WeeklySchedules/CancelShiftDialog',
	component: CancelShiftDialog,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof CancelShiftDialog>;

const baseShift = {
	id: 'shift-1',
	clientName: '山田太郎',
	serviceTypeName: '身体介護',
	date: new Date('2024-01-15'),
	startTime: new Date('2024-01-15T09:00:00'),
	endTime: new Date('2024-01-15T10:00:00'),
	currentStaffName: '佐藤花子',
};

export const Default: Story = {
	args: {
		isOpen: true,
		shift: baseShift,
		onClose: () => console.log('Close'),
		onSuccess: () => console.log('Success'),
	},
};

export const Closed: Story = {
	args: {
		isOpen: false,
		shift: baseShift,
		onClose: () => console.log('Close'),
	},
};

export const UnassignedShift: Story = {
	args: {
		isOpen: true,
		shift: {
			...baseShift,
			currentStaffName: '未割当',
		},
		onClose: () => console.log('Close'),
	},
};

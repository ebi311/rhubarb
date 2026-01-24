import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RestoreShiftDialog } from './RestoreShiftDialog';

const meta: Meta<typeof RestoreShiftDialog> = {
	title: 'Admin/WeeklySchedules/RestoreShiftDialog',
	component: RestoreShiftDialog,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof RestoreShiftDialog>;

const baseShift = {
	id: 'shift-1',
	clientName: '山田太郎',
	serviceTypeName: '身体介護',
	date: new Date('2024-01-15'),
	startTime: new Date('2024-01-15T09:00:00'),
	endTime: new Date('2024-01-15T10:00:00'),
	currentStaffName: '佐藤花子',
	staffId: 'staff-1',
	cancelReason: '利用者の体調不良のため',
	cancelCategory: 'client',
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

export const StaffReasonCategory: Story = {
	args: {
		isOpen: true,
		shift: {
			...baseShift,
			cancelReason: 'スタッフの急病のため',
			cancelCategory: 'staff',
		},
		onClose: () => console.log('Close'),
	},
};

export const OtherReasonCategory: Story = {
	args: {
		isOpen: true,
		shift: {
			...baseShift,
			cancelReason: '天候不良のため',
			cancelCategory: 'other',
		},
		onClose: () => console.log('Close'),
	},
};

export const UnassignedShift: Story = {
	args: {
		isOpen: true,
		shift: {
			...baseShift,
			currentStaffName: '未割当',
			staffId: null,
		},
		onClose: () => console.log('Close'),
	},
};

export const NoCancelInfo: Story = {
	args: {
		isOpen: true,
		shift: {
			...baseShift,
			cancelReason: undefined,
			cancelCategory: undefined,
		},
		onClose: () => console.log('Close'),
	},
};

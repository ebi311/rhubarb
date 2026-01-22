import type { Meta, StoryObj } from '@storybook/react';
import { ShiftActionButtons } from './ShiftActionButtons';

const meta: Meta<typeof ShiftActionButtons> = {
	title: 'Admin/WeeklySchedules/ShiftActionButtons',
	component: ShiftActionButtons,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ShiftActionButtons>;

export const ScheduledWithStaff: Story = {
	args: {
		status: 'scheduled',
		isUnassigned: false,
		onChangeStaff: () => console.log('Change staff'),
		onAssignStaff: () => console.log('Assign staff'),
		onCancelShift: () => console.log('Cancel'),
	},
};

export const ScheduledUnassigned: Story = {
	args: {
		status: 'scheduled',
		isUnassigned: true,
		onChangeStaff: () => console.log('Change staff'),
		onAssignStaff: () => console.log('Assign staff'),
		onCancelShift: () => console.log('Cancel'),
	},
};

export const Confirmed: Story = {
	args: {
		status: 'confirmed',
		isUnassigned: false,
		onChangeStaff: () => console.log('Change staff'),
		onAssignStaff: () => console.log('Assign staff'),
		onCancelShift: () => console.log('Cancel'),
	},
};

export const Completed: Story = {
	args: {
		status: 'completed',
		isUnassigned: false,
		onChangeStaff: () => console.log('Change staff'),
		onAssignStaff: () => console.log('Assign staff'),
		onCancelShift: () => console.log('Cancel'),
	},
};

export const Canceled: Story = {
	args: {
		status: 'canceled',
		isUnassigned: false,
		onChangeStaff: () => console.log('Change staff'),
		onAssignStaff: () => console.log('Assign staff'),
		onCancelShift: () => console.log('Cancel'),
	},
};

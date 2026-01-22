import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

export const Scheduled: Story = {
	args: {
		status: 'scheduled',
		onCancelShift: () => console.log('Cancel'),
	},
};

export const Confirmed: Story = {
	args: {
		status: 'confirmed',
		onCancelShift: () => console.log('Cancel'),
	},
};

export const Completed: Story = {
	args: {
		status: 'completed',
		onCancelShift: () => console.log('Cancel'),
	},
};

export const Canceled: Story = {
	args: {
		status: 'canceled',
		onCancelShift: () => console.log('Cancel'),
	},
};

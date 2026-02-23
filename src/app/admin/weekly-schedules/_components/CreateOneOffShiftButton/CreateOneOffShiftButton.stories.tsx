import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { CreateOneOffShiftButton } from './CreateOneOffShiftButton';

const meta: Meta<typeof CreateOneOffShiftButton> = {
	title: 'Admin/WeeklySchedules/CreateOneOffShiftButton',
	component: CreateOneOffShiftButton,
	parameters: {
		layout: 'padded',
		nextjs: {
			appDirectory: true,
		},
	},
};

export default meta;
type Story = StoryObj<typeof CreateOneOffShiftButton>;

export const Default: Story = {
	args: {
		onOpen: fn(),
	},
};

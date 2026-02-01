import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WeeklyViewToggleButton } from './WeeklyViewToggleButton';

const meta = {
	title: 'Admin/WeeklySchedules/WeeklyViewToggleButton',
	component: WeeklyViewToggleButton,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof WeeklyViewToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ListView: Story = {
	args: {
		currentView: 'list',
	},
};

export const GridView: Story = {
	args: {
		currentView: 'grid',
	},
};

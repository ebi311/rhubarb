import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ViewToggleButton } from './ViewToggleButton';

const meta = {
	title: 'Admin/BasicSchedules/ViewToggleButton',
	component: ViewToggleButton,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof ViewToggleButton>;

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

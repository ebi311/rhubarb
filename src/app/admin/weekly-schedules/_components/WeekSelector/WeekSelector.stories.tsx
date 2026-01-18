import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { WeekSelector } from './WeekSelector';

const meta = {
	title: 'Admin/WeeklySchedules/WeekSelector',
	component: WeekSelector,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: {
		onWeekChange: fn(),
	},
} satisfies Meta<typeof WeekSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		currentWeek: new Date('2026-01-19T00:00:00+09:00'),
	},
};

export const DifferentWeek: Story = {
	args: {
		currentWeek: new Date('2026-02-02T00:00:00+09:00'),
	},
};

export const YearEnd: Story = {
	args: {
		currentWeek: new Date('2025-12-29T00:00:00+09:00'),
	},
};

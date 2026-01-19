import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { EmptyState } from './EmptyState';

const meta = {
	title: 'Admin/WeeklySchedules/EmptyState',
	component: EmptyState,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: {
		onGenerate: fn(),
	},
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		weekStartDate: new Date('2026-01-19'),
	},
};

export const ClickGenerate: Story = {
	args: {
		weekStartDate: new Date('2026-01-19'),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		const button = canvas.getByRole('button', { name: /基本スケジュールから生成/ });
		await userEvent.click(button);

		expect(args.onGenerate).toHaveBeenCalled();
	},
};

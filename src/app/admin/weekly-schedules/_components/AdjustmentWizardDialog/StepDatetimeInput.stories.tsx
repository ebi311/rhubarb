import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { StepDatetimeInput } from './StepDatetimeInput';

const meta = {
	title: 'Admin/WeeklySchedules/StepDatetimeInput',
	component: StepDatetimeInput,
	tags: ['autodocs'],
	args: {
		initialStartTime: new Date('2026-02-22T09:00:00+09:00'),
		initialEndTime: new Date('2026-02-22T10:00:00+09:00'),
		onShowCandidates: fn(),
	},
} satisfies Meta<typeof StepDatetimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DashboardStats } from './DashboardStats';

const meta: Meta<typeof DashboardStats> = {
	title: 'Components/DashboardStats',
	component: DashboardStats,
	tags: ['autodocs'],
	parameters: {
		layout: 'padded',
	},
};

export default meta;
type Story = StoryObj<typeof DashboardStats>;

/**
 * 通常の状態
 */
export const Default: Story = {
	args: {
		todayShiftCount: 5,
		weekShiftCount: 20,
		unassignedCount: 0,
	},
};

/**
 * 未割当がある状態
 */
export const WithUnassigned: Story = {
	args: {
		todayShiftCount: 8,
		weekShiftCount: 35,
		unassignedCount: 3,
	},
};

/**
 * 予定が多い状態
 */
export const HighVolume: Story = {
	args: {
		todayShiftCount: 25,
		weekShiftCount: 120,
		unassignedCount: 5,
	},
};

/**
 * 予定がない状態
 */
export const Empty: Story = {
	args: {
		todayShiftCount: 0,
		weekShiftCount: 0,
		unassignedCount: 0,
	},
};

import type { AlertItem } from '@/models/dashboardActionSchemas';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DashboardAlerts } from './DashboardAlerts';

const mockAlerts: AlertItem[] = [
	{
		id: 'alert-1',
		type: 'unassigned',
		date: new Date('2026-02-03'),
		startTime: { hour: 11, minute: 0 },
		clientName: '佐藤花子',
		message: '担当者が未割当です',
	},
	{
		id: 'alert-2',
		type: 'unassigned',
		date: new Date('2026-02-04'),
		startTime: { hour: 14, minute: 30 },
		clientName: '田中一郎',
		message: '担当者が未割当です',
	},
];

const meta: Meta<typeof DashboardAlerts> = {
	title: 'Components/DashboardAlerts',
	component: DashboardAlerts,
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DashboardAlerts>;

/**
 * 複数のアラート
 */
export const Default: Story = {
	args: {
		alerts: mockAlerts,
	},
};

/**
 * 1件のアラート
 */
export const SingleAlert: Story = {
	args: {
		alerts: [mockAlerts[0]],
	},
};

/**
 * アラートなし（何も表示されない）
 */
export const Empty: Story = {
	args: {
		alerts: [],
	},
};

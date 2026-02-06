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
	{
		id: 'alert-3',
		type: 'shortage',
		date: new Date('2026-02-10'),
		startTime: { hour: 9, minute: 0 },
		clientName: '山田太郎',
		message: 'スタッフ不足です',
	},
];

const meta: Meta<typeof DashboardAlerts> = {
	title: 'Components/DashboardAlerts',
	component: DashboardAlerts,
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component:
					'ダッシュボードに表示するアラート一覧。クリックで週次スケジュール画面に遷移します。',
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof DashboardAlerts>;

/**
 * 複数のアラート（異なる週）
 * - 2/3, 2/4 は同じ週（月曜日: 2/2）
 * - 2/10 は翌週（月曜日: 2/9）
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
 * エラーアラート
 */
export const ErrorAlert: Story = {
	args: {
		alerts: [mockAlerts[2]],
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

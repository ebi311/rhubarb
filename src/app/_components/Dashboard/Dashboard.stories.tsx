import type { DashboardData } from '@/models/dashboardActionSchemas';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Dashboard } from './Dashboard';

const mockData: DashboardData = {
	stats: {
		todayShiftCount: 5,
		weekShiftCount: 20,
		unassignedCount: 2,
	},
	timeline: [
		{
			id: 'shift-1',
			startTime: { hour: 9, minute: 0 },
			endTime: { hour: 10, minute: 0 },
			clientName: '山田太郎',
			staffName: '田中一郎',
			isUnassigned: false,
			serviceTypeName: '生活支援',
		},
		{
			id: 'shift-2',
			startTime: { hour: 11, minute: 0 },
			endTime: { hour: 12, minute: 30 },
			clientName: '佐藤花子',
			staffName: null,
			isUnassigned: true,
			serviceTypeName: '身体介護',
		},
		{
			id: 'shift-3',
			startTime: { hour: 14, minute: 0 },
			endTime: { hour: 15, minute: 0 },
			clientName: '鈴木次郎',
			staffName: '山本三郎',
			isUnassigned: false,
			serviceTypeName: '通院介助',
		},
	],
	alerts: [
		{
			id: 'alert-1',
			type: 'unassigned',
			date: new Date('2026-02-03'),
			startTime: { hour: 11, minute: 0 },
			clientName: '佐藤花子',
			message: '担当者が未割当です',
		},
	],
};

const meta: Meta<typeof Dashboard> = {
	title: 'Pages/Dashboard',
	component: Dashboard,
	tags: ['autodocs'],
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<typeof Dashboard>;

/**
 * 通常の状態（アラートあり）
 */
export const Default: Story = {
	args: {
		data: mockData,
	},
};

/**
 * 予定が空の状態
 */
export const Empty: Story = {
	args: {
		data: {
			stats: {
				todayShiftCount: 0,
				weekShiftCount: 0,
				unassignedCount: 0,
			},
			timeline: [],
			alerts: [],
		},
	},
};

/**
 * アラートなしの状態
 */
export const NoAlerts: Story = {
	args: {
		data: {
			...mockData,
			stats: {
				...mockData.stats,
				unassignedCount: 0,
			},
			alerts: [],
		},
	},
};

/**
 * 多くの予定がある状態
 */
export const Busy: Story = {
	args: {
		data: {
			stats: {
				todayShiftCount: 15,
				weekShiftCount: 80,
				unassignedCount: 5,
			},
			timeline: [
				...mockData.timeline,
				{
					id: 'shift-4',
					startTime: { hour: 8, minute: 0 },
					endTime: { hour: 9, minute: 0 },
					clientName: '高橋四郎',
					staffName: '伊藤五郎',
					isUnassigned: false,
					serviceTypeName: '生活支援',
				},
				{
					id: 'shift-5',
					startTime: { hour: 16, minute: 0 },
					endTime: { hour: 17, minute: 30 },
					clientName: '渡辺六子',
					staffName: null,
					isUnassigned: true,
					serviceTypeName: '身体介護',
				},
			],
			alerts: [
				...mockData.alerts,
				{
					id: 'alert-2',
					type: 'unassigned',
					date: new Date('2026-02-03'),
					startTime: { hour: 16, minute: 0 },
					clientName: '渡辺六子',
					message: '担当者が未割当です',
				},
			],
		},
	},
};

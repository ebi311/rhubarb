import type { TodayTimelineItem } from '@/models/dashboardActionSchemas';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DashboardTimeline } from './DashboardTimeline';

const mockTimeline: TodayTimelineItem[] = [
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
];

const meta: Meta<typeof DashboardTimeline> = {
	title: 'Components/DashboardTimeline',
	component: DashboardTimeline,
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DashboardTimeline>;

/**
 * 通常の状態（複数のタイムラインアイテム）
 */
export const Default: Story = {
	args: {
		timeline: mockTimeline,
	},
};

/**
 * 未割当があるタイムライン
 */
export const WithUnassigned: Story = {
	args: {
		timeline: mockTimeline.filter((item) => item.isUnassigned),
	},
};

/**
 * 空のタイムライン
 */
export const Empty: Story = {
	args: {
		timeline: [],
	},
};

/**
 * 1件のみ
 */
export const SingleItem: Story = {
	args: {
		timeline: [mockTimeline[0]],
	},
};

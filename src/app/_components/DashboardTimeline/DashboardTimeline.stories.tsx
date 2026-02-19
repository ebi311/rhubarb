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

/**
 * 深夜帯シフトを含む（23:30〜00:30、02:00〜03:00 など）
 */
export const WithLateNightShifts: Story = {
	args: {
		timeline: [
			{
				id: 'shift-morning',
				startTime: { hour: 8, minute: 0 },
				endTime: { hour: 9, minute: 30 },
				clientName: '朝の利用者',
				staffName: '田中一郎',
				isUnassigned: false,
				serviceTypeName: '身体介護',
			},
			{
				id: 'shift-afternoon',
				startTime: { hour: 14, minute: 0 },
				endTime: { hour: 15, minute: 30 },
				clientName: '午後の利用者',
				staffName: '山本三郎',
				isUnassigned: false,
				serviceTypeName: '生活支援',
			},
			{
				id: 'shift-evening',
				startTime: { hour: 22, minute: 0 },
				endTime: { hour: 23, minute: 0 },
				clientName: '夜間の利用者',
				staffName: '田中一郎',
				isUnassigned: false,
				serviceTypeName: '身体介護',
			},
			{
				id: 'shift-midnight-cross',
				startTime: { hour: 23, minute: 30 },
				endTime: { hour: 0, minute: 30 },
				clientName: '日跨ぎの利用者',
				staffName: null,
				isUnassigned: true,
				serviceTypeName: '生活支援',
			},
			{
				id: 'shift-deep-night',
				startTime: { hour: 2, minute: 0 },
				endTime: { hour: 3, minute: 0 },
				clientName: '深夜の利用者',
				staffName: '山本三郎',
				isUnassigned: false,
				serviceTypeName: '身体介護',
			},
		],
	},
};

/**
 * 多数のスタッフ列がある状態
 */
export const ManyStaffs: Story = {
	args: {
		timeline: [
			{
				id: 'shift-a',
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientName: '利用者A',
				staffName: 'スタッフA',
				isUnassigned: false,
				serviceTypeName: '生活支援',
			},
			{
				id: 'shift-b',
				startTime: { hour: 9, minute: 30 },
				endTime: { hour: 11, minute: 0 },
				clientName: '利用者B',
				staffName: 'スタッフB',
				isUnassigned: false,
				serviceTypeName: '身体介護',
			},
			{
				id: 'shift-c',
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 30 },
				clientName: '利用者C',
				staffName: 'スタッフC',
				isUnassigned: false,
				serviceTypeName: '通院介助',
			},
			{
				id: 'shift-d',
				startTime: { hour: 13, minute: 0 },
				endTime: { hour: 14, minute: 0 },
				clientName: '利用者D',
				staffName: 'スタッフA',
				isUnassigned: false,
				serviceTypeName: '生活支援',
			},
			{
				id: 'shift-e',
				startTime: { hour: 15, minute: 0 },
				endTime: { hour: 16, minute: 30 },
				clientName: '利用者E',
				staffName: null,
				isUnassigned: true,
				serviceTypeName: '身体介護',
			},
		],
	},
};

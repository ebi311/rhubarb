import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { ShiftDisplayRow } from '../ShiftTable';
import { WeeklySchedulePage } from './WeeklySchedulePage';

const meta: Meta<typeof WeeklySchedulePage> = {
	title: 'Admin/WeeklySchedules/WeeklySchedulePage',
	component: WeeklySchedulePage,
	parameters: {
		layout: 'padded',
		nextjs: {
			appDirectory: true,
			navigation: {
				push: fn(),
				refresh: fn(),
			},
		},
	},
	decorators: [
		(Story) => (
			<div className="mx-auto max-w-5xl p-4">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof WeeklySchedulePage>;

const weekStartDate = new Date('2026-01-19T00:00:00');

const sampleShifts: ShiftDisplayRow[] = [
	{
		id: 'shift-1',
		date: new Date('2026-01-19T00:00:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientName: '田中太郎',
		serviceTypeId: 'physical-care',
		staffName: '山田花子',
		status: 'scheduled',
	},
	{
		id: 'shift-2',
		date: new Date('2026-01-19T00:00:00'),
		startTime: { hour: 11, minute: 0 },
		endTime: { hour: 12, minute: 0 },
		clientName: '鈴木一郎',
		serviceTypeId: 'life-support',
		staffName: null,
		status: 'scheduled',
	},
	{
		id: 'shift-3',
		date: new Date('2026-01-20T00:00:00'),
		startTime: { hour: 9, minute: 30 },
		endTime: { hour: 11, minute: 0 },
		clientName: '佐藤次郎',
		serviceTypeId: 'commute-support',
		staffName: '佐々木健太',
		status: 'confirmed',
	},
	{
		id: 'shift-4',
		date: new Date('2026-01-21T00:00:00'),
		startTime: { hour: 14, minute: 0 },
		endTime: { hour: 15, minute: 30 },
		clientName: '高橋三郎',
		serviceTypeId: 'physical-care',
		staffName: '田村美咲',
		status: 'completed',
	},
];

export const WithShifts: Story = {
	args: {
		weekStartDate,
		initialShifts: sampleShifts,
	},
};

export const Empty: Story = {
	args: {
		weekStartDate,
		initialShifts: [],
	},
};

export const ManyShifts: Story = {
	args: {
		weekStartDate,
		initialShifts: [
			...sampleShifts,
			{
				id: 'shift-5',
				date: new Date('2026-01-22T00:00:00'),
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 30 },
				clientName: '伊藤四郎',
				serviceTypeId: 'life-support',
				staffName: '中村由美',
				status: 'scheduled',
			},
			{
				id: 'shift-6',
				date: new Date('2026-01-23T00:00:00'),
				startTime: { hour: 13, minute: 0 },
				endTime: { hour: 14, minute: 0 },
				clientName: '渡辺五郎',
				serviceTypeId: 'physical-care',
				staffName: null,
				status: 'scheduled',
			},
			{
				id: 'shift-7',
				date: new Date('2026-01-24T00:00:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 30 },
				clientName: '小林六郎',
				serviceTypeId: 'commute-support',
				staffName: '加藤裕子',
				status: 'canceled',
			},
		],
	},
};

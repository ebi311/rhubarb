import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { TEST_IDS } from '@/test/helpers/testIds';
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

const sampleStaffOptions: StaffPickerOption[] = [
	{
		id: TEST_IDS.STAFF_1,
		name: '山田花子',
		role: 'helper',
		serviceTypeIds: ['physical-care', 'life-support'],
	},
	{
		id: TEST_IDS.STAFF_2,
		name: '佐々木健太',
		role: 'helper',
		serviceTypeIds: ['commute-support'],
	},
	{
		id: TEST_IDS.STAFF_3,
		name: '田村美咲',
		role: 'admin',
		serviceTypeIds: ['physical-care'],
	},
];

const sampleShifts: ShiftDisplayRow[] = [
	{
		id: 'shift-1',
		date: new Date('2026-01-19T00:00:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientId: TEST_IDS.CLIENT_1,
		clientName: '田中太郎',
		serviceTypeId: 'physical-care',
		staffId: TEST_IDS.STAFF_1,
		staffName: '山田花子',
		status: 'scheduled',
		isUnassigned: false,
	},
	{
		id: 'shift-2',
		date: new Date('2026-01-19T00:00:00'),
		startTime: { hour: 11, minute: 0 },
		endTime: { hour: 12, minute: 0 },
		clientId: TEST_IDS.CLIENT_2,
		clientName: '鈴木一郎',
		serviceTypeId: 'life-support',
		staffId: null,
		staffName: null,
		status: 'scheduled',
		isUnassigned: true,
	},
	{
		id: 'shift-3',
		date: new Date('2026-01-20T00:00:00'),
		startTime: { hour: 9, minute: 30 },
		endTime: { hour: 11, minute: 0 },
		clientId: TEST_IDS.CLIENT_3,
		clientName: '佐藤次郎',
		serviceTypeId: 'commute-support',
		staffId: TEST_IDS.STAFF_2,
		staffName: '佐々木健太',
		status: 'confirmed',
		isUnassigned: false,
	},
	{
		id: 'shift-4',
		date: new Date('2026-01-21T00:00:00'),
		startTime: { hour: 14, minute: 0 },
		endTime: { hour: 15, minute: 30 },
		clientId: TEST_IDS.CLIENT_4,
		clientName: '高橋三郎',
		serviceTypeId: 'physical-care',
		staffId: TEST_IDS.STAFF_3,
		staffName: '田村美咲',
		status: 'completed',
		isUnassigned: false,
	},
];

const sampleClientOptions = [
	{ id: TEST_IDS.CLIENT_1, name: '田中太郎' },
	{ id: TEST_IDS.CLIENT_2, name: '鈴木一郎' },
	{ id: TEST_IDS.CLIENT_3, name: '佐藤次郎' },
	{ id: TEST_IDS.CLIENT_4, name: '高橋三郎' },
];

export const WithShifts: Story = {
	args: {
		weekStartDate,
		initialShifts: sampleShifts,
		staffOptions: sampleStaffOptions,
		clientOptions: sampleClientOptions,
	},
};

export const Empty: Story = {
	args: {
		weekStartDate,
		initialShifts: [],
		staffOptions: sampleStaffOptions,
		clientOptions: sampleClientOptions,
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
				clientId: 'client-5',
				clientName: '伊藤四郎',
				serviceTypeId: 'life-support',
				staffId: TEST_IDS.STAFF_2,
				staffName: '中村由美',
				status: 'scheduled',
				isUnassigned: false,
			},
			{
				id: 'shift-6',
				date: new Date('2026-01-23T00:00:00'),
				startTime: { hour: 13, minute: 0 },
				endTime: { hour: 14, minute: 0 },
				clientId: 'client-6',
				clientName: '渡辺五郎',
				serviceTypeId: 'physical-care',
				staffId: null,
				staffName: null,
				status: 'scheduled',
				isUnassigned: true,
			},
			{
				id: 'shift-7',
				date: new Date('2026-01-24T00:00:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 30 },
				clientId: 'client-7',
				clientName: '小林六郎',
				serviceTypeId: 'commute-support',
				staffId: TEST_IDS.STAFF_1,
				staffName: '加藤裕子',
				status: 'canceled',
				isUnassigned: false,
			},
		],
		staffOptions: sampleStaffOptions,
		clientOptions: sampleClientOptions,
	},
};

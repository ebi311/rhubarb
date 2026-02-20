import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ShiftDisplayRow } from '../ShiftTable';
import { WeeklyShiftGrid } from './WeeklyShiftGrid';

const meta = {
	title: 'Admin/WeeklySchedules/WeeklyShiftGrid',
	component: WeeklyShiftGrid,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof WeeklyShiftGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const weekStartDate = new Date('2026-01-19T00:00:00+09:00');

const sampleShifts: ShiftDisplayRow[] = [
	{
		id: '1',
		date: new Date('2026-01-19T00:00:00+09:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'physical-care',
		staffId: 'staff-1',
		staffName: 'スタッフA',
		status: 'scheduled',
		isUnassigned: false,
	},
	{
		id: '2',
		date: new Date('2026-01-19T00:00:00+09:00'),
		startTime: { hour: 14, minute: 0 },
		endTime: { hour: 15, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'life-support',
		staffId: 'staff-2',
		staffName: 'スタッフB',
		status: 'scheduled',
		isUnassigned: false,
	},
	{
		id: '3',
		date: new Date('2026-01-20T00:00:00+09:00'),
		startTime: { hour: 10, minute: 0 },
		endTime: { hour: 11, minute: 0 },
		clientId: 'client-2',
		clientName: '佐藤花子',
		serviceTypeId: 'physical-care',
		staffId: 'staff-3',
		staffName: 'スタッフC',
		status: 'scheduled',
		isUnassigned: false,
	},
	{
		id: '4',
		date: new Date('2026-01-21T00:00:00+09:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'physical-care',
		staffId: null,
		staffName: null,
		status: 'scheduled',
		isUnassigned: true,
	},
	{
		id: '5',
		date: new Date('2026-01-22T00:00:00+09:00'),
		startTime: { hour: 13, minute: 0 },
		endTime: { hour: 14, minute: 0 },
		clientId: 'client-2',
		clientName: '佐藤花子',
		serviceTypeId: 'commute-support',
		staffId: 'staff-4',
		staffName: 'スタッフD',
		status: 'canceled',
		isUnassigned: false,
		cancelReason: '利用者都合',
		cancelCategory: 'client',
	},
];

export const Default: Story = {
	args: {
		shifts: sampleShifts,
		weekStartDate: weekStartDate,
	},
};

export const EmptyGrid: Story = {
	args: {
		shifts: [],
		weekStartDate: weekStartDate,
	},
};

const manyClientsShifts: ShiftDisplayRow[] = [
	// 山田太郎
	{
		id: '1',
		date: new Date('2026-01-19T00:00:00+09:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'physical-care',
		staffId: 'staff-1',
		staffName: 'スタッフA',
		status: 'scheduled',
		isUnassigned: false,
	},
	// 佐藤花子
	{
		id: '2',
		date: new Date('2026-01-20T00:00:00+09:00'),
		startTime: { hour: 10, minute: 0 },
		endTime: { hour: 11, minute: 0 },
		clientId: 'client-2',
		clientName: '佐藤花子',
		serviceTypeId: 'life-support',
		staffId: 'staff-2',
		staffName: 'スタッフB',
		status: 'scheduled',
		isUnassigned: false,
	},
	// 鈴木一郎
	{
		id: '3',
		date: new Date('2026-01-21T00:00:00+09:00'),
		startTime: { hour: 14, minute: 0 },
		endTime: { hour: 15, minute: 0 },
		clientId: 'client-3',
		clientName: '鈴木一郎',
		serviceTypeId: 'commute-support',
		staffId: 'staff-3',
		staffName: 'スタッフC',
		status: 'scheduled',
		isUnassigned: false,
	},
	// 田中美咲
	{
		id: '4',
		date: new Date('2026-01-22T00:00:00+09:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientId: 'client-4',
		clientName: '田中美咲',
		serviceTypeId: 'physical-care',
		staffId: 'staff-4',
		staffName: 'スタッフD',
		status: 'scheduled',
		isUnassigned: false,
	},
	// 高橋健太
	{
		id: '5',
		date: new Date('2026-01-23T00:00:00+09:00'),
		startTime: { hour: 11, minute: 0 },
		endTime: { hour: 12, minute: 0 },
		clientId: 'client-5',
		clientName: '高橋健太',
		serviceTypeId: 'life-support',
		staffId: null,
		staffName: null,
		status: 'scheduled',
		isUnassigned: true,
	},
];

export const ManyClients: Story = {
	args: {
		shifts: manyClientsShifts,
		weekStartDate: weekStartDate,
	},
};

const mixedStatusShifts: ShiftDisplayRow[] = [
	{
		id: '1',
		date: new Date('2026-01-19T00:00:00+09:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'physical-care',
		staffId: 'staff-1',
		staffName: 'スタッフA',
		status: 'scheduled',
		isUnassigned: false,
	},
	{
		id: '2',
		date: new Date('2026-01-19T00:00:00+09:00'),
		startTime: { hour: 14, minute: 0 },
		endTime: { hour: 15, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'life-support',
		staffId: 'staff-2',
		staffName: 'スタッフB',
		status: 'canceled',
		isUnassigned: false,
		cancelReason: '利用者都合',
	},
	{
		id: '3',
		date: new Date('2026-01-20T00:00:00+09:00'),
		startTime: { hour: 10, minute: 0 },
		endTime: { hour: 11, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'physical-care',
		staffId: null,
		staffName: null,
		status: 'scheduled',
		isUnassigned: true,
	},
	{
		id: '4',
		date: new Date('2026-01-21T00:00:00+09:00'),
		startTime: { hour: 9, minute: 0 },
		endTime: { hour: 10, minute: 0 },
		clientId: 'client-1',
		clientName: '山田太郎',
		serviceTypeId: 'commute-support',
		staffId: 'staff-3',
		staffName: 'スタッフC',
		status: 'confirmed',
		isUnassigned: false,
	},
];

export const MixedStatus: Story = {
	args: {
		shifts: mixedStatusShifts,
		weekStartDate: weekStartDate,
	},
};

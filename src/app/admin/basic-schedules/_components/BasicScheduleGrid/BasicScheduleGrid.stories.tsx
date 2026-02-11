import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ComponentProps } from 'react';
import { BasicScheduleGrid } from './BasicScheduleGrid';
import type { BasicScheduleGridViewModel } from './types';
const serviceTypeOptions: ComponentProps<
	typeof BasicScheduleGrid
>['serviceTypeOptions'] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活援助' },
];

const staffOptions: ComponentProps<typeof BasicScheduleGrid>['staffOptions'] = [
	{
		id: 'staff-1',
		name: 'スタッフA',
		role: 'helper',
		serviceTypeIds: ['physical-care', 'life-support'],
		note: '',
	},
	{
		id: 'staff-2',
		name: 'スタッフB',
		role: 'helper',
		serviceTypeIds: ['life-support'],
		note: '',
	},
];
const meta = {
	title: 'Admin/BasicSchedules/BasicScheduleGrid',
	component: BasicScheduleGrid,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof BasicScheduleGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSchedules: BasicScheduleGridViewModel[] = [
	{
		clientId: '1',
		clientName: '山田太郎',
		schedulesByWeekday: {
			Mon: [
				{
					id: '1',
					timeRange: '09:00-10:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフA', 'スタッフB'],
					note: null,
				},
			],
			Wed: [
				{
					id: '2',
					timeRange: '14:00-15:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフC'],
					note: '掃除のみ',
				},
			],
			Fri: [
				{
					id: '3',
					timeRange: '10:00-11:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフD'],
					note: null,
				},
			],
		},
	},
	{
		clientId: '2',
		clientName: '佐藤花子',
		schedulesByWeekday: {
			Tue: [
				{
					id: '4',
					timeRange: '08:00-09:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフE'],
					note: null,
				},
			],
			Thu: [
				{
					id: '5',
					timeRange: '13:00-14:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフF'],
					note: null,
				},
			],
		},
	},
];

const multiSchedulesInCell: BasicScheduleGridViewModel[] = [
	{
		clientId: '1',
		clientName: '鈴木一郎',
		schedulesByWeekday: {
			Mon: [
				{
					id: '1',
					timeRange: '09:00-10:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフA'],
					note: null,
				},
				{
					id: '2',
					timeRange: '14:00-15:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフB'],
					note: '買い物代行',
				},
				{
					id: '3',
					timeRange: '18:00-19:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフC'],
					note: '夕食準備',
				},
			],
			Wed: [
				{
					id: '4',
					timeRange: '10:00-11:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフD'],
					note: null,
				},
				{
					id: '5',
					timeRange: '16:00-17:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフE', 'スタッフF'],
					note: '入浴介助（2名体制）',
				},
			],
		},
	},
];

const twoSchedulesSameDay: BasicScheduleGridViewModel[] = [
	{
		clientId: '1',
		clientName: '山田太郎',
		schedulesByWeekday: {
			Mon: [
				{
					id: '1',
					timeRange: '09:00-10:30',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフA'],
					note: null,
				},
				{
					id: '2',
					timeRange: '14:00-15:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフB'],
					note: null,
				},
			],
			Wed: [
				{
					id: '3',
					timeRange: '10:00-11:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフC'],
					note: null,
				},
			],
		},
	},
	{
		clientId: '2',
		clientName: '佐藤花子',
		schedulesByWeekday: {
			Tue: [
				{
					id: '4',
					timeRange: '08:00-09:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフD'],
					note: null,
				},
			],
			Thu: [
				{
					id: '5',
					timeRange: '11:00-12:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフE'],
					note: null,
				},
				{
					id: '6',
					timeRange: '16:00-17:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフF'],
					note: null,
				},
			],
		},
	},
];

const longTextSchedules: BasicScheduleGridViewModel[] = [
	{
		clientId: '1',
		clientName: '田中三郎（とても長い名前の利用者さんのテストケース）',
		schedulesByWeekday: {
			Mon: [
				{
					id: '1',
					timeRange: '09:00-10:00',
					serviceTypeId: 'physical-care',
					staffNames: [
						'スタッフA（山田太郎）',
						'スタッフB（佐藤花子）',
						'スタッフC（鈴木一郎）',
					],
					note: 'これは非常に長い備考欄のテストです。複数行にわたる可能性のある長いテキストが入力された場合、レイアウトが崩れないことを確認します。',
				},
			],
		},
	},
];

export const Default: Story = {
	args: {
		schedules: sampleSchedules,
		serviceTypeOptions,
		staffOptions,
	},
};

export const TwoSchedulesSameDay: Story = {
	args: {
		schedules: twoSchedulesSameDay,
		serviceTypeOptions,
		staffOptions,
	},
};

export const MultipleSchedulesInCell: Story = {
	args: {
		schedules: multiSchedulesInCell,
		serviceTypeOptions,
		staffOptions,
	},
};

export const LongText: Story = {
	args: {
		schedules: longTextSchedules,
		serviceTypeOptions,
		staffOptions,
	},
};

export const Empty: Story = {
	args: {
		schedules: [],
		serviceTypeOptions,
		staffOptions,
	},
};

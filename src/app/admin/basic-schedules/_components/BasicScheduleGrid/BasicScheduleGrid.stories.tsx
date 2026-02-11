import { getBasicScheduleByIdAction } from '@/app/actions/basicSchedules';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ComponentProps } from 'react';
import { mocked } from 'storybook/test';
import { BasicScheduleGrid } from './BasicScheduleGrid';
import type { BasicScheduleGridViewModel } from './types';

/** Storybook 用 RFC 4122 準拠 UUID 定数 */
const STORY_IDS = {
	CLIENT_1: '550e8400-e29b-41d4-a716-446655440001',
	CLIENT_2: '550e8400-e29b-41d4-a716-446655440002',
	STAFF_1: '550e8400-e29b-41d4-a716-446655440011',
	STAFF_2: '550e8400-e29b-41d4-a716-446655440012',
	OFFICE_1: '550e8400-e29b-41d4-a716-446655440031',
	SCHEDULE_1: '550e8400-e29b-41d4-a716-446655440021',
	SCHEDULE_2: '550e8400-e29b-41d4-a716-446655440022',
	SCHEDULE_3: '550e8400-e29b-41d4-a716-446655440023',
	SCHEDULE_4: '550e8400-e29b-41d4-a716-446655440024',
	SCHEDULE_5: '550e8400-e29b-41d4-a716-446655440025',
	SCHEDULE_6: '550e8400-e29b-41d4-a716-446655440026',
} as const;

const serviceTypes: ComponentProps<typeof BasicScheduleGrid>['serviceTypes'] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活支援' },
];

const staffs: ComponentProps<typeof BasicScheduleGrid>['staffs'] = [
	{
		id: STORY_IDS.STAFF_1,
		office_id: STORY_IDS.OFFICE_1,
		name: 'スタッフA',
		role: 'helper',
		service_type_ids: ['physical-care', 'life-support'],
		note: '',
		created_at: new Date('2024-01-01T00:00:00Z'),
		updated_at: new Date('2024-01-01T00:00:00Z'),
	},
	{
		id: STORY_IDS.STAFF_2,
		office_id: STORY_IDS.OFFICE_1,
		name: 'スタッフB',
		role: 'helper',
		service_type_ids: ['life-support'],
		note: '',
		created_at: new Date('2024-01-01T00:00:00Z'),
		updated_at: new Date('2024-01-01T00:00:00Z'),
	},
];
const meta = {
	title: 'Admin/BasicSchedules/BasicScheduleGrid',
	component: BasicScheduleGrid,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
	beforeEach: async () => {
		mocked(getBasicScheduleByIdAction).mockResolvedValue({
			data: {
				id: STORY_IDS.SCHEDULE_1,
				client: { id: STORY_IDS.CLIENT_1, name: '山田太郎' },
				service_type_id: 'physical-care',
				weekday: 'Mon' as const,
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
				note: '',
				staffs: [{ id: STORY_IDS.STAFF_1, name: 'スタッフA' }],
				deleted_at: null,
				created_at: new Date('2024-01-01T00:00:00Z'),
				updated_at: new Date('2024-01-01T00:00:00Z'),
			},
			error: null,
			status: 200,
		});
	},
} satisfies Meta<typeof BasicScheduleGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleSchedules: BasicScheduleGridViewModel[] = [
	{
		clientId: STORY_IDS.CLIENT_1,
		clientName: '山田太郎',
		schedulesByWeekday: {
			Mon: [
				{
					id: STORY_IDS.SCHEDULE_1,
					timeRange: '09:00-10:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフA', 'スタッフB'],
					note: null,
				},
			],
			Wed: [
				{
					id: STORY_IDS.SCHEDULE_2,
					timeRange: '14:00-15:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフC'],
					note: '掃除のみ',
				},
			],
			Fri: [
				{
					id: STORY_IDS.SCHEDULE_3,
					timeRange: '10:00-11:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフD'],
					note: null,
				},
			],
		},
	},
	{
		clientId: STORY_IDS.CLIENT_2,
		clientName: '佐藤花子',
		schedulesByWeekday: {
			Tue: [
				{
					id: STORY_IDS.SCHEDULE_4,
					timeRange: '08:00-09:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフE'],
					note: null,
				},
			],
			Thu: [
				{
					id: STORY_IDS.SCHEDULE_5,
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
		clientId: STORY_IDS.CLIENT_1,
		clientName: '鈴木一郎',
		schedulesByWeekday: {
			Mon: [
				{
					id: STORY_IDS.SCHEDULE_1,
					timeRange: '09:00-10:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフA'],
					note: null,
				},
				{
					id: STORY_IDS.SCHEDULE_2,
					timeRange: '14:00-15:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフB'],
					note: '買い物代行',
				},
				{
					id: STORY_IDS.SCHEDULE_3,
					timeRange: '18:00-19:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフC'],
					note: '夕食準備',
				},
			],
			Wed: [
				{
					id: STORY_IDS.SCHEDULE_4,
					timeRange: '10:00-11:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフD'],
					note: null,
				},
				{
					id: STORY_IDS.SCHEDULE_5,
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
		clientId: STORY_IDS.CLIENT_1,
		clientName: '山田太郎',
		schedulesByWeekday: {
			Mon: [
				{
					id: STORY_IDS.SCHEDULE_1,
					timeRange: '09:00-10:30',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフA'],
					note: null,
				},
				{
					id: STORY_IDS.SCHEDULE_2,
					timeRange: '14:00-15:00',
					serviceTypeId: 'life-support',
					staffNames: ['スタッフB'],
					note: null,
				},
			],
			Wed: [
				{
					id: STORY_IDS.SCHEDULE_3,
					timeRange: '10:00-11:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフC'],
					note: null,
				},
			],
		},
	},
	{
		clientId: STORY_IDS.CLIENT_2,
		clientName: '佐藤花子',
		schedulesByWeekday: {
			Tue: [
				{
					id: STORY_IDS.SCHEDULE_4,
					timeRange: '08:00-09:00',
					serviceTypeId: 'physical-care',
					staffNames: ['スタッフD'],
					note: null,
				},
			],
			Thu: [
				{
					id: STORY_IDS.SCHEDULE_5,
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
		serviceTypes,
		staffs,
	},
};

export const TwoSchedulesSameDay: Story = {
	args: {
		schedules: twoSchedulesSameDay,
		serviceTypes,
		staffs,
	},
};

export const MultipleSchedulesInCell: Story = {
	args: {
		schedules: multiSchedulesInCell,
		serviceTypes,
		staffs,
	},
};

export const LongText: Story = {
	args: {
		schedules: longTextSchedules,
		serviceTypes,
		staffs,
	},
};

export const Empty: Story = {
	args: {
		schedules: [],
		serviceTypes,
		staffs,
	},
};

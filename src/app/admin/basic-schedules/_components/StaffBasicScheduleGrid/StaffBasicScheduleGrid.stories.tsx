import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StaffBasicScheduleGrid } from './StaffBasicScheduleGrid';
import type { StaffBasicScheduleGridViewModel } from './types';

const meta = {
	title:
		'Admin/BasicSchedules/Components/StaffBasicScheduleGrid/StaffBasicScheduleGrid',
	component: StaffBasicScheduleGrid,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof StaffBasicScheduleGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSchedules: StaffBasicScheduleGridViewModel[] = [
	{
		staffId: '1',
		staffName: 'ヘルパー 太郎',
		schedulesByWeekday: {
			Mon: [
				{
					id: '1',
					timeRange: '09:00 - 12:00',
					serviceTypeId: 'physical-care',
					clientName: '利用者 A子',
					note: null,
				},
			],
			Wed: [
				{
					id: '2',
					timeRange: '13:00 - 15:00',
					serviceTypeId: 'life-support',
					clientName: '利用者 B美',
					note: null,
				},
			],
			Fri: [
				{
					id: '3',
					timeRange: '10:00 - 11:30',
					serviceTypeId: 'commute-support',
					clientName: '利用者 C郎',
					note: null,
				},
			],
		},
	},
	{
		staffId: '2',
		staffName: 'ヘルパー 花子',
		schedulesByWeekday: {
			Tue: [
				{
					id: '4',
					timeRange: '09:00 - 11:00',
					serviceTypeId: 'physical-care',
					clientName: '利用者 D子',
					note: null,
				},
			],
			Thu: [
				{
					id: '5',
					timeRange: '14:00 - 16:00',
					serviceTypeId: 'life-support',
					clientName: '利用者 E男',
					note: null,
				},
			],
		},
	},
];

export const Default: Story = {
	args: {
		schedules: mockSchedules,
	},
};

export const Empty: Story = {
	args: {
		schedules: [],
	},
};

export const MultipleSchedulesSameDay: Story = {
	args: {
		schedules: [
			{
				staffId: '1',
				staffName: 'ヘルパー 太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00 - 12:00',
							serviceTypeId: 'physical-care',
							clientName: '利用者 A子',
							note: null,
						},
						{
							id: '2',
							timeRange: '13:00 - 15:00',
							serviceTypeId: 'life-support',
							clientName: '利用者 B美',
							note: null,
						},
						{
							id: '3',
							timeRange: '16:00 - 18:00',
							serviceTypeId: 'commute-support',
							clientName: '利用者 C郎',
							note: null,
						},
					],
				},
			},
		],
	},
};

export const WithUnassigned: Story = {
	args: {
		schedules: [
			{
				staffId: '1',
				staffName: 'ヘルパー 太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00 - 12:00',
							serviceTypeId: 'physical-care',
							clientName: '利用者 A子',
							note: null,
						},
					],
				},
			},
			{
				staffId: null,
				staffName: '未割り当て',
				schedulesByWeekday: {
					Tue: [
						{
							id: '2',
							timeRange: '13:00 - 15:00',
							serviceTypeId: 'life-support',
							clientName: '利用者 B美',
							note: null,
						},
					],
					Thu: [
						{
							id: '3',
							timeRange: '10:00 - 11:30',
							serviceTypeId: 'commute-support',
							clientName: '利用者 C郎',
							note: null,
						},
					],
				},
			},
		],
	},
};

export const LongClientName: Story = {
	args: {
		schedules: [
			{
				staffId: '1',
				staffName: 'ヘルパー 太郎',
				schedulesByWeekday: {
					Mon: [
						{
							id: '1',
							timeRange: '09:00 - 12:00',
							serviceTypeId: 'physical-care',
							clientName: '非常に長い名前の利用者さん',
							note: null,
						},
					],
				},
			},
		],
	},
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Suspense } from 'react';
import { mocked } from 'storybook/test';
import { fetchBasicSchedules } from '../BasicScheduleTable/fetchBasicSchedules';
import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import { BasicScheduleList } from './BasicScheduleList';

const sampleSchedules: BasicScheduleViewModel[] = [
	{
		id: 'schedule-1',
		clientName: '山田太郎',
		serviceTypeId: 'physical-care',
		weekday: 'Mon',
		timeRange: '09:00 - 10:00',
		staffNames: ['田中一郎', '佐藤花子'],
		note: '朝のケア',
	},
	{
		id: 'schedule-2',
		clientName: '鈴木花子',
		serviceTypeId: 'life-support',
		weekday: 'Tue',
		timeRange: '14:00 - 15:30',
		staffNames: ['田中一郎'],
		note: null,
	},
	{
		id: 'schedule-3',
		clientName: '佐藤一郎',
		serviceTypeId: 'commute-support',
		weekday: 'Wed',
		timeRange: '10:00 - 12:00',
		staffNames: [],
		note: '病院まで送迎',
	},
];

const meta = {
	title: 'Admin/BasicSchedules/BasicScheduleList',
	component: BasicScheduleList,
	parameters: {
		layout: 'padded',
	},
	beforeEach: () => {
		mocked(fetchBasicSchedules).mockResolvedValue(sampleSchedules);
	},
	decorators: [
		(Story) => (
			<Suspense>
				<Story />
			</Suspense>
		),
	],
} satisfies Meta<typeof BasicScheduleList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		filters: {
			clientId: undefined,
			serviceTypeId: undefined,
			weekday: undefined,
		},
	},
};

export const Empty: Story = {
	args: {
		filters: {
			clientId: 'non-existent-client',
			serviceTypeId: undefined,
			weekday: undefined,
		},
	},
	beforeEach: () => {
		mocked(fetchBasicSchedules).mockResolvedValue([]);
	},
};

export const WithFilters: Story = {
	args: {
		filters: {
			weekday: 'Mon',
			clientId: 'client-1',
			serviceTypeId: undefined,
		},
	},
};

export const ManySchedules: Story = {
	args: {
		filters: {
			clientId: undefined,
			serviceTypeId: undefined,
			weekday: undefined,
		},
	},
	beforeEach: () => {
		const manySchedules: BasicScheduleViewModel[] = Array.from(
			{ length: 15 },
			(_, i) => ({
				id: `schedule-${i}`,
				clientName: `利用者${i + 1}`,
				serviceTypeId: ['physical-care', 'life-support', 'commute-support'][
					i % 3
				] as BasicScheduleViewModel['serviceTypeId'],
				weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][
					i % 7
				] as BasicScheduleViewModel['weekday'],
				timeRange: `${9 + (i % 8)}:00 - ${10 + (i % 8)}:30`,
				staffNames: i % 3 === 0 ? [] : [`スタッフ${i + 1}`, `スタッフ${i + 2}`],
				note: i % 2 === 0 ? `備考${i}` : null,
			}),
		);
		mocked(fetchBasicSchedules).mockResolvedValue(manySchedules);
	},
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Suspense } from 'react';
import { mocked } from 'storybook/test';
import { BasicScheduleTable } from './BasicScheduleTable';
import { fetchBasicSchedules } from './fetchBasicSchedules';
import type { BasicScheduleViewModel } from './types';

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
	title: 'Admin/BasicSchedules/BasicScheduleTable',
	component: BasicScheduleTable,
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
} satisfies Meta<typeof BasicScheduleTable>;

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

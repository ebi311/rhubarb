import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BasicScheduleFilterBar } from './BasicScheduleFilterBar';

const sampleClients = [
	{ id: 'client-1', name: '山田太郎' },
	{ id: 'client-2', name: '鈴木花子' },
	{ id: 'client-3', name: '佐藤一郎' },
];

const sampleServiceTypes = [
	{ id: 'st-1', name: '身体介護' },
	{ id: 'st-2', name: '生活支援' },
	{ id: 'st-3', name: '通院介助' },
];

const meta = {
	title: 'Admin/BasicSchedules/BasicScheduleFilterBar',
	component: BasicScheduleFilterBar,
	args: {
		clients: sampleClients,
		serviceTypes: sampleServiceTypes,
	},
	parameters: {
		layout: 'padded',
		nextjs: {
			router: {
				pathname: '/admin/basic-schedules',
				query: {},
			},
		},
	},
} satisfies Meta<typeof BasicScheduleFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFilters: Story = {
	parameters: {
		nextjs: {
			router: {
				pathname: '/admin/basic-schedules',
				query: {
					weekday: 'Mon',
					clientId: 'client-1',
					serviceTypeId: 'st-1',
				},
			},
		},
	},
};

export const WeekdayOnly: Story = {
	parameters: {
		nextjs: {
			router: {
				pathname: '/admin/basic-schedules',
				query: {
					weekday: 'Tue',
				},
			},
		},
	},
};

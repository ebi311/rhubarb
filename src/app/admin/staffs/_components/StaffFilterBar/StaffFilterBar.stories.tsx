import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { StaffFilterState } from '../../_types';
import { StaffFilterBar } from './StaffFilterBar';

const defaultFilters: StaffFilterState = { query: '', role: 'all' };

const meta = {
	title: 'Admin/Staffs/StaffFilterBar',
	component: StaffFilterBar,
	args: {
		filters: defaultFilters,
	},
	parameters: {
		layout: 'centered',
		nextjs: {
			router: {
				pathname: '/admin/staffs',
				query: {},
			},
		},
	},
} satisfies Meta<typeof StaffFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithQuery: Story = {
	args: {
		filters: { query: '山田', role: 'admin' },
	},
};

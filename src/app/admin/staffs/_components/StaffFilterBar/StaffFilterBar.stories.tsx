import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { StaffFilterState } from '../../_types';
import { StaffFilterBar } from './StaffFilterBar';

const defaultFilters: StaffFilterState = { query: '', role: 'all' };

const meta = {
	title: 'Admin/Staffs/StaffFilterBar',
	component: StaffFilterBar,
	args: {
		filters: defaultFilters,
		onChange: () => undefined,
	},
	parameters: {
		layout: 'centered',
	},
	// decorators: [
	// 	(Story) => (
	// 		<div className="p-10 w-[640px]">
	// 			<Story />
	// 		</div>
	// 	),
	// ],
} satisfies Meta<typeof StaffFilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithQuery: Story = {
	args: {
		filters: { query: '山田', role: 'admin' },
	},
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { StaffViewModel } from '../../_types';
import { StaffTable } from './StaffTable';

const sampleStaffs: StaffViewModel[] = [
	{
		id: '019b1d20-0000-4000-8000-000000000111',
		name: '山田太郎',
		role: 'admin',
		email: 'yamada@example.com',
		note: '夜間帯対応可能',
		serviceTypes: [
			{ id: 'svc-1', name: '身体介護' },
			{ id: 'svc-2', name: '生活援助' },
		],
		updatedAt: '2025/01/01 10:00',
	},
	{
		id: '019b1d20-0000-4000-8000-000000000222',
		name: '佐藤花子',
		role: 'helper',
		email: null,
		note: null,
		serviceTypes: [],
		updatedAt: '2025/01/02 09:00',
	},
];

const meta = {
	title: 'Admin/Staffs/StaffTable',
	component: StaffTable,
	args: {
		staffs: sampleStaffs,
		onEdit: fn(),
		onDelete: fn(),
	},
	parameters: {
		layout: 'fullscreen',
	},
} satisfies Meta<typeof StaffTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: {
		staffs: [],
	},
};

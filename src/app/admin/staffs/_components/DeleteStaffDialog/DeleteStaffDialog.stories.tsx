import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { DeleteStaffDialog } from './DeleteStaffDialog';

const staff = {
	id: '019b1d20-0000-4000-8000-00000000d111',
	name: '佐藤花子',
};

const meta = {
	title: 'Admin/Staffs/DeleteStaffDialog',
	component: DeleteStaffDialog,
	args: {
		isOpen: true,
		staff,
		onClose: fn(),
		onDeleted: fn(),
	},
	parameters: {
		layout: 'centered',
	},
} satisfies Meta<typeof DeleteStaffDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongName: Story = {
	args: {
		staff: {
			id: '019b1d20-0000-4000-8000-00000000d222',
			name: '株式会社みらい介護サービス東日本 第三事業部 管理者',
		},
	},
};

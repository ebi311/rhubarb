import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { UserMenu } from './UserMenu';

const meta: Meta<typeof UserMenu> = {
	title: 'App/Header/UserMenu',
	component: UserMenu,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof UserMenu>;

export const Default: Story = {
	args: {
		userName: 'テストユーザー',
	},
};

export const LongName: Story = {
	args: {
		userName: '非常に長い名前のユーザーアカウント',
	},
};

export const Email: Story = {
	args: {
		userName: 'user@example.com',
	},
};

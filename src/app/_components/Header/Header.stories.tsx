import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HeaderPresentational } from './HeaderPresentational';

const meta: Meta<typeof HeaderPresentational> = {
	title: 'App/Header',
	component: HeaderPresentational,
	parameters: {
		layout: 'fullscreen',
	},
};

export default meta;
type Story = StoryObj<typeof HeaderPresentational>;

export const Default: Story = {
	args: {
		userName: 'デモユーザー',
	},
};

export const WithEmail: Story = {
	args: {
		userName: 'user@example.com',
	},
};

export const Guest: Story = {
	args: {
		userName: 'ゲスト',
	},
};

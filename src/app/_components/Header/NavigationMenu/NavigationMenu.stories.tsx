import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NavigationMenu } from './NavigationMenu';

const meta: Meta<typeof NavigationMenu> = {
	title: 'App/Header/NavigationMenu',
	component: NavigationMenu,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NavigationMenu>;

export const Default: Story = {};

export const InNavbar: Story = {
	decorators: [
		(Story) => (
			<div className="navbar bg-base-100">
				<div className="flex-none">
					<Story />
				</div>
			</div>
		),
	],
};

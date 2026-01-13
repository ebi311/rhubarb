import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ServiceTypeBadges } from './ServiceTypeBadges';

const meta = {
	title: 'Admin/Common/ServiceTypeBadges',
	component: ServiceTypeBadges,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: {
		serviceType: ['身体介護', '生活援助'],
	},
} satisfies Meta<typeof ServiceTypeBadges>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
	args: {
		serviceType: [],
		emptyLabel: '未割当',
	},
};

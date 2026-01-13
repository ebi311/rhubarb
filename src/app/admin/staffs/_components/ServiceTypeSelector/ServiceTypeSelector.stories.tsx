import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { ServiceTypeOption } from '../../_types';
import { ServiceTypeSelector } from './ServiceTypeSelector';

const options: ServiceTypeOption[] = [
	{ id: 'physical-care', name: '身体介護' },
	{ id: 'life-support', name: '生活支援' },
	{ id: 'commute-support', name: '通院サポート' },
];

const meta = {
	title: 'Admin/Staffs/ServiceTypeSelector',
	component: ServiceTypeSelector,
	args: {
		options,
		onChange: fn(),
	},
	parameters: {
		layout: 'centered',
	},
} satisfies Meta<typeof ServiceTypeSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		selectedIds: ['physical-care'],
	},
};

export const AllSelected: Story = {
	args: {
		selectedIds: options.map((option) => option.id),
	},
};

export const NoOptions: Story = {
	args: {
		options: [],
		selectedIds: [],
	},
};

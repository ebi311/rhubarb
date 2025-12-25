import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { ServiceTypeOption } from '../../_types';
import { ServiceTypeSelector } from './ServiceTypeSelector';

const options: ServiceTypeOption[] = [
	{ id: 'svc-1', name: '身体介護' },
	{ id: 'svc-2', name: '生活援助' },
	{ id: 'svc-3', name: '通院介助' },
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
		selectedIds: ['svc-1'],
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

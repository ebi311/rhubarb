import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Icon, ICON_NAMES } from './Icon';

const meta: Meta<typeof Icon> = {
	title: 'App/Icon',
	component: Icon,
	tags: ['autodocs'],
	parameters: {
		layout: 'centered',
	},
	argTypes: {
		name: {
			control: 'select',
			options: ICON_NAMES,
		},
		fill: {
			control: 'boolean',
		},
		className: {
			control: 'text',
		},
	},
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
	args: {
		name: 'home',
		fill: false,
	},
};

export const Filled: Story = {
	args: {
		name: 'home',
		fill: true,
	},
};

export const Large: Story = {
	args: {
		name: 'calendar_month',
		fill: false,
		className: 'text-4xl',
	},
};

export const Colored: Story = {
	args: {
		name: 'check_circle',
		fill: true,
		className: 'text-success',
	},
};

export const Warning: Story = {
	args: {
		name: 'warning',
		fill: true,
		className: 'text-warning',
	},
};

export const AllIcons: Story = {
	render: () => (
		<div className="p-4">
			<h2 className="mb-6 text-2xl font-bold">すべてのアイコン</h2>
			<div className="grid grid-cols-4 gap-6">
				{ICON_NAMES.map((iconName) => (
					<div key={iconName} className="flex flex-col items-center gap-2">
						<div className="flex gap-2">
							<Icon name={iconName} fill={false} className="text-3xl" />
							<Icon name={iconName} fill={true} className="text-3xl" />
						</div>
						<span className="text-center text-xs break-all">{iconName}</span>
					</div>
				))}
			</div>
		</div>
	),
};

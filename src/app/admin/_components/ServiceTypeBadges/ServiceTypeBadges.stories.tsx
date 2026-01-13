import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ServiceTypeBadge } from './ServiceTypeBadge';
import { ServiceTypeBadges } from './ServiceTypeBadges';

const meta = {
	title: 'Admin/Common/ServiceTypeBadges',
	component: ServiceTypeBadges,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: {
		serviceTypeIds: ['physical-care', 'life-support'],
	},
} satisfies Meta<typeof ServiceTypeBadges>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllTypes: Story = {
	args: {
		serviceTypeIds: ['physical-care', 'life-support', 'commute-support'],
	},
};

export const Empty: Story = {
	args: {
		serviceTypeIds: [],
		emptyLabel: '未割当',
	},
};

export const MediumSize: Story = {
	args: {
		serviceTypeIds: ['physical-care', 'life-support', 'commute-support'],
		size: 'md',
	},
};

// 単一バッジのストーリー（ServiceTypeBadges の中にカスタムレンダーで表示）
export const PhysicalCare: Story = {
	args: {
		serviceTypeIds: ['physical-care'],
	},
};

export const LifeSupport: Story = {
	args: {
		serviceTypeIds: ['life-support'],
	},
};

export const CommuteSupport: Story = {
	args: {
		serviceTypeIds: ['commute-support'],
	},
};

export const AllBadgesComparison: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex gap-4">
				<span className="w-24 text-sm">Small:</span>
				<ServiceTypeBadge serviceTypeId="physical-care" size="sm" />
				<ServiceTypeBadge serviceTypeId="life-support" size="sm" />
				<ServiceTypeBadge serviceTypeId="commute-support" size="sm" />
			</div>
			<div className="flex gap-4">
				<span className="w-24 text-sm">Medium:</span>
				<ServiceTypeBadge serviceTypeId="physical-care" size="md" />
				<ServiceTypeBadge serviceTypeId="life-support" size="md" />
				<ServiceTypeBadge serviceTypeId="commute-support" size="md" />
			</div>
		</div>
	),
	args: {
		serviceTypeIds: [],
	},
};

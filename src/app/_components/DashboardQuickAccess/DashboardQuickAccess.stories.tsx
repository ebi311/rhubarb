import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DashboardQuickAccess } from './DashboardQuickAccess';

const meta: Meta<typeof DashboardQuickAccess> = {
	title: 'Components/DashboardQuickAccess',
	component: DashboardQuickAccess,
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div className="max-w-2xl p-4">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof DashboardQuickAccess>;

/**
 * デフォルト表示
 * 基本スケジュールと週次スケジュールへのクイックアクセスカードを表示します。
 */
export const Default: Story = {};

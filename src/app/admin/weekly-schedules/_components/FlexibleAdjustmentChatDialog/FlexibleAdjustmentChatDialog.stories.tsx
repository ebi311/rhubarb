import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FlexibleAdjustmentChatDialog } from './FlexibleAdjustmentChatDialog';

const meta = {
	title: 'Admin/WeeklySchedules/FlexibleAdjustmentChatDialog',
	component: FlexibleAdjustmentChatDialog,
	tags: ['autodocs'],
	args: {
		isOpen: true,
		weekRange: {
			startDate: '2026-03-16',
			endDate: '2026-03-22',
		},
		allowlist: {
			shiftIds: [TEST_IDS.SCHEDULE_1, TEST_IDS.SCHEDULE_2],
			staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
		},
		onClose: fn(),
	},
} satisfies Meta<typeof FlexibleAdjustmentChatDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Closed: Story = {
	args: {
		isOpen: false,
	},
};

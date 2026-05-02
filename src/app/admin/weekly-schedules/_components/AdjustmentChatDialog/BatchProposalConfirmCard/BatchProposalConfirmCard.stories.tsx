import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { BatchProposalConfirmCard } from './BatchProposalConfirmCard';

const meta = {
	title: 'Admin/WeeklySchedules/BatchProposalConfirmCard',
	component: BatchProposalConfirmCard,
	tags: ['autodocs'],
	args: {
		onConfirm: fn(),
		onCancel: fn(),
		proposal: {
			proposals: [
				{
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_2,
					reason: '欠勤対応',
				},
				{
					type: 'update_shift_time',
					shiftId: TEST_IDS.SCHEDULE_2,
					startAt: '2026-03-16T09:00:00+09:00',
					endAt: '2026-03-16T10:00:00+09:00',
					reason: '利用者都合',
				},
			],
		},
	},
} satisfies Meta<typeof BatchProposalConfirmCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
	args: {
		isLoading: true,
	},
};

import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ProposalConfirmCard } from './ProposalConfirmCard';

const meta = {
	title: 'Admin/WeeklySchedules/AdjustmentChatDialog/ProposalConfirmCard',
	component: ProposalConfirmCard,
	tags: ['autodocs'],
	args: {
		onConfirm: fn(),
		onDismiss: fn(),
	},
} satisfies Meta<typeof ProposalConfirmCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChangeShiftStaff: Story = {
	args: {
		proposal: {
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '担当者の急病のため',
		},
		beforeValue: '山田 太郎',
		afterValue: '佐藤 花子',
	},
};

export const ChangeShiftStaffStreaming: Story = {
	args: {
		proposal: {
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '担当者の急病のため',
		},
		beforeValue: '山田 太郎',
		afterValue: '佐藤 花子',
		isStreaming: true,
	},
};

export const UpdateShiftTimeExecuting: Story = {
	args: {
		proposal: {
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-02-24T11:00:00+09:00',
			endAt: '2026-02-24T12:00:00+09:00',
			reason: '利用者都合のため',
		},
		beforeValue: '2026/02/24 10:00-11:00',
		afterValue: '2026/02/24 11:00-12:00',
		isExecuting: true,
	},
};

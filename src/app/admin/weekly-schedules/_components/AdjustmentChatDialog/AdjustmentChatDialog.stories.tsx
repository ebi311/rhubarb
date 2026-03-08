import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AdjustmentChatDialog } from './AdjustmentChatDialog';

const meta = {
	title: 'Admin/WeeklySchedules/AdjustmentChatDialog',
	component: AdjustmentChatDialog,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
	args: {
		onClose: fn(),
	},
} satisfies Meta<typeof AdjustmentChatDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const shiftContext = {
	id: TEST_IDS.SCHEDULE_1,
	staffName: '山田太郎',
	clientName: '田中太郎',
	date: '2026-02-24',
	startTime: '10:00',
	endTime: '11:00',
};

export const Default: Story = {
	args: {
		isOpen: true,
		shiftContext,
	},
};

export const Closed: Story = {
	args: {
		isOpen: false,
		shiftContext,
	},
};

export const WithUnassignedStaff: Story = {
	args: {
		isOpen: true,
		shiftContext: {
			...shiftContext,
			staffName: undefined,
		},
	},
};

export const WithUnknownClient: Story = {
	args: {
		isOpen: true,
		shiftContext: {
			...shiftContext,
			clientName: undefined,
		},
	},
};

export const InteractionTest: Story = {
	args: {
		isOpen: true,
		shiftContext,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		// 入力欄を確認
		const input = canvas.getByPlaceholderText('メッセージを入力...');
		await expect(input).toBeInTheDocument();

		// 送信ボタンが無効であることを確認
		const submitButton = canvas.getByRole('button', { name: '送信' });
		await expect(submitButton).toBeDisabled();

		// メッセージを入力
		await userEvent.type(input, 'テストメッセージ');

		// 送信ボタンが有効になることを確認
		await expect(submitButton).toBeEnabled();
	},
};

import { createOneOffShiftAction } from '@/app/actions/shifts';
import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, mocked } from 'storybook/test';
import { CreateOneOffShiftDialog } from './CreateOneOffShiftDialog';

const meta: Meta<typeof CreateOneOffShiftDialog> = {
	title: 'Admin/WeeklySchedules/CreateOneOffShiftDialog',
	component: CreateOneOffShiftDialog,
	parameters: {
		layout: 'padded',
		nextjs: {
			appDirectory: true,
			navigation: {
				refresh: fn(),
			},
		},
	},
	beforeEach: async () => {
		mocked(createOneOffShiftAction).mockResolvedValue({
			data: null,
			error: 'storybook: disabled submit',
			status: 500,
		});
	},
};

export default meta;
type Story = StoryObj<typeof CreateOneOffShiftDialog>;

export const Default: Story = {
	args: {
		isOpen: true,
		weekStartDate: new Date('2026-02-16T00:00:00'),
		clientOptions: [{ id: TEST_IDS.CLIENT_1, name: '利用者A' }],
		staffOptions: [
			{
				id: TEST_IDS.STAFF_1,
				name: '山田花子',
				role: 'helper',
				serviceTypeIds: ['life-support', 'physical-care'],
			},
		],
		onClose: fn(),
	},
};

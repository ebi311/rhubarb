import { createOneOffShiftAction } from '@/app/actions/shifts';
import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, mocked } from 'storybook/test';
import { CreateOneOffShiftButton } from './CreateOneOffShiftButton';

const meta: Meta<typeof CreateOneOffShiftButton> = {
	title: 'Admin/WeeklySchedules/CreateOneOffShiftButton',
	component: CreateOneOffShiftButton,
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
type Story = StoryObj<typeof CreateOneOffShiftButton>;

export const Default: Story = {
	args: {
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
	},
};

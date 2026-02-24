import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AdjustmentWizardDialog } from './AdjustmentWizardDialog';

const meta = {
	title: 'Admin/WeeklySchedules/AdjustmentWizardDialog',
	component: AdjustmentWizardDialog,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
	args: {
		onClose: fn(),
	},
} satisfies Meta<typeof AdjustmentWizardDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		isOpen: true,
		shiftId: TEST_IDS.SCHEDULE_1,
	},
};

export const Closed: Story = {
	args: {
		isOpen: false,
		shiftId: TEST_IDS.SCHEDULE_1,
	},
};

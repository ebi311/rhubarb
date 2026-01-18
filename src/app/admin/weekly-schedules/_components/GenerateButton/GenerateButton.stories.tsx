import { generateWeeklyShiftsAction } from '@/app/actions/weeklySchedules';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, mocked, userEvent, waitFor, within } from 'storybook/test';
import { GenerateButton } from './GenerateButton';

const meta = {
	title: 'Admin/WeeklySchedules/GenerateButton',
	component: GenerateButton,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	args: {
		onGenerated: fn(),
	},
	beforeEach: async () => {
		mocked(generateWeeklyShiftsAction).mockResolvedValue({
			data: { created: 5, skipped: 0, total: 5 },
			error: null,
			status: 200,
		});
	},
} satisfies Meta<typeof GenerateButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		weekStartDate: new Date('2026-01-19T00:00:00+09:00'),
	},
};

export const Disabled: Story = {
	args: {
		weekStartDate: new Date('2026-01-19T00:00:00+09:00'),
		disabled: true,
	},
};

export const ClickEvent: Story = {
	args: {
		weekStartDate: new Date('2026-01-19T00:00:00+09:00'),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		const button = canvas.getByRole('button');
		await userEvent.click(button);

		await waitFor(() => {
			expect(args.onGenerated).toHaveBeenCalled();
		});
	},
};

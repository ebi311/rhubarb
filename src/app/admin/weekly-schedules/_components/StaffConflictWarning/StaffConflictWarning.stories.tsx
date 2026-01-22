import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StaffConflictWarning } from './StaffConflictWarning';

const meta = {
	title: 'Admin/WeeklySchedules/StaffConflictWarning',
	component: StaffConflictWarning,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof StaffConflictWarning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoConflicts: Story = {
	args: {
		conflictingShifts: [],
	},
};

export const SingleConflict: Story = {
	args: {
		conflictingShifts: [
			{
				id: '12345678-1234-1234-8234-123456789abc',
				clientName: '田中太郎',
				startTime: new Date('2026-01-22T09:00:00+09:00'),
				endTime: new Date('2026-01-22T12:00:00+09:00'),
			},
		],
	},
};

export const MultipleConflicts: Story = {
	args: {
		conflictingShifts: [
			{
				id: '12345678-1234-1234-8234-123456789abc',
				clientName: '田中太郎',
				startTime: new Date('2026-01-22T09:00:00+09:00'),
				endTime: new Date('2026-01-22T12:00:00+09:00'),
			},
			{
				id: '12345678-1234-1234-8234-123456789def',
				clientName: '鈴木花子',
				startTime: new Date('2026-01-22T14:00:00+09:00'),
				endTime: new Date('2026-01-22T17:00:00+09:00'),
			},
			{
				id: '12345678-1234-1234-8234-123456789ghi',
				clientName: '佐藤次郎',
				startTime: new Date('2026-01-22T18:00:00+09:00'),
				endTime: new Date('2026-01-22T20:30:00+09:00'),
			},
		],
	},
};

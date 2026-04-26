import { TEST_IDS, createTestId } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { StepHelperCandidates } from './StepHelperCandidates';

const meta = {
	title: 'Admin/WeeklySchedules/StepHelperCandidates',
	component: StepHelperCandidates,
	tags: ['autodocs'],
	args: {
		shiftId: TEST_IDS.SCHEDULE_1,
		onComplete: fn(),
		onCascadeReopen: fn(),
		requestAssign: fn().mockResolvedValue({
			data: {
				updatedShift: {
					id: TEST_IDS.SCHEDULE_1,
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					staff_id: TEST_IDS.STAFF_1,
					date: new Date('2026-02-22'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
					status: 'scheduled',
					is_unassigned: false,
					canceled_reason: null,
					canceled_category: null,
					canceled_at: null,
					created_at: new Date('2026-02-22T00:00:00Z'),
					updated_at: new Date('2026-02-22T00:00:00Z'),
				},
				cascadeUnassignedShiftIds: [],
			},
			error: null,
			status: 200,
		}),
	},
} satisfies Meta<typeof StepHelperCandidates>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		requestCandidates: fn().mockResolvedValue({
			data: {
				candidates: [
					{
						staffId: TEST_IDS.STAFF_1,
						staffName: '山田太郎',
						conflictingShifts: [],
					},
					{
						staffId: TEST_IDS.STAFF_2,
						staffName: '鈴木花子',
						conflictingShifts: [
							{
								shiftId: createTestId(),
								clientName: '田中様',
								date: '2026-02-22',
								startTime: { hour: 9, minute: 30 },
								endTime: { hour: 10, minute: 30 },
							},
						],
					},
				],
			},
			error: null,
			status: 200,
		}),
	},
};

export const Loading: Story = {
	args: {
		requestCandidates: fn().mockImplementation(
			() => new Promise(() => undefined),
		),
	},
};

export const NoCandidates: Story = {
	args: {
		requestCandidates: fn().mockResolvedValue({
			data: { candidates: [] },
			error: null,
			status: 200,
		}),
	},
};

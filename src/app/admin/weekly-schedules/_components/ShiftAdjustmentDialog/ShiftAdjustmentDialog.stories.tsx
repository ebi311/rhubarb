import { suggestShiftAdjustmentsAction } from '@/app/actions/shiftAdjustments';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, mocked } from 'storybook/test';
import type { ShiftDisplayRow } from '../ShiftTable';
import { ShiftAdjustmentDialog } from './ShiftAdjustmentDialog';

const meta = {
	title: 'Admin/WeeklySchedules/ShiftAdjustmentDialog',
	component: ShiftAdjustmentDialog,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
	args: {
		onClose: fn(),
	},
	beforeEach: async () => {
		mocked(suggestShiftAdjustmentsAction).mockResolvedValue({
			data: {
				absence: {
					staffId: TEST_IDS.STAFF_2,
					startDate: new Date('2026-02-22T00:00:00+09:00'),
					endDate: new Date('2026-02-28T00:00:00+09:00'),
					memo: '急休',
				},
				affected: [],
			},
			error: null,
			status: 200,
		});
	},
} satisfies Meta<typeof ShiftAdjustmentDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockStaffOptions: StaffPickerOption[] = [
	{
		id: TEST_IDS.STAFF_1,
		name: '山田太郎',
		role: 'helper' as const,
		serviceTypeIds: ['life-support'],
	},
	{
		id: TEST_IDS.STAFF_2,
		name: '鈴木花子',
		role: 'helper' as const,
		serviceTypeIds: ['physical-care'],
	},
];

const sampleShifts: ShiftDisplayRow[] = [
	{
		id: TEST_IDS.SCHEDULE_1,
		date: new Date('2026-02-24T00:00:00+09:00'),
		startTime: { hour: 10, minute: 0 },
		endTime: { hour: 11, minute: 0 },
		clientId: TEST_IDS.CLIENT_1,
		clientName: '田中太郎',
		serviceTypeId: 'life-support',
		staffId: TEST_IDS.STAFF_2,
		staffName: '鈴木花子',
		status: 'scheduled',
		isUnassigned: false,
	},
];

export const Default: Story = {
	args: {
		isOpen: true,
		weekStartDate: new Date('2026-02-22T00:00:00+09:00'),
		staffOptions: mockStaffOptions,
		shifts: sampleShifts,
	},
};

export const Closed: Story = {
	args: {
		...Default.args,
		isOpen: false,
	},
};

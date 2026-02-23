import {
	suggestClientDatetimeChangeAdjustmentsAction,
	suggestShiftAdjustmentsAction,
} from '@/app/actions/shiftAdjustments';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { TEST_IDS } from '@/test/helpers/testIds';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, mocked, userEvent, within } from 'storybook/test';
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
				affected: [
					{
						shift: {
							id: TEST_IDS.SCHEDULE_1,
							client_id: TEST_IDS.CLIENT_1,
							service_type_id: 'life-support',
							staff_id: TEST_IDS.STAFF_2,
							date: new Date('2026-02-24T00:00:00+09:00'),
							start_time: { hour: 10, minute: 0 },
							end_time: { hour: 11, minute: 0 },
							status: 'scheduled',
						},
						suggestions: [
							{
								operations: [
									{
										type: 'change_staff',
										shift_id: TEST_IDS.SCHEDULE_2,
										from_staff_id: TEST_IDS.STAFF_1,
										to_staff_id: TEST_IDS.STAFF_3,
									},
									{
										type: 'change_staff',
										shift_id: TEST_IDS.SCHEDULE_1,
										from_staff_id: TEST_IDS.STAFF_2,
										to_staff_id: TEST_IDS.STAFF_1,
									},
								],
								rationale: [
									{ code: 'service_type_ok', message: 'サービス種別適性あり' },
									{ code: 'no_conflict', message: '時間重複なし' },
								],
							},
						],
					},
				],
			},
			error: null,
			status: 200,
		});

		mocked(suggestClientDatetimeChangeAdjustmentsAction).mockResolvedValue({
			data: {
				change: {
					shiftId: TEST_IDS.SCHEDULE_1,
					newDate: new Date('2026-02-26T00:00:00+09:00'),
					newStartTime: { hour: 13, minute: 0 },
					newEndTime: { hour: 14, minute: 0 },
					memo: '利用者都合の日時変更',
				},
				target: {
					shift: {
						id: TEST_IDS.SCHEDULE_1,
						client_id: TEST_IDS.CLIENT_1,
						service_type_id: 'life-support',
						staff_id: TEST_IDS.STAFF_2,
						date: new Date('2026-02-24T00:00:00+09:00'),
						start_time: { hour: 10, minute: 0 },
						end_time: { hour: 11, minute: 0 },
						status: 'scheduled',
					},
					suggestions: [
						{
							operations: [
								{
									type: 'update_shift_schedule',
									shift_id: TEST_IDS.SCHEDULE_1,
									new_date: new Date('2026-02-26T00:00:00+09:00'),
									new_start_time: { hour: 13, minute: 0 },
									new_end_time: { hour: 14, minute: 0 },
								},
								{
									type: 'change_staff',
									shift_id: TEST_IDS.SCHEDULE_2,
									from_staff_id: TEST_IDS.STAFF_1,
									to_staff_id: TEST_IDS.STAFF_3,
								},
							],
							rationale: [
								{ code: 'time_window_ok', message: '時間帯の調整が可能' },
							],
						},
					],
				},
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
		id: TEST_IDS.STAFF_3,
		name: '佐藤次郎',
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
	{
		id: TEST_IDS.SCHEDULE_2,
		date: new Date('2026-02-24T00:00:00+09:00'),
		startTime: { hour: 10, minute: 30 },
		endTime: { hour: 11, minute: 30 },
		clientId: TEST_IDS.CLIENT_2,
		clientName: '佐々木花子',
		serviceTypeId: 'life-support',
		staffId: TEST_IDS.STAFF_1,
		staffName: '山田太郎',
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
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.selectOptions(
			canvas.getByLabelText('欠勤スタッフ'),
			TEST_IDS.STAFF_2,
		);
		await userEvent.click(canvas.getByRole('button', { name: '提案を取得' }));
		await expect(canvas.getByText('提案結果')).toBeInTheDocument();
		await expect(canvas.getByText(/案1:/)).toBeInTheDocument();
		await expect(canvas.getByText(/佐々木花子/)).toBeInTheDocument();
		await expect(canvas.getByText(/案1:.*佐藤次郎/)).toBeInTheDocument();
		await expect(canvas.getByText(/2手目:/)).toBeInTheDocument();
		await expect(canvas.getAllByText(/2手目: 山田太郎 に変更/)).toHaveLength(1);
	},
};

export const Closed: Story = {
	args: {
		...Default.args,
		isOpen: false,
	},
};

export const ClientDatetimeChange: Story = {
	args: {
		...Default.args,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(
			canvas.getByRole('radio', { name: '利用者都合の日時変更' }),
		);
		await userEvent.selectOptions(
			canvas.getByLabelText(/対象シフト/),
			TEST_IDS.SCHEDULE_1,
		);
		await userEvent.clear(canvas.getByLabelText('新しい開始時刻'));
		await userEvent.type(canvas.getByLabelText('新しい開始時刻'), '13:00');
		await userEvent.clear(canvas.getByLabelText('新しい終了時刻'));
		await userEvent.type(canvas.getByLabelText('新しい終了時刻'), '14:00');
		await userEvent.click(canvas.getByRole('button', { name: '提案を取得' }));
		await expect(canvas.getByText('提案結果')).toBeInTheDocument();
		await expect(
			canvas.getByText(/日時を 2026-02-26 13:00〜14:00 に変更/),
		).toBeInTheDocument();
		await expect(canvas.getByText(/2手目:/)).toBeInTheDocument();
	},
};

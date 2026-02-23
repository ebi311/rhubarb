import {
	suggestClientDatetimeChangeAdjustmentsAction,
	suggestShiftAdjustmentsAction,
} from '@/app/actions/shiftAdjustments';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { TEST_IDS } from '@/test/helpers/testIds';
import {
	addJstDays,
	formatJstDateString,
	getJstDateOnly,
	parseJstDateString,
} from '@/utils/date';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { ShiftAdjustmentDialog } from './ShiftAdjustmentDialog';

vi.mock('@/app/actions/shiftAdjustments');
vi.mock('react-toastify', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

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
		id: '11111111-1111-1111-8111-111111111111',
		name: '管理者スタッフ',
		role: 'admin' as const,
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

describe('ShiftAdjustmentDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(suggestShiftAdjustmentsAction).mockResolvedValue({
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

		vi.mocked(suggestClientDatetimeChangeAdjustmentsAction).mockResolvedValue({
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
	});

	it('ダイアログが開閉する', () => {
		const { rerender } = render(
			<ShiftAdjustmentDialog
				isOpen={false}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		rerender(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('調整相談（Phase 1）')).toBeInTheDocument();
	});

	it('スタッフと期間を指定して提案を取得できる', async () => {
		const user = userEvent.setup();
		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText('欠勤スタッフ'),
			TEST_IDS.STAFF_2,
		);
		await user.type(screen.getByLabelText('メモ（任意）'), '急休');
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		await waitFor(() => {
			expect(suggestShiftAdjustmentsAction).toHaveBeenCalledWith(
				expect.objectContaining({
					staffId: TEST_IDS.STAFF_2,
					memo: '急休',
				}),
			);
		});

		await waitFor(() => {
			expect(screen.getByText('提案結果')).toBeInTheDocument();
		});
		expect(screen.getByText('田中太郎（10:00〜11:00）')).toBeInTheDocument();
		// operations[0] (1手目) は別シフトの玉突き、operations[1] (2手目) が対象シフト
		expect(screen.getByText(/案1:/)).toBeInTheDocument();
		expect(screen.getByText(/佐々木花子/)).toBeInTheDocument();
		expect(screen.getByText(/案1:.*佐藤次郎/)).toBeInTheDocument();
		expect(screen.getByText(/2手目:/)).toBeInTheDocument();
		expect(screen.getByText(/2手目: 山田太郎 に変更/)).toBeInTheDocument();
		expect(screen.getByText(/サービス種別適性あり/)).toBeInTheDocument();
		expect(screen.getByText(/時間重複なし/)).toBeInTheDocument();
	});

	it('欠勤スタッフの選択肢はhelperのみ（adminは表示しない）', () => {
		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole('option', { name: '山田太郎' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('option', { name: '鈴木花子' }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('option', { name: '管理者スタッフ' }),
		).not.toBeInTheDocument();
	});

	it('初期表示で欠勤の日付デフォルトは today / today', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-10T09:00:00+09:00'));
		try {
			render(
				<ShiftAdjustmentDialog
					isOpen={true}
					weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
					staffOptions={mockStaffOptions}
					shifts={sampleShifts}
					onClose={vi.fn()}
				/>,
			);

			expect(screen.getByLabelText('開始日')).toHaveValue('2026-03-10');
			expect(screen.getByLabelText('終了日')).toHaveValue('2026-03-10');
		} finally {
			vi.useRealTimers();
		}
	});

	it('欠勤の日付入力に14日以内の min/max が付与される', async () => {
		const user = userEvent.setup();
		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		const startInput = screen.getByLabelText('開始日');
		const endInput = screen.getByLabelText('終了日');
		const today = formatJstDateString(getJstDateOnly(new Date()));
		const todayMinus13 = formatJstDateString(
			addJstDays(parseJstDateString(today), -13),
		);
		const todayPlus13 = formatJstDateString(
			addJstDays(parseJstDateString(today), 13),
		);

		expect(startInput).toHaveAttribute('min', todayMinus13);
		expect(startInput).toHaveAttribute('max', today);
		expect(endInput).toHaveAttribute('min', today);
		expect(endInput).toHaveAttribute('max', todayPlus13);

		const startDate = formatJstDateString(
			addJstDays(parseJstDateString(today), -3),
		);
		const endDate = formatJstDateString(
			addJstDays(parseJstDateString(today), 2),
		);

		await user.clear(startInput);
		await user.type(startInput, startDate);

		expect(startInput).toHaveValue(startDate);
		expect(endInput).toHaveAttribute('min', startDate);
		expect(endInput).toHaveAttribute(
			'max',
			formatJstDateString(addJstDays(parseJstDateString(startDate), 13)),
		);

		await user.clear(endInput);
		await user.type(endInput, endDate);

		expect(endInput).toHaveValue(endDate);
		expect(startInput).toHaveAttribute(
			'min',
			formatJstDateString(addJstDays(parseJstDateString(endDate), -13)),
		);
		expect(startInput).toHaveAttribute('max', endDate);
	});

	it('action error 時は toast と console.error を出す（詳細はUIに出さない）', async () => {
		const user = userEvent.setup();
		vi.mocked(suggestShiftAdjustmentsAction).mockResolvedValueOnce({
			data: null,
			error: 'Staff not found',
			details: [{ path: ['staffId'], code: 'custom', message: 'not found' }],
			status: 404,
		});

		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText('欠勤スタッフ'),
			TEST_IDS.STAFF_2,
		);
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith('処理できませんでした。');
		});
		expect(console.error).toHaveBeenCalledWith(
			'Failed to suggest shift adjustments',
			expect.objectContaining({
				error: 'Staff not found',
				details: [{ path: ['staffId'], code: 'custom', message: 'not found' }],
			}),
		);
		expect(screen.queryByText('Staff not found')).not.toBeInTheDocument();
	});

	it('欠勤で開始日が終了日より後ならsubmitせずエラーを表示する', async () => {
		const user = userEvent.setup();
		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText('欠勤スタッフ'),
			TEST_IDS.STAFF_2,
		);
		await user.clear(screen.getByLabelText('開始日'));
		await user.type(screen.getByLabelText('開始日'), '2026-02-28');
		await user.clear(screen.getByLabelText('終了日'));
		await user.type(screen.getByLabelText('終了日'), '2026-02-22');
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		expect(suggestShiftAdjustmentsAction).not.toHaveBeenCalled();
		expect(
			screen.getByText('開始日は終了日以前を指定してください。'),
		).toBeInTheDocument();
	});

	it('action が例外を投げた場合でも画面が落ちず、エラーを表示する', async () => {
		const user = userEvent.setup();
		vi.mocked(suggestShiftAdjustmentsAction).mockRejectedValueOnce(
			new Error('Network failure'),
		);

		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText('欠勤スタッフ'),
			TEST_IDS.STAFF_2,
		);
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		await waitFor(() => {
			expect(
				screen.getByText(
					'提案の取得に失敗しました。通信状況を確認して再度お試しください。',
				),
			).toBeInTheDocument();
		});
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('日時変更フローで対象シフト選択→入力→提案取得→結果表示できる', async () => {
		const user = userEvent.setup();
		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole('radio', { name: '利用者都合の日時変更' }),
		);
		await user.selectOptions(
			screen.getByLabelText(/対象シフト/),
			TEST_IDS.SCHEDULE_1,
		);
		await user.type(
			screen.getByLabelText('メモ（任意）'),
			'訪問時間の変更依頼',
		);
		await user.clear(screen.getByLabelText('新しい開始時刻'));
		await user.type(screen.getByLabelText('新しい開始時刻'), '13:00');
		await user.clear(screen.getByLabelText('新しい終了時刻'));
		await user.type(screen.getByLabelText('新しい終了時刻'), '14:00');

		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		await waitFor(() => {
			expect(suggestClientDatetimeChangeAdjustmentsAction).toHaveBeenCalledWith(
				expect.objectContaining({
					shiftId: TEST_IDS.SCHEDULE_1,
					newStartTime: { hour: 13, minute: 0 },
					newEndTime: { hour: 14, minute: 0 },
					memo: '訪問時間の変更依頼',
				}),
			);
		});

		await waitFor(() => {
			expect(screen.getByText('提案結果')).toBeInTheDocument();
		});
		expect(screen.getByText('田中太郎（10:00〜11:00）')).toBeInTheDocument();
		expect(
			screen.getByText(/日時を 2026-02-26 13:00〜14:00 に変更/),
		).toBeInTheDocument();
		expect(screen.getByText(/2手目:/)).toBeInTheDocument();
	});

	it('日時変更で開始時刻が終了時刻以上ならsubmitせずエラーを表示する', async () => {
		const user = userEvent.setup();
		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole('radio', { name: '利用者都合の日時変更' }),
		);
		await user.selectOptions(
			screen.getByLabelText(/対象シフト/),
			TEST_IDS.SCHEDULE_1,
		);
		await user.clear(screen.getByLabelText('新しい開始時刻'));
		await user.type(screen.getByLabelText('新しい開始時刻'), '14:00');
		await user.clear(screen.getByLabelText('新しい終了時刻'));
		await user.type(screen.getByLabelText('新しい終了時刻'), '14:00');
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		expect(suggestClientDatetimeChangeAdjustmentsAction).not.toHaveBeenCalled();
		expect(
			screen.getByText('開始時刻は終了時刻より前を指定してください。'),
		).toBeInTheDocument();
	});

	it('日時変更フローで timedOut=true のとき警告を表示する', async () => {
		const user = userEvent.setup();
		vi.mocked(
			suggestClientDatetimeChangeAdjustmentsAction,
		).mockResolvedValueOnce({
			data: {
				meta: { timedOut: true },
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
					suggestions: [],
				},
			},
			error: null,
			status: 200,
		});

		render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={new Date('2026-02-22T00:00:00+09:00')}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole('radio', { name: '利用者都合の日時変更' }),
		);
		await user.selectOptions(
			screen.getByLabelText(/対象シフト/),
			TEST_IDS.SCHEDULE_1,
		);
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		await waitFor(() => {
			expect(
				screen.getByText(
					'一部の提案探索が時間上限に達したため、結果は部分的な可能性があります。',
				),
			).toBeInTheDocument();
		});
	});

	it('ダイアログを再オープンすると入力・エラー・提案結果が初期化される', async () => {
		const user = userEvent.setup();
		const todayDateStr = formatJstDateString(getJstDateOnly(new Date()));
		const weekStartDate = new Date('2026-02-22T00:00:00+09:00');
		const { rerender } = render(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={weekStartDate}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		await user.selectOptions(
			screen.getByLabelText('欠勤スタッフ'),
			TEST_IDS.STAFF_2,
		);
		await user.type(screen.getByLabelText('メモ（任意）'), '急休メモ');
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		await waitFor(() => {
			expect(screen.getByText('提案結果')).toBeInTheDocument();
		});

		await user.click(
			screen.getByRole('radio', { name: '利用者都合の日時変更' }),
		);
		await user.selectOptions(
			screen.getByLabelText(/対象シフト/),
			TEST_IDS.SCHEDULE_1,
		);
		await user.clear(screen.getByLabelText('新しい開始時刻'));
		await user.type(screen.getByLabelText('新しい開始時刻'), '14:00');
		await user.clear(screen.getByLabelText('新しい終了時刻'));
		await user.type(screen.getByLabelText('新しい終了時刻'), '14:00');
		await user.click(screen.getByRole('button', { name: '提案を取得' }));

		expect(
			screen.getByText('開始時刻は終了時刻より前を指定してください。'),
		).toBeInTheDocument();

		rerender(
			<ShiftAdjustmentDialog
				isOpen={false}
				weekStartDate={weekStartDate}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		rerender(
			<ShiftAdjustmentDialog
				isOpen={true}
				weekStartDate={weekStartDate}
				staffOptions={mockStaffOptions}
				shifts={sampleShifts}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole('radio', { name: 'スタッフ欠勤' })).toBeChecked();
		expect(screen.getByLabelText('欠勤スタッフ')).toHaveValue('');
		expect(screen.getByLabelText('開始日')).toHaveValue(todayDateStr);
		expect(screen.getByLabelText('終了日')).toHaveValue(todayDateStr);
		expect(screen.getByLabelText('メモ（任意）')).toHaveValue('');
		expect(
			screen.queryByText('開始時刻は終了時刻より前を指定してください。'),
		).not.toBeInTheDocument();
		expect(screen.queryByText('提案結果')).not.toBeInTheDocument();

		await user.click(
			screen.getByRole('radio', { name: '利用者都合の日時変更' }),
		);
		expect(screen.getByLabelText(/対象シフト/)).toHaveValue('');
		expect(screen.getByLabelText('2) 新しい日付')).toHaveValue('2026-02-22');
		expect(screen.getByLabelText('新しい開始時刻')).toHaveValue('09:00');
		expect(screen.getByLabelText('新しい終了時刻')).toHaveValue('10:00');
	});
});

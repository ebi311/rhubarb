import { suggestShiftAdjustmentsAction } from '@/app/actions/shiftAdjustments';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { ShiftAdjustmentDialog } from './ShiftAdjustmentDialog';

vi.mock('@/app/actions/shiftAdjustments');

const mockStaffOptions: StaffPickerOption[] = [
	{
		id: TEST_IDS.STAFF_1,
		name: '山田太郎',
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
];

describe('ShiftAdjustmentDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
		expect(screen.getByText(/田中太郎/)).toBeInTheDocument();
		expect(screen.getByText(/案1: 山田太郎 に変更/)).toBeInTheDocument();
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

	it('エラー時は最小のエラーメッセージを表示する', async () => {
		const user = userEvent.setup();
		vi.mocked(suggestShiftAdjustmentsAction).mockResolvedValueOnce({
			data: null,
			error: 'Staff not found',
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
			expect(screen.getByText('Staff not found')).toBeInTheDocument();
		});
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
});

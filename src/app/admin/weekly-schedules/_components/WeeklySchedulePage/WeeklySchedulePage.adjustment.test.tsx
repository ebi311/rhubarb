import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
		refresh: mockRefresh,
	}),
}));

vi.mock('@/app/actions/weeklySchedules', () => ({
	generateWeeklyShiftsAction: vi.fn().mockResolvedValue({
		data: { created: 1, skipped: 0 },
		error: null,
		status: 200,
	}),
}));

vi.mock('../ShiftTable', () => ({
	ShiftTable: ({
		shifts,
		onChangeStaff,
	}: {
		shifts: unknown[];
		onChangeStaff?: (shift: unknown) => void;
	}) => (
		<div>
			<button type="button" onClick={() => onChangeStaff?.(shifts[0])}>
				担当者を変更
			</button>
		</div>
	),
}));

vi.mock('../ChangeStaffDialog', () => ({
	ChangeStaffDialog: ({
		isOpen,
		shift,
		onClose,
		onStartAdjustment,
		initialSuggestion,
	}: {
		isOpen: boolean;
		shift: { id: string };
		onClose?: () => void;
		onStartAdjustment?: (shiftId: string) => void;
		initialSuggestion?: {
			newStaffId: string;
			newStartTime: Date;
			newEndTime: Date;
		};
	}) =>
		isOpen ? (
			<div>
				<button type="button" onClick={() => onClose?.()}>
					変更ダイアログを閉じる
				</button>
				<button type="button" onClick={() => onStartAdjustment?.(shift.id)}>
					調整相談
				</button>
				{initialSuggestion && (
					<div>
						<p>Suggested staff: {initialSuggestion.newStaffId}</p>
						<p>
							Suggested start: {initialSuggestion.newStartTime.toISOString()}
						</p>
						<p>Suggested end: {initialSuggestion.newEndTime.toISOString()}</p>
					</div>
				)}
			</div>
		) : null,
}));

vi.mock('../AdjustmentWizardDialog', () => ({
	AdjustmentWizardDialog: ({
		isOpen,
		shiftId,
		initialStartTime,
		initialEndTime,
		staffAbsenceRequest,
		onAssigned,
		onStaffAbsenceSuggestionSelected,
		onClose,
		onCascadeReopen,
	}: {
		isOpen: boolean;
		shiftId: string;
		initialStartTime: Date;
		initialEndTime: Date;
		staffAbsenceRequest?: {
			staffId: string;
			startDate: Date;
			endDate: Date;
		};
		onClose?: () => void;
		onAssigned?: (payload: {
			shiftId: string;
			newStaffId: string;
			newStartTime: Date;
			newEndTime: Date;
		}) => void;
		onStaffAbsenceSuggestionSelected?: (payload: {
			shift: {
				id: string;
				date: Date;
				start_time: { hour: number; minute: number };
				end_time: { hour: number; minute: number };
				staff_id: string | null;
			};
			suggestion: {
				operations: Array<
					| {
							type: 'change_staff';
							shift_id: string;
							from_staff_id: string;
							to_staff_id: string;
					  }
					| {
							type: 'update_shift_schedule';
							shift_id: string;
							new_date: Date;
							new_start_time: { hour: number; minute: number };
							new_end_time: { hour: number; minute: number };
					  }
				>;
			};
		}) => void;
		onCascadeReopen?: (shiftIds: string[]) => void;
	}) =>
		isOpen ? (
			<div>
				<p>Wizard Open: {shiftId}</p>
				<p>Start: {initialStartTime.toISOString()}</p>
				<p>End: {initialEndTime.toISOString()}</p>
				{staffAbsenceRequest && (
					<>
						<p>Staff absence request: {staffAbsenceRequest.staffId}</p>
						<p>Absence start: {staffAbsenceRequest.startDate.toISOString()}</p>
						<p>Absence end: {staffAbsenceRequest.endDate.toISOString()}</p>
					</>
				)}
				<button type="button" onClick={() => onClose?.()}>
					Wizardを閉じる
				</button>
				<button
					type="button"
					onClick={() => {
						onAssigned?.({
							shiftId,
							newStaffId: TEST_IDS.STAFF_2,
							newStartTime: new Date('2026-01-19T02:00:00.000Z'),
							newEndTime: new Date('2026-01-19T03:00:00.000Z'),
						});
						onClose?.();
					}}
				>
					候補確定
				</button>
				<button
					type="button"
					onClick={() => {
						onStaffAbsenceSuggestionSelected?.({
							shift: {
								id: shiftId,
								date: new Date('2026-01-19T00:00:00.000Z'),
								start_time: { hour: 9, minute: 0 },
								end_time: { hour: 10, minute: 0 },
								staff_id: TEST_IDS.STAFF_1,
							},
							suggestion: {
								operations: [
									{
										type: 'change_staff',
										shift_id: shiftId,
										from_staff_id: TEST_IDS.STAFF_1,
										to_staff_id: TEST_IDS.STAFF_3,
									},
									{
										type: 'update_shift_schedule',
										shift_id: shiftId,
										new_date: new Date('2026-01-19T00:00:00.000Z'),
										new_start_time: { hour: 11, minute: 0 },
										new_end_time: { hour: 12, minute: 0 },
									},
								],
							},
						});
						onClose?.();
					}}
				>
					急休提案を反映
				</button>
				<button
					type="button"
					onClick={() => {
						onStaffAbsenceSuggestionSelected?.({
							shift: {
								id: shiftId,
								date: new Date('2026-01-19T00:00:00.000Z'),
								start_time: { hour: 9, minute: 0 },
								end_time: { hour: 10, minute: 0 },
								staff_id: TEST_IDS.STAFF_1,
							},
							suggestion: {
								operations: [
									{
										type: 'update_shift_schedule',
										shift_id: shiftId,
										new_date: new Date('2026-01-19T00:00:00.000Z'),
										new_start_time: { hour: 11, minute: 0 },
										new_end_time: { hour: 12, minute: 0 },
									},
								],
							},
						});
						onClose?.();
					}}
				>
					急休提案を反映(updateのみ)
				</button>
				<button
					type="button"
					onClick={() => {
						onStaffAbsenceSuggestionSelected?.({
							shift: {
								id: shiftId,
								date: new Date('2026-01-19T00:00:00.000Z'),
								start_time: { hour: 9, minute: 0 },
								end_time: { hour: 10, minute: 0 },
								staff_id: TEST_IDS.STAFF_1,
							},
							suggestion: {
								operations: [
									{
										type: 'change_staff',
										shift_id: TEST_IDS.SCHEDULE_2,
										from_staff_id: TEST_IDS.STAFF_1,
										to_staff_id: TEST_IDS.STAFF_3,
									},
									{
										type: 'update_shift_schedule',
										shift_id: TEST_IDS.SCHEDULE_2,
										new_date: new Date('2026-01-19T00:00:00.000Z'),
										new_start_time: { hour: 11, minute: 0 },
										new_end_time: { hour: 12, minute: 0 },
									},
								],
							},
						});
						onClose?.();
					}}
				>
					急休提案を反映(shift_id不一致)
				</button>
				<button
					type="button"
					onClick={() => {
						onStaffAbsenceSuggestionSelected?.({
							shift: {
								id: shiftId,
								date: new Date('2026-01-19T00:00:00.000Z'),
								start_time: { hour: 9, minute: 0 },
								end_time: { hour: 10, minute: 0 },
								staff_id: null,
							},
							suggestion: {
								operations: [
									{
										type: 'update_shift_schedule',
										shift_id: shiftId,
										new_date: new Date('2026-01-19T00:00:00.000Z'),
										new_start_time: { hour: 11, minute: 0 },
										new_end_time: { hour: 12, minute: 0 },
									},
								],
							},
						});
						onClose?.();
					}}
				>
					急休提案を反映(newStaffId欠落)
				</button>
				<button
					type="button"
					onClick={() => onCascadeReopen?.([TEST_IDS.SCHEDULE_2])}
				>
					連鎖再オープン
				</button>
			</div>
		) : null,
}));

import type { ShiftDisplayRow } from '../ShiftTable';
import {
	WeeklySchedulePage,
	type WeeklySchedulePageProps,
} from './WeeklySchedulePage';

describe('WeeklySchedulePage (Adjustment entry)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	const sampleShifts: ShiftDisplayRow[] = [
		{
			id: TEST_IDS.SCHEDULE_1,
			date: new Date('2026-01-19T00:00:00Z'),
			startTime: { hour: 9, minute: 0 },
			endTime: { hour: 10, minute: 0 },
			clientId: TEST_IDS.CLIENT_1,
			clientName: '田中太郎',
			serviceTypeId: 'physical-care',
			staffId: TEST_IDS.STAFF_1,
			staffName: '山田花子',
			status: 'scheduled',
			isUnassigned: false,
		},
	];

	const defaultProps: WeeklySchedulePageProps = {
		weekStartDate: new Date('2026-01-19T00:00:00Z'),
		initialShifts: sampleShifts,
		staffOptions: [],
		clientOptions: [{ id: TEST_IDS.CLIENT_1, name: '田中太郎' }],
	};

	it('ChangeStaffDialog の調整相談ボタンクリックで AdjustmentWizardDialog が開く', async () => {
		const user = userEvent.setup();

		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));

		expect(
			screen.getByText(`Wizard Open: ${TEST_IDS.SCHEDULE_1}`),
		).toBeInTheDocument();
		expect(
			screen.getByText('Start: 2026-01-19T00:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			screen.getByText('End: 2026-01-19T01:00:00.000Z'),
		).toBeInTheDocument();
	});

	it('候補確定後はChangeStaffDialogに初期提案を注入し、自動更新しない', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(screen.getByRole('button', { name: '候補確定' }));

		expect(mockRefresh).not.toHaveBeenCalled();
		expect(
			screen.getByText(`Suggested staff: ${TEST_IDS.STAFF_2}`),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested start: 2026-01-19T02:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested end: 2026-01-19T03:00:00.000Z'),
		).toBeInTheDocument();
	});

	it('候補を確定せずにWizardを閉じた場合、再オープン時にsuggestionは注入されない', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(screen.getByRole('button', { name: 'Wizardを閉じる' }));
		await user.click(screen.getByRole('button', { name: '担当者を変更' }));

		expect(screen.queryByText(/Suggested staff:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Suggested start:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Suggested end:/)).not.toBeInTheDocument();
	});

	it('候補確定後にChangeStaffDialogを閉じて再オープンするとsuggestionは残留しない', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(screen.getByRole('button', { name: '候補確定' }));

		expect(
			screen.getByText(`Suggested staff: ${TEST_IDS.STAFF_2}`),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole('button', { name: '変更ダイアログを閉じる' }),
		);
		await user.click(screen.getByRole('button', { name: '担当者を変更' }));

		expect(screen.queryByText(/Suggested staff:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Suggested start:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Suggested end:/)).not.toBeInTheDocument();
	});

	it('staff_absence 選択結果を ChangeStaffDialog の initialSuggestion に正規化して注入する', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(screen.getByRole('button', { name: '急休提案を反映' }));

		expect(mockRefresh).not.toHaveBeenCalled();
		expect(
			screen.getByText(`Suggested staff: ${TEST_IDS.STAFF_3}`),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested start: 2026-01-19T02:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested end: 2026-01-19T03:00:00.000Z'),
		).toBeInTheDocument();
	});

	it('staff_absence の update のみ提案は shift.staff_id を使って注入する', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(
			screen.getByRole('button', { name: '急休提案を反映(updateのみ)' }),
		);

		expect(mockRefresh).not.toHaveBeenCalled();
		expect(
			screen.getByText(`Suggested staff: ${TEST_IDS.STAFF_1}`),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested start: 2026-01-19T02:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested end: 2026-01-19T03:00:00.000Z'),
		).toBeInTheDocument();
	});

	it('staff_absence の operation.shift_id が不一致なら対象shiftの値へフォールバックする', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(
			screen.getByRole('button', { name: '急休提案を反映(shift_id不一致)' }),
		);

		expect(mockRefresh).not.toHaveBeenCalled();
		expect(
			screen.getByText(`Suggested staff: ${TEST_IDS.STAFF_1}`),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested start: 2026-01-19T00:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Suggested end: 2026-01-19T01:00:00.000Z'),
		).toBeInTheDocument();
	});

	it('staff_absence 正規化後に newStaffId を解決できない場合は提案を注入しない', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(
			screen.getByRole('button', { name: '急休提案を反映(newStaffId欠落)' }),
		);

		expect(mockRefresh).not.toHaveBeenCalled();
		expect(screen.queryByText(/Suggested staff:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Suggested start:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Suggested end:/)).not.toBeInTheDocument();
	});

	it('onCascadeReopen が unknown shiftId を返したときは wizard を開かない', async () => {
		const user = userEvent.setup();

		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(screen.getByRole('button', { name: '連鎖再オープン' }));

		expect(
			screen.queryByText(`Wizard Open: ${TEST_IDS.SCHEDULE_2}`),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(`Wizard Open: ${TEST_IDS.SCHEDULE_1}`),
		).not.toBeInTheDocument();
	});

	it('ChangeStaffDialog経由で開いたWizardに staffAbsenceRequest を渡す', async () => {
		const user = userEvent.setup();

		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));

		expect(
			screen.getByText(`Staff absence request: ${TEST_IDS.STAFF_1}`),
		).toBeInTheDocument();
		expect(
			screen.getByText('Absence start: 2026-01-19T00:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Absence end: 2026-01-19T00:00:00.000Z'),
		).toBeInTheDocument();
	});

	it('staffId が null のシフトでは staffAbsenceRequest を渡さない', async () => {
		const user = userEvent.setup();
		render(
			<WeeklySchedulePage
				{...defaultProps}
				initialShifts={[
					{
						...sampleShifts[0],
						staffId: null,
						staffName: null,
						isUnassigned: true,
					},
				]}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));

		expect(
			screen.queryByText(/Staff absence request:/),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/Absence start:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Absence end:/)).not.toBeInTheDocument();
	});
});

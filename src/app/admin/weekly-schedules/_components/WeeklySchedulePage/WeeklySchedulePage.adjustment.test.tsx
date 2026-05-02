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
		onAssigned,
		onClose,
		onCascadeReopen,
	}: {
		isOpen: boolean;
		shiftId: string;
		initialStartTime: Date;
		initialEndTime: Date;
		onClose?: () => void;
		onAssigned?: (payload: {
			shiftId: string;
			newStaffId: string;
			newStartTime: Date;
			newEndTime: Date;
		}) => void;
		onCascadeReopen?: (shiftIds: string[]) => void;
	}) =>
		isOpen ? (
			<div>
				<p>Wizard Open: {shiftId}</p>
				<p>Start: {initialStartTime.toISOString()}</p>
				<p>End: {initialEndTime.toISOString()}</p>
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
					onClick={() => onCascadeReopen?.([TEST_IDS.SCHEDULE_2])}
				>
					連鎖再オープン
				</button>
			</div>
		) : null,
}));

vi.mock('../FlexibleAdjustmentChatDialog', () => ({
	FlexibleAdjustmentChatDialog: () => null,
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
});

import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
		onStartAdjustment,
	}: {
		isOpen: boolean;
		shift: { id: string };
		onStartAdjustment?: (shiftId: string) => void;
	}) =>
		isOpen ? (
			<div>
				<button type="button" onClick={() => onStartAdjustment?.(shift.id)}>
					調整相談
				</button>
			</div>
		) : null,
}));

vi.mock('../AdjustmentWizardDialog', () => ({
	AdjustmentWizardDialog: ({
		isOpen,
		shiftId,
		onAssigned,
		onCascadeReopen,
	}: {
		isOpen: boolean;
		shiftId: string;
		onAssigned?: () => void;
		onCascadeReopen?: (shiftIds: string[]) => void;
	}) =>
		isOpen ? (
			<div>
				<p>Wizard Open: {shiftId}</p>
				<button type="button" onClick={() => onAssigned?.()}>
					割当完了
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

vi.mock('../ShiftAdjustmentDialog', () => ({
	ShiftAdjustmentDialog: ({ isOpen }: { isOpen: boolean }) =>
		isOpen ? <div>Shift Adjustment Open</div> : null,
}));

import type { ShiftDisplayRow } from '../ShiftTable';
import {
	WeeklySchedulePage,
	type WeeklySchedulePageProps,
} from './WeeklySchedulePage';

describe('WeeklySchedulePage (Adjustment entry)', () => {
	const sampleShifts: ShiftDisplayRow[] = [
		{
			id: TEST_IDS.SCHEDULE_1,
			date: new Date('2026-01-19T00:00:00'),
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
		weekStartDate: new Date('2026-01-19T00:00:00'),
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
	});

	it('assign成功導線で一覧リフレッシュを呼ぶ', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(screen.getByRole('button', { name: '割当完了' }));

		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});

	it('onCascadeReopen で指定shiftが再オープンされる', async () => {
		const user = userEvent.setup();

		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '担当者を変更' }));
		await user.click(screen.getByRole('button', { name: '調整相談' }));
		await user.click(screen.getByRole('button', { name: '連鎖再オープン' }));

		expect(
			screen.getByText(`Wizard Open: ${TEST_IDS.SCHEDULE_2}`),
		).toBeInTheDocument();
	});
});

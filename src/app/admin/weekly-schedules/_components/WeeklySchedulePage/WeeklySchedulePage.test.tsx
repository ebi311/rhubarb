import { TEST_IDS } from '@/test/helpers/testIds';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import {
	WeeklySchedulePage,
	type WeeklySchedulePageProps,
} from './WeeklySchedulePage';

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
		data: { created: 5, skipped: 0 },
		error: null,
		status: 200,
	}),
}));

describe('WeeklySchedulePage', () => {
	const weekStartDate = new Date('2026-01-19T00:00:00');

	const sampleShifts: ShiftDisplayRow[] = [
		{
			id: 'shift-1',
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
		weekStartDate,
		initialShifts: [],
		staffOptions: [],
		clientOptions: [
			{ id: TEST_IDS.CLIENT_1, name: '田中太郎' },
			{ id: TEST_IDS.CLIENT_2, name: '鈴木一郎' },
		],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('WeekSelectorが表示される', () => {
		render(<WeeklySchedulePage {...defaultProps} />);

		expect(screen.getByText(/2026年01月19日/)).toBeInTheDocument();
	});

	it('GenerateButtonが表示される', () => {
		render(<WeeklySchedulePage {...defaultProps} />);

		expect(
			screen.getByRole('button', { name: /シフトを生成/ }),
		).toBeInTheDocument();
	});

	it('シフトがある場合はShiftTableが表示される', () => {
		render(
			<WeeklySchedulePage {...defaultProps} initialShifts={sampleShifts} />,
		);

		expect(screen.getByText('田中太郎')).toBeInTheDocument();
		expect(screen.getByText('山田花子')).toBeInTheDocument();
	});

	it('シフトがない場合はEmptyStateが表示される', () => {
		render(<WeeklySchedulePage {...defaultProps} />);

		expect(
			screen.getByText('この週のシフトはまだありません'),
		).toBeInTheDocument();
	});

	it('週を変更するとrouter.pushが呼ばれる', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: '前週' }));

		expect(mockPush).toHaveBeenCalledWith(
			'/admin/weekly-schedules?week=2026-01-12',
		);
	});

	it('EmptyStateから生成ボタンをクリックするとgenerateWeeklyShiftsActionが呼ばれる', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(
			screen.getByRole('button', { name: '基本スケジュールから生成' }),
		);

		const { generateWeeklyShiftsAction } =
			await import('@/app/actions/weeklySchedules');
		expect(generateWeeklyShiftsAction).toHaveBeenCalledWith('2026-01-19');
	});

	it('生成完了後にrouter.refreshが呼ばれる', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: /シフトを生成/ }));

		// Wait for async action to complete
		await vi.waitFor(() => {
			expect(mockRefresh).toHaveBeenCalled();
		});
	});
});

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
const capturedStaffIds: string[][] = [];

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

vi.mock('../AdjustmentChatDialog', () => ({
	AdjustmentChatDialog: ({
		isOpen,
		staffOptions,
	}: {
		isOpen: boolean;
		staffOptions: Array<{ id: string }>;
	}) => {
		if (!isOpen) {
			return null;
		}
		capturedStaffIds.push(staffOptions.map((staffOption) => staffOption.id));
		return <div role="dialog">シフト調整チャット</div>;
	},
}));

describe('WeeklySchedulePage staffOptions', () => {
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
		initialShifts: sampleShifts,
		staffOptions: [
			{
				id: TEST_IDS.STAFF_1,
				name: '山田花子',
				role: 'helper',
				serviceTypeIds: ['physical-care'],
			},
			{
				id: TEST_IDS.STAFF_2,
				name: '鈴木次郎',
				role: 'helper',
				serviceTypeIds: ['physical-care'],
			},
		],
		clientOptions: [{ id: TEST_IDS.CLIENT_1, name: '田中太郎' }],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		capturedStaffIds.length = 0;
	});

	it('再レンダー時もダイアログへ同じスタッフID一覧が渡る', async () => {
		const user = userEvent.setup();
		render(<WeeklySchedulePage {...defaultProps} />);

		await user.click(screen.getByRole('button', { name: 'AIに相談' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(capturedStaffIds).toHaveLength(1);
		expect(capturedStaffIds[0]).toEqual([TEST_IDS.STAFF_1, TEST_IDS.STAFF_2]);

		await user.click(
			screen.getByRole('button', { name: '利用者別グリッド表示' }),
		);

		expect(capturedStaffIds).toHaveLength(2);
		expect(capturedStaffIds[1]).toEqual([TEST_IDS.STAFF_1, TEST_IDS.STAFF_2]);
	});
});

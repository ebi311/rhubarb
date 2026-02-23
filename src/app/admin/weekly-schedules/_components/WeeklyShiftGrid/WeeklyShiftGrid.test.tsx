import { TEST_IDS } from '@/test/helpers/testIds';
import { addJstDays, formatJstDateString } from '@/utils/date';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { WeeklyShiftGrid } from './WeeklyShiftGrid';

const expectToBeAfterInDom = (a: Element, b: Element) => {
	const position = a.compareDocumentPosition(b);
	expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
};

describe('WeeklyShiftGrid', () => {
	const weekStartDate = new Date('2026-01-19T00:00:00+09:00');

	it('ヘッダー行に利用者名と日付が表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: TEST_IDS.STAFF_1,
				staffName: 'スタッフA',
				status: 'scheduled',
				isUnassigned: false,
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		expect(screen.getByText('利用者名')).toBeInTheDocument();
		// 週の日付ヘッダーが7つ存在することを確認
		const headers = screen
			.getAllByText(/\d+\/\d+\([月火水木金土日]\)/)
			.filter((el) => el.classList.contains('font-semibold'));
		expect(headers.length).toBe(7);
	});

	it('非空セルではシフト一覧の後ろ（下寄せ）に「＋」が表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: TEST_IDS.STAFF_1,
				staffName: 'スタッフA',
				status: 'scheduled',
				isUnassigned: false,
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		const dateKey = formatJstDateString(weekStartDate);
		const cell = screen.getByTestId(
			`weekly-shift-grid-cell-${TEST_IDS.CLIENT_1}-${dateKey}`,
		);
		const shiftEl = within(cell).getByTestId(
			`weekly-shift-cell-${TEST_IDS.SCHEDULE_1}`,
		);
		const shiftsContainer = within(cell).getByTestId(
			'weekly-shift-grid-cell-shifts',
		);
		const addButtonContainer = within(cell).getByTestId(
			'weekly-shift-grid-cell-add-button-container',
		);
		const addButton = within(addButtonContainer).getByRole('button', {
			name: '単発シフト追加',
		});

		expect(shiftsContainer).toContainElement(shiftEl);
		expectToBeAfterInDom(shiftsContainer, addButtonContainer);
		expect(addButtonContainer).toContainElement(addButton);
		// 下寄せは実レイアウトを直接検証できないため、最小限のプロキシとして mt-auto の有無のみ確認
		expect(addButtonContainer).toHaveClass('mt-auto');
	});

	it('空セルでは「＋」がセルの一番上側に表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: TEST_IDS.STAFF_1,
				staffName: 'スタッフA',
				status: 'scheduled',
				isUnassigned: false,
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		const emptyDate = addJstDays(weekStartDate, 1);
		const dateKey = formatJstDateString(emptyDate);
		const cell = screen.getByTestId(
			`weekly-shift-grid-cell-${TEST_IDS.CLIENT_1}-${dateKey}`,
		);
		const addButtonContainer = within(cell).getByTestId(
			'weekly-shift-grid-cell-add-button-container',
		);
		const placeholder = within(cell).getByTestId(
			'weekly-shift-grid-cell-placeholder',
		);
		const addButton = within(addButtonContainer).getByRole('button', {
			name: '単発シフト追加',
		});

		expectToBeAfterInDom(addButtonContainer, placeholder);
		expect(addButtonContainer).toContainElement(addButton);
		expect(addButtonContainer).not.toHaveClass('mt-auto');
	});

	it('利用者名が表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: TEST_IDS.STAFF_1,
				staffName: 'スタッフA',
				status: 'scheduled',
				isUnassigned: false,
			},
			{
				id: TEST_IDS.SCHEDULE_2,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientId: TEST_IDS.CLIENT_2,
				clientName: '佐藤花子',
				serviceTypeId: 'life-support',
				staffId: TEST_IDS.STAFF_2,
				staffName: 'スタッフB',
				status: 'scheduled',
				isUnassigned: false,
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
	});

	it('シフトセルに時間帯とスタッフ名が表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: TEST_IDS.STAFF_1,
				staffName: 'スタッフA',
				status: 'scheduled',
				isUnassigned: false,
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
		expect(screen.getByText('スタッフA')).toBeInTheDocument();
	});

	it('未割当のシフトには未割当バッジが表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: null,
				staffName: null,
				status: 'scheduled',
				isUnassigned: true,
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		expect(screen.getByText('未割当')).toBeInTheDocument();
	});

	it('シフトがない場合は空のメッセージが表示される', () => {
		render(<WeeklyShiftGrid shifts={[]} weekStartDate={weekStartDate} />);

		expect(screen.getByText('シフトがありません')).toBeInTheDocument();
	});

	it('キャンセルされたシフトにはキャンセル表示が出る', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: TEST_IDS.STAFF_1,
				staffName: 'スタッフA',
				status: 'canceled',
				isUnassigned: false,
				cancelReason: '利用者都合',
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		expect(screen.getByText('キャンセル')).toBeInTheDocument();
	});

	it('任意のセルの「＋」をクリックすると onAddOneOffShift が日付(YYYY-MM-DD)で呼ばれる', async () => {
		const user = userEvent.setup();
		const onAddOneOffShift = vi.fn();
		const shifts: ShiftDisplayRow[] = [
			{
				id: TEST_IDS.SCHEDULE_1,
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientId: TEST_IDS.CLIENT_1,
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: TEST_IDS.STAFF_1,
				staffName: 'スタッフA',
				status: 'scheduled',
				isUnassigned: false,
			},
		];

		render(
			<WeeklyShiftGrid
				shifts={shifts}
				weekStartDate={weekStartDate}
				onAddOneOffShift={onAddOneOffShift}
			/>,
		);

		const addButtons = screen.getAllByRole('button', {
			name: '単発シフト追加',
		});
		await user.click(addButtons[0]!);

		expect(onAddOneOffShift).toHaveBeenCalledTimes(1);
		expect(onAddOneOffShift).toHaveBeenCalledWith(
			formatJstDateString(weekStartDate),
			TEST_IDS.CLIENT_1,
		);
	});
});

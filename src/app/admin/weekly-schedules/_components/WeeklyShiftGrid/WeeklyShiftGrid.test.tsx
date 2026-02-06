import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { WeeklyShiftGrid } from './WeeklyShiftGrid';

describe('WeeklyShiftGrid', () => {
	const weekStartDate = new Date('2026-01-19T00:00:00+09:00');

	it('ヘッダー行に利用者名と日付が表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: '1',
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: 'staff-1',
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

	it('利用者名が表示される', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: '1',
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: 'staff-1',
				staffName: 'スタッフA',
				status: 'scheduled',
				isUnassigned: false,
			},
			{
				id: '2',
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 10, minute: 0 },
				endTime: { hour: 11, minute: 0 },
				clientName: '佐藤花子',
				serviceTypeId: 'life-support',
				staffId: 'staff-2',
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
				id: '1',
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: 'staff-1',
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
				id: '1',
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
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
				id: '1',
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				staffId: 'staff-1',
				staffName: 'スタッフA',
				status: 'canceled',
				isUnassigned: false,
				cancelReason: '利用者都合',
			},
		];

		render(<WeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />);

		expect(screen.getByText('キャンセル')).toBeInTheDocument();
	});
});

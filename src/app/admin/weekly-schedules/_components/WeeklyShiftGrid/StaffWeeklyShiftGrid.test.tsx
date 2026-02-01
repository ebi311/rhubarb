import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { StaffWeeklyShiftGrid } from './StaffWeeklyShiftGrid';

describe('StaffWeeklyShiftGrid', () => {
	const weekStartDate = new Date('2025-01-20');

	const createShift = (
		id: string,
		staffId: string | null,
		staffName: string | null,
		clientName: string,
		date: Date,
		startHour: number,
		endHour: number,
		serviceTypeId: 'physical-care' | 'life-support' | 'commute-support',
		status: 'scheduled' | 'canceled' = 'scheduled',
	): ShiftDisplayRow => ({
		id,
		staffId,
		staffName,
		clientName,
		date,
		startTime: { hour: startHour, minute: 0 },
		endTime: { hour: endHour, minute: 0 },
		serviceTypeId,
		status,
		isUnassigned: staffId === null,
		cancelReason: null,
		cancelCategory: null,
	});

	it('シフトがない場合、空状態を表示する', () => {
		render(<StaffWeeklyShiftGrid shifts={[]} weekStartDate={weekStartDate} />);

		expect(screen.getByText('シフトがありません')).toBeInTheDocument();
	});

	it('スタッフ名カラムを表示する', () => {
		const shifts: ShiftDisplayRow[] = [
			createShift(
				'1',
				'staff-1',
				'田中太郎',
				'山田花子',
				new Date('2025-01-20'),
				9,
				11,
				'physical-care',
			),
		];

		render(
			<StaffWeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />,
		);

		expect(screen.getByText('スタッフ名')).toBeInTheDocument();
		expect(screen.getByText('田中太郎')).toBeInTheDocument();
	});

	it('週の日付ヘッダーを表示する', () => {
		const shifts: ShiftDisplayRow[] = [
			createShift(
				'1',
				'staff-1',
				'田中太郎',
				'山田花子',
				new Date('2025-01-20'),
				9,
				11,
				'physical-care',
			),
		];

		render(
			<StaffWeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />,
		);

		// 各日付のヘッダーをパターンマッチで確認（タイムゾーンの影響を軽減）
		expect(screen.getByText(/1\/20\(月\)/)).toBeInTheDocument();
		expect(screen.getByText(/1\/21\(火\)/)).toBeInTheDocument();
		expect(screen.getByText(/1\/22\(水\)/)).toBeInTheDocument();
	});

	it('シフトの利用者名を表示する', () => {
		const shifts: ShiftDisplayRow[] = [
			createShift(
				'1',
				'staff-1',
				'田中太郎',
				'山田花子',
				new Date('2025-01-20'),
				9,
				11,
				'physical-care',
			),
		];

		render(
			<StaffWeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />,
		);

		expect(screen.getByText('山田花子')).toBeInTheDocument();
	});

	it('未割当のスタッフ行を正しく表示する', () => {
		const shifts: ShiftDisplayRow[] = [
			createShift(
				'1',
				null,
				null,
				'山田花子',
				new Date('2025-01-20'),
				9,
				11,
				'physical-care',
			),
		];

		render(
			<StaffWeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />,
		);

		expect(screen.getByText('未割当')).toBeInTheDocument();
	});

	it('キャンセル済みシフトにステータスを表示する', () => {
		const shifts: ShiftDisplayRow[] = [
			createShift(
				'1',
				'staff-1',
				'田中太郎',
				'山田花子',
				new Date('2025-01-20'),
				9,
				11,
				'physical-care',
				'canceled',
			),
		];

		render(
			<StaffWeeklyShiftGrid shifts={shifts} weekStartDate={weekStartDate} />,
		);

		expect(screen.getByText('キャンセル')).toBeInTheDocument();
	});
});

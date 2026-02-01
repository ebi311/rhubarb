import { describe, expect, it } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { transformToStaffGridViewModel } from './transformToStaffGridViewModel';

describe('transformToStaffGridViewModel', () => {
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
		cancelReason: null,
		cancelCategory: null,
	});

	it('空の配列の場合、空の結果を返す', () => {
		const result = transformToStaffGridViewModel([]);
		expect(result).toEqual([]);
	});

	it('シフトをスタッフ別にグループ化する', () => {
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
			createShift(
				'2',
				'staff-1',
				'田中太郎',
				'鈴木一郎',
				new Date('2025-01-21'),
				14,
				16,
				'life-support',
			),
			createShift(
				'3',
				'staff-2',
				'佐藤次郎',
				'山田花子',
				new Date('2025-01-20'),
				10,
				12,
				'commute-support',
			),
		];

		const result = transformToStaffGridViewModel(shifts);

		expect(result).toHaveLength(2);
		expect(result[0].staffName).toBe('佐藤次郎');
		expect(result[1].staffName).toBe('田中太郎');
	});

	it('未割当のシフトは最後にグループ化される', () => {
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
			createShift(
				'2',
				'staff-1',
				'田中太郎',
				'鈴木一郎',
				new Date('2025-01-21'),
				14,
				16,
				'life-support',
			),
		];

		const result = transformToStaffGridViewModel(shifts);

		expect(result).toHaveLength(2);
		expect(result[0].staffName).toBe('田中太郎');
		expect(result[1].staffName).toBe('未割当');
		expect(result[1].staffId).toBeNull();
	});

	it('同じスタッフの同日シフトは配列としてまとめられる', () => {
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
			createShift(
				'2',
				'staff-1',
				'田中太郎',
				'鈴木一郎',
				new Date('2025-01-20'),
				14,
				16,
				'life-support',
			),
		];

		const result = transformToStaffGridViewModel(shifts);

		expect(result).toHaveLength(1);
		expect(result[0].staffName).toBe('田中太郎');
		expect(result[0].shiftsByDate['2025-01-20']).toHaveLength(2);
	});

	it('シフトセルには正しい情報が含まれる', () => {
		const shifts: ShiftDisplayRow[] = [
			createShift(
				'1',
				'staff-1',
				'田中太郎',
				'山田花子',
				new Date('2025-01-20'),
				9,
				30,
				'physical-care',
				'canceled',
			),
		];

		const result = transformToStaffGridViewModel(shifts);

		const cell = result[0].shiftsByDate['2025-01-20'][0];
		expect(cell.id).toBe('1');
		expect(cell.clientName).toBe('山田花子');
		expect(cell.timeRange).toBe('09:00 - 30:00');
		expect(cell.serviceTypeId).toBe('physical-care');
		expect(cell.status).toBe('canceled');
	});

	it('スタッフ名で五十音順にソートされる', () => {
		const shifts: ShiftDisplayRow[] = [
			createShift(
				'1',
				'staff-1',
				'渡辺三郎',
				'山田花子',
				new Date('2025-01-20'),
				9,
				11,
				'physical-care',
			),
			createShift(
				'2',
				'staff-2',
				'阿部四郎',
				'鈴木一郎',
				new Date('2025-01-20'),
				14,
				16,
				'life-support',
			),
			createShift(
				'3',
				'staff-3',
				'中村五郎',
				'高橋二郎',
				new Date('2025-01-20'),
				10,
				12,
				'commute-support',
			),
		];

		const result = transformToStaffGridViewModel(shifts);

		expect(result[0].staffName).toBe('阿部四郎');
		expect(result[1].staffName).toBe('中村五郎');
		expect(result[2].staffName).toBe('渡辺三郎');
	});
});

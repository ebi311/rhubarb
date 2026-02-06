import { describe, expect, it } from 'vitest';
import type { ShiftDisplayRow } from '../ShiftTable';
import { transformToGridViewModel } from './transformToGridViewModel';

describe('transformToGridViewModel', () => {
	it('シフトデータを利用者ごとにグルーピングする', () => {
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

		const result = transformToGridViewModel(shifts);

		expect(result).toHaveLength(2);
		expect(result[0].clientName).toBe('佐藤花子'); // 日本語ソート
		expect(result[1].clientName).toBe('山田太郎');
	});

	it('同じ利用者の同じ日のシフトは同じ配列に入る', () => {
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
				startTime: { hour: 14, minute: 0 },
				endTime: { hour: 15, minute: 0 },
				clientName: '山田太郎',
				serviceTypeId: 'life-support',
				staffId: 'staff-2',
				staffName: 'スタッフB',
				status: 'scheduled',
				isUnassigned: false,
			},
		];

		const result = transformToGridViewModel(shifts);

		expect(result).toHaveLength(1);
		expect(result[0].shiftsByDate['2026-01-19']).toHaveLength(2);
	});

	it('各日付のセルは開始時刻でソートされる', () => {
		const shifts: ShiftDisplayRow[] = [
			{
				id: '2',
				date: new Date('2026-01-19T00:00:00+09:00'),
				startTime: { hour: 14, minute: 0 },
				endTime: { hour: 15, minute: 0 },
				clientName: '山田太郎',
				serviceTypeId: 'life-support',
				staffId: 'staff-2',
				staffName: 'スタッフB',
				status: 'scheduled',
				isUnassigned: false,
			},
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

		const result = transformToGridViewModel(shifts);

		expect(result[0].shiftsByDate['2026-01-19'][0].timeRange).toBe(
			'09:00 - 10:00',
		);
		expect(result[0].shiftsByDate['2026-01-19'][1].timeRange).toBe(
			'14:00 - 15:00',
		);
	});

	it('空のシフトリストは空の結果を返す', () => {
		const result = transformToGridViewModel([]);
		expect(result).toHaveLength(0);
	});
});

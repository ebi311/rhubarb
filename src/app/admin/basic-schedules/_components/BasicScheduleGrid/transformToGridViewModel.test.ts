import { describe, expect, it } from 'vitest';
import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import { transformToGridViewModel } from './transformToGridViewModel';

describe('transformToGridViewModel', () => {
	it('リスト形式をグリッド形式に変換する', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: 'schedule-1',
				clientId: 'client-yamada',
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '09:00 - 10:00',
				staffNames: ['田中一郎'],
				note: '朝のケア',
			},
			{
				id: 'schedule-2',
				clientId: 'client-yamada',
				clientName: '山田太郎',
				serviceTypeId: 'life-support',
				weekday: 'Wed',
				timeRange: '14:00 - 15:30',
				staffNames: ['佐藤花子'],
				note: null,
			},
			{
				id: 'schedule-3',
				clientId: 'client-suzuki',
				clientName: '鈴木花子',
				serviceTypeId: 'commute-support',
				weekday: 'Mon',
				timeRange: '10:00 - 12:00',
				staffNames: [],
				note: '病院まで送迎',
			},
		];

		const result = transformToGridViewModel(schedules);

		expect(result).toHaveLength(2);

		// 山田太郎（名前順で先）
		expect(result[0].clientId).toBe('client-yamada');
		expect(result[0].clientName).toBe('山田太郎');
		expect(result[0].schedulesByWeekday.Mon).toHaveLength(1);
		expect(result[0].schedulesByWeekday.Mon![0].id).toBe('schedule-1');
		expect(result[0].schedulesByWeekday.Wed).toHaveLength(1);
		expect(result[0].schedulesByWeekday.Wed![0].id).toBe('schedule-2');

		// 鈴木花子
		expect(result[1].clientId).toBe('client-suzuki');
		expect(result[1].clientName).toBe('鈴木花子');
		expect(result[1].schedulesByWeekday.Mon).toHaveLength(1);
		expect(result[1].schedulesByWeekday.Mon![0].id).toBe('schedule-3');
		expect(result[1].schedulesByWeekday.Wed).toBeUndefined();
	});

	it('同一利用者・曜日に複数スケジュールがある場合、時刻順にソートする', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: 'schedule-1',
				clientId: 'client-yamada',
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '14:00 - 15:00',
				staffNames: ['田中一郎'],
				note: null,
			},
			{
				id: 'schedule-2',
				clientId: 'client-yamada',
				clientName: '山田太郎',
				serviceTypeId: 'life-support',
				weekday: 'Mon',
				timeRange: '09:00 - 10:00',
				staffNames: ['佐藤花子'],
				note: null,
			},
			{
				id: 'schedule-3',
				clientId: 'client-yamada',
				clientName: '山田太郎',
				serviceTypeId: 'commute-support',
				weekday: 'Mon',
				timeRange: '11:00 - 12:00',
				staffNames: [],
				note: null,
			},
		];

		const result = transformToGridViewModel(schedules);

		expect(result).toHaveLength(1);
		expect(result[0].schedulesByWeekday.Mon).toHaveLength(3);

		// 時刻順にソートされている
		expect(result[0].schedulesByWeekday.Mon![0].id).toBe('schedule-2'); // 09:00
		expect(result[0].schedulesByWeekday.Mon![1].id).toBe('schedule-3'); // 11:00
		expect(result[0].schedulesByWeekday.Mon![2].id).toBe('schedule-1'); // 14:00
	});

	it('空の配列を渡すと空の配列を返す', () => {
		const result = transformToGridViewModel([]);
		expect(result).toHaveLength(0);
	});

	it('セル情報が正しく変換される', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: 'schedule-1',
				clientId: 'client-yamada',
				clientName: '山田太郎',
				serviceTypeId: 'physical-care',
				weekday: 'Tue',
				timeRange: '09:00 - 10:00',
				staffNames: ['田中一郎', '佐藤花子'],
				note: 'テスト備考',
			},
		];

		const result = transformToGridViewModel(schedules);

		const cell = result[0].schedulesByWeekday.Tue![0];
		expect(cell.id).toBe('schedule-1');
		expect(cell.timeRange).toBe('09:00 - 10:00');
		expect(cell.serviceTypeId).toBe('physical-care');
		expect(cell.staffNames).toEqual(['田中一郎', '佐藤花子']);
		expect(cell.note).toBe('テスト備考');
	});

	it('複数の利用者を名前順にソートする', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: 'schedule-1',
				clientId: 'client-tanaka',
				clientName: '田中次郎',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '09:00 - 10:00',
				staffNames: [],
				note: null,
			},
			{
				id: 'schedule-2',
				clientId: 'client-sato',
				clientName: '佐藤一郎',
				serviceTypeId: 'life-support',
				weekday: 'Mon',
				timeRange: '09:00 - 10:00',
				staffNames: [],
				note: null,
			},
			{
				id: 'schedule-3',
				clientId: 'client-yamada',
				clientName: '山田太郎',
				serviceTypeId: 'commute-support',
				weekday: 'Mon',
				timeRange: '09:00 - 10:00',
				staffNames: [],
				note: null,
			},
		];

		const result = transformToGridViewModel(schedules);

		expect(result).toHaveLength(3);
		// 日本語のあいうえお順: さ→や→た
		expect(result[0].clientName).toBe('佐藤一郎');
		expect(result[1].clientName).toBe('山田太郎');
		expect(result[2].clientName).toBe('田中次郎');
	});
});

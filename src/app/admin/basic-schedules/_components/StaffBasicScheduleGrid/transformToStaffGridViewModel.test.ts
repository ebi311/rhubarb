import { describe, expect, it } from 'vitest';
import type { BasicScheduleViewModel } from '../BasicScheduleTable/types';
import { transformToStaffGridViewModel } from './transformToStaffGridViewModel';

describe('transformToStaffGridViewModel', () => {
	it('should transform schedules to staff-based grid view', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: '1',
				clientId: 'client-a',
				clientName: '利用者A',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '09:00 - 12:00',
				staffNames: ['スタッフ太郎'],
				note: null,
			},
			{
				id: '2',
				clientId: 'client-b',
				clientName: '利用者B',
				serviceTypeId: 'life-support',
				weekday: 'Mon',
				timeRange: '13:00 - 15:00',
				staffNames: ['スタッフ太郎'],
				note: null,
			},
		];

		const result = transformToStaffGridViewModel(schedules);

		expect(result).toHaveLength(1);
		expect(result[0].staffName).toBe('スタッフ太郎');
		expect(result[0].schedulesByWeekday.Mon).toHaveLength(2);
		expect(result[0].schedulesByWeekday.Mon![0].clientName).toBe('利用者A');
		expect(result[0].schedulesByWeekday.Mon![1].clientName).toBe('利用者B');
	});

	it('should handle schedules with multiple staff members', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: '1',
				clientId: 'client-a',
				clientName: '利用者A',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '09:00 - 12:00',
				staffNames: ['スタッフ太郎', 'スタッフ花子'],
				note: null,
			},
		];

		const result = transformToStaffGridViewModel(schedules);

		expect(result).toHaveLength(2);
		// 五十音順でソートされる
		expect(result[0].staffName).toBe('スタッフ花子');
		expect(result[0].schedulesByWeekday.Mon).toHaveLength(1);
		expect(result[1].staffName).toBe('スタッフ太郎');
		expect(result[1].schedulesByWeekday.Mon).toHaveLength(1);
	});

	it('should handle unassigned schedules', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: '1',
				clientId: 'client-a',
				clientName: '利用者A',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '09:00 - 12:00',
				staffNames: [],
				note: null,
			},
		];

		const result = transformToStaffGridViewModel(schedules);

		expect(result).toHaveLength(1);
		expect(result[0].staffName).toBe('未割り当て');
		expect(result[0].staffId).toBeNull();
		expect(result[0].schedulesByWeekday.Mon).toHaveLength(1);
	});

	it('should sort schedules by time within each weekday', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: '1',
				clientId: 'client-a',
				clientName: '利用者A',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '13:00 - 15:00',
				staffNames: ['スタッフ太郎'],
				note: null,
			},
			{
				id: '2',
				clientId: 'client-b',
				clientName: '利用者B',
				serviceTypeId: 'life-support',
				weekday: 'Mon',
				timeRange: '09:00 - 12:00',
				staffNames: ['スタッフ太郎'],
				note: null,
			},
		];

		const result = transformToStaffGridViewModel(schedules);

		expect(result[0].schedulesByWeekday.Mon![0].timeRange).toBe(
			'09:00 - 12:00',
		);
		expect(result[0].schedulesByWeekday.Mon![1].timeRange).toBe(
			'13:00 - 15:00',
		);
	});

	it('should sort staff members by name with unassigned last', () => {
		const schedules: BasicScheduleViewModel[] = [
			{
				id: '1',
				clientId: 'client-a',
				clientName: '利用者A',
				serviceTypeId: 'physical-care',
				weekday: 'Mon',
				timeRange: '09:00 - 12:00',
				staffNames: [],
				note: null,
			},
			{
				id: '2',
				clientId: 'client-b',
				clientName: '利用者B',
				serviceTypeId: 'life-support',
				weekday: 'Tue',
				timeRange: '13:00 - 15:00',
				staffNames: ['山田太郎'],
				note: null,
			},
			{
				id: '3',
				clientId: 'client-c',
				clientName: '利用者C',
				serviceTypeId: 'commute-support',
				weekday: 'Wed',
				timeRange: '10:00 - 11:00',
				staffNames: ['佐藤花子'],
				note: null,
			},
		];

		const result = transformToStaffGridViewModel(schedules);

		expect(result).toHaveLength(3);
		expect(result[0].staffName).toBe('佐藤花子');
		expect(result[1].staffName).toBe('山田太郎');
		expect(result[2].staffName).toBe('未割り当て');
	});
});

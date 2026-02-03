import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { DashboardService } from '@/backend/services/dashboardService';
import { Shift } from '@/models/shift';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';

// テスト用のサービスタイプマップ
const mockServiceTypes = new Map([
	['life-support', '生活支援'],
	['physical-care', '身体介護'],
]);

// テスト用のクライアントマップ
const mockClients = new Map([
	['client-1', '山田太郎'],
	['client-2', '佐藤花子'],
]);

// テスト用のスタッフマップ
const mockStaffs = new Map([
	['staff-1', '田中一郎'],
	['staff-2', '鈴木次郎'],
]);

const createShift = (overrides: Partial<Shift> = {}): Shift => ({
	id: '00000000-0000-4000-8000-000000000001',
	client_id: 'client-1',
	service_type_id: 'life-support',
	staff_id: 'staff-1',
	date: new Date('2026-02-03'),
	time: {
		start: { hour: 9, minute: 0 },
		end: { hour: 10, minute: 0 },
	},
	status: 'scheduled',
	is_unassigned: false,
	canceled_reason: null,
	canceled_category: null,
	canceled_at: null,
	created_at: new Date(),
	updated_at: new Date(),
	...overrides,
});

describe('DashboardService', () => {
	let shiftRepo: Mocked<ShiftRepository>;
	let service: DashboardService;

	const today = new Date('2026-02-03');

	beforeEach(() => {
		shiftRepo = {
			list: vi.fn(),
		} as unknown as Mocked<ShiftRepository>;

		service = new DashboardService({
			shiftRepository: shiftRepo,
			serviceTypeMap: mockServiceTypes,
			clientMap: mockClients,
			staffMap: mockStaffs,
		});
	});

	describe('getDashboardStats', () => {
		it('今日と今週のシフト件数、未割当件数を返す', async () => {
			const todayShifts: Shift[] = [
				createShift({ id: '1', date: today }),
				createShift({
					id: '2',
					date: today,
					is_unassigned: true,
					staff_id: null,
				}),
			];
			const weekShifts: Shift[] = [
				...todayShifts,
				createShift({ id: '3', date: new Date('2026-02-04') }),
				createShift({
					id: '4',
					date: new Date('2026-02-05'),
					is_unassigned: true,
					staff_id: null,
				}),
			];

			// 今日のシフト取得
			shiftRepo.list.mockResolvedValueOnce(todayShifts);
			// 今週のシフト取得
			shiftRepo.list.mockResolvedValueOnce(weekShifts);
			// 未割当シフト取得
			shiftRepo.list.mockResolvedValueOnce([
				createShift({ id: '2', is_unassigned: true, staff_id: null }),
				createShift({ id: '4', is_unassigned: true, staff_id: null }),
			]);

			const result = await service.getDashboardStats('office-1', today);

			expect(result).toEqual({
				todayShiftCount: 2,
				weekShiftCount: 4,
				unassignedCount: 2,
			});
		});

		it('シフトがない場合はすべて0を返す', async () => {
			shiftRepo.list.mockResolvedValue([]);

			const result = await service.getDashboardStats('office-1', today);

			expect(result).toEqual({
				todayShiftCount: 0,
				weekShiftCount: 0,
				unassignedCount: 0,
			});
		});
	});

	describe('getTodayTimeline', () => {
		it('今日のシフトをタイムラインアイテムに変換して返す', async () => {
			const shifts: Shift[] = [
				createShift({
					id: 'shift-1',
					client_id: 'client-1',
					staff_id: 'staff-1',
					time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
					is_unassigned: false,
				}),
				createShift({
					id: 'shift-2',
					client_id: 'client-2',
					staff_id: null,
					service_type_id: 'physical-care',
					time: {
						start: { hour: 14, minute: 30 },
						end: { hour: 16, minute: 0 },
					},
					is_unassigned: true,
				}),
			];

			shiftRepo.list.mockResolvedValueOnce(shifts);

			const result = await service.getTodayTimeline('office-1', today);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				id: 'shift-1',
				startTime: { hour: 9, minute: 0 },
				endTime: { hour: 10, minute: 0 },
				clientName: '山田太郎',
				staffName: '田中一郎',
				isUnassigned: false,
				serviceTypeName: '生活支援',
			});
			expect(result[1]).toEqual({
				id: 'shift-2',
				startTime: { hour: 14, minute: 30 },
				endTime: { hour: 16, minute: 0 },
				clientName: '佐藤花子',
				staffName: null,
				isUnassigned: true,
				serviceTypeName: '身体介護',
			});
		});

		it('シフトがない場合は空配列を返す', async () => {
			shiftRepo.list.mockResolvedValueOnce([]);

			const result = await service.getTodayTimeline('office-1', today);

			expect(result).toEqual([]);
		});

		it('シフトを開始時間順にソートして返す', async () => {
			const shifts: Shift[] = [
				createShift({
					id: 'shift-2',
					time: {
						start: { hour: 14, minute: 0 },
						end: { hour: 15, minute: 0 },
					},
				}),
				createShift({
					id: 'shift-1',
					time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
				}),
			];

			shiftRepo.list.mockResolvedValueOnce(shifts);

			const result = await service.getTodayTimeline('office-1', today);

			expect(result[0].id).toBe('shift-1');
			expect(result[1].id).toBe('shift-2');
		});
	});

	describe('getAlerts', () => {
		it('未割当シフトをアラートとして返す', async () => {
			const unassignedShifts: Shift[] = [
				createShift({
					id: 'shift-1',
					client_id: 'client-1',
					date: new Date('2026-02-03'),
					time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
					is_unassigned: true,
					staff_id: null,
				}),
			];

			shiftRepo.list.mockResolvedValueOnce(unassignedShifts);

			const result = await service.getAlerts('office-1', today);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'shift-1',
				type: 'unassigned',
				date: new Date('2026-02-03'),
				startTime: { hour: 9, minute: 0 },
				clientName: '山田太郎',
				message:
					'山田太郎様の09:00からの予定にスタッフが割り当てられていません',
			});
		});

		it('未割当シフトがない場合は空配列を返す', async () => {
			shiftRepo.list.mockResolvedValueOnce([]);

			const result = await service.getAlerts('office-1', today);

			expect(result).toEqual([]);
		});

		it('アラートを日時順にソートして返す', async () => {
			const unassignedShifts: Shift[] = [
				createShift({
					id: 'shift-2',
					client_id: 'client-2',
					date: new Date('2026-02-04'),
					time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
					is_unassigned: true,
					staff_id: null,
				}),
				createShift({
					id: 'shift-1',
					client_id: 'client-1',
					date: new Date('2026-02-03'),
					time: {
						start: { hour: 14, minute: 0 },
						end: { hour: 15, minute: 0 },
					},
					is_unassigned: true,
					staff_id: null,
				}),
			];

			shiftRepo.list.mockResolvedValueOnce(unassignedShifts);

			const result = await service.getAlerts('office-1', today);

			expect(result[0].id).toBe('shift-1');
			expect(result[1].id).toBe('shift-2');
		});
	});
});

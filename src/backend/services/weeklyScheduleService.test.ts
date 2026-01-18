import { BasicScheduleRepository } from '@/backend/repositories/basicScheduleRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { BasicScheduleWithStaff } from '@/models/basicSchedule';
import { Shift } from '@/models/shift';
import { setJstTime } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { ServiceError, WeeklyScheduleService } from './weeklyScheduleService';

const adminStaff = {
	id: '11111111-1111-4111-8111-111111111111',
	office_id: 'aaaa1111-2222-4333-8444-555555555555',
	auth_user_id: 'user-admin',
	name: 'Admin',
	role: 'admin' as const,
	email: null,
	created_at: new Date(),
	updated_at: new Date(),
};

const helperStaff = {
	id: '22222222-2222-4222-8222-222222222222',
	office_id: 'aaaa1111-2222-4333-8444-555555555555',
	auth_user_id: 'user-helper',
	name: 'Helper',
	role: 'helper' as const,
	email: null,
	created_at: new Date(),
	updated_at: new Date(),
};

const basicSchedules: BasicScheduleWithStaff[] = [
	{
		id: 'bs-1',
		client_id: 'client-1',
		service_type_id: 'life-support',
		day_of_week: 'Mon',
		time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
		note: null,
		deleted_at: null,
		created_at: new Date(),
		updated_at: new Date(),
		staff_ids: ['staff-1'],
	},
	{
		id: 'bs-2',
		client_id: 'client-2',
		service_type_id: 'physical-care',
		day_of_week: 'Wed',
		time: { start: { hour: 14, minute: 0 }, end: { hour: 15, minute: 30 } },
		note: 'メモ',
		deleted_at: null,
		created_at: new Date(),
		updated_at: new Date(),
		staff_ids: [], // 未割当
	},
	{
		id: 'bs-3',
		client_id: 'client-1',
		service_type_id: 'life-support',
		day_of_week: 'Fri',
		time: { start: { hour: 10, minute: 0 }, end: { hour: 11, minute: 0 } },
		note: null,
		deleted_at: null,
		created_at: new Date(),
		updated_at: new Date(),
		staff_ids: ['staff-2', 'staff-3'],
	},
];

// 月曜日の週開始日（2026年1月19日）
const mondayDate = new Date('2026-01-19');

describe('WeeklyScheduleService', () => {
	let basicScheduleRepo: Mocked<BasicScheduleRepository>;
	let shiftRepo: Mocked<ShiftRepository>;
	let staffRepo: Mocked<StaffRepository>;
	let supabase: SupabaseClient<Database>;

	beforeEach(() => {
		basicScheduleRepo = {
			list: vi.fn().mockResolvedValue(basicSchedules),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			softDelete: vi.fn(),
			findOverlaps: vi.fn(),
		} as unknown as Mocked<BasicScheduleRepository>;

		shiftRepo = {
			list: vi.fn().mockResolvedValue([]),
			findById: vi.fn(),
			create: vi.fn(),
			createMany: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			exists: vi.fn(),
			findExistingInRange: vi.fn().mockResolvedValue(new Map()),
		} as unknown as Mocked<ShiftRepository>;

		staffRepo = {
			findByAuthUserId: vi.fn(),
		} as unknown as Mocked<StaffRepository>;

		supabase = {} as SupabaseClient<Database>;
	});

	const createService = () =>
		new WeeklyScheduleService(supabase, {
			basicScheduleRepository: basicScheduleRepo,
			shiftRepository: shiftRepo,
			staffRepository: staffRepo,
		});

	describe('generateWeeklyShifts', () => {
		it('generates shifts for all basic schedules with correct dates', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(adminStaff);

			const service = createService();
			const result = await service.generateWeeklyShifts(adminStaff.auth_user_id, mondayDate);

			expect(result).toEqual({ created: 3, skipped: 0, total: 3 });
			expect(shiftRepo.createMany).toHaveBeenCalledOnce();

			const createdShifts = shiftRepo.createMany.mock.calls[0][0] as Shift[];
			expect(createdShifts).toHaveLength(3);

			// Mon (offset 0) -> 2026-01-19
			const monShift = createdShifts.find(
				(s) => s.client_id === 'client-1' && s.time.start.hour === 9,
			);
			expect(monShift?.date.toISOString().slice(0, 10)).toBe('2026-01-19');
			expect(monShift?.staff_id).toBe('staff-1');
			expect(monShift?.is_unassigned).toBe(false);

			// Wed (offset 2) -> 2026-01-21
			const wedShift = createdShifts.find((s) => s.client_id === 'client-2');
			expect(wedShift?.date.toISOString().slice(0, 10)).toBe('2026-01-21');
			expect(wedShift?.staff_id).toBeNull();
			expect(wedShift?.is_unassigned).toBe(true);

			// Fri (offset 4) -> 2026-01-23
			const friShift = createdShifts.find((s) => s.time.start.hour === 10);
			expect(friShift?.date.toISOString().slice(0, 10)).toBe('2026-01-23');
			expect(friShift?.staff_id).toBe('staff-2'); // 先頭のスタッフ
		});

		it('skips existing shifts', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(adminStaff);

			// 1つ目の基本スケジュールに対応するシフトが既に存在
			// キー形式は "clientId|start_time_iso|end_time_iso"
			// JST ベースで日時を計算（2026-01-19 09:00 JST = 2026-01-19T00:00:00.000Z）
			const startTime = setJstTime(mondayDate, 9, 0);
			const endTime = setJstTime(mondayDate, 10, 0);
			const existingMap = new Map<string, Set<string>>();
			existingMap.set(
				'client-1',
				new Set([`client-1|${startTime.toISOString()}|${endTime.toISOString()}`]),
			);
			shiftRepo.findExistingInRange.mockResolvedValue(existingMap);

			const service = createService();
			const result = await service.generateWeeklyShifts(adminStaff.auth_user_id, mondayDate);

			expect(result).toEqual({ created: 2, skipped: 1, total: 3 });
		});

		it('throws error when weekStartDate is not Monday', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(adminStaff);

			const service = createService();
			const tuesday = new Date('2026-01-20'); // 火曜日

			await expect(service.generateWeeklyShifts(adminStaff.auth_user_id, tuesday)).rejects.toThrow(
				ServiceError,
			);

			await expect(service.generateWeeklyShifts(adminStaff.auth_user_id, tuesday)).rejects.toThrow(
				'Week start date must be Monday',
			);
		});

		it('throws 403 when non-admin tries to generate', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(helperStaff);

			const service = createService();

			await expect(
				service.generateWeeklyShifts(helperStaff.auth_user_id, mondayDate),
			).rejects.toThrow(ServiceError);

			try {
				await service.generateWeeklyShifts(helperStaff.auth_user_id, mondayDate);
			} catch (e) {
				expect((e as ServiceError).status).toBe(403);
			}
		});

		it('throws 404 when staff not found', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(null);

			const service = createService();

			await expect(service.generateWeeklyShifts('unknown-user', mondayDate)).rejects.toThrow(
				ServiceError,
			);

			try {
				await service.generateWeeklyShifts('unknown-user', mondayDate);
			} catch (e) {
				expect((e as ServiceError).status).toBe(404);
			}
		});

		it('returns zeros when no basic schedules exist', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(adminStaff);
			basicScheduleRepo.list.mockResolvedValue([]);

			const service = createService();
			const result = await service.generateWeeklyShifts(adminStaff.auth_user_id, mondayDate);

			expect(result).toEqual({ created: 0, skipped: 0, total: 0 });
			expect(shiftRepo.createMany).not.toHaveBeenCalled();
		});
	});

	describe('listShifts', () => {
		it('returns shifts for admin', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(adminStaff);
			const mockShifts: Shift[] = [
				{
					id: 'shift-1',
					client_id: 'client-1',
					service_type_id: 'life-support',
					staff_id: 'staff-1',
					date: new Date('2026-01-19'),
					time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
					status: 'scheduled',
					is_unassigned: false,
					created_at: new Date(),
					updated_at: new Date(),
				},
			];
			shiftRepo.list.mockResolvedValue(mockShifts);

			const service = createService();
			const result = await service.listShifts(adminStaff.auth_user_id, {
				startDate: new Date('2026-01-19'),
				endDate: new Date('2026-01-25'),
			});

			expect(result).toEqual(mockShifts);
			expect(shiftRepo.list).toHaveBeenCalledWith({
				officeId: adminStaff.office_id,
				startDate: new Date('2026-01-19'),
				endDate: new Date('2026-01-25'),
				staffId: undefined,
			});
		});

		it('throws 403 when non-admin tries to list all shifts', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(helperStaff);

			const service = createService();

			await expect(
				service.listShifts(helperStaff.auth_user_id, {
					startDate: new Date('2026-01-19'),
					endDate: new Date('2026-01-25'),
				}),
			).rejects.toThrow(ServiceError);
		});
	});

	describe('listMyShifts', () => {
		it('returns own shifts for helper', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(helperStaff);
			const mockShifts: Shift[] = [
				{
					id: 'shift-1',
					client_id: 'client-1',
					service_type_id: 'life-support',
					staff_id: helperStaff.id,
					date: new Date('2026-01-19'),
					time: { start: { hour: 9, minute: 0 }, end: { hour: 10, minute: 0 } },
					status: 'scheduled',
					is_unassigned: false,
					created_at: new Date(),
					updated_at: new Date(),
				},
			];
			shiftRepo.list.mockResolvedValue(mockShifts);

			const service = createService();
			const result = await service.listMyShifts(helperStaff.auth_user_id, {
				startDate: new Date('2026-01-19'),
				endDate: new Date('2026-01-25'),
			});

			expect(result).toEqual(mockShifts);
			expect(shiftRepo.list).toHaveBeenCalledWith({
				officeId: helperStaff.office_id,
				startDate: new Date('2026-01-19'),
				endDate: new Date('2026-01-25'),
				staffId: helperStaff.id,
			});
		});

		it('throws 404 when staff not found', async () => {
			staffRepo.findByAuthUserId.mockResolvedValue(null);

			const service = createService();

			await expect(
				service.listMyShifts('unknown-user', {
					startDate: new Date('2026-01-19'),
					endDate: new Date('2026-01-25'),
				}),
			).rejects.toThrow(ServiceError);
		});
	});
});

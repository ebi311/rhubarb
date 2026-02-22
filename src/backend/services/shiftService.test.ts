import { ServiceUserRepository } from '@/backend/repositories/serviceUserRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { ServiceUser } from '@/models/serviceUser';
import { Shift } from '@/models/shift';
import { Staff } from '@/models/staff';
import { createTestId, TEST_IDS } from '@/test/helpers/testIds';
import { setJstTime } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	Mocked,
	vi,
} from 'vitest';
import { ShiftService } from './shiftService';

const createMockStaffRepository = (): Mocked<StaffRepository> => {
	return {
		findByAuthUserId: vi.fn(),
		findById: vi.fn(),
	} as unknown as Mocked<StaffRepository>;
};

const createMockShiftRepository = (): Mocked<ShiftRepository> => {
	return {
		findById: vi.fn(),
		exists: vi.fn(),
		create: vi.fn(),
		updateStaffAssignment: vi.fn(),
		updateShiftSchedule: vi.fn(),
		cancelShift: vi.fn(),
		restoreShift: vi.fn(),
		findClientConflictingShifts: vi.fn(),
		findConflictingShifts: vi.fn(),
	} as unknown as Mocked<ShiftRepository>;
};

const createMockServiceUserRepository = (): Mocked<ServiceUserRepository> => {
	return {
		findById: vi.fn(),
	} as unknown as Mocked<ServiceUserRepository>;
};

const createTestStaff = (overrides: Partial<Staff> = {}): Staff => ({
	id: '12345678-1234-1234-8234-123456789001',
	auth_user_id: 'auth-user-1',
	office_id: 'office-1',
	name: 'テストスタッフ',
	email: 'test@example.com',
	role: 'admin',
	created_at: new Date('2026-01-01T00:00:00Z'),
	updated_at: new Date('2026-01-01T00:00:00Z'),
	...overrides,
});

const createTestShift = (overrides: Partial<Shift> = {}): Shift => ({
	id: '12345678-1234-1234-8234-123456789011',
	client_id: '12345678-1234-1234-8234-123456789002',
	service_type_id: 'physical-care',
	staff_id: '12345678-1234-1234-8234-123456789001',
	date: new Date('2026-01-20'),
	time: {
		start: { hour: 10, minute: 0 },
		end: { hour: 11, minute: 0 },
	},
	status: 'scheduled',
	is_unassigned: false,
	created_at: new Date('2026-01-20T00:00:00Z'),
	updated_at: new Date('2026-01-20T00:00:00Z'),
	...overrides,
});

const createTestServiceUser = (
	overrides: Partial<ServiceUser> = {},
): ServiceUser => ({
	id: TEST_IDS.CLIENT_1,
	office_id: TEST_IDS.OFFICE_1,
	name: '田中様',
	address: null,
	contract_status: 'active',
	created_at: new Date('2026-01-01T00:00:00Z'),
	updated_at: new Date('2026-01-01T00:00:00Z'),
	...overrides,
});

describe('ShiftService', () => {
	let service: ShiftService;
	let mockStaffRepo: Mocked<StaffRepository>;
	let mockShiftRepo: Mocked<ShiftRepository>;
	let mockServiceUserRepo: Mocked<ServiceUserRepository>;
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		mockStaffRepo = createMockStaffRepository();
		mockShiftRepo = createMockShiftRepository();
		mockServiceUserRepo = createMockServiceUserRepository();
		mockSupabase = {} as SupabaseClient<Database>;
		service = new ShiftService(mockSupabase, {
			staffRepository: mockStaffRepo,
			shiftRepository: mockShiftRepo,
			serviceUserRepository: mockServiceUserRepo,
		});
	});

	describe('changeStaffAssignment', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T00:00:00+09:00'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should successfully change staff assignment', async () => {
			const userId = 'auth-user-1';
			const shiftId = '12345678-1234-1234-8234-123456789011';
			const newStaffId = '12345678-1234-1234-8234-123456789003';
			const reason = '担当者変更';

			const adminStaff = createTestStaff();
			const shift = createTestShift();
			const oldStaff = createTestStaff();
			const newStaff = createTestStaff({
				id: newStaffId,
				name: '新しいスタッフ',
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(shift);
			mockStaffRepo.findById.mockResolvedValueOnce(oldStaff); // 旧スタッフ
			mockStaffRepo.findById.mockResolvedValueOnce(newStaff); // 新スタッフ

			const result = await service.changeStaffAssignment(
				userId,
				shiftId,
				newStaffId,
				reason,
			);

			expect(mockShiftRepo.updateStaffAssignment).toHaveBeenCalledWith(
				shiftId,
				newStaffId,
				reason,
			);
			expect(result).toEqual({
				oldStaffName: 'テストスタッフ',
				newStaffName: '新しいスタッフ',
			});
		});

		it('should throw 400 if shift is in the past (JST)', async () => {
			vi.setSystemTime(new Date('2026-02-22T00:00:00+09:00'));

			const userId = 'auth-user-1';
			const shiftId = TEST_IDS.SCHEDULE_1;
			const newStaffId = TEST_IDS.STAFF_2;

			const adminStaff = createTestStaff({ office_id: TEST_IDS.OFFICE_1 });
			const pastShift = createTestShift({
				id: shiftId,
				client_id: TEST_IDS.CLIENT_1,
				date: new Date('2026-02-21'),
				time: {
					start: { hour: 9, minute: 0 },
					end: { hour: 10, minute: 0 },
				},
			});
			const newStaff = createTestStaff({
				id: newStaffId,
				office_id: TEST_IDS.OFFICE_1,
				name: 'スタッフ2',
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(pastShift);
			mockStaffRepo.findById.mockResolvedValueOnce(newStaff);

			await expect(
				service.changeStaffAssignment(
					userId,
					shiftId,
					newStaffId,
					'担当者変更',
				),
			).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Cannot change staff for past shift',
				}),
			);

			expect(mockShiftRepo.updateStaffAssignment).not.toHaveBeenCalled();
		});

		it('should throw 404 if staff not found', async () => {
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(null);

			await expect(
				service.changeStaffAssignment('user-1', 'shift-1', 'staff-1'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Staff not found',
				}),
			);
		});

		it('should throw 403 if user is not admin', async () => {
			const helperStaff = createTestStaff({ role: 'helper' });
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(helperStaff);

			await expect(
				service.changeStaffAssignment('user-1', 'shift-1', 'staff-1'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 403,
					message: 'Forbidden',
				}),
			);
		});

		it('should throw 404 if shift not found', async () => {
			const adminStaff = createTestStaff();
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(null);

			await expect(
				service.changeStaffAssignment('user-1', 'shift-1', 'staff-1'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Shift not found',
				}),
			);
		});

		it('should throw 400 if shift is canceled', async () => {
			const adminStaff = createTestStaff();
			const canceledShift = createTestShift({ status: 'canceled' });

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(canceledShift);

			await expect(
				service.changeStaffAssignment('user-1', 'shift-1', 'staff-1'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Cannot change canceled or completed shift',
				}),
			);
		});

		it('should throw 400 if shift is completed', async () => {
			const adminStaff = createTestStaff();
			const completedShift = createTestShift({ status: 'completed' });

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(completedShift);

			await expect(
				service.changeStaffAssignment('user-1', 'shift-1', 'staff-1'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Cannot change canceled or completed shift',
				}),
			);
		});

		it('should handle unassigned shift (old staff name = "未割当")', async () => {
			const userId = 'auth-user-1';
			const shiftId = '12345678-1234-1234-8234-123456789011';
			const newStaffId = '12345678-1234-1234-8234-123456789003';

			const adminStaff = createTestStaff();
			const unassignedShift = createTestShift({
				staff_id: null,
				is_unassigned: true,
			});
			const newStaff = createTestStaff({
				id: newStaffId,
				name: '新しいスタッフ',
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(unassignedShift);
			mockStaffRepo.findById.mockResolvedValueOnce(newStaff);

			const result = await service.changeStaffAssignment(
				userId,
				shiftId,
				newStaffId,
			);

			expect(result).toEqual({
				oldStaffName: '未割当',
				newStaffName: '新しいスタッフ',
			});
		});
	});

	describe('cancelShift', () => {
		it('should successfully cancel shift', async () => {
			const userId = 'auth-user-1';
			const shiftId = '12345678-1234-1234-8234-123456789011';
			const reason = '利用者都合';
			const category = 'client';

			const adminStaff = createTestStaff();
			const shift = createTestShift();

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(shift);

			await service.cancelShift(userId, shiftId, reason, category);

			expect(mockShiftRepo.cancelShift).toHaveBeenCalledWith(
				shiftId,
				reason,
				category,
				expect.any(Date),
			);
		});

		it('should throw 404 if staff not found', async () => {
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(null);

			await expect(
				service.cancelShift('user-1', 'shift-1', 'reason', 'client'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Staff not found',
				}),
			);
		});

		it('should throw 403 if user is not admin', async () => {
			const helperStaff = createTestStaff({ role: 'helper' });
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(helperStaff);

			await expect(
				service.cancelShift('user-1', 'shift-1', 'reason', 'client'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 403,
					message: 'Forbidden',
				}),
			);
		});

		it('should throw 404 if shift not found', async () => {
			const adminStaff = createTestStaff();
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(null);

			await expect(
				service.cancelShift('user-1', 'shift-1', 'reason', 'client'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Shift not found',
				}),
			);
		});

		it('should throw 400 if shift is already completed', async () => {
			const adminStaff = createTestStaff();
			const completedShift = createTestShift({ status: 'completed' });

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(completedShift);

			await expect(
				service.cancelShift('user-1', 'shift-1', 'reason', 'client'),
			).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Cannot cancel completed shift',
				}),
			);
		});
	});

	describe('updateShiftSchedule', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T00:00:00+09:00'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should update schedule and staff when valid', async () => {
			const userId = 'auth-user-1';
			const shiftId = TEST_IDS.SCHEDULE_1;
			const newStart = new Date('2026-02-22T01:00:00.000Z');
			const newEnd = new Date('2026-02-22T02:00:00.000Z');
			const newStaffId = TEST_IDS.STAFF_2;
			const reason = '日時調整';

			const adminStaff = createTestStaff({ office_id: TEST_IDS.OFFICE_1 });
			const shift = createTestShift({
				id: shiftId,
				client_id: TEST_IDS.CLIENT_1,
			});
			const client = createTestServiceUser({ office_id: TEST_IDS.OFFICE_1 });
			const staff = createTestStaff({
				id: newStaffId,
				office_id: TEST_IDS.OFFICE_1,
				name: 'スタッフ2',
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(shift);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockStaffRepo.findById.mockResolvedValueOnce(staff);
			mockShiftRepo.findClientConflictingShifts.mockResolvedValueOnce([]);
			mockShiftRepo.updateShiftSchedule.mockResolvedValueOnce(undefined);

			const result = await service.updateShiftSchedule(
				userId,
				shiftId,
				newStart,
				newEnd,
				newStaffId,
				reason,
			);

			expect(mockShiftRepo.updateShiftSchedule).toHaveBeenCalledWith(shiftId, {
				startTime: newStart,
				endTime: newEnd,
				staffId: newStaffId,
				notes: reason,
			});
			expect(result).toEqual({ shiftId });
		});

		it('should throw 409 if client has conflicting shift (excluding itself)', async () => {
			const userId = 'auth-user-1';
			const shiftId = TEST_IDS.SCHEDULE_1;
			const newStart = new Date('2026-02-22T01:00:00.000Z');
			const newEnd = new Date('2026-02-22T02:00:00.000Z');

			const adminStaff = createTestStaff({ office_id: TEST_IDS.OFFICE_1 });
			const shift = createTestShift({
				id: shiftId,
				client_id: TEST_IDS.CLIENT_1,
			});
			const client = createTestServiceUser({ office_id: TEST_IDS.OFFICE_1 });
			const conflictingShift = createTestShift({
				id: TEST_IDS.SCHEDULE_2,
				client_id: TEST_IDS.CLIENT_1,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(shift);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockShiftRepo.findClientConflictingShifts.mockResolvedValueOnce([
				conflictingShift,
			]);

			await expect(
				service.updateShiftSchedule(userId, shiftId, newStart, newEnd, null),
			).rejects.toThrow(
				expect.objectContaining({
					status: 409,
					message: 'Client has conflicting shift',
				}),
			);
		});

		it('should throw 400 if newStartTime is in the past (JST)', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-02-22T00:00:00+09:00'));

			const userId = 'auth-user-1';
			const shiftId = TEST_IDS.SCHEDULE_1;
			// JST 2026-02-21 23:00 (past relative to system time JST 2026-02-22 00:00)
			const pastStart = new Date('2026-02-21T14:00:00.000Z');
			const pastEnd = new Date('2026-02-21T15:00:00.000Z');

			const adminStaff = createTestStaff({ office_id: TEST_IDS.OFFICE_1 });
			const shift = createTestShift({
				id: shiftId,
				client_id: TEST_IDS.CLIENT_1,
			});
			const client = createTestServiceUser({ office_id: TEST_IDS.OFFICE_1 });

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(shift);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);

			await expect(
				service.updateShiftSchedule(userId, shiftId, pastStart, pastEnd, null),
			).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Cannot move shift to the past',
				}),
			);

			vi.useRealTimers();
		});

		it('should throw 400 if changing staff for past shift even when schedule is unchanged', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-02-22T00:00:00+09:00'));

			const userId = 'auth-user-1';
			const shiftId = TEST_IDS.SCHEDULE_1;
			const newStaffId = TEST_IDS.STAFF_2;

			const adminStaff = createTestStaff({ office_id: TEST_IDS.OFFICE_1 });
			const shift = createTestShift({
				id: shiftId,
				client_id: TEST_IDS.CLIENT_1,
				// system time (JST 2026-02-22) より過去のシフト
				date: new Date('2026-02-21'),
				time: {
					start: { hour: 9, minute: 0 },
					end: { hour: 10, minute: 0 },
				},
			});
			const client = createTestServiceUser({ office_id: TEST_IDS.OFFICE_1 });
			const staff = createTestStaff({
				id: newStaffId,
				office_id: TEST_IDS.OFFICE_1,
				name: 'スタッフ2',
			});

			const sameStart = setJstTime(shift.date, 9, 0);
			const sameEnd = setJstTime(shift.date, 10, 0);

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(shift);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockShiftRepo.findClientConflictingShifts.mockResolvedValueOnce([]);
			mockStaffRepo.findById.mockResolvedValueOnce(staff);

			await expect(
				service.updateShiftSchedule(
					userId,
					shiftId,
					sameStart,
					sameEnd,
					newStaffId,
					'担当者だけ変更',
				),
			).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Cannot change staff for past shift',
				}),
			);

			expect(mockShiftRepo.updateShiftSchedule).not.toHaveBeenCalled();

			vi.useRealTimers();
		});
	});

	describe('restoreShift', () => {
		it('should successfully restore canceled shift', async () => {
			const userId = 'auth-user-1';
			const shiftId = '12345678-1234-1234-8234-123456789011';

			const adminStaff = createTestStaff();
			const canceledShift = createTestShift({ status: 'canceled' });

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(canceledShift);

			await service.restoreShift(userId, shiftId);

			expect(mockShiftRepo.restoreShift).toHaveBeenCalledWith(shiftId);
		});

		it('should throw 404 if staff not found', async () => {
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(null);

			await expect(service.restoreShift('user-1', 'shift-1')).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Staff not found',
				}),
			);
		});

		it('should throw 403 if user is not admin', async () => {
			const helperStaff = createTestStaff({ role: 'helper' });
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(helperStaff);

			await expect(service.restoreShift('user-1', 'shift-1')).rejects.toThrow(
				expect.objectContaining({
					status: 403,
					message: 'Forbidden',
				}),
			);
		});

		it('should throw 404 if shift not found', async () => {
			const adminStaff = createTestStaff();
			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(null);

			await expect(service.restoreShift('user-1', 'shift-1')).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Shift not found',
				}),
			);
		});

		it('should throw 400 if shift is not canceled (scheduled)', async () => {
			const adminStaff = createTestStaff();
			const scheduledShift = createTestShift({ status: 'scheduled' });

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(scheduledShift);

			await expect(service.restoreShift('user-1', 'shift-1')).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Shift is not canceled',
				}),
			);
		});

		it('should throw 400 if shift is not canceled (completed)', async () => {
			const adminStaff = createTestStaff();
			const completedShift = createTestShift({ status: 'completed' });

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockShiftRepo.findById.mockResolvedValueOnce(completedShift);

			await expect(service.restoreShift('user-1', 'shift-1')).rejects.toThrow(
				expect.objectContaining({
					status: 400,
					message: 'Shift is not canceled',
				}),
			);
		});
	});

	describe('createOneOffShift', () => {
		it('単発シフトを作成できる（担当者あり）', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});
			const assignedStaff = createTestStaff({
				id: TEST_IDS.STAFF_1,
				office_id: TEST_IDS.OFFICE_1,
			});
			const client = createTestServiceUser({
				id: TEST_IDS.CLIENT_1,
				office_id: TEST_IDS.OFFICE_1,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockStaffRepo.findById.mockResolvedValueOnce(assignedStaff);
			mockShiftRepo.findClientConflictingShifts.mockResolvedValueOnce([]);
			mockShiftRepo.findConflictingShifts.mockResolvedValueOnce([]);
			mockShiftRepo.create.mockResolvedValueOnce();

			const result = await service.createOneOffShift(userId, {
				client_id: TEST_IDS.CLIENT_1,
				service_type_id: 'physical-care',
				staff_id: TEST_IDS.STAFF_1,
				date: new Date('2026-02-19'),
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
			});

			expect(mockShiftRepo.findClientConflictingShifts).toHaveBeenCalledWith(
				TEST_IDS.CLIENT_1,
				expect.any(Date),
				expect.any(Date),
				TEST_IDS.OFFICE_1,
			);
			expect(mockShiftRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					staff_id: TEST_IDS.STAFF_1,
					is_unassigned: false,
					status: 'scheduled',
					time: {
						start: { hour: 9, minute: 0 },
						end: { hour: 10, minute: 0 },
					},
				}),
			);
			expect(result.id).toEqual(expect.any(String));
		});

		it('単発シフトを作成できる（未割当）', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});
			const client = createTestServiceUser({
				id: TEST_IDS.CLIENT_1,
				office_id: TEST_IDS.OFFICE_1,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockShiftRepo.findClientConflictingShifts.mockResolvedValueOnce([]);
			mockShiftRepo.create.mockResolvedValueOnce();

			const result = await service.createOneOffShift(userId, {
				client_id: TEST_IDS.CLIENT_1,
				service_type_id: 'physical-care',
				date: new Date('2026-02-19'),
				start_time: { hour: 9, minute: 0 },
				end_time: { hour: 10, minute: 0 },
			});

			expect(result.staff_id).toBeNull();
			expect(result.is_unassigned).toBe(true);
		});

		it('同一clientで時間帯が部分的にでも重なる場合は409を投げる', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});
			const client = createTestServiceUser({
				id: TEST_IDS.CLIENT_1,
				office_id: TEST_IDS.OFFICE_1,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockShiftRepo.findClientConflictingShifts.mockResolvedValueOnce([
				createTestShift({
					client_id: TEST_IDS.CLIENT_1,
					date: new Date('2026-02-19'),
					time: {
						start: { hour: 9, minute: 30 },
						end: { hour: 10, minute: 30 },
					},
				}),
			]);

			await expect(
				service.createOneOffShift(userId, {
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					date: new Date('2026-02-19'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
				}),
			).rejects.toThrow(
				expect.objectContaining({
					status: 409,
					message: 'Client has conflicting shift',
				}),
			);
		});

		it('担当者が存在しない場合は404を投げる', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});
			const client = createTestServiceUser({
				id: TEST_IDS.CLIENT_1,
				office_id: TEST_IDS.OFFICE_1,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockStaffRepo.findById.mockResolvedValueOnce(null);

			await expect(
				service.createOneOffShift(userId, {
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					staff_id: TEST_IDS.STAFF_1,
					date: new Date('2026-02-19'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
				}),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Assigned staff not found',
				}),
			);
			expect(mockShiftRepo.exists).not.toHaveBeenCalled();
		});

		it('client が存在しない場合は404を投げる（情報漏えい防止）', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(null);

			await expect(
				service.createOneOffShift(userId, {
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					date: new Date('2026-02-19'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
				}),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Client not found',
				}),
			);
			expect(mockShiftRepo.exists).not.toHaveBeenCalled();
		});

		it('client が別 office の場合も404を投げる（情報漏えい防止）', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});
			const clientOtherOffice = createTestServiceUser({
				id: TEST_IDS.CLIENT_1,
				office_id: TEST_IDS.OFFICE_2,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(clientOtherOffice);

			await expect(
				service.createOneOffShift(userId, {
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					date: new Date('2026-02-19'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
				}),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Client not found',
				}),
			);
			expect(mockShiftRepo.exists).not.toHaveBeenCalled();
		});

		it('担当者が別 office の場合は404を投げる（staff_id 指定時）', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});
			const client = createTestServiceUser({
				id: TEST_IDS.CLIENT_1,
				office_id: TEST_IDS.OFFICE_1,
			});
			const assignedStaffOtherOffice = createTestStaff({
				id: TEST_IDS.STAFF_1,
				office_id: TEST_IDS.OFFICE_2,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockStaffRepo.findById.mockResolvedValueOnce(assignedStaffOtherOffice);

			await expect(
				service.createOneOffShift(userId, {
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					staff_id: TEST_IDS.STAFF_1,
					date: new Date('2026-02-19'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
				}),
			).rejects.toThrow(
				expect.objectContaining({
					status: 404,
					message: 'Assigned staff not found',
				}),
			);
			expect(mockShiftRepo.exists).not.toHaveBeenCalled();
		});

		it('担当者の重複（時間衝突）があれば409を投げる', async () => {
			const userId = createTestId();
			const adminStaff = createTestStaff({
				auth_user_id: userId,
				role: 'admin',
				office_id: TEST_IDS.OFFICE_1,
			});
			const assignedStaff = createTestStaff({
				id: TEST_IDS.STAFF_1,
				office_id: TEST_IDS.OFFICE_1,
			});
			const client = createTestServiceUser({
				id: TEST_IDS.CLIENT_1,
				office_id: TEST_IDS.OFFICE_1,
			});

			mockStaffRepo.findByAuthUserId.mockResolvedValueOnce(adminStaff);
			mockServiceUserRepo.findById.mockResolvedValueOnce(client);
			mockStaffRepo.findById.mockResolvedValueOnce(assignedStaff);
			mockShiftRepo.findClientConflictingShifts.mockResolvedValueOnce([]);
			mockShiftRepo.findConflictingShifts.mockResolvedValueOnce([
				createTestShift({ staff_id: TEST_IDS.STAFF_1 }),
			]);

			await expect(
				service.createOneOffShift(userId, {
					client_id: TEST_IDS.CLIENT_1,
					service_type_id: 'physical-care',
					staff_id: TEST_IDS.STAFF_1,
					date: new Date('2026-02-19'),
					start_time: { hour: 9, minute: 0 },
					end_time: { hour: 10, minute: 0 },
				}),
			).rejects.toThrow(
				expect.objectContaining({
					status: 409,
					message: 'Staff has conflicting shift',
				}),
			);
		});
	});

	describe('validateStaffAvailability', () => {
		it('should return available=true if no conflicts', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');

			mockShiftRepo.findConflictingShifts.mockResolvedValueOnce([]);

			const result = await service.validateStaffAvailability(
				staffId,
				startTime,
				endTime,
			);

			expect(result).toEqual({ available: true });
		});

		it('should return available=false with conflicting shifts', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');

			const conflictingShift = createTestShift();
			mockShiftRepo.findConflictingShifts.mockResolvedValueOnce([
				conflictingShift,
			]);
			mockServiceUserRepo.findById.mockResolvedValueOnce({
				id: conflictingShift.client_id,
				name: '田中様',
			} as ServiceUser);

			const result = await service.validateStaffAvailability(
				staffId,
				startTime,
				endTime,
			);

			expect(result.available).toBe(false);
			expect(result.conflictingShifts).toBeDefined();
			expect(result.conflictingShifts?.length).toBe(1);
			expect(result.conflictingShifts?.[0].clientName).toBe('田中様');
		});

		it('should exclude specific shift when provided', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');
			const excludeShiftId = 'exclude-shift-1';

			mockShiftRepo.findConflictingShifts.mockResolvedValueOnce([]);

			await service.validateStaffAvailability(
				staffId,
				startTime,
				endTime,
				excludeShiftId,
			);

			expect(mockShiftRepo.findConflictingShifts).toHaveBeenCalledWith(
				staffId,
				startTime,
				endTime,
				excludeShiftId,
			);
		});
	});
});

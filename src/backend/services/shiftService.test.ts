import { ServiceUserRepository } from '@/backend/repositories/serviceUserRepository';
import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { Database } from '@/backend/types/supabase';
import { ServiceUser } from '@/models/serviceUser';
import { Shift } from '@/models/shift';
import { Staff } from '@/models/staff';
import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
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
		updateStaffAssignment: vi.fn(),
		cancelShift: vi.fn(),
		restoreShift: vi.fn(),
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

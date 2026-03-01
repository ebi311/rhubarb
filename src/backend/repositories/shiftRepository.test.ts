import { Database } from '@/backend/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftRepository } from './shiftRepository';

// Supabase クライアントのモック
const createMockSupabaseClient = () => {
	const mockQuery = {
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		gt: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn(),
		single: vi.fn(),
	};

	return {
		from: vi.fn(() => mockQuery),
		_mockQuery: mockQuery,
	} as unknown as SupabaseClient<Database> & { _mockQuery: typeof mockQuery };
};

describe('ShiftRepository', () => {
	let repository: ShiftRepository;
	let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
		repository = new ShiftRepository(mockSupabase);
	});

	describe('updateStaffAssignment', () => {
		it('should update staff_id and notes', async () => {
			const shiftId = 'shift-1';
			const newStaffId = 'staff-2';
			const notes = '担当者変更: 急病のため';

			mockSupabase._mockQuery.eq.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			await repository.updateStaffAssignment(shiftId, newStaffId, notes);

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
				staff_id: newStaffId,
				is_unassigned: false,
				notes,
				updated_at: expect.any(String),
			});
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('id', shiftId);
		});

		it('should set is_unassigned to false when staffId is provided', async () => {
			const shiftId = 'shift-1';
			const newStaffId = 'staff-2';

			mockSupabase._mockQuery.eq.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			await repository.updateStaffAssignment(shiftId, newStaffId);

			expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
				staff_id: newStaffId,
				is_unassigned: false,
				notes: undefined,
				updated_at: expect.any(String),
			});
		});

		it('should set is_unassigned to true when staffId is null', async () => {
			const shiftId = 'shift-1';

			mockSupabase._mockQuery.eq.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			await repository.updateStaffAssignment(shiftId, null);

			expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
				staff_id: null,
				is_unassigned: true,
				notes: undefined,
				updated_at: expect.any(String),
			});
		});

		it('should throw error if update fails', async () => {
			const error = new Error('Update failed');
			mockSupabase._mockQuery.eq.mockResolvedValueOnce({ data: null, error });

			await expect(
				repository.updateStaffAssignment('shift-1', 'staff-2'),
			).rejects.toThrow('Update failed');
		});
	});

	describe('updateShiftSchedule', () => {
		it('should update start_time/end_time and staff_id', async () => {
			const shiftId = 'shift-1';
			const startTime = new Date('2026-02-22T01:00:00.000Z');
			const endTime = new Date('2026-02-22T02:00:00.000Z');
			const staffId = 'staff-2';
			const notes = '編集理由';

			mockSupabase._mockQuery.eq.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			await repository.updateShiftSchedule(shiftId, {
				startTime,
				endTime,
				staffId,
				notes,
			});

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
				start_time: startTime.toISOString(),
				end_time: endTime.toISOString(),
				staff_id: staffId,
				is_unassigned: false,
				notes,
				updated_at: expect.any(String),
			});
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('id', shiftId);
		});

		it('should allow unassigned (staff_id=null, is_unassigned=true)', async () => {
			const shiftId = 'shift-1';
			const startTime = new Date('2026-02-22T01:00:00.000Z');
			const endTime = new Date('2026-02-22T02:00:00.000Z');

			mockSupabase._mockQuery.eq.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			await repository.updateShiftSchedule(shiftId, {
				startTime,
				endTime,
				staffId: null,
			});

			expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
				start_time: startTime.toISOString(),
				end_time: endTime.toISOString(),
				staff_id: null,
				is_unassigned: true,
				notes: undefined,
				updated_at: expect.any(String),
			});
		});
	});

	describe('cancelShift', () => {
		it('should update status to canceled with reason and category', async () => {
			const shiftId = 'shift-1';
			const reason = '利用者が入院';
			const category = 'client';
			const canceledAt = new Date('2026-01-20T10:00:00Z');

			mockSupabase._mockQuery.eq.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			await repository.cancelShift(shiftId, reason, category, canceledAt);

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
				status: 'canceled',
				canceled_reason: reason,
				canceled_category: category,
				canceled_at: canceledAt.toISOString(),
				updated_at: expect.any(String),
			});
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('id', shiftId);
		});

		it('should throw error if cancel fails', async () => {
			const error = new Error('Cancel failed');
			mockSupabase._mockQuery.eq.mockResolvedValueOnce({ data: null, error });

			await expect(
				repository.cancelShift('shift-1', 'reason', 'client', new Date()),
			).rejects.toThrow('Cancel failed');
		});
	});

	describe('restoreShift', () => {
		it('should update status to scheduled and clear cancel info', async () => {
			const shiftId = 'shift-1';

			mockSupabase._mockQuery.eq.mockResolvedValueOnce({
				data: null,
				error: null,
			});

			await repository.restoreShift(shiftId);

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			expect(mockSupabase._mockQuery.update).toHaveBeenCalledWith({
				status: 'scheduled',
				canceled_reason: null,
				canceled_category: null,
				canceled_at: null,
				updated_at: expect.any(String),
			});
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith('id', shiftId);
		});

		it('should throw error if restore fails', async () => {
			const error = new Error('Restore failed');
			mockSupabase._mockQuery.eq.mockResolvedValueOnce({ data: null, error });

			await expect(repository.restoreShift('shift-1')).rejects.toThrow(
				'Restore failed',
			);
		});
	});

	describe('findConflictingShifts', () => {
		it('should find shifts for a staff in the same time range', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');

			const mockData = [
				{
					id: '12345678-1234-1234-8234-123456789011',
					client_id: '12345678-1234-1234-8234-123456789002',
					service_type_id: 'physical-care',
					staff_id: staffId,
					start_time: '2026-01-20T10:00:00+09:00',
					end_time: '2026-01-20T11:00:00+09:00',
					status: 'scheduled',
					is_unassigned: false,
					created_at: '2026-01-20T00:00:00Z',
					updated_at: '2026-01-20T00:00:00Z',
					notes: null,
					canceled_reason: null,
					canceled_at: null,
				},
			];

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: mockData,
				error: null,
			});

			const result = await repository.findConflictingShifts(
				staffId,
				startTime,
				endTime,
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			expect(mockSupabase._mockQuery.select).toHaveBeenCalledWith('*');
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'staff_id',
				staffId,
			);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('12345678-1234-1234-8234-123456789011');
		});

		it('should use 30-minute buffered times in the query', async () => {
			const staffId = 'staff-1';
			// 10:00Z ~ 11:00Z → buffered: 09:30Z ~ 11:30Z
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');

			const bufferedStart = new Date('2026-01-20T09:30:00.000Z');
			const bufferedEnd = new Date('2026-01-20T11:30:00.000Z');

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findConflictingShifts(staffId, startTime, endTime);

			// .or() に渡されるクエリ文字列が buffered な ISO を含むことを検証
			expect(mockSupabase._mockQuery.or).toHaveBeenCalledWith(
				`and(start_time.lt.${bufferedEnd.toISOString()},end_time.gt.${bufferedStart.toISOString()})`,
			);
		});

		it('should exclude a specific shift when provided', async () => {
			const staffId = 'staff-1';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');
			const excludeShiftId = 'shift-2';

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findConflictingShifts(
				staffId,
				startTime,
				endTime,
				excludeShiftId,
			);

			// neq が呼ばれることを確認
			expect(mockSupabase._mockQuery.neq).toHaveBeenCalledWith(
				'id',
				excludeShiftId,
			);
		});

		it('should return empty array if no conflicts', async () => {
			const staffId = 'staff-1';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			const result = await repository.findConflictingShifts(
				staffId,
				startTime,
				endTime,
			);

			expect(result).toEqual([]);
		});

		it('should throw error if query fails', async () => {
			const error = new Error('Query failed');
			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: null,
				error,
			});

			await expect(
				repository.findConflictingShifts('staff-1', new Date(), new Date()),
			).rejects.toThrow('Query failed');
		});
	});

	describe('findClientConflictingShifts', () => {
		it('should build overlap query with strict boundaries', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findClientConflictingShifts(
				clientId,
				startTime,
				endTime,
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'client_id',
				clientId,
			);
			expect(mockSupabase._mockQuery.neq).toHaveBeenCalledWith(
				'status',
				'canceled',
			);
			expect(mockSupabase._mockQuery.lt).toHaveBeenCalledWith(
				'start_time',
				endTime.toISOString(),
			);
			expect(mockSupabase._mockQuery.gt).toHaveBeenCalledWith(
				'end_time',
				startTime.toISOString(),
			);
		});

		it('10:00-11:00 と 11:00-12:00 は重ならない（境界は排他的）', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const startTime = new Date('2026-01-20T11:00:00Z');
			const endTime = new Date('2026-01-20T12:00:00Z');

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findClientConflictingShifts(
				clientId,
				startTime,
				endTime,
			);

			// 重複判定は strict: start < existingEnd && end > existingStart
			// 例: existingEnd === start の場合は重複しないよう gt/lt を使用する
			expect(mockSupabase._mockQuery.lt).toHaveBeenCalledWith(
				'start_time',
				endTime.toISOString(),
			);
			expect(mockSupabase._mockQuery.gt).toHaveBeenCalledWith(
				'end_time',
				startTime.toISOString(),
			);
		});

		it('should apply officeId filter via clients join when provided', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const startTime = new Date('2026-01-20T10:00:00Z');
			const endTime = new Date('2026-01-20T11:00:00Z');
			const officeId = 'office-1';

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findClientConflictingShifts(
				clientId,
				startTime,
				endTime,
				officeId,
			);

			expect(mockSupabase._mockQuery.select).toHaveBeenCalledWith(
				'*, clients!inner(office_id)',
			);
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'clients.office_id',
				officeId,
			);
		});
	});
});

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
		limit: vi.fn().mockReturnThis(),
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

	describe('findAffectedShiftsByAbsence', () => {
		it('should call list with correct filters for affected shifts', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startDate = new Date('2026-01-20');
			const endDate = new Date('2026-01-22');
			const officeId = '12345678-1234-1234-8234-123456789031';

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
					clients: { office_id: officeId },
				},
				{
					id: '12345678-1234-1234-8234-123456789012',
					client_id: '12345678-1234-1234-8234-123456789003',
					service_type_id: 'life-support',
					staff_id: staffId,
					start_time: '2026-01-21T09:00:00+09:00',
					end_time: '2026-01-21T10:00:00+09:00',
					status: 'confirmed',
					is_unassigned: false,
					created_at: '2026-01-20T00:00:00Z',
					updated_at: '2026-01-20T00:00:00Z',
					notes: null,
					canceled_reason: null,
					canceled_at: null,
					clients: { office_id: officeId },
				},
			];

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: mockData,
				error: null,
			});

			const result = await repository.findAffectedShiftsByAbsence(
				staffId,
				startDate,
				endDate,
				officeId,
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			// join clients
			expect(mockSupabase._mockQuery.select).toHaveBeenCalledWith(
				'*, clients!inner(office_id)',
			);
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'clients.office_id',
				officeId,
			);
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'staff_id',
				staffId,
			);
			expect(mockSupabase._mockQuery.neq).toHaveBeenCalledWith(
				'status',
				'canceled',
			);
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('12345678-1234-1234-8234-123456789011');
			expect(result[1].id).toBe('12345678-1234-1234-8234-123456789012');
		});

		it('should exclude canceled shifts', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startDate = new Date('2026-01-20');
			const endDate = new Date('2026-01-22');
			const officeId = '12345678-1234-1234-8234-123456789031';

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findAffectedShiftsByAbsence(
				staffId,
				startDate,
				endDate,
				officeId,
			);

			expect(mockSupabase._mockQuery.neq).toHaveBeenCalledWith(
				'status',
				'canceled',
			);
		});

		it('should only include scheduled or confirmed status shifts', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startDate = new Date('2026-01-20');
			const endDate = new Date('2026-01-22');
			const officeId = '12345678-1234-1234-8234-123456789031';

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findAffectedShiftsByAbsence(
				staffId,
				startDate,
				endDate,
				officeId,
			);

			// scheduled または confirmed のみを対象にするフィルタ
			expect(mockSupabase._mockQuery.or).toHaveBeenCalledWith(
				'status.eq.scheduled,status.eq.confirmed',
			);
		});

		it('should only include shifts from startDate onwards (not past shifts)', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startDate = new Date('2026-01-20');
			const endDate = new Date('2026-01-22');
			const officeId = '12345678-1234-1234-8234-123456789031';

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findAffectedShiftsByAbsence(
				staffId,
				startDate,
				endDate,
				officeId,
			);

			// startDate以降のシフトのみ（当日以降）
			expect(mockSupabase._mockQuery.gte).toHaveBeenCalledWith(
				'start_time',
				expect.stringContaining('2026-01-19T15:00:00'), // JST 2026-01-20 00:00 = UTC 2026-01-19 15:00
			);
		});

		it('should return empty array if no shifts found', async () => {
			const staffId = '12345678-1234-1234-8234-123456789001';
			const startDate = new Date('2026-01-20');
			const endDate = new Date('2026-01-22');
			const officeId = '12345678-1234-1234-8234-123456789031';

			mockSupabase._mockQuery.order.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			const result = await repository.findAffectedShiftsByAbsence(
				staffId,
				startDate,
				endDate,
				officeId,
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
				repository.findAffectedShiftsByAbsence(
					'staff-1',
					new Date('2026-01-20'),
					new Date('2026-01-22'),
					'office-1',
				),
			).rejects.toThrow('Query failed');
		});
	});

	describe('findPastAssignedStaffIdsByClient', () => {
		it('should return unique staff IDs from completed shifts for a client with serviceTypeId filter', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const officeId = '12345678-1234-1234-8234-123456789031';
			const serviceTypeId = 'life-support';
			const limit = 3;

			// SQL DISTINCT + ORDER BY で取得済み（直近順）、重複なしのデータ
			const mockData = [
				{ staff_id: '12345678-1234-1234-8234-123456789011' },
				{ staff_id: '12345678-1234-1234-8234-123456789012' },
				{ staff_id: '12345678-1234-1234-8234-123456789013' },
			];

			mockSupabase._mockQuery.limit.mockResolvedValueOnce({
				data: mockData,
				error: null,
			});

			const result = await repository.findPastAssignedStaffIdsByClient(
				clientId,
				officeId,
				serviceTypeId,
				limit,
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('shifts');
			// DISTINCT staff_id を使用
			expect(mockSupabase._mockQuery.select).toHaveBeenCalledWith(
				'staff_id, clients!inner(office_id)',
			);
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'clients.office_id',
				officeId,
			);
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'client_id',
				clientId,
			);
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'service_type_id',
				serviceTypeId,
			);
			// status='completed' 限定
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'status',
				'completed',
			);
			expect(mockSupabase._mockQuery.neq).toHaveBeenCalledWith(
				'staff_id',
				null,
			);
			// start_time 降順（直近優先）
			expect(mockSupabase._mockQuery.order).toHaveBeenCalledWith('start_time', {
				ascending: false,
			});
			// limit パラメータを使用
			expect(mockSupabase._mockQuery.limit).toHaveBeenCalled();
			// 直近順で返却
			expect(result).toHaveLength(3);
			expect(result).toEqual([
				'12345678-1234-1234-8234-123456789011',
				'12345678-1234-1234-8234-123456789012',
				'12345678-1234-1234-8234-123456789013',
			]);
		});

		it('should filter by completed status only', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const officeId = '12345678-1234-1234-8234-123456789031';
			const serviceTypeId = 'life-support';

			mockSupabase._mockQuery.limit.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findPastAssignedStaffIdsByClient(
				clientId,
				officeId,
				serviceTypeId,
				10,
			);

			// status='completed' に限定
			expect(mockSupabase._mockQuery.eq).toHaveBeenCalledWith(
				'status',
				'completed',
			);
		});

		it('should order by start_time descending (recent first)', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const officeId = '12345678-1234-1234-8234-123456789031';
			const serviceTypeId = 'life-support';

			mockSupabase._mockQuery.limit.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findPastAssignedStaffIdsByClient(
				clientId,
				officeId,
				serviceTypeId,
				10,
			);

			// 直近担当優先（start_time 降順）
			expect(mockSupabase._mockQuery.order).toHaveBeenCalledWith('start_time', {
				ascending: false,
			});
		});

		it('should return empty array if no shifts found', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const officeId = '12345678-1234-1234-8234-123456789031';
			const serviceTypeId = 'life-support';

			mockSupabase._mockQuery.limit.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			const result = await repository.findPastAssignedStaffIdsByClient(
				clientId,
				officeId,
				serviceTypeId,
				3,
			);

			expect(result).toEqual([]);
		});

		it('should throw error if query fails', async () => {
			const error = new Error('Query failed');
			mockSupabase._mockQuery.limit.mockResolvedValueOnce({
				data: null,
				error,
			});

			await expect(
				repository.findPastAssignedStaffIdsByClient(
					'client-1',
					'office-1',
					'life-support',
					3,
				),
			).rejects.toThrow('Query failed');
		});

		it('should use default limit of 10 when not specified', async () => {
			const clientId = '12345678-1234-1234-8234-123456789002';
			const officeId = '12345678-1234-1234-8234-123456789031';
			const serviceTypeId = 'life-support';

			mockSupabase._mockQuery.limit.mockResolvedValueOnce({
				data: [],
				error: null,
			});

			await repository.findPastAssignedStaffIdsByClient(
				clientId,
				officeId,
				serviceTypeId,
			);

			// デフォルト limit = 10
			expect(mockSupabase._mockQuery.limit).toHaveBeenCalled();
		});
	});
});

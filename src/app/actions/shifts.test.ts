import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import type { CreateOneOffShiftActionInput } from '@/models/shiftActionSchemas';
import { TEST_IDS, createTestId } from '@/test/helpers/testIds';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
	cancelShiftAction,
	changeShiftStaffAction,
	createOneOffShiftAction,
	restoreShiftAction,
	updateShiftScheduleAction,
	validateStaffAvailabilityAction,
} from './shifts';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/shiftService', async () => {
	const actual = await vi.importActual<
		typeof import('@/backend/services/shiftService')
	>('@/backend/services/shiftService');
	return {
		...actual,
		ShiftService: vi.fn(),
	};
});

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
};

const createMockService = () => ({
	changeStaffAssignment: vi.fn(),
	cancelShift: vi.fn(),
	restoreShift: vi.fn(),
	validateStaffAvailability: vi.fn(),
	createOneOffShift: vi.fn(),
	updateShiftSchedule: vi.fn(),
});

type MockService = ReturnType<typeof createMockService>;
let mockService: MockService;

beforeEach(() => {
	vi.clearAllMocks();
	mockService = createMockService();
	mockSupabase.auth.getUser.mockReset();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	(ShiftService as unknown as Mock).mockImplementation(function () {
		return mockService;
	});
});

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({
		data: { user: { id: userId } },
		error: null,
	});
};

describe('changeShiftStaffAction', () => {
	const validInput = {
		shiftId: '12345678-1234-1234-8234-123456789abc',
		newStaffId: '12345678-1234-1234-8234-123456789def',
		reason: '担当者変更の理由',
	};

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await changeShiftStaffAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.changeStaffAssignment).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（shiftIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await changeShiftStaffAction({
			...validInput,
			shiftId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.changeStaffAssignment).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（newStaffIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await changeShiftStaffAction({
			...validInput,
			newStaffId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.changeStaffAssignment).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する（404）', async () => {
		mockAuthUser('user-1');
		mockService.changeStaffAssignment.mockRejectedValue(
			new ServiceError(404, 'Shift not found'),
		);

		const result = await changeShiftStaffAction(validInput);

		expect(result.status).toBe(404);
		expect(result.error).toBe('Shift not found');
	});

	it('ServiceErrorを委譲する（403）', async () => {
		mockAuthUser('user-1');
		mockService.changeStaffAssignment.mockRejectedValue(
			new ServiceError(403, 'Forbidden'),
		);

		const result = await changeShiftStaffAction(validInput);

		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
	});

	it('担当者変更に成功し、変更前後の名前を返す', async () => {
		mockAuthUser('user-1');
		mockService.changeStaffAssignment.mockResolvedValue({
			oldStaffName: '山田太郎',
			newStaffName: '鈴木花子',
		});

		const result = await changeShiftStaffAction(validInput);

		expect(mockService.changeStaffAssignment).toHaveBeenCalledWith(
			'user-1',
			validInput.shiftId,
			validInput.newStaffId,
			validInput.reason,
		);
		expect(result).toEqual({
			data: { oldStaffName: '山田太郎', newStaffName: '鈴木花子' },
			error: null,
			status: 200,
		});
	});

	it('reasonが未指定でも動作する', async () => {
		mockAuthUser('user-1');
		mockService.changeStaffAssignment.mockResolvedValue({
			oldStaffName: '山田太郎',
			newStaffName: '鈴木花子',
		});

		const result = await changeShiftStaffAction({
			shiftId: validInput.shiftId,
			newStaffId: validInput.newStaffId,
		});

		expect(mockService.changeStaffAssignment).toHaveBeenCalledWith(
			'user-1',
			validInput.shiftId,
			validInput.newStaffId,
			undefined,
		);
		expect(result.status).toBe(200);
	});
});

describe('cancelShiftAction', () => {
	const validInput = {
		shiftId: '12345678-1234-1234-8234-123456789abc',
		reason: 'クライアントの都合により',
		category: 'client' as const,
	};

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await cancelShiftAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.cancelShift).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（shiftIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await cancelShiftAction({
			...validInput,
			shiftId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.cancelShift).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（reasonが空）', async () => {
		mockAuthUser('user-1');

		const result = await cancelShiftAction({
			...validInput,
			reason: '',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.cancelShift).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（categoryが不正）', async () => {
		mockAuthUser('user-1');

		const result = await cancelShiftAction({
			...validInput,
			category: 'invalid_category' as any,
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.cancelShift).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する（404）', async () => {
		mockAuthUser('user-1');
		mockService.cancelShift.mockRejectedValue(
			new ServiceError(404, 'Shift not found'),
		);

		const result = await cancelShiftAction(validInput);

		expect(result.status).toBe(404);
		expect(result.error).toBe('Shift not found');
	});

	it('ServiceErrorを委譲する（400 - completed shift）', async () => {
		mockAuthUser('user-1');
		mockService.cancelShift.mockRejectedValue(
			new ServiceError(400, 'Completed shift cannot be canceled'),
		);

		const result = await cancelShiftAction(validInput);

		expect(result.status).toBe(400);
		expect(result.error).toBe('Completed shift cannot be canceled');
	});

	it('キャンセルに成功する', async () => {
		mockAuthUser('user-1');
		mockService.cancelShift.mockResolvedValue(undefined);

		const result = await cancelShiftAction(validInput);

		expect(mockService.cancelShift).toHaveBeenCalledWith(
			'user-1',
			validInput.shiftId,
			validInput.reason,
			validInput.category,
		);
		expect(result).toEqual({
			data: null,
			error: null,
			status: 200,
		});
	});
});

describe('updateShiftScheduleAction', () => {
	const authUserId = createTestId();
	const validInput = {
		shiftId: createTestId(),
		staffId: TEST_IDS.STAFF_1,
		dateStr: '2026-02-22',
		startTimeStr: '09:00',
		endTimeStr: '10:00',
		reason: '変更理由',
	};

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await updateShiftScheduleAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.updateShiftSchedule).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（shiftIdが不正）', async () => {
		mockAuthUser(createTestId());

		const result = await updateShiftScheduleAction({
			...validInput,
			shiftId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.updateShiftSchedule).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（dateStrが不正）', async () => {
		mockAuthUser(createTestId());

		const result = await updateShiftScheduleAction({
			...validInput,
			dateStr: '2026/02/22',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.updateShiftSchedule).not.toHaveBeenCalled();
	});

	it('更新に成功し shiftId を返す', async () => {
		mockAuthUser(authUserId);
		mockService.updateShiftSchedule.mockResolvedValue({
			shiftId: validInput.shiftId,
		});

		const result = await updateShiftScheduleAction(validInput);

		expect(mockService.updateShiftSchedule).toHaveBeenCalledWith(
			authUserId,
			validInput.shiftId,
			expect.any(Date),
			expect.any(Date),
			validInput.staffId,
			validInput.reason,
		);
		expect(result).toEqual({
			data: { shiftId: validInput.shiftId },
			error: null,
			status: 200,
		});
	});
});

describe('createOneOffShiftAction', () => {
	const validInput = {
		weekStartDate: '2026-02-16',
		client_id: TEST_IDS.CLIENT_1,
		service_type_id: 'physical-care' as const,
		staff_id: TEST_IDS.STAFF_1,
		date: '2026-02-19',
		start_time: { hour: 9, minute: 0 },
		end_time: { hour: 10, minute: 0 },
	} satisfies CreateOneOffShiftActionInput;

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await createOneOffShiftAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.createOneOffShift).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（client_idが不正）', async () => {
		mockAuthUser(createTestId());
		const result = await createOneOffShiftAction({
			...validInput,
			client_id: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.createOneOffShift).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（start_time >= end_time）', async () => {
		mockAuthUser(createTestId());
		const result = await createOneOffShiftAction({
			...validInput,
			start_time: { hour: 10, minute: 0 },
			end_time: { hour: 10, minute: 0 },
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.createOneOffShift).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（週外の日付）', async () => {
		mockAuthUser(createTestId());
		const result = await createOneOffShiftAction({
			...validInput,
			date: '2026-02-23',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.createOneOffShift).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する（409）', async () => {
		mockAuthUser(createTestId());
		mockService.createOneOffShift.mockRejectedValue(
			new ServiceError(409, 'Shift already exists'),
		);

		const result = await createOneOffShiftAction(validInput);
		expect(result.status).toBe(409);
		expect(result.error).toBe('Shift already exists');
	});

	it('作成に成功し、ShiftRecord を返す', async () => {
		const userId = createTestId();
		mockAuthUser(userId);
		const now = new Date('2026-02-19T00:00:00Z');
		mockService.createOneOffShift.mockResolvedValue({
			id: createTestId(),
			client_id: validInput.client_id,
			service_type_id: validInput.service_type_id,
			staff_id: validInput.staff_id,
			date: new Date(validInput.date),
			time: { start: validInput.start_time, end: validInput.end_time },
			status: 'scheduled',
			is_unassigned: false,
			created_at: now,
			updated_at: now,
		});

		const result = await createOneOffShiftAction(validInput);

		expect(mockService.createOneOffShift).toHaveBeenCalledWith(userId, {
			client_id: validInput.client_id,
			service_type_id: validInput.service_type_id,
			staff_id: validInput.staff_id,
			date: expect.any(Date),
			start_time: validInput.start_time,
			end_time: validInput.end_time,
		});
		expect(result.status).toBe(201);
		expect(result.data?.client_id).toBe(validInput.client_id);
	});
});

describe('restoreShiftAction', () => {
	const validInput = {
		shiftId: '12345678-1234-1234-8234-123456789abc',
	};

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await restoreShiftAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.restoreShift).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（shiftIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await restoreShiftAction({
			shiftId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.restoreShift).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する（404）', async () => {
		mockAuthUser('user-1');
		mockService.restoreShift.mockRejectedValue(
			new ServiceError(404, 'Shift not found'),
		);

		const result = await restoreShiftAction(validInput);

		expect(result.status).toBe(404);
		expect(result.error).toBe('Shift not found');
	});

	it('ServiceErrorを委譲する（400 - shift is not canceled）', async () => {
		mockAuthUser('user-1');
		mockService.restoreShift.mockRejectedValue(
			new ServiceError(400, 'Shift is not canceled'),
		);

		const result = await restoreShiftAction(validInput);

		expect(result.status).toBe(400);
		expect(result.error).toBe('Shift is not canceled');
	});

	it('復元に成功する', async () => {
		mockAuthUser('user-1');
		mockService.restoreShift.mockResolvedValue(undefined);

		const result = await restoreShiftAction(validInput);

		expect(mockService.restoreShift).toHaveBeenCalledWith(
			'user-1',
			validInput.shiftId,
		);
		expect(result).toEqual({
			data: null,
			error: null,
			status: 200,
		});
	});
});

describe('validateStaffAvailabilityAction', () => {
	const validInput = {
		staffId: '12345678-1234-1234-8234-123456789abc',
		startTime: '2026-01-21T00:00:00.000Z',
		endTime: '2026-01-21T03:00:00.000Z',
		excludeShiftId: '12345678-1234-1234-8234-123456789def',
	};

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await validateStaffAvailabilityAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.validateStaffAvailability).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（staffIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await validateStaffAvailabilityAction({
			...validInput,
			staffId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.validateStaffAvailability).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（excludeShiftIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await validateStaffAvailabilityAction({
			...validInput,
			excludeShiftId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.validateStaffAvailability).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する', async () => {
		mockAuthUser('user-1');
		mockService.validateStaffAvailability.mockRejectedValue(
			new ServiceError(404, 'Staff not found'),
		);

		const result = await validateStaffAvailabilityAction(validInput);

		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});

	it('重複がない場合にavailable=trueを返す', async () => {
		mockAuthUser('user-1');
		mockService.validateStaffAvailability.mockResolvedValue({
			available: true,
		});

		const result = await validateStaffAvailabilityAction(validInput);

		expect(mockService.validateStaffAvailability).toHaveBeenCalledWith(
			validInput.staffId,
			new Date(validInput.startTime),
			new Date(validInput.endTime),
			validInput.excludeShiftId,
		);
		expect(result).toEqual({
			data: { available: true },
			error: null,
			status: 200,
		});
	});

	it('重複がある場合にavailable=falseと重複シフトを返す', async () => {
		mockAuthUser('user-1');
		const conflictingShifts = [
			{
				id: '12345678-1234-1234-8234-111111111111',
				clientId: '12345678-1234-1234-8234-222222222222',
				clientName: '田中様',
				date: new Date('2026-01-21'),
				startTime: new Date('2026-01-21T01:00:00.000Z'),
				endTime: new Date('2026-01-21T04:00:00.000Z'),
			},
		];
		mockService.validateStaffAvailability.mockResolvedValue({
			available: false,
			conflictingShifts,
		});

		const result = await validateStaffAvailabilityAction(validInput);

		expect(result.status).toBe(200);
		expect(result.data?.available).toBe(false);
		expect(result.data?.conflictingShifts).toBeDefined();
		expect(result.data?.conflictingShifts?.length).toBe(1);
		expect(result.data?.conflictingShifts?.[0].clientName).toBe('田中様');
	});

	it('excludeShiftIdが未指定でも動作する', async () => {
		mockAuthUser('user-1');
		mockService.validateStaffAvailability.mockResolvedValue({
			available: true,
		});

		const { excludeShiftId: _, ...inputWithoutExclude } = validInput;
		const result = await validateStaffAvailabilityAction(inputWithoutExclude);

		expect(mockService.validateStaffAvailability).toHaveBeenCalledWith(
			validInput.staffId,
			new Date(validInput.startTime),
			new Date(validInput.endTime),
			undefined,
		);
		expect(result.status).toBe(200);
	});
});

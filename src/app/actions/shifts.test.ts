import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
	cancelShiftAction,
	changeShiftStaffAction,
	restoreShiftAction,
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

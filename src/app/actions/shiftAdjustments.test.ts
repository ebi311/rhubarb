import {
	ServiceError,
	ShiftAdjustmentSuggestionService,
} from '@/backend/services/shiftAdjustmentSuggestionService';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { suggestShiftAdjustmentsAction } from './shiftAdjustments';

vi.mock('@/utils/supabase/server');
vi.mock('@/backend/services/shiftAdjustmentSuggestionService', async () => {
	const actual = await vi.importActual<
		typeof import('@/backend/services/shiftAdjustmentSuggestionService')
	>('@/backend/services/shiftAdjustmentSuggestionService');
	return {
		...actual,
		ShiftAdjustmentSuggestionService: vi.fn(),
	};
});

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
};

const createMockService = () => ({
	suggestShiftAdjustments: vi.fn(),
});

type MockService = ReturnType<typeof createMockService>;
let mockService: MockService;

beforeEach(() => {
	vi.clearAllMocks();
	mockService = createMockService();
	mockSupabase.auth.getUser.mockReset();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	(ShiftAdjustmentSuggestionService as unknown as Mock).mockImplementation(
		function () {
			return mockService;
		},
	);
});

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({
		data: { user: { id: userId } },
		error: null,
	});
};

describe('suggestShiftAdjustmentsAction', () => {
	const validInput = {
		staffId: '12345678-1234-1234-8234-123456789abc',
		startDate: '2026-02-22',
		endDate: '2026-02-28',
		memo: '急休',
	};

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await suggestShiftAdjustmentsAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.suggestShiftAdjustments).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（staffIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await suggestShiftAdjustmentsAction({
			...validInput,
			staffId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(mockService.suggestShiftAdjustments).not.toHaveBeenCalled();
	});

	it('ServiceErrorを委譲する（403）', async () => {
		mockAuthUser('user-1');
		mockService.suggestShiftAdjustments.mockRejectedValue(
			new ServiceError(403, 'Forbidden'),
		);

		const result = await suggestShiftAdjustmentsAction(validInput);

		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
	});

	it('ServiceErrorを委譲する（404）', async () => {
		mockAuthUser('user-1');
		mockService.suggestShiftAdjustments.mockRejectedValue(
			new ServiceError(404, 'Staff not found'),
		);

		const result = await suggestShiftAdjustmentsAction(validInput);

		expect(result.status).toBe(404);
		expect(result.error).toBe('Staff not found');
	});

	it('提案取得に成功し、結果を返す', async () => {
		mockAuthUser('user-1');
		mockService.suggestShiftAdjustments.mockResolvedValue({
			absence: {
				staffId: validInput.staffId,
				startDate: new Date('2026-02-22T00:00:00+09:00'),
				endDate: new Date('2026-02-28T00:00:00+09:00'),
				memo: validInput.memo,
			},
			affected: [],
		});

		const result = await suggestShiftAdjustmentsAction(validInput);

		expect(mockService.suggestShiftAdjustments).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({
				staffId: validInput.staffId,
				memo: validInput.memo,
			}),
		);
		expect(result.status).toBe(200);
		expect(result.error).toBeNull();
		expect(result.data?.affected).toEqual([]);
	});
});

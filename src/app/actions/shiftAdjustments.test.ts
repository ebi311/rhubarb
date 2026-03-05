import {
	ServiceError,
	ShiftAdjustmentSuggestionService,
} from '@/backend/services/shiftAdjustmentSuggestionService';
import { TEST_IDS } from '@/test/helpers/testIds';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { suggestStaffAbsenceAdjustmentsAction } from './shiftAdjustments';

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
	suggestStaffAbsenceAdjustments: vi.fn(),
});

type MockService = ReturnType<typeof createMockService>;
let mockService: MockService;

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
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

describe('legacy export', () => {
	it('旧 suggestShiftAdjustmentsAction を公開しない', async () => {
		const shiftAdjustmentsModule = await import('./shiftAdjustments');

		expect('suggestShiftAdjustmentsAction' in shiftAdjustmentsModule).toBe(
			false,
		);
	});

	it('旧 suggestClientDatetimeChangeAdjustmentsAction を公開しない', async () => {
		const shiftAdjustmentsModule = await import('./shiftAdjustments');

		expect(
			'suggestClientDatetimeChangeAdjustmentsAction' in shiftAdjustmentsModule,
		).toBe(false);
	});
});

describe('suggestStaffAbsenceAdjustmentsAction', () => {
	const validInput = {
		staffId: TEST_IDS.STAFF_1,
		startDate: '2026-02-22',
		endDate: '2026-02-22',
		memo: '子どもの発熱により急休',
	};

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await suggestStaffAbsenceAdjustmentsAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(mockService.suggestStaffAbsenceAdjustments).not.toHaveBeenCalled();
	});

	it('バリデーションエラーは400を返す（staffIdが不正）', async () => {
		mockAuthUser('user-1');

		const result = await suggestStaffAbsenceAdjustmentsAction({
			...validInput,
			staffId: 'invalid-uuid',
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(result.details).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					path: ['staffId'],
					code: 'invalid_format',
				}),
			]),
		);
		expect(mockService.suggestStaffAbsenceAdjustments).not.toHaveBeenCalled();
	});

	it('ServiceError(500)はdetailsを返さない', async () => {
		mockAuthUser('user-1');
		mockService.suggestStaffAbsenceAdjustments.mockRejectedValue(
			new ServiceError(500, 'Internal Server Error', { reason: 'sensitive' }),
		);

		const result = await suggestStaffAbsenceAdjustmentsAction(validInput);

		expect(result.status).toBe(500);
		expect(result.error).toBe('Internal Server Error');
		expect(result).not.toHaveProperty('details');
	});

	it('ServiceError(503)はdetailsを返さない', async () => {
		mockAuthUser('user-1');
		mockService.suggestStaffAbsenceAdjustments.mockRejectedValue(
			new ServiceError(503, 'Service Unavailable', { reason: 'sensitive' }),
		);

		const result = await suggestStaffAbsenceAdjustmentsAction(validInput);

		expect(result.status).toBe(503);
		expect(result.error).toBe('Service Unavailable');
		expect(result).not.toHaveProperty('details');
	});

	it('提案取得に成功し、結果を返す', async () => {
		mockAuthUser('user-1');
		mockService.suggestStaffAbsenceAdjustments.mockResolvedValue({
			absence: {
				staffId: validInput.staffId,
				startDate: new Date('2026-02-22T00:00:00+09:00'),
				endDate: new Date('2026-02-22T00:00:00+09:00'),
				memo: validInput.memo,
			},
			affected: [
				{
					shift: {
						id: TEST_IDS.SCHEDULE_1,
						client_id: TEST_IDS.CLIENT_1,
						service_type_id: 'life-support',
						staff_id: TEST_IDS.STAFF_1,
						date: new Date('2026-02-22T00:00:00+09:00'),
						start_time: { hour: 9, minute: 0 },
						end_time: { hour: 10, minute: 0 },
						status: 'scheduled',
					},
					suggestions: [
						{
							operations: [
								{
									type: 'change_staff',
									shift_id: TEST_IDS.SCHEDULE_1,
									from_staff_id: TEST_IDS.STAFF_1,
									to_staff_id: TEST_IDS.STAFF_2,
								},
							],
							rationale: [{ code: 'available', message: '時間重複なし' }],
						},
					],
				},
			],
		});

		const result = await suggestStaffAbsenceAdjustmentsAction(validInput);

		expect(mockService.suggestStaffAbsenceAdjustments).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({
				staffId: validInput.staffId,
				memo: validInput.memo,
			}),
		);
		expect(result.status).toBe(200);
		expect(result.error).toBeNull();
		expect(result.data?.affected).toHaveLength(1);
	});
});

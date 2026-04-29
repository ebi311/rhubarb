import { AiOperationLogService } from '@/backend/services/aiOperationLogService';
import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import { TEST_IDS } from '@/test/helpers/testIds';
import { createSupabaseClient } from '@/utils/supabase/server';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
	type Mock,
} from 'vitest';
import { executeAiChatMutationBatchAction } from './aiChatMutationBatch';
import { logServerError } from './utils/actionResult';

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
vi.mock('@/backend/services/aiOperationLogService', async () => {
	const actual = await vi.importActual<
		typeof import('@/backend/services/aiOperationLogService')
	>('@/backend/services/aiOperationLogService');
	return {
		...actual,
		AiOperationLogService: vi.fn(),
	};
});
vi.mock('./utils/actionResult', async () => {
	const actual = await vi.importActual<typeof import('./utils/actionResult')>(
		'./utils/actionResult',
	);
	return {
		...actual,
		logServerError: vi.fn(),
	};
});

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
};

const createMockShiftService = () => ({
	executeAiChatMutationBatchProposal: vi.fn(),
	findActorOfficeId: vi.fn(),
});

const createMockAiOperationLogService = () => ({
	logSilently: vi.fn(),
});

type MockShiftService = ReturnType<typeof createMockShiftService>;
type MockAiOperationLogService = ReturnType<
	typeof createMockAiOperationLogService
>;

let mockShiftService: MockShiftService;
let mockAiOperationLogService: MockAiOperationLogService;

const validInput = {
	proposals: [
		{
			type: 'change_shift_staff' as const,
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '担当者変更',
		},
		{
			type: 'update_shift_time' as const,
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-04-01T09:00:00+09:00',
			endAt: '2026-04-01T10:00:00+09:00',
			reason: '時間変更',
		},
	],
	allowlist: {
		shiftIds: [TEST_IDS.SCHEDULE_1, TEST_IDS.SCHEDULE_2],
		staffIds: [TEST_IDS.STAFF_2],
	},
};

const mockAuthUser = (userId: string) => {
	mockSupabase.auth.getUser.mockResolvedValue({
		data: { user: { id: userId } },
		error: null,
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	mockShiftService = createMockShiftService();
	mockAiOperationLogService = createMockAiOperationLogService();
	(createSupabaseClient as Mock).mockResolvedValue(mockSupabase);
	(ShiftService as unknown as Mock).mockImplementation(function () {
		return mockShiftService;
	});
	(AiOperationLogService as unknown as Mock).mockImplementation(function () {
		return mockAiOperationLogService;
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('executeAiChatMutationBatchAction', () => {
	it('admin ユーザーで成功時、200 と監査ログ記録を返す', async () => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.executeAiChatMutationBatchProposal.mockResolvedValue({
			results: [
				{
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					officeId: TEST_IDS.OFFICE_1,
				},
				{
					type: 'update_shift_time',
					shiftId: TEST_IDS.SCHEDULE_1,
					officeId: TEST_IDS.OFFICE_1,
				},
			],
		});

		const result = await executeAiChatMutationBatchAction(validInput);

		expect(result).toEqual({
			data: {
				results: [
					{
						type: 'change_shift_staff',
						shiftId: TEST_IDS.SCHEDULE_1,
						officeId: TEST_IDS.OFFICE_1,
					},
					{
						type: 'update_shift_time',
						shiftId: TEST_IDS.SCHEDULE_1,
						officeId: TEST_IDS.OFFICE_1,
					},
				],
			},
			error: null,
			status: 200,
		});
		expect(
			mockShiftService.executeAiChatMutationBatchProposal,
		).toHaveBeenCalledWith(
			TEST_IDS.USER_1,
			validInput.proposals,
			validInput.allowlist,
		);
		expect(mockAiOperationLogService.logSilently).toHaveBeenCalledTimes(1);
		expect(mockAiOperationLogService.logSilently).toHaveBeenCalledWith(
			expect.objectContaining({
				office_id: TEST_IDS.OFFICE_1,
				actor_user_id: TEST_IDS.USER_1,
				operation_type: 'batch_mutation',
				targets: { shiftIds: [TEST_IDS.SCHEDULE_1] },
				result: { status: 'success' },
			}),
		);
	});

	it('未認証は401を返す', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await executeAiChatMutationBatchAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(
			mockShiftService.executeAiChatMutationBatchProposal,
		).not.toHaveBeenCalled();
		expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
	});

	it('非admin は 403 を返す', async () => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.executeAiChatMutationBatchProposal.mockRejectedValue(
			new ServiceError(403, 'Forbidden'),
		);

		const result = await executeAiChatMutationBatchAction(validInput);

		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
		expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
	});

	it('バリデーションエラー時は400を返す', async () => {
		mockAuthUser(TEST_IDS.USER_1);

		const result = await executeAiChatMutationBatchAction({
			...validInput,
			proposals: [
				{
					...validInput.proposals[0],
					shiftId: 'invalid-uuid',
				},
			],
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(
			mockShiftService.executeAiChatMutationBatchProposal,
		).not.toHaveBeenCalled();
		expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
	});

	it('ServiceError の status/message を返す', async () => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.findActorOfficeId.mockResolvedValue(TEST_IDS.OFFICE_1);
		mockShiftService.executeAiChatMutationBatchProposal.mockRejectedValue(
			new ServiceError(409, 'Batch contains conflicting proposal'),
		);

		const result = await executeAiChatMutationBatchAction(validInput);

		expect(result.status).toBe(409);
		expect(result.error).toBe('Batch contains conflicting proposal');
	});

	it('results が空の場合は500を返し、logServerErrorを呼ぶ', async () => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.executeAiChatMutationBatchProposal.mockResolvedValue({
			results: [],
		});

		const result = await executeAiChatMutationBatchAction(validInput);

		expect(result).toEqual({
			data: null,
			error: 'No mutation result found',
			status: 500,
		});
		expect(logServerError).toHaveBeenCalledTimes(1);
		expect(logServerError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'No mutation result found' }),
		);
		expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
	});
});

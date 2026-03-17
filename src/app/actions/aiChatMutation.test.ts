import { AiOperationLogService } from '@/backend/services/aiOperationLogService';
import { ServiceError, ShiftService } from '@/backend/services/shiftService';
import { TEST_IDS } from '@/test/helpers/testIds';
import { createSupabaseClient } from '@/utils/supabase/server';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { executeAiChatMutationAction } from './aiChatMutation';

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

const mockSupabase = {
	auth: {
		getUser: vi.fn(),
	},
};

const createMockShiftService = () => ({
	executeAiChatMutationProposal: vi.fn(),
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
	proposal: {
		type: 'change_shift_staff' as const,
		shiftId: TEST_IDS.SCHEDULE_1,
		toStaffId: TEST_IDS.STAFF_2,
		reason: '担当者変更',
	},
	allowlist: {
		shiftIds: [TEST_IDS.SCHEDULE_1],
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

describe('executeAiChatMutationAction', () => {
	it('未認証は401を返し、ログは記録しない', async () => {
		mockSupabase.auth.getUser.mockResolvedValue({
			data: { user: null },
			error: null,
		});

		const result = await executeAiChatMutationAction(validInput);

		expect(result).toEqual({ data: null, error: 'Unauthorized', status: 401 });
		expect(
			mockShiftService.executeAiChatMutationProposal,
		).not.toHaveBeenCalled();
		expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
	});

	it('入力バリデーションエラーは400を返す', async () => {
		mockAuthUser(TEST_IDS.USER_1);

		const result = await executeAiChatMutationAction({
			...validInput,
			proposal: {
				...validInput.proposal,
				shiftId: 'invalid-uuid',
			},
		});

		expect(result.status).toBe(400);
		expect(result.error).toBe('Validation failed');
		expect(
			mockShiftService.executeAiChatMutationProposal,
		).not.toHaveBeenCalled();
		expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
	});

	it.each([
		{ status: 403, message: 'Forbidden' },
		{ status: 400, message: 'Proposal target shift is not allowed' },
		{ status: 409, message: 'Client has conflicting shift' },
	])('ServiceError(%s)を伝播する', async ({ status, message }) => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.findActorOfficeId.mockResolvedValue(TEST_IDS.OFFICE_1);
		mockShiftService.executeAiChatMutationProposal.mockRejectedValue(
			new ServiceError(status, message, { reason: 'details' }),
		);

		const result = await executeAiChatMutationAction(validInput);

		expect(result.status).toBe(status);
		expect(result.error).toBe(message);
		if (status === 403) {
			expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
		} else {
			expect(mockAiOperationLogService.logSilently).toHaveBeenCalledTimes(1);
		}
	});

	it('成功時はlogSilentlyを呼び出す', async () => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.findActorOfficeId.mockResolvedValue(TEST_IDS.OFFICE_1);
		mockShiftService.executeAiChatMutationProposal.mockResolvedValue({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			officeId: TEST_IDS.OFFICE_1,
		});

		const result = await executeAiChatMutationAction(validInput);

		expect(result).toEqual({
			data: {
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				officeId: TEST_IDS.OFFICE_1,
			},
			error: null,
			status: 200,
		});
		expect(mockAiOperationLogService.logSilently).toHaveBeenCalledTimes(1);
		expect(mockAiOperationLogService.logSilently).toHaveBeenCalledWith(
			expect.objectContaining({
				office_id: TEST_IDS.OFFICE_1,
				actor_user_id: TEST_IDS.USER_1,
				operation_type: 'change_shift_staff',
				result: { status: 'success' },
			}),
		);
	});

	it('失敗時(400)はlogSilentlyを呼び出す', async () => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.findActorOfficeId.mockResolvedValue(TEST_IDS.OFFICE_1);
		mockShiftService.executeAiChatMutationProposal.mockRejectedValue(
			new ServiceError(400, 'Proposal target staff is not allowed', {
				reason: 'forbidden staff',
			}),
		);

		const result = await executeAiChatMutationAction(validInput);

		expect(result.status).toBe(400);
		expect(result.error).toBe('Proposal target staff is not allowed');
		expect(mockAiOperationLogService.logSilently).toHaveBeenCalledTimes(1);
		expect(mockAiOperationLogService.logSilently).toHaveBeenCalledWith(
			expect.objectContaining({
				office_id: TEST_IDS.OFFICE_1,
				result: {
					status: 'error',
					error: 'Proposal target staff is not allowed',
					errorStatus: 400,
				},
			}),
		);
	});

	it('ServiceError(403)ではlogSilentlyを呼び出さない', async () => {
		mockAuthUser(TEST_IDS.USER_1);
		mockShiftService.findActorOfficeId.mockResolvedValue(TEST_IDS.OFFICE_1);
		mockShiftService.executeAiChatMutationProposal.mockRejectedValue(
			new ServiceError(403, 'Forbidden'),
		);

		const result = await executeAiChatMutationAction(validInput);

		expect(result.status).toBe(403);
		expect(result.error).toBe('Forbidden');
		expect(mockAiOperationLogService.logSilently).not.toHaveBeenCalled();
	});
});

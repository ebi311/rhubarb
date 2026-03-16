import { AiOperationLogRepository } from '@/backend/repositories/aiOperationLogRepository';
import { TEST_IDS } from '@/test/helpers/testIds';
import { createAdminClient } from '@/utils/supabase/admin';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiOperationLogService } from './aiOperationLogService';

vi.mock('@/utils/supabase/admin', () => ({
	createAdminClient: vi.fn(),
}));

describe('AiOperationLogService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createAdminClient).mockReturnValue({} as never);
	});

	it('log は source を ai_chat に固定して repository に渡す', async () => {
		const repository = {
			create: vi.fn().mockResolvedValue({ id: TEST_IDS.SCHEDULE_1 }),
		} as unknown as AiOperationLogRepository;
		const service = new AiOperationLogService({ repository });

		await service.log({
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			operation_type: 'shift.change_staff',
			targets: { shift_id: TEST_IDS.SCHEDULE_1 },
		});

		expect(repository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				source: 'ai_chat',
				office_id: TEST_IDS.OFFICE_1,
				actor_user_id: TEST_IDS.USER_1,
			}),
		);
	});

	it('repository 未指定時は createAdminClient を使って初期化する', () => {
		new AiOperationLogService();
		expect(createAdminClient).toHaveBeenCalledTimes(1);
	});

	it('logSilently は失敗しても例外を投げない', async () => {
		const repository = {
			create: vi.fn().mockRejectedValue(new Error('failed')),
		} as unknown as AiOperationLogRepository;
		const service = new AiOperationLogService({ repository });
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(
			service.logSilently({
				office_id: TEST_IDS.OFFICE_1,
				actor_user_id: TEST_IDS.USER_1,
				operation_type: 'shift.change_staff',
				targets: {},
			}),
		).resolves.toBeUndefined();
		expect(errorSpy).toHaveBeenCalled();

		errorSpy.mockRestore();
	});
});

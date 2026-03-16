import type { Database } from '@/backend/types/supabase';
import { TEST_IDS } from '@/test/helpers/testIds';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiOperationLogRepository } from './aiOperationLogRepository';

describe('AiOperationLogRepository', () => {
	let supabase: SupabaseClient<Database>;
	let repository: AiOperationLogRepository;

	beforeEach(() => {
		supabase = {
			from: vi.fn(),
		} as unknown as SupabaseClient<Database>;
		repository = new AiOperationLogRepository(supabase);
	});

	it('監査ログを1件作成して返す', async () => {
		const mockSingle = vi.fn().mockResolvedValue({
			data: {
				id: TEST_IDS.SCHEDULE_1,
				office_id: TEST_IDS.OFFICE_1,
				actor_user_id: TEST_IDS.USER_1,
				source: 'ai_chat',
				operation_type: 'shift.change_staff',
				targets: { shift_id: TEST_IDS.SCHEDULE_1 },
				proposal: null,
				request: { reason: '欠勤' },
				result: { success: true },
				created_at: '2026-03-20T00:00:00Z',
			},
			error: null,
		});
		const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

		(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
			insert: mockInsert,
		} as never);

		const input = {
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'ai_chat' as const,
			operation_type: 'shift.change_staff',
			targets: { shift_id: TEST_IDS.SCHEDULE_1 },
			proposal: null,
			request: { reason: '欠勤' },
			result: { success: true },
		};

		const result = await repository.create(input);

		expect(supabase.from).toHaveBeenCalledWith('ai_operation_logs');
		expect(mockInsert).toHaveBeenCalledWith(input);
		expect(result.id).toBe(TEST_IDS.SCHEDULE_1);
		expect(result.created_at).toBeInstanceOf(Date);
	});

	it('insert エラー時は例外を投げる', async () => {
		const mockSingle = vi.fn().mockResolvedValue({
			data: null,
			error: new Error('insert failed'),
		});
		const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
		const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

		(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
			insert: mockInsert,
		} as never);

		await expect(
			repository.create({
				office_id: TEST_IDS.OFFICE_1,
				actor_user_id: TEST_IDS.USER_1,
				source: 'ai_chat',
				operation_type: 'shift.change_staff',
				targets: {},
			}),
		).rejects.toThrow('insert failed');
	});
});

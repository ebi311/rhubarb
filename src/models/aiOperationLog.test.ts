import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import {
	AiOperationLogInputSchema,
	AiOperationLogSchema,
} from './aiOperationLog';

describe('AiOperationLogSchema', () => {
	it('有効な監査ログを受け入れる', () => {
		const result = AiOperationLogSchema.safeParse({
			id: TEST_IDS.SCHEDULE_1,
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'ai_chat',
			operation_type: 'change_shift_staff',
			targets: { shift_id: TEST_IDS.SCHEDULE_1 },
			proposal: { type: 'change_shift_staff' },
			request: { reason: 'test' },
			result: { success: true },
			created_at: '2026-03-20T00:00:00Z',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.created_at).toBeInstanceOf(Date);
		}
	});

	it('proposal/request/result に null を許容する', () => {
		const result = AiOperationLogSchema.safeParse({
			id: TEST_IDS.SCHEDULE_1,
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'ai_chat',
			operation_type: 'change_shift_staff',
			targets: { shift_id: TEST_IDS.SCHEDULE_1 },
			proposal: null,
			request: null,
			result: null,
			created_at: '2026-03-20T00:00:00Z',
		});

		expect(result.success).toBe(true);
	});

	it('source が ai_chat 以外の場合はエラー', () => {
		const result = AiOperationLogSchema.safeParse({
			id: TEST_IDS.SCHEDULE_1,
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'manual',
			operation_type: 'change_shift_staff',
			targets: {},
			created_at: '2026-03-20T00:00:00Z',
		});

		expect(result.success).toBe(false);
	});

	it('targets が null の場合はエラー', () => {
		const result = AiOperationLogSchema.safeParse({
			id: TEST_IDS.SCHEDULE_1,
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'ai_chat',
			operation_type: 'change_shift_staff',
			targets: null,
			created_at: '2026-03-20T00:00:00Z',
		});

		expect(result.success).toBe(false);
	});
});

describe('AiOperationLogInputSchema', () => {
	it('proposal/request/result に null を許容する', () => {
		const result = AiOperationLogInputSchema.safeParse({
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'ai_chat',
			operation_type: 'change_shift_staff',
			targets: { shift_id: TEST_IDS.SCHEDULE_1 },
			proposal: null,
			request: null,
			result: null,
		});

		expect(result.success).toBe(true);
	});

	it('proposal/request/result 省略でも有効', () => {
		const result = AiOperationLogInputSchema.safeParse({
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'ai_chat',
			operation_type: 'change_shift_staff',
			targets: { shift_id: TEST_IDS.SCHEDULE_1 },
		});

		expect(result.success).toBe(true);
	});

	it('actor_user_id が UUID でない場合はエラー', () => {
		const result = AiOperationLogInputSchema.safeParse({
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: 'invalid',
			source: 'ai_chat',
			operation_type: 'change_shift_staff',
			targets: {},
		});

		expect(result.success).toBe(false);
	});

	it('targets が null の場合はエラー', () => {
		const result = AiOperationLogInputSchema.safeParse({
			office_id: TEST_IDS.OFFICE_1,
			actor_user_id: TEST_IDS.USER_1,
			source: 'ai_chat',
			operation_type: 'change_shift_staff',
			targets: null,
		});

		expect(result.success).toBe(false);
	});
});

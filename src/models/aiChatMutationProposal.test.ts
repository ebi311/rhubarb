import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import { AiChatMutationProposalSchema } from './aiChatMutationProposal';

describe('AiChatMutationProposalSchema', () => {
	it('change_shift_staff proposal を受け入れる', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '当日欠勤のため',
		});

		expect(result.success).toBe(true);
	});

	it('update_shift_time proposal を受け入れる', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T09:00:00+09:00',
			endAt: '2026-03-16T10:00:00+09:00',
			reason: '利用者都合',
		});

		expect(result.success).toBe(true);
	});

	it('update_shift_time proposal は UTC の Z 指定も受け入れる', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T00:00:00Z',
			endAt: '2026-03-16T01:00:00Z',
			reason: '利用者都合',
		});

		expect(result.success).toBe(true);
	});

	it('update_shift_time で startAt が endAt 以降の場合はエラー', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T10:00:00+09:00',
			endAt: '2026-03-16T09:00:00+09:00',
		});

		expect(result.success).toBe(false);
	});

	it('shiftId が uuid でない場合はエラー', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'change_shift_staff',
			shiftId: 'invalid-uuid',
			toStaffId: TEST_IDS.STAFF_2,
		});

		expect(result.success).toBe(false);
	});

	it('startAt/endAt が ISO datetime でない場合はエラー', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16 09:00:00',
			endAt: 'not-a-date',
		});

		expect(result.success).toBe(false);
	});

	it('update_shift_time でタイムゾーンオフセット無しはエラー', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T09:00:00',
			endAt: '2026-03-16T10:00:00',
		});

		expect(result.success).toBe(false);
	});

	it('未定義の type はエラー', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'unsupported_type',
			shiftId: TEST_IDS.SCHEDULE_1,
		});

		expect(result.success).toBe(false);
	});
});

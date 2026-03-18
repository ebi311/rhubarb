import { TEST_IDS, createTestId } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import {
	ALLOWLIST_MAX_SHIFT_IDS,
	ALLOWLIST_MAX_STAFF_IDS,
	AiChatMutationProposalSchema,
	ExecuteAiChatMutationInputSchema,
	ProposalAllowlistSchema,
} from './aiChatMutationProposal';

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

	it('change_shift_staff で reason が空白のみの場合はエラー', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '   ',
		});

		expect(result.success).toBe(false);
	});

	it('update_shift_time で reason が空白のみの場合はエラー', () => {
		const result = AiChatMutationProposalSchema.safeParse({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T09:00:00+09:00',
			endAt: '2026-03-16T10:00:00+09:00',
			reason: '   ',
		});

		expect(result.success).toBe(false);
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

describe('ProposalAllowlistSchema', () => {
	it('shiftIds が空配列の場合はエラー', () => {
		const result = ProposalAllowlistSchema.safeParse({
			shiftIds: [],
			staffIds: [TEST_IDS.STAFF_1],
		});

		expect(result.success).toBe(false);
	});

	it('shiftIds が上限を超える場合はエラー', () => {
		const result = ProposalAllowlistSchema.safeParse({
			shiftIds: Array.from({ length: ALLOWLIST_MAX_SHIFT_IDS + 1 }, () =>
				createTestId(),
			),
		});

		expect(result.success).toBe(false);
	});

	it('staffIds が上限を超える場合はエラー', () => {
		const result = ProposalAllowlistSchema.safeParse({
			shiftIds: [TEST_IDS.SCHEDULE_1],
			staffIds: Array.from({ length: ALLOWLIST_MAX_STAFF_IDS + 1 }, () =>
				createTestId(),
			),
		});

		expect(result.success).toBe(false);
	});
});

describe('ExecuteAiChatMutationInputSchema', () => {
	it('change_shift_staff で allowlist.staffIds が undefined の場合はエラー', () => {
		const result = ExecuteAiChatMutationInputSchema.safeParse({
			proposal: {
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
			},
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1],
			},
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						path: ['allowlist', 'staffIds'],
					}),
				]),
			);
		}
	});

	it('change_shift_staff で allowlist.staffIds が空配列の場合はエラー', () => {
		const result = ExecuteAiChatMutationInputSchema.safeParse({
			proposal: {
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
			},
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1],
				staffIds: [],
			},
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						path: ['allowlist', 'staffIds'],
					}),
				]),
			);
		}
	});
});

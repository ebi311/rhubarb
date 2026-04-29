import { TEST_IDS, createTestId } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import {
	ALLOWLIST_MAX_SHIFT_IDS,
	ALLOWLIST_MAX_STAFF_IDS,
	AiChatMutationBatchProposalSchema,
	AiChatMutationProposalSchema,
	BATCH_PROPOSAL_MAX_COUNT,
	ExecuteAiChatMutationBatchInputSchema,
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

	it('staffIds が空配列の場合はエラー', () => {
		const result = ProposalAllowlistSchema.safeParse({
			shiftIds: [TEST_IDS.SCHEDULE_1],
			staffIds: [],
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
	it('change_shift_staff + allowlist.staffIds ありの正常系を受け入れる', () => {
		const result = ExecuteAiChatMutationInputSchema.safeParse({
			proposal: {
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
			},
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1],
				staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
			},
		});

		expect(result.success).toBe(true);
	});

	it('update_shift_time + allowlist.staffIds なしの正常系を受け入れる', () => {
		const result = ExecuteAiChatMutationInputSchema.safeParse({
			proposal: {
				type: 'update_shift_time',
				shiftId: TEST_IDS.SCHEDULE_1,
				startAt: '2026-03-16T09:00:00+09:00',
				endAt: '2026-03-16T10:00:00+09:00',
			},
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1],
			},
		});

		expect(result.success).toBe(true);
	});

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

	it('change_shift_staff で allowlist.staffIds が空配列の場合は min(1) のみでエラー', () => {
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
			expect(
				result.error.issues.some(
					(issue) => issue.message === 'allowlist.staffIds must not be empty',
				),
			).toBe(false);
		}
	});
});

describe('AiChatMutationBatchProposalSchema', () => {
	it('proposals が 1..max 件の場合は受け入れる', () => {
		const result = AiChatMutationBatchProposalSchema.safeParse({
			proposals: Array.from({ length: BATCH_PROPOSAL_MAX_COUNT }, () => ({
				type: 'update_shift_time' as const,
				shiftId: createTestId(),
				startAt: '2026-03-16T09:00:00+09:00',
				endAt: '2026-03-16T10:00:00+09:00',
			})),
		});

		expect(result.success).toBe(true);
	});

	it('proposals が 0 件の場合はエラー', () => {
		const result = AiChatMutationBatchProposalSchema.safeParse({
			proposals: [],
		});

		expect(result.success).toBe(false);
	});

	it('proposals が max を超える場合はエラー', () => {
		const result = AiChatMutationBatchProposalSchema.safeParse({
			proposals: Array.from({ length: BATCH_PROPOSAL_MAX_COUNT + 1 }, () => ({
				type: 'change_shift_staff' as const,
				shiftId: createTestId(),
				toStaffId: createTestId(),
			})),
		});

		expect(result.success).toBe(false);
	});
});

describe('ExecuteAiChatMutationBatchInputSchema', () => {
	it('change_shift_staff + valid allowlist.staffIds の正常系を受け入れる', () => {
		const result = ExecuteAiChatMutationBatchInputSchema.safeParse({
			proposals: [
				{
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_2,
				},
			],
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1],
				staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
			},
		});

		expect(result.success).toBe(true);
	});

	it('mixed proposals の正常系を受け入れる', () => {
		const result = ExecuteAiChatMutationBatchInputSchema.safeParse({
			proposals: [
				{
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_2,
				},
				{
					type: 'update_shift_time',
					shiftId: TEST_IDS.SCHEDULE_2,
					startAt: '2026-03-16T11:00:00+09:00',
					endAt: '2026-03-16T12:00:00+09:00',
				},
			],
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1, TEST_IDS.SCHEDULE_2],
				staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
			},
		});

		expect(result.success).toBe(true);
	});

	it('change_shift_staff を含まない場合は allowlist.staffIds が無くても受け入れる', () => {
		const result = ExecuteAiChatMutationBatchInputSchema.safeParse({
			proposals: [
				{
					type: 'update_shift_time',
					shiftId: TEST_IDS.SCHEDULE_1,
					startAt: '2026-03-16T09:00:00+09:00',
					endAt: '2026-03-16T10:00:00+09:00',
				},
			],
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1],
			},
		});

		expect(result.success).toBe(true);
	});

	it('change_shift_staff を含む場合は allowlist.staffIds が必須', () => {
		const result = ExecuteAiChatMutationBatchInputSchema.safeParse({
			proposals: [
				{
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_2,
				},
			],
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

	it('change_shift_staff を含む場合は allowlist.staffIds 空配列で min(1) のみエラー', () => {
		const result = ExecuteAiChatMutationBatchInputSchema.safeParse({
			proposals: [
				{
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
					toStaffId: TEST_IDS.STAFF_2,
				},
			],
			allowlist: {
				shiftIds: [TEST_IDS.SCHEDULE_1],
				staffIds: [],
			},
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some(
					(issue) => issue.message === 'allowlist.staffIds must not be empty',
				),
			).toBe(false);
		}
	});
});

import { TEST_IDS } from '@/test/helpers/testIds';
import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { extractProposalFromParts } from './extractProposalFromParts';

describe('extractProposalFromParts', () => {
	const allowlist = {
		shiftIds: [TEST_IDS.SCHEDULE_1],
		staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
	};

	const createDynamicToolPart = (
		output: unknown,
	): UIMessage['parts'][number] => ({
		type: 'dynamic-tool',
		toolName: 'proposeShiftChange',
		toolCallId: 'call_1',
		state: 'output-available',
		input: {},
		output,
	});

	it('change_shift_staff の tool output から proposal を返す', () => {
		const parts: UIMessage['parts'] = [
			createDynamicToolPart({
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
				reason: '欠勤対応',
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toEqual({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '欠勤対応',
		});
	});

	it('update_shift_time の tool output から proposal を返す', () => {
		const parts: UIMessage['parts'] = [
			createDynamicToolPart({
				type: 'update_shift_time',
				shiftId: TEST_IDS.SCHEDULE_1,
				startAt: '2026-03-16T09:00:00+09:00',
				endAt: '2026-03-16T10:00:00+09:00',
				reason: '利用者都合',
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toEqual({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T09:00:00+09:00',
			endAt: '2026-03-16T10:00:00+09:00',
			reason: '利用者都合',
		});
	});

	it('tool パートが無い場合は null', () => {
		const parts: UIMessage['parts'] = [{ type: 'text', text: '提案なし' }];

		expect(extractProposalFromParts(parts, allowlist)).toBeNull();
	});

	it('state が output-available でない場合は null', () => {
		const parts: UIMessage['parts'] = [
			{
				type: 'dynamic-tool',
				toolName: 'proposeShiftChange',
				toolCallId: 'call_1',
				state: 'input-available',
				input: {
					type: 'change_shift_staff',
					shiftId: TEST_IDS.SCHEDULE_1,
				},
			},
		];

		expect(extractProposalFromParts(parts, allowlist)).toBeNull();
	});

	it('schema 不一致の output は null', () => {
		const parts: UIMessage['parts'] = [
			createDynamicToolPart({
				type: 'update_shift_time',
				shiftId: TEST_IDS.SCHEDULE_1,
				startAt: 'invalid-date',
				endAt: '2026-03-16T10:00:00+09:00',
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toBeNull();
	});

	it('allowlist にない shiftId は null', () => {
		const parts: UIMessage['parts'] = [
			createDynamicToolPart({
				type: 'update_shift_time',
				shiftId: TEST_IDS.SCHEDULE_2,
				startAt: '2026-03-16T09:00:00+09:00',
				endAt: '2026-03-16T10:00:00+09:00',
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toBeNull();
	});

	it('allowlist にない toStaffId は null', () => {
		const parts: UIMessage['parts'] = [
			createDynamicToolPart({
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_4,
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toBeNull();
	});

	it('parts が空配列の場合は null', () => {
		expect(extractProposalFromParts([], allowlist)).toBeNull();
	});
});

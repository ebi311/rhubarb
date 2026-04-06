import { TEST_IDS } from '@/test/helpers/testIds';
import type { UIMessage } from 'ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractProposalFromParts } from './extractProposalFromParts';

describe('extractProposalFromParts', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

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

	const createProposeShiftChangePart = (
		output: unknown,
	): UIMessage['parts'][number] => ({
		type: 'tool-proposeShiftChange',
		toolCallId: 'call_1',
		state: 'output-available',
		input: {},
		output,
	});

	it('change_shift_staff の tool output から proposal を返す', () => {
		const parts: UIMessage['parts'] = [
			createProposeShiftChangePart({
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
			createProposeShiftChangePart({
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
				type: 'tool-proposeShiftChange',
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
			createProposeShiftChangePart({
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
			createProposeShiftChangePart({
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
			createProposeShiftChangePart({
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

	it('text と別ツールが混在していても proposeShiftChange を優先して返す', () => {
		const parts: UIMessage['parts'] = [
			{ type: 'text', text: '候補を確認中です。' },
			{
				type: 'tool-searchStaffs',
				toolCallId: 'call_search_1',
				state: 'output-available',
				input: { name: '佐藤' },
				output: { staffs: [] },
			},
			createProposeShiftChangePart({
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toEqual({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
		});
	});

	it('1つ目の tool-proposeShiftChange が schema NG でも 2つ目が OK なら proposal を返す', () => {
		const parts: UIMessage['parts'] = [
			createProposeShiftChangePart({
				type: 'update_shift_time',
				shiftId: TEST_IDS.SCHEDULE_1,
				startAt: 'invalid-date',
				endAt: '2026-03-16T10:00:00+09:00',
			}),
			createProposeShiftChangePart({
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
				reason: '修正済み提案',
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toEqual({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '修正済み提案',
		});
	});

	it('1つ目の tool-proposeShiftChange が allowlist NG でも 2つ目が OK なら proposal を返す', () => {
		const parts: UIMessage['parts'] = [
			createProposeShiftChangePart({
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_4,
				reason: 'allowlist 外のスタッフ',
			}),
			createProposeShiftChangePart({
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
				reason: 'allowlist 内のスタッフ',
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toEqual({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: 'allowlist 内のスタッフ',
		});
	});

	it('後方互換で dynamic-tool + proposeShiftChange を受け付ける', () => {
		const parts: UIMessage['parts'] = [
			createDynamicToolPart({
				type: 'change_shift_staff',
				shiftId: TEST_IDS.SCHEDULE_1,
				toStaffId: TEST_IDS.STAFF_2,
			}),
		];

		expect(extractProposalFromParts(parts, allowlist)).toEqual({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
		});
	});
});

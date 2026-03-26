import { TEST_IDS } from '@/test/helpers/testIds';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseProposal, parseProposalWithDiagnostic } from './parseProposal';

describe('parseProposal', () => {
	const allowlist = {
		shiftIds: [TEST_IDS.SCHEDULE_1],
		staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
	};

	const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

	beforeEach(() => {
		warnSpy.mockClear();
	});

	afterEach(() => {
		warnSpy.mockClear();
	});

	it('assistant content から ```json ブロックを抽出して parse できる', () => {
		const content = `以下が提案です。\n\n\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}",
  "reason": "欠勤のため"
}
\`\`\``;

		const result = parseProposal(content, allowlist);

		expect(result).toEqual({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '欠勤のため',
		});
	});

	it('複数の json ブロックがある場合は null を返す', () => {
		const content = `最初の提案です。\n\n\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}
\`\`\`\n\n別案です。\n\n\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_1}"
}
\`\`\``;

		const result = parseProposal(content, allowlist);

		expect(result).toBeNull();
	});

	it('update_shift_time は json ブロック1件 + offset 付きISO + allowlist内 shiftId のとき proposal を返す', () => {
		const content = `時間変更の提案です。\n\n\`\`\`json
{
  "type": "update_shift_time",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "startAt": "2026-03-16T00:00:00Z",
  "endAt": "2026-03-16T01:00:00Z",
  "reason": "営業時間変更のため"
}
\`\`\``;

		expect(content.match(/```json/gi)).toHaveLength(1);

		const result = parseProposal(content, allowlist);

		expect(result).not.toBeNull();
		expect(result).toEqual({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T00:00:00Z',
			endAt: '2026-03-16T01:00:00Z',
			reason: '営業時間変更のため',
		});
	});

	it('update_shift_time は +09:00 オフセット指定でも proposal を返す', () => {
		const content = `時間変更の提案です。\n\n\`\`\`json
{
  "type": "update_shift_time",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "startAt": "2026-03-16T09:00:00+09:00",
  "endAt": "2026-03-16T10:00:00+09:00",
  "reason": "営業時間変更のため"
}
\`\`\``;

		const result = parseProposal(content, allowlist);

		expect(result).toEqual({
			type: 'update_shift_time',
			shiftId: TEST_IDS.SCHEDULE_1,
			startAt: '2026-03-16T09:00:00+09:00',
			endAt: '2026-03-16T10:00:00+09:00',
			reason: '営業時間変更のため',
		});
	});

	it('同一入力で複数回呼び出しても結果が変わらない', () => {
		const content = `以下が提案です。\n\n\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}",
  "reason": "欠勤のため"
}
\`\`\``;

		const firstResult = parseProposal(content, allowlist);
		const secondResult = parseProposal(content, allowlist);

		expect(firstResult).toEqual(secondResult);
		expect(secondResult).toEqual({
			type: 'change_shift_staff',
			shiftId: TEST_IDS.SCHEDULE_1,
			toStaffId: TEST_IDS.STAFF_2,
			reason: '欠勤のため',
		});
	});

	it('json ブロックが無い場合は null', () => {
		const result = parseProposal('提案は文章のみです', allowlist);
		expect(result).toBeNull();
	});

	it('json が壊れている場合は null', () => {
		const content = `\`\`\`json\n{ invalid json }\n\`\`\``;
		const result = parseProposal(content, allowlist);
		expect(result).toBeNull();
	});

	it('スキーマ不一致の場合は null', () => {
		const content = `\`\`\`json
{
  "type": "update_shift_time",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "startAt": "not-date",
  "endAt": "2026-03-16T10:00:00+09:00"
}
\`\`\``;

		const result = parseProposal(content, allowlist);
		expect(result).toBeNull();
	});

	it('allowlist にない shiftId の場合は null', () => {
		const content = `\`\`\`json
{
  "type": "update_shift_time",
  "shiftId": "${TEST_IDS.SCHEDULE_2}",
  "startAt": "2026-03-16T09:00:00+09:00",
  "endAt": "2026-03-16T10:00:00+09:00"
}
\`\`\``;

		const result = parseProposal(content, allowlist);
		expect(result).toBeNull();
	});

	it('change_shift_staff で allowlist.staffIds が undefined の場合は null', () => {
		const content = `\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}
\`\`\``;

		const result = parseProposal(content, {
			shiftIds: [TEST_IDS.SCHEDULE_1],
		});

		expect(result).toBeNull();
	});

	it('change_shift_staff で allowlist.staffIds が空配列の場合は null', () => {
		const content = `\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_2}"
}
\`\`\``;

		const result = parseProposal(content, {
			shiftIds: [TEST_IDS.SCHEDULE_1],
			staffIds: [],
		});

		expect(result).toBeNull();
	});

	it('allowlist にない toStaffId の場合は null', () => {
		const content = `\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_4}"
}
\`\`\``;

		const result = parseProposal(content, allowlist);
		expect(result).toBeNull();
	});
});

describe('parseProposalWithDiagnostic', () => {
	const allowlist = {
		shiftIds: [TEST_IDS.SCHEDULE_1],
		staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
	};

	it('no_json_block を返す', () => {
		expect(
			parseProposalWithDiagnostic('提案は文章のみです', allowlist),
		).toEqual({
			proposal: null,
			failReason: 'no_json_block',
		});
	});

	it('multiple_json_blocks を返す', () => {
		const content = '```json\n{}\n```\n\n```json\n{}\n```';
		expect(parseProposalWithDiagnostic(content, allowlist)).toEqual({
			proposal: null,
			failReason: 'multiple_json_blocks',
		});
	});

	it('json_parse_error を返す', () => {
		const content = '```json\n{ invalid json }\n```';
		expect(parseProposalWithDiagnostic(content, allowlist)).toEqual({
			proposal: null,
			failReason: 'json_parse_error',
		});
	});

	it('schema_invalid を返す', () => {
		const content = `\`\`\`json
{
  "type": "update_shift_time",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "startAt": "not-date",
  "endAt": "2026-03-16T10:00:00+09:00"
}
\`\`\``;
		expect(parseProposalWithDiagnostic(content, allowlist)).toEqual({
			proposal: null,
			failReason: 'schema_invalid',
		});
	});

	it('allowlist_rejected を返す', () => {
		const content = `\`\`\`json
{
  "type": "change_shift_staff",
  "shiftId": "${TEST_IDS.SCHEDULE_1}",
  "toStaffId": "${TEST_IDS.STAFF_4}"
}
\`\`\``;
		expect(parseProposalWithDiagnostic(content, allowlist)).toEqual({
			proposal: null,
			failReason: 'allowlist_rejected',
		});
	});
});

describe('parseProposal warning', () => {
	const allowlist = {
		shiftIds: [TEST_IDS.SCHEDULE_1],
		staffIds: [TEST_IDS.STAFF_1],
	};

	it('失敗時に console.warn を出す', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const result = parseProposal('提案は文章のみです', allowlist);
		expect(result).toBeNull();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('[parseProposal] failed to parse proposal'),
			expect.objectContaining({ failReason: 'no_json_block' }),
		);
		warnSpy.mockRestore();
	});
});

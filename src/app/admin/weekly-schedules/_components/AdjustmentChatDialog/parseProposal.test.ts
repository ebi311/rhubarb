import { TEST_IDS } from '@/test/helpers/testIds';
import { describe, expect, it } from 'vitest';
import { parseProposal } from './parseProposal';

describe('parseProposal', () => {
	const allowlist = {
		shiftIds: [TEST_IDS.SCHEDULE_1],
		staffIds: [TEST_IDS.STAFF_1, TEST_IDS.STAFF_2],
	};

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

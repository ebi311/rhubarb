import { describe, expect, it } from 'vitest';
import { createJstDateStringSchema } from './jstDate';

describe('createJstDateStringSchema', () => {
	const schema = createJstDateStringSchema({
		formatMessage: '日付はYYYY-MM-DD形式で指定してください',
		invalidDateMessage: '存在する日付を指定してください',
	});

	it('形式不正は formatMessage のみを 1 件返す', () => {
		const result = schema.safeParse('2026/02/01');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues).toHaveLength(1);
			expect(result.error.issues[0]?.message).toBe(
				'日付はYYYY-MM-DD形式で指定してください',
			);
		}
	});

	it('形式が正しくても実在しない日付は invalidDateMessage のみを 1 件返す', () => {
		const result = schema.safeParse('2026-02-31');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues).toHaveLength(1);
			expect(result.error.issues[0]?.message).toBe(
				'存在する日付を指定してください',
			);
		}
	});
});

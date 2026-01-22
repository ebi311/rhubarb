import { describe, expect, it } from 'vitest';

import { getMonday, parseSearchParams } from './helpers';

describe('getMonday', () => {
	it('月曜日を渡すとそのまま返す', () => {
		// 2026-01-19 は月曜日
		const monday = new Date('2026-01-19T00:00:00+09:00');
		const result = getMonday(monday);
		expect(result.toISOString()).toBe('2026-01-18T15:00:00.000Z'); // JST 2026-01-19 00:00
	});

	it('火曜日を渡すと前日の月曜日を返す', () => {
		// 2026-01-20 は火曜日
		const tuesday = new Date('2026-01-20T10:30:00+09:00');
		const result = getMonday(tuesday);
		expect(result.toISOString()).toBe('2026-01-18T15:00:00.000Z'); // JST 2026-01-19 00:00
	});

	it('日曜日を渡すと前週の月曜日を返す', () => {
		// 2026-01-25 は日曜日
		const sunday = new Date('2026-01-25T23:59:59+09:00');
		const result = getMonday(sunday);
		expect(result.toISOString()).toBe('2026-01-18T15:00:00.000Z'); // JST 2026-01-19 00:00
	});

	it('土曜日を渡すと同週の月曜日を返す', () => {
		// 2026-01-24 は土曜日
		const saturday = new Date('2026-01-24T12:00:00+09:00');
		const result = getMonday(saturday);
		expect(result.toISOString()).toBe('2026-01-18T15:00:00.000Z'); // JST 2026-01-19 00:00
	});
});

describe('parseSearchParams', () => {
	describe('week パラメータが未指定の場合', () => {
		it('weekStartDate が null で isValid が false を返す', () => {
			const result = parseSearchParams({});
			expect(result).toEqual({
				weekStartDate: null,
				isValid: false,
			});
		});

		it('week が空文字の場合も同様', () => {
			const result = parseSearchParams({ week: '' });
			expect(result).toEqual({
				weekStartDate: null,
				isValid: false,
			});
		});
	});

	describe('week パラメータが無効な日付の場合', () => {
		it('不正な形式は invalid_date エラー', () => {
			const result = parseSearchParams({ week: 'invalid-date' });
			expect(result).toEqual({
				weekStartDate: null,
				isValid: false,
				error: 'invalid_date',
			});
		});

		it('YYYY-MM-DD 形式でない場合は invalid_date エラー', () => {
			const result = parseSearchParams({ week: '2026/01/19' });
			expect(result).toEqual({
				weekStartDate: null,
				isValid: false,
				error: 'invalid_date',
			});
		});
	});

	describe('week パラメータが月曜日以外の場合', () => {
		it('火曜日は not_monday エラー（パース結果は含む）', () => {
			const result = parseSearchParams({ week: '2026-01-20' }); // 火曜日
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('not_monday');
			expect(result.weekStartDate).not.toBeNull();
		});

		it('日曜日は not_monday エラー', () => {
			const result = parseSearchParams({ week: '2026-01-25' }); // 日曜日
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('not_monday');
		});
	});

	describe('week パラメータが有効な月曜日の場合', () => {
		it('isValid が true でパース結果を返す', () => {
			const result = parseSearchParams({ week: '2026-01-19' }); // 月曜日
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
			expect(result.weekStartDate).not.toBeNull();
			// JST 2026-01-19 00:00:00 = UTC 2026-01-18 15:00:00
			expect(result.weekStartDate?.toISOString()).toBe(
				'2026-01-18T15:00:00.000Z',
			);
		});

		it('別の月曜日でも正常にパースする', () => {
			const result = parseSearchParams({ week: '2026-01-26' }); // 次の月曜日
			expect(result.isValid).toBe(true);
			expect(result.weekStartDate).not.toBeNull();
		});
	});
});

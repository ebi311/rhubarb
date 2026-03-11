import { describe, expect, it } from 'vitest';
import { getDaysDifference, isValidDate } from './dateValidation';

describe('isValidDate', () => {
	describe('正常な日付', () => {
		it('有効な日付形式を受け入れる', () => {
			expect(isValidDate('2026-02-25')).toBe(true);
			expect(isValidDate('2026-12-31')).toBe(true);
			expect(isValidDate('2026-01-01')).toBe(true);
		});

		it('閏年の2月29日を受け入れる', () => {
			// 2024年は閏年
			expect(isValidDate('2024-02-29')).toBe(true);
			// 2028年も閏年
			expect(isValidDate('2028-02-29')).toBe(true);
		});
	});

	describe('存在しない日付', () => {
		it('2月31日を拒否する', () => {
			expect(isValidDate('2026-02-31')).toBe(false);
		});

		it('4月31日を拒否する', () => {
			expect(isValidDate('2026-04-31')).toBe(false);
		});

		it('非閏年の2月29日を拒否する', () => {
			// 2025年は閏年ではない
			expect(isValidDate('2025-02-29')).toBe(false);
			// 2026年も閏年ではない
			expect(isValidDate('2026-02-29')).toBe(false);
		});

		it('13月を拒否する', () => {
			expect(isValidDate('2026-13-01')).toBe(false);
		});

		it('0月を拒否する', () => {
			expect(isValidDate('2026-00-01')).toBe(false);
		});

		it('32日を拒否する', () => {
			expect(isValidDate('2026-01-32')).toBe(false);
		});
	});

	describe('不正な形式', () => {
		it('YYYY/MM/DD形式を拒否する', () => {
			// isValidDate はYYYY-MM-DD形式を前提とするので不正な形式はfalse
			expect(isValidDate('2026/02/25')).toBe(false);
		});

		it('空文字を拒否する', () => {
			expect(isValidDate('')).toBe(false);
		});

		it('不完全な日付を拒否する', () => {
			expect(isValidDate('2026-02')).toBe(false);
			expect(isValidDate('2026')).toBe(false);
		});
	});
});

describe('getDaysDifference', () => {
	describe('日数計算（両端含む）', () => {
		it('2026-03-01〜03-14 は 14日間', () => {
			expect(getDaysDifference('2026-03-01', '2026-03-14')).toBe(14);
		});

		it('同日の場合は 1日', () => {
			expect(getDaysDifference('2026-03-01', '2026-03-01')).toBe(1);
		});

		it('連続する2日間の場合は 2日', () => {
			expect(getDaysDifference('2026-03-01', '2026-03-02')).toBe(2);
		});
	});

	describe('月またぎ', () => {
		it('月をまたぐ期間を正しく計算する', () => {
			// 2026-02-28 〜 2026-03-03 = 4日間（2/28, 3/1, 3/2, 3/3）
			expect(getDaysDifference('2026-02-28', '2026-03-03')).toBe(4);
		});

		it('閏年の月またぎを正しく計算する', () => {
			// 2024-02-28 〜 2024-03-01 = 3日間（2/28, 2/29, 3/1）
			expect(getDaysDifference('2024-02-28', '2024-03-01')).toBe(3);
		});
	});

	describe('年またぎ', () => {
		it('年をまたぐ期間を正しく計算する', () => {
			// 2025-12-30 〜 2026-01-02 = 4日間
			expect(getDaysDifference('2025-12-30', '2026-01-02')).toBe(4);
		});
	});
});

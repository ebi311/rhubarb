import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatJstDateString } from '@/utils/date';

import { getMonday, parseSearchParams } from './helpers';
import WeeklySchedulesPage from './page';

// redirect のモック
vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
}));

// helpers のモック
vi.mock('./helpers', () => ({
	getMonday: vi.fn((date: Date) => date),
	parseSearchParams: vi.fn(),
}));

// formatJstDateString のモック
vi.mock('@/utils/date', () => ({
	formatJstDateString: vi.fn(() => '2026-01-19'),
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe('WeeklySchedulesPage', () => {
	describe('week パラメータが未指定の場合', () => {
		it('今週の月曜日にリダイレクトする', async () => {
			vi.mocked(parseSearchParams).mockReturnValue({
				weekStartDate: null,
				isValid: false,
			});

			await WeeklySchedulesPage({ searchParams: Promise.resolve({}) });

			expect(redirect).toHaveBeenCalledWith('/admin/weekly-schedules?week=2026-01-19');
		});
	});

	describe('week パラメータが無効な日付の場合', () => {
		it('今週の月曜日にリダイレクトする', async () => {
			vi.mocked(parseSearchParams).mockReturnValue({
				weekStartDate: null,
				isValid: false,
				error: 'invalid_date',
			});

			await WeeklySchedulesPage({ searchParams: Promise.resolve({ week: 'invalid' }) });

			expect(redirect).toHaveBeenCalledWith('/admin/weekly-schedules?week=2026-01-19');
		});
	});

	describe('week パラメータが月曜日以外の場合', () => {
		it('その週の月曜日にリダイレクトする', async () => {
			const tuesday = new Date('2026-01-20T00:00:00+09:00');
			const monday = new Date('2026-01-19T00:00:00+09:00');

			vi.mocked(parseSearchParams).mockReturnValue({
				weekStartDate: tuesday,
				isValid: false,
				error: 'not_monday',
			});
			vi.mocked(getMonday).mockReturnValue(monday);
			vi.mocked(formatJstDateString).mockReturnValue('2026-01-19');

			await WeeklySchedulesPage({ searchParams: Promise.resolve({ week: '2026-01-20' }) });

			expect(getMonday).toHaveBeenCalledWith(tuesday);
			expect(redirect).toHaveBeenCalledWith('/admin/weekly-schedules?week=2026-01-19');
		});
	});

	describe('week パラメータが有効な月曜日の場合', () => {
		it('ページタイトルが表示される', async () => {
			const monday = new Date('2026-01-19T00:00:00+09:00');

			vi.mocked(parseSearchParams).mockReturnValue({
				weekStartDate: monday,
				isValid: true,
			});

			const result = await WeeklySchedulesPage({
				searchParams: Promise.resolve({ week: '2026-01-19' }),
			});

			render(result as React.ReactElement);

			expect(screen.getByText('週間スケジュール')).toBeInTheDocument();
		});

		it('リダイレクトされない', async () => {
			const monday = new Date('2026-01-19T00:00:00+09:00');

			vi.mocked(parseSearchParams).mockReturnValue({
				weekStartDate: monday,
				isValid: true,
			});

			await WeeklySchedulesPage({ searchParams: Promise.resolve({ week: '2026-01-19' }) });

			expect(redirect).not.toHaveBeenCalled();
		});
	});
});

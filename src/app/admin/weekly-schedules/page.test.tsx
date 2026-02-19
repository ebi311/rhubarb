import { formatJstDateString } from '@/utils/date';
import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMonday, parseSearchParams } from './helpers';
import WeeklySchedulesPage from './page';

vi.mock('../../_components/Header/context', () => ({
	PageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

// redirect のモック
vi.mock('next/navigation', () => ({
	redirect: vi.fn(),
	useRouter: () => ({
		push: vi.fn(),
		refresh: vi.fn(),
	}),
}));

// helpers のモック
vi.mock('./helpers', () => ({
	getMonday: vi.fn((date: Date) => date),
	parseSearchParams: vi.fn(),
}));

// formatJstDateString のモック（部分モック）
vi.mock('@/utils/date', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/utils/date')>();
	return {
		...actual,
		formatJstDateString: vi.fn(() => '2026-01-19'),
		addJstDays: vi.fn(() => new Date('2026-01-25T00:00:00+09:00')),
	};
});

// Server Actions のモック
vi.mock('@/app/actions/weeklySchedules', () => ({
	listShiftsAction: vi
		.fn()
		.mockResolvedValue({ data: [], error: null, status: 200 }),
	generateWeeklyShiftsAction: vi.fn().mockResolvedValue({
		data: { created: 0, skipped: 0 },
		error: null,
		status: 200,
	}),
}));

vi.mock('@/app/actions/serviceUsers', () => ({
	getServiceUsersAction: vi
		.fn()
		.mockResolvedValue({ data: [], error: null, status: 200 }),
}));

vi.mock('@/app/actions/staffs', () => ({
	listStaffsAction: vi
		.fn()
		.mockResolvedValue({ data: [], error: null, status: 200 }),
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

			expect(redirect).toHaveBeenCalledWith(
				'/admin/weekly-schedules?week=2026-01-19',
			);
		});
	});

	describe('week パラメータが無効な日付の場合', () => {
		it('今週の月曜日にリダイレクトする', async () => {
			vi.mocked(parseSearchParams).mockReturnValue({
				weekStartDate: null,
				isValid: false,
				error: 'invalid_date',
			});

			await WeeklySchedulesPage({
				searchParams: Promise.resolve({ week: 'invalid' }),
			});

			expect(redirect).toHaveBeenCalledWith(
				'/admin/weekly-schedules?week=2026-01-19',
			);
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

			await WeeklySchedulesPage({
				searchParams: Promise.resolve({ week: '2026-01-20' }),
			});

			expect(getMonday).toHaveBeenCalledWith(tuesday);
			expect(redirect).toHaveBeenCalledWith(
				'/admin/weekly-schedules?week=2026-01-19',
			);
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

			expect(screen.getByText('週次スケジュール管理')).toBeInTheDocument();
		});

		it('リダイレクトされない', async () => {
			const monday = new Date('2026-01-19T00:00:00+09:00');

			vi.mocked(parseSearchParams).mockReturnValue({
				weekStartDate: monday,
				isValid: true,
			});

			await WeeklySchedulesPage({
				searchParams: Promise.resolve({ week: '2026-01-19' }),
			});

			expect(redirect).not.toHaveBeenCalled();
		});
	});
});

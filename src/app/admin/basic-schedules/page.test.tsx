import { render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fetchModule from './fetchFilterOptions';

// モック設定
vi.mock('./fetchFilterOptions', () => ({
	fetchFilterOptions: vi.fn(),
}));

vi.mock('next/navigation');

const { default: BasicScheduleListPage } = await import('./page');

beforeEach(() => {
	vi.mocked(fetchModule.fetchFilterOptions).mockResolvedValue({
		clients: [],
		serviceTypes: [],
	});

	vi.mocked(useRouter).mockReturnValue({
		replace: vi.fn(),
	} as any);

	vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
});

describe('BasicScheduleListPage', () => {
	it('ページタイトルと説明が表示される', async () => {
		render(await BasicScheduleListPage({ searchParams: {} }));

		expect(screen.getByText('基本スケジュール')).toBeInTheDocument();
		expect(screen.getByText('週次スケジュール一覧')).toBeInTheDocument();
		expect(
			screen.getByText('登録済みの基本スケジュールを確認できます。'),
		).toBeInTheDocument();
	});

	it('新規登録ボタンが表示される', async () => {
		render(await BasicScheduleListPage({ searchParams: {} }));

		const buttons = screen.getAllByRole('link', { name: '新規登録' });
		expect(buttons.length).toBeGreaterThan(0);
		expect(buttons[0]).toHaveAttribute('href', '/admin/basic-schedules/new');
	});
});

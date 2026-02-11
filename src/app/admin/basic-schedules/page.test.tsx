import { listServiceTypesAction, listStaffsAction } from '@/app/actions/staffs';
import { render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fetchModule from './fetchFilterOptions';

// モック設定
vi.mock('@/app/actions/staffs', () => ({
	listServiceTypesAction: vi.fn(),
	listStaffsAction: vi.fn(),
}));
vi.mock('../../_components/Header/context', () => ({
	PageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('./fetchFilterOptions', () => ({
	fetchFilterOptions: vi.fn(),
}));

vi.mock('next/navigation');

const { default: BasicScheduleListPage } = await import('./page');

beforeEach(() => {
	vi.mocked(listServiceTypesAction).mockResolvedValue({
		data: [
			{
				id: 'physical-care',
				name: '身体介護',
			},
			{
				id: 'life-support',
				name: '生活援助',
			},
			{
				id: 'commute-support',
				name: '通院サポート',
			},
		],
	} as any);
	vi.mocked(listStaffsAction).mockResolvedValue({
		data: [
			{
				id: 'staff-1',
				name: 'スタッフA',
				role: 'helper',
				service_type_ids: ['physical-care', 'life-support'],
				note: '',
			},
			{
				id: 'staff-2',
				name: 'スタッフB',
				role: 'helper',
				service_type_ids: ['life-support'],
				note: '',
			},
		],
	} as any);
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

		expect(screen.getByText('基本スケジュール管理')).toBeInTheDocument();
		expect(
			screen.getByText('登録済みの基本スケジュールを確認・編集できます。'),
		).toBeInTheDocument();
	});

	it('新規登録ボタンが表示される', async () => {
		render(await BasicScheduleListPage({ searchParams: {} }));

		const buttons = screen.getAllByRole('link', { name: '新規登録' });
		expect(buttons.length).toBeGreaterThan(0);
		expect(buttons[0]).toHaveAttribute('href', '/admin/basic-schedules/new');
	});
});

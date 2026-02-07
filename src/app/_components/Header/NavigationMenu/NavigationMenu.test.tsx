import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { NavigationMenu } from './NavigationMenu';

vi.mock('next/navigation', () => ({
	usePathname: vi.fn(() => '/'),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe('NavigationMenu', () => {
	it('メニューボタンが表示される', () => {
		render(<NavigationMenu />);
		expect(screen.getByRole('group')).toBeInTheDocument();
		expect(screen.getByText('メニュー')).toBeInTheDocument();
	});

	it('ダッシュボードへのリンクが表示される', () => {
		render(<NavigationMenu />);
		const link = screen.getByRole('link', { name: 'ダッシュボード' });
		expect(link).toHaveAttribute('href', '/');
	});

	it('週次スケジュールへのリンクが表示される', () => {
		render(<NavigationMenu />);
		const link = screen.getByRole('link', { name: '週次スケジュール' });
		expect(link).toHaveAttribute('href', '/admin/weekly-schedules');
	});

	it('基本スケジュールへのリンクが表示される', () => {
		render(<NavigationMenu />);
		const link = screen.getByRole('link', { name: '基本スケジュール' });
		expect(link).toHaveAttribute('href', '/admin/basic-schedules');
	});

	it('利用者管理へのリンクが表示される', () => {
		render(<NavigationMenu />);
		const link = screen.getByRole('link', { name: '利用者管理' });
		expect(link).toHaveAttribute('href', '/admin/clients');
	});

	it('スタッフ管理へのリンクが表示される', () => {
		render(<NavigationMenu />);
		const link = screen.getByRole('link', { name: 'スタッフ管理' });
		expect(link).toHaveAttribute('href', '/admin/staffs');
	});

	it('5つのナビゲーションリンクが存在する', () => {
		render(<NavigationMenu />);
		const links = screen.getAllByRole('link');
		expect(links).toHaveLength(5);
	});

	it('menuアイコンが表示される', () => {
		render(<NavigationMenu />);
		expect(screen.getByText('menu')).toBeInTheDocument();
	});

	it('メニューグループ間に区切り線が表示される', () => {
		render(<NavigationMenu />);
		const separator = document.querySelector('hr.my-1');
		expect(separator).toBeInTheDocument();
	});

	it('リンクをクリックするとドロップダウンが閉じる', async () => {
		const user = userEvent.setup();
		render(<NavigationMenu />);

		const details = document.querySelector('details');
		expect(details).toBeInTheDocument();

		// メニューを開く
		const summary = screen.getByText('メニュー');
		await user.click(summary);
		expect(details).toHaveAttribute('open');

		// リンクをクリック
		const link = screen.getByRole('link', { name: 'ダッシュボード' });
		await user.click(link);

		// メニューが閉じる
		expect(details).not.toHaveAttribute('open');
	});

	it('パス変更時にドロップダウンが閉じる', async () => {
		const user = userEvent.setup();
		mockedUsePathname.mockReturnValue('/');
		const { rerender } = render(<NavigationMenu />);

		const details = document.querySelector('details');
		expect(details).toBeInTheDocument();

		// メニューを開く
		const summary = screen.getByText('メニュー');
		await user.click(summary);
		expect(details).toHaveAttribute('open');

		// パスを変更してre-render
		mockedUsePathname.mockReturnValue('/admin/staffs');
		rerender(<NavigationMenu />);

		// メニューが閉じる
		expect(details).not.toHaveAttribute('open');
	});
});

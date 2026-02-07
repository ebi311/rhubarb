import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavigationMenu } from './NavigationMenu';

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
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardQuickAccess } from './DashboardQuickAccess';

const renderComponent = () => {
	return render(<DashboardQuickAccess />);
};

describe('DashboardQuickAccess', () => {
	describe('タイトル', () => {
		it('「クイックアクセス」というタイトルが表示される', () => {
			renderComponent();
			expect(screen.getByText('クイックアクセス')).toBeInTheDocument();
		});
	});

	describe('基本スケジュールリンク', () => {
		it('基本スケジュールへのリンクが表示される', () => {
			renderComponent();
			const link = screen.getByRole('link', { name: /基本スケジュール/ });
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', '/admin/basic-schedules');
		});

		it('calendar_month アイコンが表示される', () => {
			renderComponent();
			const card = screen.getByRole('link', { name: /基本スケジュール/ });
			expect(card).toContainHTML('calendar_month');
		});
	});

	describe('週次スケジュールリンク', () => {
		it('週次スケジュールへのリンクが表示される', () => {
			renderComponent();
			const link = screen.getByRole('link', { name: /週次スケジュール/ });
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', '/admin/weekly-schedules');
		});

		it('calendar_view_week アイコンが表示される', () => {
			renderComponent();
			const card = screen.getByRole('link', { name: /週次スケジュール/ });
			expect(card).toContainHTML('calendar_view_week');
		});
	});

	describe('レスポンシブ対応', () => {
		it('コンテナにグリッドレイアウトのクラスが適用されている', () => {
			renderComponent();
			const container = screen.getByTestId('quick-access-grid');
			expect(container).toHaveClass('grid');
		});
	});

	describe('アクセシビリティ', () => {
		it('各リンクに適切な aria-label が設定されている', () => {
			renderComponent();
			expect(
				screen.getByRole('link', { name: /基本スケジュール/ }),
			).toHaveAttribute('aria-label');
			expect(
				screen.getByRole('link', { name: /週次スケジュール/ }),
			).toHaveAttribute('aria-label');
		});
	});
});

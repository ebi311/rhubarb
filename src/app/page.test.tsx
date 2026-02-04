import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

// Server Actionをモック
vi.mock('@/app/actions/dashboard', () => ({
	getDashboardDataAction: vi.fn().mockResolvedValue({
		data: {
			stats: { todayShiftCount: 5, weekShiftCount: 20, unassignedCount: 2 },
			timeline: [],
			alerts: [],
		},
		error: null,
		status: 200,
	}),
}));

// Server Actionのモック
vi.mock('@/app/actions/auth', () => ({
	signOutAction: vi.fn(),
}));

// async Header コンポーネントをモック
vi.mock('@/app/_components/Header', () => ({
	Header: () => (
		<header>
			<span>Rhubarb</span>
			<button>ログアウト</button>
		</header>
	),
}));

describe('Home', () => {
	it('ヘッダーが表示される', () => {
		render(<Home />);
		expect(screen.getByText('Rhubarb')).toBeInTheDocument();
	});

	it('ダッシュボードのローディング状態が表示される', () => {
		render(<Home />);
		// Suspense fallbackが表示される
		expect(screen.getByText('ログアウト')).toBeInTheDocument();
	});
});

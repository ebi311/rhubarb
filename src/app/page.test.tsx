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
vi.mock('@/app/auth/actions', () => ({
	signOut: vi.fn(),
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

describe.skip('Home', () => {
	it('ヘッダーが表示される', () => {
		render(<Home />);
		expect(screen.getByText('Rhubarb')).toBeInTheDocument();
	});
});

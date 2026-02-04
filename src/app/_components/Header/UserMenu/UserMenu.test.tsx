import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';

vi.mock('@/app/actions/auth', () => ({
	signOutAction: vi.fn(),
}));

describe('UserMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('ユーザー名が表示される', () => {
		render(<UserMenu userName="テストユーザー" />);
		expect(screen.getByText('テストユーザー')).toBeInTheDocument();
	});

	it('ドロップダウン内にログアウトボタンが表示される', () => {
		render(<UserMenu userName="テストユーザー" />);

		expect(
			screen.getByRole('button', { name: 'ログアウト' }),
		).toBeInTheDocument();
	});
});

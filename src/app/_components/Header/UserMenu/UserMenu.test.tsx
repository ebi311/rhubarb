import { signOut } from '@/app/auth/actions';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';

vi.mock('@/app/auth/actions', () => ({
	signOut: vi.fn(),
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

	it('ログアウトボタンがクリック可能である', async () => {
		const user = userEvent.setup();
		render(<UserMenu userName="テストユーザー" />);

		const logoutButton = screen.getByRole('button', { name: 'ログアウト' });
		await user.click(logoutButton);

		// クリックが正常に動作すること（エラーが発生しないこと）を確認
		expect(signOut).toHaveBeenCalled();
	});
});

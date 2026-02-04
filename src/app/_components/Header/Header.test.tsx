import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

// Mock the server action
vi.mock('@/app/actions/auth', () => ({
	signOutAction: vi.fn(),
}));

// Mock the supabase client
vi.mock('@/utils/supabase/server', () => ({
	createSupabaseClient: vi.fn().mockResolvedValue({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: {
					user: {
						email: 'test@example.com',
						user_metadata: { name: 'テストユーザー' },
					},
				},
			}),
		},
	}),
}));

describe('Header', () => {
	it('タイトル「Rhubarb」がリンクとして表示される', async () => {
		render(await Header());
		const link = screen.getByRole('link', { name: 'Rhubarb' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/');
	});

	it('ログアウトボタンが表示される', async () => {
		render(await Header());
		expect(
			screen.getByRole('button', { name: 'ログアウト' }),
		).toBeInTheDocument();
	});

	it('ユーザー名が表示される（user_metadata.nameが優先）', async () => {
		render(await Header());
		expect(screen.getByText('テストユーザー')).toBeInTheDocument();
	});
});

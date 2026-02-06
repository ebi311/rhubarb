import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header, HeaderPresentational } from './Header';

// Mock the server action
vi.mock('@/app/auth/actions', () => ({
	signOut: vi.fn(),
}));

// Mock the StaffRepository
const mockFindByAuthUserId = vi.fn().mockResolvedValue({
	id: 'staff-1',
	name: 'テストユーザー',
});

vi.mock('@/backend/repositories/staffRepository', () => ({
	StaffRepository: class {
		findByAuthUserId = mockFindByAuthUserId;
	},
}));

// Mock the supabase client
vi.mock('@/utils/supabase/server', () => ({
	createSupabaseClient: vi.fn().mockResolvedValue({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: {
					user: {
						id: 'user-1',
						email: 'test@example.com',
					},
				},
			}),
		},
	}),
}));

describe('HeaderPresentational', () => {
	it('タイトル「Rhubarb」がリンクとして表示される', () => {
		render(<HeaderPresentational userName="テストユーザー" />);
		const link = screen.getByRole('link', { name: 'Rhubarb' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/');
	});

	it('ログアウトボタンが表示される', () => {
		render(<HeaderPresentational userName="テストユーザー" />);
		expect(
			screen.getByRole('button', { name: 'ログアウト' }),
		).toBeInTheDocument();
	});

	it('ユーザー名が表示される', () => {
		render(<HeaderPresentational userName="テストユーザー" />);
		expect(screen.getByText('テストユーザー')).toBeInTheDocument();
	});
});

describe('Header', () => {
	it('StaffRepositoryからユーザー名を取得して表示される', async () => {
		render(await Header());
		expect(screen.getByText('テストユーザー')).toBeInTheDocument();
	});
});

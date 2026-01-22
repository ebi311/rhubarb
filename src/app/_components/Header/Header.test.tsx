import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

// Mock the server action
vi.mock('@/app/auth/actions', () => ({
	signOut: vi.fn(),
}));

describe('Header', () => {
	it('renders the title', () => {
		render(<Header />);
		expect(screen.getByText('Rhubarb')).toBeInTheDocument();
	});

	it('renders the logout button', () => {
		render(<Header />);
		expect(
			screen.getByRole('button', { name: 'ログアウト' }),
		).toBeInTheDocument();
	});
});

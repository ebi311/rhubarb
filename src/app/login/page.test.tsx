import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

// Mock LoginButton to avoid testing its internal logic again
vi.mock('./_components/LoginButton', () => ({
	default: () => <button>Mock Login Button</button>,
}));

describe('LoginPage', () => {
	it('renders the login page correctly', async () => {
		render(await LoginPage({ searchParams: Promise.resolve({}) }));
		expect(
			screen.getByRole('heading', { name: 'ログイン' }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Googleアカウントを使用してログインしてください/),
		).toBeInTheDocument();
		expect(screen.getByText('Mock Login Button')).toBeInTheDocument();
	});
});

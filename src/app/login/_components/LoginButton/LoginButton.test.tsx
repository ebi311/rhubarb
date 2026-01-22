import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginButton from './LoginButton';

// Mock createSupabaseClient
const mockSignInWithOAuth = vi.fn();
vi.mock('@/utils/supabase/client', () => ({
	createSupabaseClient: () => ({
		auth: {
			signInWithOAuth: mockSignInWithOAuth,
		},
	}),
}));

describe('LoginButton', () => {
	it('renders correctly', () => {
		render(<LoginButton />);
		expect(
			screen.getByRole('button', { name: /Googleでログイン/i }),
		).toBeInTheDocument();
	});

	it('calls signInWithOAuth when clicked', async () => {
		render(<LoginButton />);
		const button = screen.getByRole('button', { name: /Googleでログイン/i });
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockSignInWithOAuth).toHaveBeenCalledWith({
				provider: 'google',
				options: {
					redirectTo: expect.stringContaining('/auth/callback'),
				},
			});
		});
	});

	it('shows loading state when clicked', async () => {
		// Mock signInWithOAuth to never resolve immediately to test loading state
		mockSignInWithOAuth.mockImplementation(() => new Promise(() => {}));

		render(<LoginButton />);
		const button = screen.getByRole('button', { name: /Googleでログイン/i });
		fireEvent.click(button);

		expect(button).toBeDisabled();
		// daisyUI loading spinner class
		expect(button.querySelector('.loading')).toBeInTheDocument();
	});
});

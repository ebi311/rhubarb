import { render, screen } from '@testing-library/react';
import { Header } from './Header';
import { describe, it, expect, vi } from 'vitest';

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
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });
});

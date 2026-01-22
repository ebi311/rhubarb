import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ClientFilterTabs } from './ClientFilterTabs';

describe('ClientFilterTabs', () => {
	it('3つのタブ（全て、契約中、中断中）が表示される', () => {
		render(<ClientFilterTabs activeFilter="all" onFilterChange={vi.fn()} />);
		expect(screen.getByRole('tab', { name: '全て' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: '契約中' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: '中断中' })).toBeInTheDocument();
	});

	it('activeFilterに応じてアクティブなタブが表示される', () => {
		const { rerender } = render(
			<ClientFilterTabs activeFilter="all" onFilterChange={vi.fn()} />,
		);
		expect(screen.getByRole('tab', { name: '全て' })).toHaveClass('tab-active');

		rerender(
			<ClientFilterTabs activeFilter="active" onFilterChange={vi.fn()} />,
		);
		expect(screen.getByRole('tab', { name: '契約中' })).toHaveClass(
			'tab-active',
		);

		rerender(
			<ClientFilterTabs activeFilter="suspended" onFilterChange={vi.fn()} />,
		);
		expect(screen.getByRole('tab', { name: '中断中' })).toHaveClass(
			'tab-active',
		);
	});

	it('タブクリックでonFilterChangeが呼ばれる', async () => {
		const user = userEvent.setup();
		const handleFilterChange = vi.fn();
		render(
			<ClientFilterTabs
				activeFilter="all"
				onFilterChange={handleFilterChange}
			/>,
		);

		await user.click(screen.getByRole('tab', { name: '契約中' }));
		expect(handleFilterChange).toHaveBeenCalledWith('active');

		await user.click(screen.getByRole('tab', { name: '中断中' }));
		expect(handleFilterChange).toHaveBeenCalledWith('suspended');

		await user.click(screen.getByRole('tab', { name: '全て' }));
		expect(handleFilterChange).toHaveBeenCalledWith('all');
	});

	it('アクティブなタブをクリックしてもonFilterChangeは呼ばれる', async () => {
		const user = userEvent.setup();
		const handleFilterChange = vi.fn();
		render(
			<ClientFilterTabs
				activeFilter="active"
				onFilterChange={handleFilterChange}
			/>,
		);

		await user.click(screen.getByRole('tab', { name: '契約中' }));
		expect(handleFilterChange).toHaveBeenCalledWith('active');
	});
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyViewToggleButton } from './WeeklyViewToggleButton';

describe('WeeklyViewToggleButton', () => {
	it('2つの表示モード切り替えボタンが表示される', () => {
		render(<WeeklyViewToggleButton currentView="list" />);

		expect(screen.getByLabelText('リスト表示')).toBeInTheDocument();
		expect(screen.getByLabelText('グリッド表示')).toBeInTheDocument();
	});

	it('currentViewがlistの場合、リストボタンがアクティブになる', () => {
		render(<WeeklyViewToggleButton currentView="list" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('グリッド表示');

		expect(listButton).toHaveClass('btn-active');
		expect(gridButton).not.toHaveClass('btn-active');
	});

	it('currentViewがgridの場合、グリッドボタンがアクティブになる', () => {
		render(<WeeklyViewToggleButton currentView="grid" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('グリッド表示');

		expect(listButton).not.toHaveClass('btn-active');
		expect(gridButton).toHaveClass('btn-active');
	});

	it('ボタンクリック時にonViewChangeが呼ばれる', async () => {
		const handleViewChange = vi.fn();
		const user = userEvent.setup();

		render(
			<WeeklyViewToggleButton
				currentView="list"
				onViewChange={handleViewChange}
			/>,
		);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('グリッド表示');

		await user.click(listButton);
		expect(handleViewChange).toHaveBeenCalledWith('list');

		await user.click(gridButton);
		expect(handleViewChange).toHaveBeenCalledWith('grid');
	});
});

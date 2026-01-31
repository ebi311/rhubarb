import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ViewToggleButton } from './ViewToggleButton';

describe('ViewToggleButton', () => {
	it('3つの表示モード切り替えボタンが表示される', () => {
		render(<ViewToggleButton currentView="list" />);

		expect(screen.getByLabelText('リスト表示')).toBeInTheDocument();
		expect(screen.getByLabelText('利用者別グリッド表示')).toBeInTheDocument();
		expect(screen.getByLabelText('スタッフ別グリッド表示')).toBeInTheDocument();
	});

	it('currentViewがlistの場合、リストボタンがアクティブになる', () => {
		render(<ViewToggleButton currentView="list" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('利用者別グリッド表示');
		const staffGridButton = screen.getByLabelText('スタッフ別グリッド表示');

		expect(listButton).toHaveClass('btn-active');
		expect(gridButton).not.toHaveClass('btn-active');
		expect(staffGridButton).not.toHaveClass('btn-active');
	});

	it('currentViewがgridの場合、利用者別グリッドボタンがアクティブになる', () => {
		render(<ViewToggleButton currentView="grid" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('利用者別グリッド表示');
		const staffGridButton = screen.getByLabelText('スタッフ別グリッド表示');

		expect(listButton).not.toHaveClass('btn-active');
		expect(gridButton).toHaveClass('btn-active');
		expect(staffGridButton).not.toHaveClass('btn-active');
	});

	it('currentViewがstaff-gridの場合、スタッフ別グリッドボタンがアクティブになる', () => {
		render(<ViewToggleButton currentView="staff-grid" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('利用者別グリッド表示');
		const staffGridButton = screen.getByLabelText('スタッフ別グリッド表示');

		expect(listButton).not.toHaveClass('btn-active');
		expect(gridButton).not.toHaveClass('btn-active');
		expect(staffGridButton).toHaveClass('btn-active');
	});

	it('ボタンクリック時にonViewChangeが呼ばれる', async () => {
		const handleViewChange = vi.fn();
		const user = userEvent.setup();

		render(
			<ViewToggleButton currentView="list" onViewChange={handleViewChange} />,
		);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('利用者別グリッド表示');
		const staffGridButton = screen.getByLabelText('スタッフ別グリッド表示');

		await user.click(listButton);
		expect(handleViewChange).toHaveBeenCalledWith('list');

		await user.click(gridButton);
		expect(handleViewChange).toHaveBeenCalledWith('grid');

		await user.click(staffGridButton);
		expect(handleViewChange).toHaveBeenCalledWith('staff-grid');
	});
});

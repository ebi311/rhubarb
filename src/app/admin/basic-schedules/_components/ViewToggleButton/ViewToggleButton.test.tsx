import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

	it('各ボタンのhrefが正しい', () => {
		render(<ViewToggleButton currentView="list" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('利用者別グリッド表示');
		const staffGridButton = screen.getByLabelText('スタッフ別グリッド表示');

		expect(listButton).toHaveAttribute('href', '?view=list');
		expect(gridButton).toHaveAttribute('href', '?view=grid');
		expect(staffGridButton).toHaveAttribute('href', '?view=staff-grid');
	});
});

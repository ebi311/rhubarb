import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ViewToggleButton } from './ViewToggleButton';

describe('ViewToggleButton', () => {
	it('リストビューとグリッドビューの切り替えボタンが表示される', () => {
		render(<ViewToggleButton currentView="list" />);

		expect(screen.getByLabelText('リスト表示')).toBeInTheDocument();
		expect(screen.getByLabelText('グリッド表示')).toBeInTheDocument();
	});

	it('currentViewがlistの場合、リストボタンがアクティブになる', () => {
		render(<ViewToggleButton currentView="list" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('グリッド表示');

		expect(listButton).toHaveClass('btn-active');
		expect(gridButton).not.toHaveClass('btn-active');
	});

	it('currentViewがgridの場合、グリッドボタンがアクティブになる', () => {
		render(<ViewToggleButton currentView="grid" />);

		const listButton = screen.getByLabelText('リスト表示');
		const gridButton = screen.getByLabelText('グリッド表示');

		expect(listButton).not.toHaveClass('btn-active');
		expect(gridButton).toHaveClass('btn-active');
	});

	it('リストボタンのhrefが正しい', () => {
		render(<ViewToggleButton currentView="grid" />);

		const listButton = screen.getByLabelText('リスト表示');
		expect(listButton).toHaveAttribute('href', '?view=list');
	});

	it('グリッドボタンのhrefが正しい', () => {
		render(<ViewToggleButton currentView="list" />);

		const gridButton = screen.getByLabelText('グリッド表示');
		expect(gridButton).toHaveAttribute('href', '?view=grid');
	});
});

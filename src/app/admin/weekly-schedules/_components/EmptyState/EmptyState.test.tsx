import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
	const defaultProps = {
		weekStartDate: new Date('2026-01-19'),
		onGenerate: vi.fn(),
	};

	it('空状態メッセージが表示される', () => {
		render(<EmptyState {...defaultProps} />);

		expect(screen.getByText(/この週のシフトはまだありません/)).toBeInTheDocument();
	});

	it('生成ボタンが表示される', () => {
		render(<EmptyState {...defaultProps} />);

		expect(screen.getByRole('button', { name: /基本スケジュールから生成/ })).toBeInTheDocument();
	});

	it('ボタンクリック時に onGenerate が呼ばれる', async () => {
		const user = userEvent.setup();
		const onGenerate = vi.fn();

		render(<EmptyState {...defaultProps} onGenerate={onGenerate} />);

		await user.click(screen.getByRole('button', { name: /基本スケジュールから生成/ }));

		expect(onGenerate).toHaveBeenCalledTimes(1);
	});
});

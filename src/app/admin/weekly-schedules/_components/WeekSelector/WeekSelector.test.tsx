import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WeekSelector } from './WeekSelector';

describe('WeekSelector', () => {
	const defaultProps = {
		currentWeek: new Date('2026-01-19T00:00:00+09:00'), // 月曜日
		onWeekChange: vi.fn(),
	};

	it('現在の週を YYYY年MM月DD日〜MM月DD日 形式で表示する', () => {
		render(<WeekSelector {...defaultProps} />);

		// 2026年01月19日〜01月25日
		expect(screen.getByText(/2026年01月19日/)).toBeInTheDocument();
		expect(screen.getByText(/01月25日/)).toBeInTheDocument();
	});

	it('前週ボタンをクリックすると7日前の日付でonWeekChangeが呼ばれる', async () => {
		const onWeekChange = vi.fn();
		const user = userEvent.setup();

		render(<WeekSelector {...defaultProps} onWeekChange={onWeekChange} />);

		const prevButton = screen.getByRole('button', { name: /前週/ });
		await user.click(prevButton);

		expect(onWeekChange).toHaveBeenCalledTimes(1);
		const calledDate = onWeekChange.mock.calls[0][0] as Date;
		// 2026-01-12（前週の月曜日）
		expect(calledDate.toISOString()).toContain('2026-01-11'); // UTC での日付
	});

	it('次週ボタンをクリックすると7日後の日付でonWeekChangeが呼ばれる', async () => {
		const onWeekChange = vi.fn();
		const user = userEvent.setup();

		render(<WeekSelector {...defaultProps} onWeekChange={onWeekChange} />);

		const nextButton = screen.getByRole('button', { name: /次週/ });
		await user.click(nextButton);

		expect(onWeekChange).toHaveBeenCalledTimes(1);
		const calledDate = onWeekChange.mock.calls[0][0] as Date;
		// 2026-01-26（次週の月曜日）
		expect(calledDate.toISOString()).toContain('2026-01-25'); // UTC での日付
	});

	it('週選択入力フィールドが表示される', () => {
		render(<WeekSelector {...defaultProps} />);

		const weekInput = screen.getByLabelText('週を選択');
		expect(weekInput).toBeInTheDocument();
		expect(weekInput).toHaveAttribute('type', 'week');
	});

	it('週選択入力で別の週を選択するとonWeekChangeが呼ばれる', async () => {
		const onWeekChange = vi.fn();

		render(<WeekSelector {...defaultProps} onWeekChange={onWeekChange} />);

		const weekInput = screen.getByLabelText('週を選択');
		// fireEvent.change で値を変更
		fireEvent.change(weekInput, { target: { value: '2026-W05' } });

		expect(onWeekChange).toHaveBeenCalled();
	});
});

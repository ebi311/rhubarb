import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateOneOffShiftButton } from './CreateOneOffShiftButton';

describe('CreateOneOffShiftButton', () => {
	it('ボタンが表示される', () => {
		render(<CreateOneOffShiftButton onOpen={vi.fn()} />);

		expect(
			screen.getByRole('button', { name: '単発シフト追加' }),
		).toBeInTheDocument();
	});

	it('クリックで onOpen が呼ばれる', async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		render(<CreateOneOffShiftButton onOpen={onOpen} />);

		await user.click(screen.getByRole('button', { name: '単発シフト追加' }));
		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});

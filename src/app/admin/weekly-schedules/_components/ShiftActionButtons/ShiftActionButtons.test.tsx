import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ShiftStatus } from '../ShiftTable';
import { ShiftActionButtons } from './ShiftActionButtons';

describe('ShiftActionButtons', () => {
	const defaultProps = {
		status: 'scheduled' as ShiftStatus,
		onCancelShift: vi.fn(),
		onRestoreShift: vi.fn(),
	};

	it('scheduledの場合、キャンセルボタンが表示される', () => {
		render(<ShiftActionButtons {...defaultProps} status="scheduled" />);

		expect(
			screen.getByRole('button', { name: 'キャンセル' }),
		).toBeInTheDocument();
	});

	it('confirmedの場合、ボタンが非表示になる', () => {
		render(<ShiftActionButtons {...defaultProps} status="confirmed" />);

		expect(
			screen.queryByRole('button', { name: 'キャンセル' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '復元' }),
		).not.toBeInTheDocument();
	});

	it('completedの場合、ボタンが非表示になる', () => {
		render(<ShiftActionButtons {...defaultProps} status="completed" />);

		expect(
			screen.queryByRole('button', { name: 'キャンセル' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '復元' }),
		).not.toBeInTheDocument();
	});

	it('canceledの場合、復元ボタンが表示される', () => {
		render(<ShiftActionButtons {...defaultProps} status="canceled" />);

		expect(screen.getByRole('button', { name: '復元' })).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'キャンセル' }),
		).not.toBeInTheDocument();
	});

	it('キャンセルボタンをクリックするとonCancelShiftが呼ばれる', async () => {
		const user = userEvent.setup();
		const onCancelShift = vi.fn();

		render(
			<ShiftActionButtons
				{...defaultProps}
				status="scheduled"
				onCancelShift={onCancelShift}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'キャンセル' }));

		expect(onCancelShift).toHaveBeenCalled();
	});

	it('復元ボタンをクリックするとonRestoreShiftが呼ばれる', async () => {
		const user = userEvent.setup();
		const onRestoreShift = vi.fn();

		render(
			<ShiftActionButtons
				{...defaultProps}
				status="canceled"
				onRestoreShift={onRestoreShift}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '復元' }));

		expect(onRestoreShift).toHaveBeenCalled();
	});
});

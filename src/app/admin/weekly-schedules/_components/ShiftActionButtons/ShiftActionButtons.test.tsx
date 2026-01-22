import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ShiftStatus } from '../ShiftTable';
import { ShiftActionButtons } from './ShiftActionButtons';

describe('ShiftActionButtons', () => {
	const defaultProps = {
		status: 'scheduled' as ShiftStatus,
		isUnassigned: false,
		onChangeStaff: vi.fn(),
		onAssignStaff: vi.fn(),
		onCancelShift: vi.fn(),
	};

	it('scheduledかつis_unassigned=falseの場合、担当者変更とキャンセルボタンが表示される', () => {
		render(
			<ShiftActionButtons
				{...defaultProps}
				status="scheduled"
				isUnassigned={false}
			/>,
		);

		expect(screen.getByRole('button', { name: '変更' })).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'キャンセル' }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '割り当て' }),
		).not.toBeInTheDocument();
	});

	it('scheduledかつis_unassigned=trueの場合、割り当てとキャンセルボタンが表示される', () => {
		render(
			<ShiftActionButtons
				{...defaultProps}
				status="scheduled"
				isUnassigned={true}
			/>,
		);

		expect(
			screen.getByRole('button', { name: '割り当て' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'キャンセル' }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '変更' }),
		).not.toBeInTheDocument();
	});

	it('confirmedの場合、すべてのボタンが非表示になる', () => {
		render(<ShiftActionButtons {...defaultProps} status="confirmed" />);

		expect(
			screen.queryByRole('button', { name: '変更' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '割り当て' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'キャンセル' }),
		).not.toBeInTheDocument();
	});

	it('completedの場合、すべてのボタンが非表示になる', () => {
		render(<ShiftActionButtons {...defaultProps} status="completed" />);

		expect(
			screen.queryByRole('button', { name: '変更' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '割り当て' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'キャンセル' }),
		).not.toBeInTheDocument();
	});

	it('canceledの場合、すべてのボタンが非表示になる', () => {
		render(<ShiftActionButtons {...defaultProps} status="canceled" />);

		expect(
			screen.queryByRole('button', { name: '変更' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '割り当て' }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'キャンセル' }),
		).not.toBeInTheDocument();
	});

	it('担当者変更ボタンをクリックするとonChangeStaffが呼ばれる', async () => {
		const user = userEvent.setup();
		const onChangeStaff = vi.fn();

		render(
			<ShiftActionButtons
				{...defaultProps}
				status="scheduled"
				isUnassigned={false}
				onChangeStaff={onChangeStaff}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '変更' }));

		expect(onChangeStaff).toHaveBeenCalled();
	});

	it('割り当てボタンをクリックするとonAssignStaffが呼ばれる', async () => {
		const user = userEvent.setup();
		const onAssignStaff = vi.fn();

		render(
			<ShiftActionButtons
				{...defaultProps}
				status="scheduled"
				isUnassigned={true}
				onAssignStaff={onAssignStaff}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '割り当て' }));

		expect(onAssignStaff).toHaveBeenCalled();
	});

	it('キャンセルボタンをクリックするとonCancelShiftが呼ばれる', async () => {
		const user = userEvent.setup();
		const onCancelShift = vi.fn();

		render(
			<ShiftActionButtons
				{...defaultProps}
				status="scheduled"
				isUnassigned={false}
				onCancelShift={onCancelShift}
			/>,
		);

		await user.click(screen.getByRole('button', { name: 'キャンセル' }));

		expect(onCancelShift).toHaveBeenCalled();
	});
});

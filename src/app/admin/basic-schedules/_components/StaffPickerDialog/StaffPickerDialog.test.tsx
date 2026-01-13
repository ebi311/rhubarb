import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StaffPickerOption } from './StaffPickerDialog';
import { StaffPickerDialog } from './StaffPickerDialog';

const options: StaffPickerOption[] = [
	{
		id: 'staff-1',
		name: '山田太郎',
		role: 'admin',
		serviceTypeIds: ['physical-care', 'life-support'],
		note: '夜間可',
	},
	{
		id: 'staff-2',
		name: '佐藤花子',
		role: 'helper',
		serviceTypeIds: ['physical-care'],
		note: null,
	},
];

const renderDialog = (overrides: Partial<Parameters<typeof StaffPickerDialog>[0]> = {}) => {
	const defaultProps = {
		isOpen: true,
		staffOptions: options,
		selectedStaffId: null,
		onClose: vi.fn(),
		onSelect: vi.fn(),
		onClear: vi.fn(),
	};
	return render(<StaffPickerDialog {...defaultProps} {...overrides} />);
};

describe('StaffPickerDialog', () => {
	it('filters staff by keyword and role', async () => {
		const user = userEvent.setup();
		renderDialog();

		await user.type(screen.getByPlaceholderText('氏名・サービス区分で検索'), '花子');
		expect(screen.queryByText('山田太郎')).not.toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();

		await user.clear(screen.getByPlaceholderText('氏名・サービス区分で検索'));
		await user.selectOptions(screen.getByDisplayValue('すべて'), 'ヘルパー');
		expect(screen.queryByText('山田太郎')).not.toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
	});

	it('selects staff and confirms', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		renderDialog({ onSelect });

		await user.click(screen.getAllByRole('radio')[1]);
		const confirmButton = screen.getByRole('button', { name: '確定する' });
		expect(confirmButton).toBeEnabled();

		await user.click(confirmButton);
		expect(onSelect).toHaveBeenCalledWith('staff-2');
	});

	it('calls onClear when clear button is clicked', async () => {
		const user = userEvent.setup();
		const onClear = vi.fn();
		renderDialog({ onClear });

		await user.click(screen.getByRole('button', { name: '選択をクリア' }));
		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it('renders nothing when dialog is closed', () => {
		renderDialog({ isOpen: false });
		expect(screen.queryByText('担当者を選択')).not.toBeInTheDocument();
	});
});

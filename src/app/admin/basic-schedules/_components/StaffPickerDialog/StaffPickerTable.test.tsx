import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StaffPickerTable } from './StaffPickerTable';
import type { StaffPickerOption } from './types';

const staffs: StaffPickerOption[] = [
	{
		id: 'staff-1',
		name: '山田太郎',
		role: 'admin',
		serviceTypeIds: ['physical-care'],
		note: '夜間可',
	},
	{
		id: 'staff-2',
		name: '佐藤花子',
		role: 'helper',
		serviceTypeIds: ['life-support'],
		note: null,
	},
];

describe('StaffPickerTable', () => {
	it('スタッフ情報をテーブル表示し、選択状態を示す', () => {
		render(<StaffPickerTable staffs={staffs} selectedStaffId="staff-2" onSelect={() => {}} />);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
		expect(screen.getAllByRole('radio')).toHaveLength(2);
	});

	it('行クリックで onSelect を呼び出す', async () => {
		const user = userEvent.setup();
		const handleSelect = vi.fn();
		render(<StaffPickerTable staffs={staffs} selectedStaffId={null} onSelect={handleSelect} />);

		const row = screen.getByText('佐藤花子').closest('tr');
		await user.click(row!);
		expect(handleSelect).toHaveBeenCalledWith('staff-2');
	});
});

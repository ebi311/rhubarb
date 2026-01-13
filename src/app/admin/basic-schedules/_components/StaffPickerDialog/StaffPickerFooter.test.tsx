import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StaffPickerFooter } from './StaffPickerFooter';

describe('StaffPickerFooter', () => {
	it('選択中スタッフ名を表示する', () => {
		render(
			<StaffPickerFooter
				pendingStaff={{
					id: 'staff-1',
					name: '山田太郎',
					role: 'admin',
					serviceTypeIds: [],
					note: null,
				}}
				onClose={() => {}}
				onConfirm={() => {}}
				confirmDisabled={false}
			/>,
		);

		expect(screen.getByText(/山田太郎/)).toBeInTheDocument();
	});

	it('ボタンクリックでハンドラを呼び出す', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		const handleConfirm = vi.fn();

		render(
			<StaffPickerFooter
				pendingStaff={null}
				onClose={handleClose}
				onConfirm={handleConfirm}
				confirmDisabled={false}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '閉じる' }));
		expect(handleClose).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole('button', { name: '確定する' }));
		expect(handleConfirm).toHaveBeenCalledTimes(1);
	});

	it('confirmDisabled が true の場合ボタンを無効化する', () => {
		render(
			<StaffPickerFooter
				pendingStaff={null}
				onClose={() => {}}
				onConfirm={() => {}}
				confirmDisabled
			/>,
		);

		expect(screen.getByText('現在選択されている担当者はありません。')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '確定する' })).toBeDisabled();
	});
});

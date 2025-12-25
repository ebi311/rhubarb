import { deleteStaffAction } from '@/app/actions/staffs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteStaffDialog } from './DeleteStaffDialog';

vi.mock('@/app/actions/staffs', () => ({
	deleteStaffAction: vi.fn(),
}));

const mockStaff = {
	id: '019b1d20-0000-4000-8000-000000000aaa',
	name: '山田太郎',
};

const successResult = { data: null, error: null, status: 204 };
const errorResult = (message: string) => ({ data: null, error: message, status: 400 });

describe('DeleteStaffDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('担当者名が一致するまで削除ボタンは無効のまま', async () => {
		const user = userEvent.setup();

		render(<DeleteStaffDialog isOpen staff={mockStaff} onClose={vi.fn()} />);

		const deleteButton = screen.getByRole('button', { name: '削除' });
		expect(deleteButton).toBeDisabled();

		await user.type(screen.getByLabelText('削除する担当者名'), '山田太郎');

		expect(deleteButton).toBeEnabled();
	});

	it('正しい名前を入力して削除するとdeleteStaffActionが呼び出される', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		const handleDeleted = vi.fn();
		vi.mocked(deleteStaffAction).mockResolvedValue(successResult);

		render(
			<DeleteStaffDialog
				isOpen
				staff={mockStaff}
				onClose={handleClose}
				onDeleted={handleDeleted}
			/>,
		);

		await user.type(screen.getByLabelText('削除する担当者名'), '山田太郎');
		await user.click(screen.getByRole('button', { name: '削除' }));

		await waitFor(() => {
			expect(deleteStaffAction).toHaveBeenCalledWith('019b1d20-0000-4000-8000-000000000aaa');
		});

		expect(handleDeleted).toHaveBeenCalledWith('019b1d20-0000-4000-8000-000000000aaa');
		expect(handleClose).toHaveBeenCalled();
	});

	it('API エラー時はエラーメッセージを表示する', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		vi.mocked(deleteStaffAction).mockResolvedValue(errorResult('削除に失敗しました'));

		render(<DeleteStaffDialog isOpen staff={mockStaff} onClose={handleClose} />);

		await user.type(screen.getByLabelText('削除する担当者名'), '山田太郎');
		await user.click(screen.getByRole('button', { name: '削除' }));

		await waitFor(() => {
			expect(screen.getByText('削除に失敗しました')).toBeInTheDocument();
		});

		expect(handleClose).not.toHaveBeenCalled();
	});
});

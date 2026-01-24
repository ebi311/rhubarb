import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelShiftDialog } from './CancelShiftDialog';

vi.mock('@/app/actions/shifts', () => ({
	cancelShiftAction: vi.fn(),
}));

vi.mock('@/hooks/useActionResultHandler', () => ({
	useActionResultHandler: () => ({
		handleActionResult: vi.fn((result) => result.data !== null),
	}),
}));

const { cancelShiftAction } = await import('@/app/actions/shifts');

const mockShift = {
	id: 'shift-1',
	clientName: '山田太郎',
	serviceTypeName: '身体介護',
	date: new Date('2024-01-15'),
	startTime: new Date('2024-01-15T09:00:00'),
	endTime: new Date('2024-01-15T10:00:00'),
	currentStaffName: '佐藤花子',
};

describe('CancelShiftDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(cancelShiftAction).mockResolvedValue({
			data: {} as any,
			error: null,
			status: 200,
		});
		// window.confirm をモック
		vi.spyOn(window, 'confirm').mockReturnValue(true);
	});

	it('ダイアログが開閉する', async () => {
		const onClose = vi.fn();
		const { rerender } = render(
			<CancelShiftDialog isOpen={false} shift={mockShift} onClose={onClose} />,
		);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		rerender(
			<CancelShiftDialog isOpen={true} shift={mockShift} onClose={onClose} />,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('シフトをキャンセル')).toBeInTheDocument();
	});

	it('シフト情報が表示される', () => {
		render(
			<CancelShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
	});

	it('キャンセル理由カテゴリを選択できる', async () => {
		const user = userEvent.setup();
		render(
			<CancelShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		const clientRadio = screen.getByLabelText('利用者都合');
		const staffRadio = screen.getByLabelText('スタッフ都合');
		const otherRadio = screen.getByLabelText('その他');

		expect(clientRadio).not.toBeChecked();
		expect(staffRadio).not.toBeChecked();
		expect(otherRadio).not.toBeChecked();

		await user.click(clientRadio);
		expect(clientRadio).toBeChecked();

		await user.click(staffRadio);
		expect(staffRadio).toBeChecked();
		expect(clientRadio).not.toBeChecked();
	});

	it('キャンセル理由を入力して送信できる', async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const onClose = vi.fn();

		render(
			<CancelShiftDialog
				isOpen={true}
				shift={mockShift}
				onClose={onClose}
				onSuccess={onSuccess}
			/>,
		);

		// カテゴリを選択
		await user.click(screen.getByLabelText('利用者都合'));

		// 理由を入力
		await user.type(
			screen.getByPlaceholderText(/キャンセル理由/),
			'体調不良のため',
		);

		// 送信
		await user.click(screen.getByRole('button', { name: 'キャンセルする' }));

		await waitFor(() => {
			expect(cancelShiftAction).toHaveBeenCalledWith({
				shiftId: mockShift.id,
				category: 'client',
				reason: '体調不良のため',
			});
		});

		expect(onSuccess).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it('理由が未入力の場合は送信ボタンが無効', () => {
		render(
			<CancelShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		const submitButton = screen.getByRole('button', { name: 'キャンセルする' });
		expect(submitButton).toBeDisabled();
	});

	it('カテゴリが未選択の場合は送信ボタンが無効', async () => {
		const user = userEvent.setup();
		render(
			<CancelShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		// 理由のみ入力
		await user.type(
			screen.getByPlaceholderText(/キャンセル理由/),
			'体調不良のため',
		);

		const submitButton = screen.getByRole('button', { name: 'キャンセルする' });
		expect(submitButton).toBeDisabled();
	});

	it('閉じるボタンでダイアログが閉じる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(
			<CancelShiftDialog isOpen={true} shift={mockShift} onClose={onClose} />,
		);

		await user.click(screen.getByRole('button', { name: '閉じる' }));

		expect(onClose).toHaveBeenCalled();
	});

	it('確認ダイアログでキャンセルした場合は送信されない', async () => {
		const user = userEvent.setup();
		vi.spyOn(window, 'confirm').mockReturnValue(false);

		render(
			<CancelShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		// カテゴリを選択
		await user.click(screen.getByLabelText('利用者都合'));

		// 理由を入力
		await user.type(
			screen.getByPlaceholderText(/キャンセル理由/),
			'体調不良のため',
		);

		// 送信（確認ダイアログでキャンセル）
		await user.click(screen.getByRole('button', { name: 'キャンセルする' }));

		expect(window.confirm).toHaveBeenCalled();
		expect(cancelShiftAction).not.toHaveBeenCalled();
	});
});

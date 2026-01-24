import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RestoreShiftDialog } from './RestoreShiftDialog';

vi.mock('@/app/actions/shifts', () => ({
	restoreShiftAction: vi.fn(),
	validateStaffAvailabilityAction: vi.fn(),
}));

vi.mock('@/hooks/useActionResultHandler', () => ({
	useActionResultHandler: () => ({
		handleActionResult: vi.fn(
			(result) => result.data !== null || result.status === 200,
		),
	}),
}));

const { restoreShiftAction, validateStaffAvailabilityAction } =
	await import('@/app/actions/shifts');

const mockShift = {
	id: 'shift-1',
	clientName: '山田太郎',
	serviceTypeName: '身体介護',
	date: new Date('2024-01-15'),
	startTime: new Date('2024-01-15T09:00:00'),
	endTime: new Date('2024-01-15T10:00:00'),
	currentStaffName: '佐藤花子',
	staffId: 'staff-1',
	cancelReason: '利用者の体調不良',
	cancelCategory: 'client',
};

describe('RestoreShiftDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(restoreShiftAction).mockResolvedValue({
			data: null,
			error: null,
			status: 200,
		});
		vi.mocked(validateStaffAvailabilityAction).mockResolvedValue({
			data: { available: true },
			error: null,
			status: 200,
		});
		// window.confirm をモック
		vi.spyOn(window, 'confirm').mockReturnValue(true);
	});

	it('ダイアログが開閉する', async () => {
		const onClose = vi.fn();
		const { rerender } = render(
			<RestoreShiftDialog isOpen={false} shift={mockShift} onClose={onClose} />,
		);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		rerender(
			<RestoreShiftDialog isOpen={true} shift={mockShift} onClose={onClose} />,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('シフトを復元')).toBeInTheDocument();
	});

	it('シフト情報が表示される', () => {
		render(
			<RestoreShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		expect(screen.getByText('山田太郎')).toBeInTheDocument();
		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('佐藤花子')).toBeInTheDocument();
	});

	it('キャンセル理由が表示される', () => {
		render(
			<RestoreShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		expect(screen.getByText('キャンセル情報')).toBeInTheDocument();
		expect(screen.getByText('利用者都合')).toBeInTheDocument();
		expect(screen.getByText('利用者の体調不良')).toBeInTheDocument();
	});

	it('復元を実行できる', async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const onClose = vi.fn();

		render(
			<RestoreShiftDialog
				isOpen={true}
				shift={mockShift}
				onClose={onClose}
				onSuccess={onSuccess}
			/>,
		);

		// 送信
		await user.click(screen.getByRole('button', { name: '復元する' }));

		await waitFor(() => {
			expect(restoreShiftAction).toHaveBeenCalledWith({
				shiftId: mockShift.id,
			});
		});

		expect(onSuccess).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it('閉じるボタンでダイアログが閉じる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(
			<RestoreShiftDialog isOpen={true} shift={mockShift} onClose={onClose} />,
		);

		await user.click(screen.getByRole('button', { name: '閉じる' }));

		expect(onClose).toHaveBeenCalled();
	});

	it('確認ダイアログでキャンセルした場合は送信されない', async () => {
		const user = userEvent.setup();
		vi.spyOn(window, 'confirm').mockReturnValue(false);

		render(
			<RestoreShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		// 送信（確認ダイアログでキャンセル）
		await user.click(screen.getByRole('button', { name: '復元する' }));

		expect(window.confirm).toHaveBeenCalled();
		expect(restoreShiftAction).not.toHaveBeenCalled();
	});

	it('時間重複がある場合は警告が表示される', async () => {
		vi.mocked(validateStaffAvailabilityAction).mockResolvedValue({
			data: {
				available: false,
				conflictingShifts: [
					{
						id: 'conflict-1',
						clientName: '鈴木次郎',
						startTime: new Date('2024-01-15T09:30:00'),
						endTime: new Date('2024-01-15T10:30:00'),
					},
				],
			},
			error: null,
			status: 200,
		});

		render(
			<RestoreShiftDialog isOpen={true} shift={mockShift} onClose={vi.fn()} />,
		);

		await waitFor(() => {
			expect(screen.getByText(/鈴木次郎/)).toBeInTheDocument();
		});
	});

	it('スタッフが未設定の場合は時間重複チェックをスキップする', () => {
		const shiftWithoutStaff = {
			...mockShift,
			staffId: null,
			currentStaffName: '未割当',
		};

		render(
			<RestoreShiftDialog
				isOpen={true}
				shift={shiftWithoutStaff}
				onClose={vi.fn()}
			/>,
		);

		expect(validateStaffAvailabilityAction).not.toHaveBeenCalled();
	});
});

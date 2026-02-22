import {
	updateShiftScheduleAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangeStaffDialog } from './ChangeStaffDialog';

vi.mock('@/app/actions/shifts');

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		refresh: refreshMock,
	}),
}));

const mockStaffOptions: StaffPickerOption[] = [
	{
		id: 'staff-1',
		name: '山田太郎',
		role: 'helper' as const,
		serviceTypeIds: ['life-support'],
	},
	{
		id: 'staff-2',
		name: '鈴木花子',
		role: 'helper' as const,
		serviceTypeIds: ['physical-care'],
	},
];

const mockShift = {
	id: 'shift-1',
	clientName: '田中太郎',
	serviceTypeName: '生活援助',
	date: new Date('2026-01-22'),
	startTime: new Date('2026-01-22T09:00:00+09:00'),
	endTime: new Date('2026-01-22T12:00:00+09:00'),
	currentStaffName: '佐藤次郎',
	currentStaffId: 'staff-3',
};

describe('ChangeStaffDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(validateStaffAvailabilityAction).mockResolvedValue({
			data: { available: true },
			error: null,
			status: 200,
		});
		vi.mocked(updateShiftScheduleAction).mockResolvedValue({
			data: { shiftId: 'shift-1' },
			error: null,
			status: 200,
		});
	});

	it('ダイアログが開閉する', () => {
		const { rerender } = render(
			<ChangeStaffDialog
				isOpen={false}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		rerender(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('担当者を変更')).toBeInTheDocument();
	});

	it('シフト情報が表示される', () => {
		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		expect(screen.getByText('田中太郎')).toBeInTheDocument();
		expect(screen.getByText('生活援助')).toBeInTheDocument();
		expect(screen.getByText(/09:00.*12:00/)).toBeInTheDocument();
		expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
	});

	it('スタッフを選択して変更できる', async () => {
		const user = userEvent.setup();
		const onSuccess = vi.fn();
		const onClose = vi.fn();

		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={onClose}
				onSuccess={onSuccess}
			/>,
		);

		// スタッフを選択ボタンをクリック
		const selectButton = screen.getByRole('button', { name: 'スタッフを選択' });
		await user.click(selectButton);

		// StaffPickerDialogが開く（別のダイアログ）
		await waitFor(() => {
			expect(screen.getByText('担当者を選択')).toBeInTheDocument();
		});

		// スタッフピッカーダイアログでスタッフを選択
		const staffRow = screen.getByText('山田太郎').closest('[role="row"]');
		await user.click(staffRow!);

		// 確定ボタンをクリック
		const confirmButton = screen.getByRole('button', { name: '確定する' });
		await user.click(confirmButton);

		// ダイアログが閉じて、選択されたスタッフが表示される
		await waitFor(() => {
			expect(screen.queryByText('担当者を選択')).not.toBeInTheDocument();
		});

		// 変更ボタンをクリック
		const changeButton = screen.getByRole('button', { name: '変更' });
		await user.click(changeButton);

		await waitFor(() => {
			expect(updateShiftScheduleAction).toHaveBeenCalledWith({
				shiftId: 'shift-1',
				staffId: 'staff-1',
				dateStr: '2026-01-22',
				startTimeStr: '09:00',
				endTimeStr: '12:00',
				reason: undefined,
			});
		});

		expect(onSuccess).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
		expect(refreshMock).toHaveBeenCalled();
	});

	it('変更理由を入力できる', async () => {
		const user = userEvent.setup();

		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		// スタッフを選択ボタンをクリック
		const selectButton = screen.getByRole('button', { name: 'スタッフを選択' });
		await user.click(selectButton);

		// スタッフを選択
		await waitFor(() => {
			expect(screen.getByText('山田太郎')).toBeInTheDocument();
		});
		const staffRow = screen.getByText('山田太郎').closest('[role="row"]');
		await user.click(staffRow!);

		// 確定ボタンをクリック
		const confirmButton = screen.getByRole('button', { name: '確定する' });
		await user.click(confirmButton);

		// ダイアログが閉じるのを待つ
		await waitFor(() => {
			expect(screen.queryByText('担当者を選択')).not.toBeInTheDocument();
		});

		// 変更理由を入力
		const reasonTextarea = screen.getByPlaceholderText(/変更理由/);
		await user.type(reasonTextarea, '緊急対応のため');

		// 変更ボタンをクリック
		const changeButton = screen.getByRole('button', { name: '変更' });
		await user.click(changeButton);

		await waitFor(() => {
			expect(updateShiftScheduleAction).toHaveBeenCalledWith({
				shiftId: 'shift-1',
				staffId: 'staff-1',
				dateStr: '2026-01-22',
				startTimeStr: '09:00',
				endTimeStr: '12:00',
				reason: '緊急対応のため',
			});
		});
	});

	it('時間重複がある場合に警告が表示される', async () => {
		const user = userEvent.setup();
		vi.mocked(validateStaffAvailabilityAction).mockResolvedValue({
			data: {
				available: false,
				conflictingShifts: [
					{
						id: 'conflict-1',
						clientName: '佐藤花子',
						startTime: new Date('2026-01-22T10:00:00+09:00'),
						endTime: new Date('2026-01-22T13:00:00+09:00'),
					},
				],
			},
			error: null,
			status: 200,
		});

		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		// スタッフを選択ボタンをクリック
		const selectButton = screen.getByRole('button', { name: 'スタッフを選択' });
		await user.click(selectButton);

		// スタッフを選択
		await waitFor(() => {
			expect(screen.getByText('山田太郎')).toBeInTheDocument();
		});
		const staffRow = screen.getByText('山田太郎').closest('[role="row"]');
		await user.click(staffRow!);

		// 確定ボタンをクリック
		const confirmButton = screen.getByRole('button', { name: '確定する' });
		await user.click(confirmButton);

		// スタッフピッカーダイアログが閉じてから警告が表示される
		await waitFor(() => {
			expect(screen.queryByText('担当者を選択')).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText(/時間重複の警告/)).toBeInTheDocument();
			expect(screen.getByText('佐藤花子')).toBeInTheDocument();
		});
	});

	it('スタッフを選択していない場合は変更ボタンが無効', () => {
		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		const changeButton = screen.getByRole('button', { name: '変更' });
		expect(changeButton).toBeDisabled();
	});
});

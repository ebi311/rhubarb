import {
	updateShiftScheduleAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
	{
		id: 'staff-3',
		name: '佐藤次郎',
		role: 'admin' as const,
		serviceTypeIds: ['life-support'],
	},
];

const mockShift = {
	id: 'shift-1',
	clientName: '田中太郎',
	serviceTypeName: '生活援助',
	date: new Date('2099-01-22'),
	startTime: new Date('2099-01-22T09:00:00+09:00'),
	endTime: new Date('2099-01-22T12:00:00+09:00'),
	currentStaffName: '佐藤次郎',
	currentStaffId: 'staff-3',
};

describe('ChangeStaffDialog', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

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
		expect(screen.getAllByText('佐藤次郎').length).toBeGreaterThanOrEqual(1);
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
		const selectButton = screen.getByRole('button', {
			name: /新しい担当者/,
		});
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
				dateStr: '2099-01-22',
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
		const selectButton = screen.getByRole('button', {
			name: /新しい担当者/,
		});
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
		const reasonTextarea = screen.getByLabelText('変更理由（任意）');
		await user.type(reasonTextarea, '緊急対応のため');

		// 変更ボタンをクリック
		const changeButton = screen.getByRole('button', { name: '変更' });
		await user.click(changeButton);

		await waitFor(() => {
			expect(updateShiftScheduleAction).toHaveBeenCalledWith({
				shiftId: 'shift-1',
				staffId: 'staff-1',
				dateStr: '2099-01-22',
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
						startTime: new Date('2099-01-22T10:00:00+09:00'),
						endTime: new Date('2099-01-22T13:00:00+09:00'),
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
		const selectButton = screen.getByRole('button', {
			name: /新しい担当者/,
		});
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

	it('onStartAdjustment が渡された場合、調整相談ボタンが表示される', () => {
		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
				onStartAdjustment={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole('button', { name: '調整相談' }),
		).toBeInTheDocument();
	});

	it('onStartAdjustment が渡されない場合、調整相談ボタンは表示されない', () => {
		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		expect(
			screen.queryByRole('button', { name: '調整相談' }),
		).not.toBeInTheDocument();
	});

	it('調整相談ボタンをクリックすると onClose と onStartAdjustment が呼ばれる', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onStartAdjustment = vi.fn();

		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={onClose}
				onSuccess={vi.fn()}
				onStartAdjustment={onStartAdjustment}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '調整相談' }));

		expect(onClose).toHaveBeenCalled();
		expect(onStartAdjustment).toHaveBeenCalledWith('shift-1');
	});

	it('元シフトが未割当の場合は変更ボタンが無効', () => {
		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={{
					...mockShift,
					currentStaffName: '未割当',
					currentStaffId: null,
				}}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		const changeButton = screen.getByRole('button', { name: '変更' });
		expect(changeButton).toBeDisabled();
	});

	it('日付/開始/終了を編集して保存できる', async () => {
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

		// 日時を編集
		const dateInput = screen.getByLabelText('日付');
		await user.clear(dateInput);
		await user.type(dateInput, '2099-01-23');

		const startInput = screen.getByLabelText('開始');
		await user.clear(startInput);
		await user.type(startInput, '10:00');

		const endInput = screen.getByLabelText('終了');
		await user.clear(endInput);
		await user.type(endInput, '13:00');

		// スタッフを選択
		await user.click(
			screen.getByRole('button', {
				name: /新しい担当者/,
			}),
		);
		await waitFor(() => {
			expect(screen.getByText('担当者を選択')).toBeInTheDocument();
		});
		const staffRow = screen.getByText('山田太郎').closest('[role="row"]');
		await user.click(staffRow!);
		await user.click(screen.getByRole('button', { name: '確定する' }));

		await waitFor(() => {
			expect(validateStaffAvailabilityAction).toHaveBeenCalledWith({
				staffId: 'staff-1',
				startTime: new Date('2099-01-23T01:00:00.000Z').toISOString(),
				endTime: new Date('2099-01-23T04:00:00.000Z').toISOString(),
				excludeShiftId: 'shift-1',
			});
		});

		// 変更
		await user.click(screen.getByRole('button', { name: '変更' }));

		await waitFor(() => {
			expect(updateShiftScheduleAction).toHaveBeenCalledWith({
				shiftId: 'shift-1',
				staffId: 'staff-1',
				dateStr: '2099-01-23',
				startTimeStr: '10:00',
				endTimeStr: '13:00',
				reason: undefined,
			});
		});
	});

	it('initialSuggestion がある場合はスタッフ・日時の初期値に反映される', () => {
		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={mockShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
				initialSuggestion={{
					shiftId: 'shift-1',
					newStaffId: 'staff-2',
					newStartTime: new Date('2099-01-23T01:00:00.000Z'),
					newEndTime: new Date('2099-01-23T04:00:00.000Z'),
				}}
			/>,
		);

		expect(
			screen.getByRole('button', { name: '新しい担当者: 鈴木花子' }),
		).toBeInTheDocument();
		expect(screen.getByLabelText('日付')).toHaveValue('2099-01-23');
		expect(screen.getByLabelText('開始')).toHaveValue('10:00');
		expect(screen.getByLabelText('終了')).toHaveValue('13:00');
	});

	it('過去シフトの場合は編集操作と実行操作が無効化される', async () => {
		const user = userEvent.setup();
		const onStartAdjustment = vi.fn();
		const pastShift = {
			...mockShift,
			date: new Date('2020-01-22'),
			startTime: new Date('2020-01-22T09:00:00+09:00'),
			endTime: new Date('2020-01-22T12:00:00+09:00'),
		};

		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={pastShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
				onStartAdjustment={onStartAdjustment}
			/>,
		);

		expect(screen.getByLabelText('日付')).toBeDisabled();
		expect(screen.getByLabelText('開始')).toBeDisabled();
		expect(screen.getByLabelText('終了')).toBeDisabled();
		expect(screen.getByRole('button', { name: /新しい担当者/ })).toBeDisabled();
		expect(screen.getByLabelText('変更理由（任意）')).toBeDisabled();
		expect(screen.getByRole('button', { name: '変更' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '調整相談' })).toBeDisabled();

		await user.click(screen.getByRole('button', { name: '調整相談' }));
		expect(onStartAdjustment).not.toHaveBeenCalled();
	});

	it('過去シフトの場合は変更ボタン押下でも更新アクションを呼ばない', async () => {
		const user = userEvent.setup();
		const pastShift = {
			...mockShift,
			date: new Date('2020-01-22'),
			startTime: new Date('2020-01-22T09:00:00+09:00'),
			endTime: new Date('2020-01-22T12:00:00+09:00'),
		};

		render(
			<ChangeStaffDialog
				isOpen={true}
				shift={pastShift}
				staffOptions={mockStaffOptions}
				onClose={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '変更' }));

		expect(updateShiftScheduleAction).not.toHaveBeenCalled();
	});
});

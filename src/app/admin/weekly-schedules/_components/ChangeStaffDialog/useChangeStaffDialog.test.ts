import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChangeStaffDialog } from './useChangeStaffDialog';

vi.mock('@/app/actions/shifts', () => ({
	changeShiftStaffAction: vi.fn(),
	validateStaffAvailabilityAction: vi.fn(),
}));

vi.mock('@/hooks/useActionResultHandler', () => ({
	useActionResultHandler: () => ({
		handleActionResult: vi.fn((result) => result.data !== null),
	}),
}));

const { changeShiftStaffAction, validateStaffAvailabilityAction } =
	await import('@/app/actions/shifts');

const mockShift = {
	id: 'shift-1',
	clientName: '山田太郎',
	serviceTypeName: '身体介護',
	date: new Date('2024-01-15'),
	startTime: new Date('2024-01-15T09:00:00'),
	endTime: new Date('2024-01-15T10:00:00'),
	currentStaffName: '佐藤花子',
	currentStaffId: 'staff-1',
};

describe('useChangeStaffDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(validateStaffAvailabilityAction).mockResolvedValue({
			data: { available: true, conflictingShifts: [] },
			error: null,
			status: 200,
		});
		vi.mocked(changeShiftStaffAction).mockResolvedValue({
			data: { oldStaffName: '佐藤花子', newStaffName: '山田太郎' },
			error: null,
			status: 200,
		});
	});

	it('初期状態が正しく設定される', () => {
		const { result } = renderHook(() => useChangeStaffDialog(mockShift, true));

		expect(result.current.selectedStaffId).toBeNull();
		expect(result.current.reason).toBe('');
		expect(result.current.conflictingShifts).toEqual([]);
		expect(result.current.isChecking).toBe(false);
		expect(result.current.isSubmitting).toBe(false);
		expect(result.current.showStaffPicker).toBe(false);
	});

	it('ダイアログが開いたときに状態がリセットされる', () => {
		const { result, rerender } = renderHook(
			({ isOpen }) => useChangeStaffDialog(mockShift, isOpen),
			{
				initialProps: { isOpen: false },
			},
		);

		// 状態を変更
		act(() => {
			result.current.setSelectedStaffId('staff-2');
			result.current.setReason('理由');
		});

		// ダイアログを開く
		rerender({ isOpen: true });

		// リセットされる
		expect(result.current.selectedStaffId).toBeNull();
		expect(result.current.reason).toBe('');
		expect(result.current.conflictingShifts).toEqual([]);
	});

	it('スタッフが選択されたときに時間重複チェックが実行される', async () => {
		const { result } = renderHook(() => useChangeStaffDialog(mockShift, true));

		act(() => {
			result.current.handleStaffSelect('staff-2');
		});

		await waitFor(() => {
			expect(validateStaffAvailabilityAction).toHaveBeenCalledWith({
				staffId: 'staff-2',
				startTime: mockShift.startTime.toISOString(),
				endTime: mockShift.endTime.toISOString(),
				excludeShiftId: mockShift.id,
			});
		});

		expect(result.current.selectedStaffId).toBe('staff-2');
		expect(result.current.conflictingShifts).toEqual([]);
	});

	it('時間重複がある場合にconflictingShiftsが設定される', async () => {
		vi.mocked(validateStaffAvailabilityAction).mockResolvedValue({
			data: {
				available: false,
				conflictingShifts: [
					{
						id: 'shift-2',
						clientName: '鈴木一郎',
						startTime: '2024-01-15T09:30:00' as unknown as Date,
						endTime: '2024-01-15T10:30:00' as unknown as Date,
					},
				],
			},
			error: null,
			status: 200,
		});

		const { result } = renderHook(() => useChangeStaffDialog(mockShift, true));

		act(() => {
			result.current.handleStaffSelect('staff-2');
		});

		await waitFor(() => {
			expect(result.current.conflictingShifts).toHaveLength(1);
		});

		expect(result.current.conflictingShifts[0].clientName).toBe('鈴木一郎');
		expect(result.current.conflictingShifts[0].startTime).toBeInstanceOf(Date);
	});

	it('handleSubmitが正しく動作する', async () => {
		const onSuccess = vi.fn();
		const onClose = vi.fn();

		const { result } = renderHook(() =>
			useChangeStaffDialog(mockShift, true, onSuccess, onClose),
		);

		// スタッフを選択
		act(() => {
			result.current.setSelectedStaffId('staff-2');
			result.current.setReason('急遽変更');
		});

		// 送信
		await act(async () => {
			await result.current.handleSubmit();
		});

		expect(changeShiftStaffAction).toHaveBeenCalledWith({
			shiftId: mockShift.id,
			newStaffId: 'staff-2',
			reason: '急遽変更',
		});

		expect(onSuccess).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it('スタッフが選択されていない場合はhandleSubmitが何もしない', async () => {
		const onSuccess = vi.fn();

		const { result } = renderHook(() =>
			useChangeStaffDialog(mockShift, true, onSuccess, vi.fn()),
		);

		await act(async () => {
			await result.current.handleSubmit();
		});

		expect(changeShiftStaffAction).not.toHaveBeenCalled();
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it('理由が空の場合はundefinedで送信される', async () => {
		const { result } = renderHook(() =>
			useChangeStaffDialog(mockShift, true, vi.fn(), vi.fn()),
		);

		act(() => {
			result.current.setSelectedStaffId('staff-2');
		});

		await act(async () => {
			await result.current.handleSubmit();
		});

		expect(changeShiftStaffAction).toHaveBeenCalledWith({
			shiftId: mockShift.id,
			newStaffId: 'staff-2',
			reason: undefined,
		});
	});
});

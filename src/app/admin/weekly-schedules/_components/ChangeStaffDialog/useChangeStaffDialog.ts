import {
	changeShiftStaffAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import { useCallback, useEffect, useState } from 'react';
import type { ConflictingShift } from '../StaffConflictWarning';
import type { ChangeStaffDialogShift } from './ChangeStaffDialog';

export const useChangeStaffDialog = (
	shift: ChangeStaffDialogShift,
	isOpen: boolean,
	onSuccess?: () => void,
	onClose?: () => void,
) => {
	const [showStaffPicker, setShowStaffPicker] = useState(false);
	const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
	const [reason, setReason] = useState('');
	const [conflictingShifts, setConflictingShifts] = useState<
		ConflictingShift[]
	>([]);
	const [isChecking, setIsChecking] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { handleActionResult } = useActionResultHandler();

	// ダイアログが開いたときにリセット
	useEffect(() => {
		if (isOpen) {
			setSelectedStaffId(null);
			setReason('');
			setConflictingShifts([]);
			setShowStaffPicker(false);
		}
	}, [isOpen]);

	// スタッフが選択されたときに時間重複チェック
	useEffect(() => {
		if (!selectedStaffId || !isOpen) {
			setConflictingShifts([]);
			return;
		}

		const checkAvailability = async () => {
			setIsChecking(true);
			try {
				const result = await validateStaffAvailabilityAction({
					staffId: selectedStaffId,
					startTime: shift.startTime.toISOString(),
					endTime: shift.endTime.toISOString(),
					excludeShiftId: shift.id,
				});

				if (
					result.data &&
					!result.data.available &&
					result.data.conflictingShifts
				) {
					setConflictingShifts(
						result.data.conflictingShifts.map((s) => ({
							...s,
							startTime: new Date(s.startTime),
							endTime: new Date(s.endTime),
						})),
					);
				} else {
					setConflictingShifts([]);
				}
			} finally {
				setIsChecking(false);
			}
		};

		checkAvailability();
	}, [selectedStaffId, isOpen, shift.id, shift.startTime, shift.endTime]);

	const handleStaffSelect = useCallback((staffId: string) => {
		setSelectedStaffId(staffId);
		setShowStaffPicker(false);
	}, []);

	const handleSubmit = useCallback(async () => {
		if (!selectedStaffId) return;

		setIsSubmitting(true);
		try {
			const result = await changeShiftStaffAction({
				shiftId: shift.id,
				newStaffId: selectedStaffId,
				reason: reason || undefined,
			});

			const success = handleActionResult(result, {
				successMessage: `${result.data?.oldStaffName} → ${result.data?.newStaffName}に変更しました`,
				errorMessage: '担当者の変更に失敗しました',
			});

			if (success) {
				onSuccess?.();
				onClose?.();
			}
		} finally {
			setIsSubmitting(false);
		}
	}, [
		selectedStaffId,
		shift.id,
		reason,
		handleActionResult,
		onSuccess,
		onClose,
	]);

	return {
		showStaffPicker,
		setShowStaffPicker,
		selectedStaffId,
		setSelectedStaffId,
		reason,
		setReason,
		conflictingShifts,
		isChecking,
		isSubmitting,
		handleStaffSelect,
		handleSubmit,
	};
};

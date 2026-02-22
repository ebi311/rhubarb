import {
	updateShiftScheduleAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import { formatJstDateString, getJstHours, getJstMinutes } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ConflictingShift } from '../StaffConflictWarning';
import type { ChangeStaffDialogShift } from './ChangeStaffDialog';

const toJstTimeStr = (date: Date): string => {
	const h = getJstHours(date);
	const m = getJstMinutes(date);
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

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
	const router = useRouter();

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
			const result = await updateShiftScheduleAction({
				shiftId: shift.id,
				staffId: selectedStaffId,
				dateStr: formatJstDateString(shift.date),
				startTimeStr: toJstTimeStr(shift.startTime),
				endTimeStr: toJstTimeStr(shift.endTime),
				reason: reason || undefined,
			});

			const success = handleActionResult(result, {
				successMessage: 'シフトを更新しました',
				errorMessage: 'シフトの更新に失敗しました',
			});

			if (success) {
				router.refresh();
				onSuccess?.();
				onClose?.();
			}
		} finally {
			setIsSubmitting(false);
		}
	}, [
		selectedStaffId,
		shift.id,
		shift.date,
		shift.startTime,
		shift.endTime,
		reason,
		handleActionResult,
		router,
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

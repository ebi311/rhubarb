import {
	updateShiftScheduleAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import {
	formatJstDateString,
	parseHHmm,
	parseJstDateString,
	setJstTime,
	toJstTimeStr,
} from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConflictingShift } from '../StaffConflictWarning';
import type { ChangeStaffDialogShift } from './ChangeStaffDialog';

export const useChangeStaffDialog = (
	shift: ChangeStaffDialogShift,
	isOpen: boolean,
	onSuccess?: () => void,
	onClose?: () => void,
) => {
	const [showStaffPicker, setShowStaffPicker] = useState(false);
	const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
		shift.currentStaffId ?? null,
	);
	const [reason, setReason] = useState('');
	const [dateStr, setDateStr] = useState(formatJstDateString(shift.date));
	const [startTimeStr, setStartTimeStr] = useState(
		toJstTimeStr(shift.startTime),
	);
	const [endTimeStr, setEndTimeStr] = useState(toJstTimeStr(shift.endTime));
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
			setSelectedStaffId(shift.currentStaffId ?? null);
			setReason('');
			setDateStr(formatJstDateString(shift.date));
			setStartTimeStr(toJstTimeStr(shift.startTime));
			setEndTimeStr(toJstTimeStr(shift.endTime));
			setConflictingShifts([]);
			setShowStaffPicker(false);
		}
	}, [
		isOpen,
		shift.id,
		shift.currentStaffId,
		shift.date,
		shift.startTime,
		shift.endTime,
	]);

	const baseDate = useMemo(() => {
		try {
			const parsed = parseJstDateString(dateStr);
			return Number.isNaN(parsed.getTime()) ? shift.date : parsed;
		} catch {
			return shift.date;
		}
	}, [dateStr, shift.date]);
	const parsedStart = useMemo(() => parseHHmm(startTimeStr), [startTimeStr]);
	const parsedEnd = useMemo(() => parseHHmm(endTimeStr), [endTimeStr]);
	const editedStartTime = useMemo(() => {
		if (!parsedStart) return shift.startTime;
		return setJstTime(baseDate, parsedStart.hour, parsedStart.minute);
	}, [baseDate, parsedStart, shift.startTime]);
	const editedEndTime = useMemo(() => {
		if (!parsedEnd) return shift.endTime;
		return setJstTime(baseDate, parsedEnd.hour, parsedEnd.minute);
	}, [baseDate, parsedEnd, shift.endTime]);

	// スタッフが選択されたときに時間重複チェック
	useEffect(() => {
		if (!selectedStaffId || !isOpen) {
			setConflictingShifts([]);
			return;
		}

		if (!parsedStart || !parsedEnd) {
			setConflictingShifts([]);
			return;
		}

		const checkAvailability = async () => {
			setIsChecking(true);
			try {
				const result = await validateStaffAvailabilityAction({
					staffId: selectedStaffId,
					startTime: editedStartTime.toISOString(),
					endTime: editedEndTime.toISOString(),
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
	}, [
		selectedStaffId,
		isOpen,
		shift.id,
		editedStartTime,
		editedEndTime,
		parsedStart,
		parsedEnd,
	]);

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
				dateStr,
				startTimeStr,
				endTimeStr,
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
		dateStr,
		startTimeStr,
		endTimeStr,
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
		dateStr,
		setDateStr,
		startTimeStr,
		setStartTimeStr,
		endTimeStr,
		setEndTimeStr,
		editedStartTime,
		editedEndTime,
		editedDate: baseDate,
		conflictingShifts,
		isChecking,
		isSubmitting,
		handleStaffSelect,
		handleSubmit,
	};
};

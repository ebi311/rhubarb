import {
	updateShiftScheduleAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import {
	formatJstDateString,
	getJstDateOnly,
	parseHHmm,
	parseJstDateString,
	setJstTime,
	toJstTimeStr,
} from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdjustmentWizardSuggestion } from '../AdjustmentWizardDialog';
import type { ConflictingShift } from '../StaffConflictWarning';
import type { ChangeStaffDialogShift } from './ChangeStaffDialog';

type DialogInitialValues = {
	selectedStaffId: string | null;
	dateStr: string;
	startTimeStr: string;
	endTimeStr: string;
};

const createDialogInitialValues = (
	shift: ChangeStaffDialogShift,
	initialSuggestion?: AdjustmentWizardSuggestion,
): DialogInitialValues => {
	const startTime = initialSuggestion?.newStartTime ?? shift.startTime;
	const endTime = initialSuggestion?.newEndTime ?? shift.endTime;

	return {
		selectedStaffId:
			initialSuggestion?.newStaffId ?? shift.currentStaffId ?? null,
		dateStr: formatJstDateString(startTime),
		startTimeStr: toJstTimeStr(startTime),
		endTimeStr: toJstTimeStr(endTime),
	};
};

export const useChangeStaffDialog = (
	shift: ChangeStaffDialogShift,
	isOpen: boolean,
	onSuccess?: () => void,
	onClose?: () => void,
	initialSuggestion?: AdjustmentWizardSuggestion,
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

	const initialSuggestionStaffId = initialSuggestion?.newStaffId;
	const initialSuggestionStartTimeMs =
		initialSuggestion?.newStartTime.getTime();
	const initialSuggestionEndTimeMs = initialSuggestion?.newEndTime.getTime();
	const shiftStartTimeMs = shift.startTime.getTime();
	const shiftEndTimeMs = shift.endTime.getTime();

	// ダイアログが開いたときにリセット
	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const initialValues = createDialogInitialValues(shift, initialSuggestion);

		setSelectedStaffId(initialValues.selectedStaffId);
		setReason('');
		setDateStr(initialValues.dateStr);
		setStartTimeStr(initialValues.startTimeStr);
		setEndTimeStr(initialValues.endTimeStr);
		setConflictingShifts([]);
		setShowStaffPicker(false);
	}, [
		initialSuggestionEndTimeMs,
		initialSuggestionStaffId,
		initialSuggestionStartTimeMs,
		isOpen,
		shift.currentStaffId,
		shiftEndTimeMs,
		shiftStartTimeMs,
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

	const isPastShift = useMemo(() => {
		const shiftDateJst = getJstDateOnly(shift.date);
		const todayJst = getJstDateOnly(new Date());
		return shiftDateJst.getTime() < todayJst.getTime();
	}, [shift.date]);

	// スタッフが選択されたときに時間重複チェック
	useEffect(() => {
		if (!selectedStaffId || !isOpen || isPastShift) {
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
		isPastShift,
	]);

	const handleStaffSelect = useCallback((staffId: string) => {
		setSelectedStaffId(staffId);
		setShowStaffPicker(false);
	}, []);

	const handleSubmit = useCallback(async () => {
		if (!selectedStaffId || isPastShift) return;

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
		isPastShift,
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
		isPastShift,
		handleStaffSelect,
		handleSubmit,
	};
};

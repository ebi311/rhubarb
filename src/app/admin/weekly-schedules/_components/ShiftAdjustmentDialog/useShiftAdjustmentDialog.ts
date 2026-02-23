import {
	suggestClientDatetimeChangeAdjustmentsAction,
	suggestShiftAdjustmentsAction,
} from '@/app/actions/shiftAdjustments';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type {
	ClientDatetimeChangeActionInput,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import {
	addJstDays,
	formatJstDateString,
	getJstDateOnly,
	parseJstDateString,
	stringToTimeObject,
} from '@/utils/date';
import { useEffect, useMemo, useState } from 'react';
import type { ShiftDisplayRow } from '../ShiftTable';

type AdjustmentType = 'staff_absence' | 'client_datetime_change';

type UseShiftAdjustmentDialogParams = {
	isOpen: boolean;
	weekStartDate: Date;
	staffOptions: StaffPickerOption[];
	shifts: ShiftDisplayRow[];
	requestSuggestions?: (input: {
		staffId: string;
		startDate: string;
		endDate: string;
		memo?: string;
	}) => Promise<ActionResult<SuggestShiftAdjustmentsOutput>>;
	requestClientDatetimeChangeSuggestions?: (
		input: ClientDatetimeChangeActionInput,
	) => Promise<ActionResult<SuggestClientDatetimeChangeAdjustmentsOutput>>;
};

const toDateInputString = (
	value: string,
	offsetDays: number,
	fallback: string,
) => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return fallback;
	}
	return formatJstDateString(addJstDays(parseJstDateString(value), offsetDays));
};

const ACTION_ERROR_MESSAGE = '処理できませんでした。';

export const useShiftAdjustmentDialog = ({
	isOpen,
	weekStartDate,
	staffOptions,
	shifts,
	requestSuggestions,
	requestClientDatetimeChangeSuggestions,
}: UseShiftAdjustmentDialogParams) => {
	const [adjustmentType, setAdjustmentType] =
		useState<AdjustmentType>('staff_absence');
	const helperStaffOptions = useMemo(
		() => staffOptions.filter((s) => s.role === 'helper'),
		[staffOptions],
	);
	const { handleActionResult } = useActionResultHandler();
	const todayDateStr = formatJstDateString(getJstDateOnly(new Date()));

	const [staffId, setStaffId] = useState('');
	const [startDateStr, setStartDateStr] = useState(todayDateStr);
	const [endDateStr, setEndDateStr] = useState(todayDateStr);
	const [targetShiftId, setTargetShiftId] = useState('');
	const [newDateStr, setNewDateStr] = useState(
		formatJstDateString(weekStartDate),
	);
	const [newStartTime, setNewStartTime] = useState('09:00');
	const [newEndTime, setNewEndTime] = useState('10:00');
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultData, setResultData] =
		useState<SuggestShiftAdjustmentsOutput | null>(null);
	const [clientResultData, setClientResultData] =
		useState<SuggestClientDatetimeChangeAdjustmentsOutput | null>(null);

	useEffect(() => {
		if (!isOpen) return;

		setAdjustmentType('staff_absence');
		setStaffId('');
		setStartDateStr(todayDateStr);
		setEndDateStr(todayDateStr);
		setTargetShiftId('');
		setNewDateStr(formatJstDateString(weekStartDate));
		setNewStartTime('09:00');
		setNewEndTime('10:00');
		setMemo('');
		setIsSubmitting(false);
		setErrorMessage(null);
		setResultData(null);
		setClientResultData(null);
	}, [isOpen, todayDateStr, weekStartDate]);

	const startDateMin = useMemo(
		() => toDateInputString(endDateStr, -13, todayDateStr),
		[endDateStr, todayDateStr],
	);
	const startDateMax = endDateStr;
	const endDateMin = startDateStr;
	const endDateMax = useMemo(
		() => toDateInputString(startDateStr, 13, todayDateStr),
		[startDateStr, todayDateStr],
	);

	const shiftMap = useMemo(() => {
		const map = new Map<string, ShiftDisplayRow>();
		for (const shift of shifts) map.set(shift.id, shift);
		return map;
	}, [shifts]);

	const staffNameMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const staff of helperStaffOptions) map.set(staff.id, staff.name);
		return map;
	}, [helperStaffOptions]);

	const selectedStaffName = staffNameMap.get(staffId);

	const targetableShifts = useMemo(() => {
		const weekStart = getJstDateOnly(weekStartDate).getTime();
		const weekEnd = weekStart + 6 * 86400000;
		return shifts.filter((shift) => {
			const dateTime = getJstDateOnly(shift.date).getTime();
			return (
				shift.status === 'scheduled' &&
				!shift.isUnassigned &&
				shift.staffId !== null &&
				dateTime >= weekStart &&
				dateTime <= weekEnd
			);
		});
	}, [shifts, weekStartDate]);

	const clearResultsAndError = () => {
		setResultData(null);
		setClientResultData(null);
		setErrorMessage(null);
	};

	const handleStaffAbsenceSubmit = async () => {
		clearResultsAndError();
		if (startDateStr > endDateStr) {
			setErrorMessage('開始日は終了日以前を指定してください。');
			return;
		}
		setIsSubmitting(true);
		try {
			const action = requestSuggestions ?? suggestShiftAdjustmentsAction;
			const res = await action({
				staffId,
				startDate: startDateStr,
				endDate: endDateStr,
				memo: memo.trim() ? memo.trim() : undefined,
			});
			if (
				!handleActionResult(res, {
					errorMessage: ACTION_ERROR_MESSAGE,
					onError: () => {
						console.error('Failed to suggest shift adjustments', {
							error: res.error,
							details: res.details,
						});
					},
				})
			) {
				setErrorMessage(ACTION_ERROR_MESSAGE);
				return;
			}
			setResultData(res.data);
			setClientResultData(null);
		} catch (error) {
			console.error('Unexpected error while suggesting shift adjustments', {
				error,
			});
			handleActionResult(
				{ data: null, error: ACTION_ERROR_MESSAGE, status: 500 },
				{ errorMessage: ACTION_ERROR_MESSAGE },
			);
			setErrorMessage(
				'提案の取得に失敗しました。通信状況を確認して再度お試しください。',
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClientDatetimeChangeSubmit = async () => {
		clearResultsAndError();
		const parsedStartTime = stringToTimeObject(newStartTime);
		const parsedEndTime = stringToTimeObject(newEndTime);
		if (!parsedStartTime || !parsedEndTime) {
			setErrorMessage('時刻の形式が不正です。HH:mm 形式で入力してください。');
			return;
		}
		const startTotalMinutes =
			parsedStartTime.hour * 60 + parsedStartTime.minute;
		const endTotalMinutes = parsedEndTime.hour * 60 + parsedEndTime.minute;
		if (startTotalMinutes >= endTotalMinutes) {
			setErrorMessage('開始時刻は終了時刻より前を指定してください。');
			return;
		}
		setIsSubmitting(true);
		try {
			const action =
				requestClientDatetimeChangeSuggestions ??
				suggestClientDatetimeChangeAdjustmentsAction;
			const res = await action({
				shiftId: targetShiftId,
				newDate: newDateStr,
				newStartTime: parsedStartTime,
				newEndTime: parsedEndTime,
				memo: memo.trim() ? memo.trim() : undefined,
			});
			if (
				!handleActionResult(res, {
					errorMessage: ACTION_ERROR_MESSAGE,
					onError: () => {
						console.error(
							'Failed to suggest client datetime change adjustments',
							{
								error: res.error,
								details: res.details,
							},
						);
					},
				})
			) {
				setErrorMessage(ACTION_ERROR_MESSAGE);
				return;
			}
			setClientResultData(res.data);
			setResultData(null);
		} catch (error) {
			console.error(
				'Unexpected error while suggesting client datetime change adjustments',
				{ error },
			);
			handleActionResult(
				{ data: null, error: ACTION_ERROR_MESSAGE, status: 500 },
				{ errorMessage: ACTION_ERROR_MESSAGE },
			);
			setErrorMessage(
				'提案の取得に失敗しました。通信状況を確認して再度お試しください。',
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSubmit = async () => {
		if (adjustmentType === 'staff_absence') {
			await handleStaffAbsenceSubmit();
			return;
		}
		await handleClientDatetimeChangeSubmit();
	};

	const handleAdjustmentTypeChange = (nextType: AdjustmentType) => {
		setAdjustmentType(nextType);
		clearResultsAndError();
	};

	return {
		adjustmentType,
		helperStaffOptions,
		staffId,
		startDateStr,
		endDateStr,
		targetShiftId,
		newDateStr,
		newStartTime,
		newEndTime,
		memo,
		isSubmitting,
		errorMessage,
		resultData,
		clientResultData,
		startDateMin,
		startDateMax,
		endDateMin,
		endDateMax,
		selectedStaffName,
		targetableShifts,
		shiftMap,
		staffNameMap,
		setStaffId,
		setStartDateStr,
		setEndDateStr,
		setTargetShiftId,
		setNewDateStr,
		setNewStartTime,
		setNewEndTime,
		setMemo,
		handleSubmit,
		handleAdjustmentTypeChange,
	};
};

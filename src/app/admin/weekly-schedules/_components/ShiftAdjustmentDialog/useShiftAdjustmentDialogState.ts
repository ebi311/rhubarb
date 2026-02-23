import type {
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import { formatJstDateString, getJstDateOnly } from '@/utils/date';
import { useState } from 'react';
import {
	DEFAULT_END_TIME,
	DEFAULT_START_TIME,
	type AdjustmentType,
} from './shiftAdjustmentDialogHelpers';

type UseShiftAdjustmentDialogStateParams = {
	weekStartDate: Date;
};

export const useShiftAdjustmentDialogState = ({
	weekStartDate,
}: UseShiftAdjustmentDialogStateParams) => {
	const todayDateStr = formatJstDateString(getJstDateOnly(new Date()));

	const [adjustmentType, setAdjustmentType] =
		useState<AdjustmentType>('staff_absence');
	const [staffId, setStaffId] = useState('');
	const [startDateStr, setStartDateStr] = useState(todayDateStr);
	const [endDateStr, setEndDateStr] = useState(todayDateStr);
	const [targetShiftId, setTargetShiftId] = useState('');
	const [newDateStr, setNewDateStr] = useState(
		formatJstDateString(weekStartDate),
	);
	const [newStartTime, setNewStartTime] = useState(DEFAULT_START_TIME);
	const [newEndTime, setNewEndTime] = useState(DEFAULT_END_TIME);
	const [memo, setMemo] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultData, setResultData] =
		useState<SuggestShiftAdjustmentsOutput | null>(null);
	const [clientResultData, setClientResultData] =
		useState<SuggestClientDatetimeChangeAdjustmentsOutput | null>(null);

	return {
		todayDateStr,
		adjustmentType,
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
		setAdjustmentType,
		setStaffId,
		setStartDateStr,
		setEndDateStr,
		setTargetShiftId,
		setNewDateStr,
		setNewStartTime,
		setNewEndTime,
		setMemo,
		setIsSubmitting,
		setErrorMessage,
		setResultData,
		setClientResultData,
	};
};

import {
	suggestClientDatetimeChangeAdjustmentsAction,
	suggestShiftAdjustmentsAction,
} from '@/app/actions/shiftAdjustments';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { HandleActionResult } from '@/hooks/useActionResultHandler';
import type {
	ClientDatetimeChangeActionInput,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import type { Dispatch, SetStateAction } from 'react';
import {
	ACTION_ERROR_MESSAGE,
	toOptionalMemo,
	validateClientDatetimeChangeTimes,
	validateStaffAbsenceRange,
	type AdjustmentType,
} from './shiftAdjustmentDialogHelpers';

type UseShiftAdjustmentDialogSubmitParams = {
	adjustmentType: AdjustmentType;
	staffId: string;
	startDateStr: string;
	endDateStr: string;
	targetShiftId: string;
	newDateStr: string;
	newStartTime: string;
	newEndTime: string;
	memo: string;
	requestSuggestions?: (input: {
		staffId: string;
		startDate: string;
		endDate: string;
		memo?: string;
	}) => Promise<ActionResult<SuggestShiftAdjustmentsOutput>>;
	requestClientDatetimeChangeSuggestions?: (
		input: ClientDatetimeChangeActionInput,
	) => Promise<ActionResult<SuggestClientDatetimeChangeAdjustmentsOutput>>;
	handleActionResult: HandleActionResult;
	setIsSubmitting: Dispatch<SetStateAction<boolean>>;
	setErrorMessage: Dispatch<SetStateAction<string | null>>;
	setResultData: Dispatch<SetStateAction<SuggestShiftAdjustmentsOutput | null>>;
	setClientResultData: Dispatch<
		SetStateAction<SuggestClientDatetimeChangeAdjustmentsOutput | null>
	>;
};

export const useShiftAdjustmentDialogSubmit = ({
	adjustmentType,
	staffId,
	startDateStr,
	endDateStr,
	targetShiftId,
	newDateStr,
	newStartTime,
	newEndTime,
	memo,
	requestSuggestions,
	requestClientDatetimeChangeSuggestions,
	handleActionResult,
	setIsSubmitting,
	setErrorMessage,
	setResultData,
	setClientResultData,
}: UseShiftAdjustmentDialogSubmitParams) => {
	const clearResultsAndError = () => {
		setResultData(null);
		setClientResultData(null);
		setErrorMessage(null);
	};

	const handleStaffAbsenceSubmit = async () => {
		clearResultsAndError();
		const validationError = validateStaffAbsenceRange(startDateStr, endDateStr);
		if (validationError) {
			setErrorMessage(validationError);
			return;
		}
		setIsSubmitting(true);
		try {
			const action = requestSuggestions ?? suggestShiftAdjustmentsAction;
			const res = await action({
				staffId,
				startDate: startDateStr,
				endDate: endDateStr,
				memo: toOptionalMemo(memo),
			});
			if (!handleStaffAbsenceActionResult(res)) {
				return;
			}
			setResultData(res.data);
			setClientResultData(null);
		} catch (error) {
			handleStaffAbsenceUnexpectedError(error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClientDatetimeChangeSubmit = async () => {
		clearResultsAndError();
		const parsedResult = validateClientDatetimeChangeTimes(
			newStartTime,
			newEndTime,
		);
		if (!parsedResult.isValid) {
			setErrorMessage(parsedResult.errorMessage);
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
				newStartTime: parsedResult.parsedStartTime,
				newEndTime: parsedResult.parsedEndTime,
				memo: toOptionalMemo(memo),
			});
			if (!handleClientDatetimeChangeActionResult(res)) {
				return;
			}
			setClientResultData(res.data);
			setResultData(null);
		} catch (error) {
			handleClientDatetimeChangeUnexpectedError(error);
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

	const handleStaffAbsenceActionResult = (
		res: ActionResult<SuggestShiftAdjustmentsOutput>,
	) =>
		handleActionResult(res, {
			errorMessage: ACTION_ERROR_MESSAGE,
			onError: () => {
				console.error('Failed to suggest shift adjustments', {
					error: res.error,
					details: res.details,
				});
			},
		});

	const handleClientDatetimeChangeActionResult = (
		res: ActionResult<SuggestClientDatetimeChangeAdjustmentsOutput>,
	) =>
		handleActionResult(res, {
			errorMessage: ACTION_ERROR_MESSAGE,
			onError: () => {
				console.error('Failed to suggest client datetime change adjustments', {
					error: res.error,
					details: res.details,
				});
			},
		});

	const handleStaffAbsenceUnexpectedError = (error: unknown) => {
		handleUnexpectedError(
			'Unexpected error while suggesting shift adjustments',
			error,
		);
	};

	const handleClientDatetimeChangeUnexpectedError = (error: unknown) => {
		handleUnexpectedError(
			'Unexpected error while suggesting client datetime change adjustments',
			error,
		);
	};

	const handleUnexpectedError = (message: string, error: unknown) => {
		console.error(message, { error });
		handleActionResult(
			{ data: null, error: ACTION_ERROR_MESSAGE, status: 500 },
			{ errorMessage: ACTION_ERROR_MESSAGE },
		);
	};

	const handleAdjustmentTypeChange = () => {
		clearResultsAndError();
	};

	return {
		handleSubmit,
		handleAdjustmentTypeChange,
	};
};

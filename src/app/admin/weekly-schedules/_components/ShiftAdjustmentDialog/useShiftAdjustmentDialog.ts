import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type {
	ClientDatetimeChangeActionInput,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import type { ShiftDisplayRow } from '../ShiftTable';
import { useShiftAdjustmentDialogDerived } from './useShiftAdjustmentDialogDerived';
import {
	buildDialogResult,
	buildSubmitParams,
	createDialogAdjustmentTypeChangeHandler,
} from './useShiftAdjustmentDialogInternals';
import { useShiftAdjustmentDialogState } from './useShiftAdjustmentDialogState';
import { useShiftAdjustmentDialogSubmit } from './useShiftAdjustmentDialogSubmit';

type UseShiftAdjustmentDialogParams = {
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

export const useShiftAdjustmentDialog = ({
	weekStartDate,
	staffOptions,
	shifts,
	requestSuggestions,
	requestClientDatetimeChangeSuggestions,
}: UseShiftAdjustmentDialogParams) => {
	const state = useShiftAdjustmentDialogState({
		weekStartDate,
	});

	const derived = useShiftAdjustmentDialogDerived({
		staffOptions,
		shifts,
		weekStartDate,
		staffId: state.staffId,
		startDateStr: state.startDateStr,
		endDateStr: state.endDateStr,
		todayDateStr: state.todayDateStr,
	});

	const { handleActionResult } = useActionResultHandler();
	const { handleSubmit, handleAdjustmentTypeChange } =
		useShiftAdjustmentDialogSubmit(
			buildSubmitParams({
				state,
				requestSuggestions,
				requestClientDatetimeChangeSuggestions,
				handleActionResult,
			}),
		);

	const handleDialogAdjustmentTypeChange =
		createDialogAdjustmentTypeChangeHandler(
			state.setAdjustmentType,
			handleAdjustmentTypeChange,
		);

	return buildDialogResult({
		state,
		derived,
		handleSubmit,
		handleDialogAdjustmentTypeChange,
	});
};

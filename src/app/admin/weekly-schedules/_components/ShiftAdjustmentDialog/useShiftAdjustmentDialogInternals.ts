import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import type { HandleActionResult } from '@/hooks/useActionResultHandler';
import type {
	ClientDatetimeChangeActionInput,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import type { Dispatch, SetStateAction } from 'react';
import type { ShiftDisplayRow } from '../ShiftTable';
import type { AdjustmentType } from './shiftAdjustmentDialogHelpers';

type ShiftAdjustmentDialogStateLike = {
	adjustmentType: AdjustmentType;
	staffId: string;
	startDateStr: string;
	endDateStr: string;
	targetShiftId: string;
	newDateStr: string;
	newStartTime: string;
	newEndTime: string;
	memo: string;
	isSubmitting: boolean;
	errorMessage: string | null;
	resultData: SuggestShiftAdjustmentsOutput | null;
	clientResultData: SuggestClientDatetimeChangeAdjustmentsOutput | null;
	setAdjustmentType: Dispatch<SetStateAction<AdjustmentType>>;
	setStaffId: Dispatch<SetStateAction<string>>;
	setStartDateStr: Dispatch<SetStateAction<string>>;
	setEndDateStr: Dispatch<SetStateAction<string>>;
	setTargetShiftId: Dispatch<SetStateAction<string>>;
	setNewDateStr: Dispatch<SetStateAction<string>>;
	setNewStartTime: Dispatch<SetStateAction<string>>;
	setNewEndTime: Dispatch<SetStateAction<string>>;
	setMemo: Dispatch<SetStateAction<string>>;
	setIsSubmitting: Dispatch<SetStateAction<boolean>>;
	setErrorMessage: Dispatch<SetStateAction<string | null>>;
	setResultData: Dispatch<SetStateAction<SuggestShiftAdjustmentsOutput | null>>;
	setClientResultData: Dispatch<
		SetStateAction<SuggestClientDatetimeChangeAdjustmentsOutput | null>
	>;
};

type ShiftAdjustmentDialogDerivedLike = {
	helperStaffOptions: StaffPickerOption[];
	startDateMin: string;
	startDateMax: string;
	endDateMin: string;
	endDateMax: string;
	shiftMap: Map<string, ShiftDisplayRow>;
	staffNameMap: Map<string, string>;
	selectedStaffName: string | undefined;
	targetableShifts: ShiftDisplayRow[];
};

type BuildSubmitParamsArgs = {
	state: ShiftAdjustmentDialogStateLike;
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
};

export const buildSubmitParams = ({
	state,
	requestSuggestions,
	requestClientDatetimeChangeSuggestions,
	handleActionResult,
}: BuildSubmitParamsArgs) => ({
	adjustmentType: state.adjustmentType,
	staffId: state.staffId,
	startDateStr: state.startDateStr,
	endDateStr: state.endDateStr,
	targetShiftId: state.targetShiftId,
	newDateStr: state.newDateStr,
	newStartTime: state.newStartTime,
	newEndTime: state.newEndTime,
	memo: state.memo,
	requestSuggestions,
	requestClientDatetimeChangeSuggestions,
	handleActionResult,
	setIsSubmitting: state.setIsSubmitting,
	setErrorMessage: state.setErrorMessage,
	setResultData: state.setResultData,
	setClientResultData: state.setClientResultData,
});

export const createDialogAdjustmentTypeChangeHandler =
	(
		setAdjustmentType: Dispatch<SetStateAction<AdjustmentType>>,
		handleAdjustmentTypeChange: () => void,
	) =>
	(nextType: AdjustmentType) => {
		setAdjustmentType(nextType);
		handleAdjustmentTypeChange();
	};

type BuildDialogResultArgs = {
	state: ShiftAdjustmentDialogStateLike;
	derived: ShiftAdjustmentDialogDerivedLike;
	handleSubmit: () => Promise<void>;
	handleDialogAdjustmentTypeChange: (nextType: AdjustmentType) => void;
};

export const buildDialogResult = ({
	state,
	derived,
	handleSubmit,
	handleDialogAdjustmentTypeChange,
}: BuildDialogResultArgs) => ({
	adjustmentType: state.adjustmentType,
	helperStaffOptions: derived.helperStaffOptions,
	staffId: state.staffId,
	startDateStr: state.startDateStr,
	endDateStr: state.endDateStr,
	targetShiftId: state.targetShiftId,
	newDateStr: state.newDateStr,
	newStartTime: state.newStartTime,
	newEndTime: state.newEndTime,
	memo: state.memo,
	isSubmitting: state.isSubmitting,
	errorMessage: state.errorMessage,
	resultData: state.resultData,
	clientResultData: state.clientResultData,
	startDateMin: derived.startDateMin,
	startDateMax: derived.startDateMax,
	endDateMin: derived.endDateMin,
	endDateMax: derived.endDateMax,
	selectedStaffName: derived.selectedStaffName,
	targetableShifts: derived.targetableShifts,
	shiftMap: derived.shiftMap,
	staffNameMap: derived.staffNameMap,
	setStaffId: state.setStaffId,
	setStartDateStr: state.setStartDateStr,
	setEndDateStr: state.setEndDateStr,
	setTargetShiftId: state.setTargetShiftId,
	setNewDateStr: state.setNewDateStr,
	setNewStartTime: state.setNewStartTime,
	setNewEndTime: state.setNewEndTime,
	setMemo: state.setMemo,
	handleSubmit,
	handleAdjustmentTypeChange: handleDialogAdjustmentTypeChange,
});

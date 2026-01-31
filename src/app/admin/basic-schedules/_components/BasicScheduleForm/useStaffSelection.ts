import type { StaffRecord } from '@/models/staffActionSchemas';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type { StaffPickerOption } from '../StaffPickerDialog';
import type { BasicScheduleFormValues } from './BasicScheduleForm';
import {
	computeAllowedStaffIds,
	createStaffMap,
	getSelectedStaff,
	getStaffStatusMessage,
	mapStaffPickerOptions,
	resolveStaffPickerClearHandler,
	shouldDisableClearButton,
	shouldDisableStaffPickerButton,
} from './helpers';

type UseStaffSelectionParams = {
	staffs: StaffRecord[];
	serviceTypeId: ServiceTypeId | '' | undefined;
	selectedStaffId: string | null | undefined;
	setValue: UseFormSetValue<BasicScheduleFormValues>;
	isSubmitting: boolean;
};

export const useStaffSelection = ({
	staffs,
	serviceTypeId,
	selectedStaffId,
	setValue,
	isSubmitting,
}: UseStaffSelectionParams) => {
	const [isStaffPickerOpen, setStaffPickerOpen] = useState(false);

	const staffMap = useMemo(() => createStaffMap(staffs), [staffs]);

	const allowedStaffIds = useMemo(
		() => computeAllowedStaffIds(staffs, serviceTypeId),
		[staffs, serviceTypeId],
	);

	const staffPickerOptions: StaffPickerOption[] = useMemo(
		() => mapStaffPickerOptions(staffs, allowedStaffIds),
		[staffs, allowedStaffIds],
	);

	// サービス区分変更時に、許可されていないスタッフをクリア
	useEffect(() => {
		if (selectedStaffId && !allowedStaffIds.has(selectedStaffId)) {
			setValue('staffId', null);
		}
	}, [allowedStaffIds, selectedStaffId, setValue]);

	const selectedStaff = useMemo(
		() => getSelectedStaff(staffMap, selectedStaffId ?? null),
		[staffMap, selectedStaffId],
	);

	const staffStatusMessage = useMemo(
		() => getStaffStatusMessage(serviceTypeId, staffPickerOptions.length),
		[serviceTypeId, staffPickerOptions.length],
	);

	const canOpenStaffPicker = Boolean(serviceTypeId);

	const handleStaffConfirm = useCallback(
		(staffId: string) => {
			setValue('staffId', staffId, { shouldValidate: true });
			setStaffPickerOpen(false);
		},
		[setValue],
	);

	const handleStaffClear = useCallback(() => {
		setValue('staffId', null, { shouldValidate: true });
	}, [setValue]);

	const hasSelectedStaff = Boolean(selectedStaff);

	const staffPickerDisabled = shouldDisableStaffPickerButton(
		canOpenStaffPicker,
		isSubmitting,
	);

	const staffClearDisabled = shouldDisableClearButton(
		hasSelectedStaff,
		isSubmitting,
	);

	const staffPickerClearHandler = resolveStaffPickerClearHandler(
		selectedStaff,
		handleStaffClear,
	);

	return {
		// ダイアログ状態
		isStaffPickerOpen,
		openStaffPicker: () => setStaffPickerOpen(true),
		closeStaffPicker: () => setStaffPickerOpen(false),

		// 選択データ
		selectedStaff,
		staffPickerOptions,
		staffStatusMessage,

		// ハンドラ
		handleStaffConfirm,
		handleStaffClear,
		staffPickerClearHandler,

		// UI状態
		staffPickerDisabled,
		staffClearDisabled,
	};
};

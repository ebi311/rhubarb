import type { StaffRecord } from '@/models/staffActionSchemas';
import type { ServiceTypeId } from '@/models/valueObjects/serviceTypeId';
import type { TimeValue } from '@/models/valueObjects/time';
import type { StaffPickerOption } from '../StaffPickerDialog';

export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const parseTimeString = (value: string): TimeValue | null => {
	const match = TIME_PATTERN.exec(value);
	if (!match) return null;
	return { hour: Number(match[1]), minute: Number(match[2]) };
};

export const createStaffMap = (staffs: StaffRecord[]) =>
	new Map(staffs.map((staff) => [staff.id, staff]));

export const computeAllowedStaffIds = (
	staffs: StaffRecord[],
	serviceTypeId?: ServiceTypeId | '',
) => {
	if (!serviceTypeId) return new Set<string>();
	return new Set(
		staffs
			.filter((staff) =>
				staff.service_type_ids.includes(serviceTypeId as ServiceTypeId),
			)
			.map((staff) => staff.id),
	);
};

export const mapStaffPickerOptions = (
	staffs: StaffRecord[],
	allowedStaffIds: Set<string>,
): StaffPickerOption[] =>
	staffs
		.filter((staff) => allowedStaffIds.has(staff.id))
		.map((staff) => ({
			id: staff.id,
			name: staff.name,
			role: staff.role,
			note: staff.note,
			serviceTypeIds: staff.service_type_ids,
		}));

export const getStaffStatusMessage = (
	serviceTypeId?: string,
	optionCount: number = 0,
) => {
	if (!serviceTypeId) {
		return 'サービス区分を選択すると担当者を選べます。';
	}
	if (optionCount === 0) {
		return '選択されたサービス区分に紐づく担当者がいません。';
	}
	return `${optionCount}名の担当者が選択可能です。`;
};

export const getSelectedStaff = (
	staffMap: Map<string, StaffRecord>,
	staffId: string | null,
) => {
	if (!staffId) return null;
	return staffMap.get(staffId) ?? null;
};

export const sanitizeNote = (value?: string | null) => {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const getSelectClassName = (hasError: boolean) =>
	hasError ? 'select select-error' : 'select';

export const getFieldDescriptionId = (hasError: boolean, fieldId: string) =>
	hasError ? `${fieldId}-error` : undefined;

export const getSubmitButtonClass = (isSubmitting: boolean) =>
	isSubmitting ? 'btn btn-primary loading' : 'btn btn-primary';

export const shouldDisableStaffPickerButton = (
	canOpen: boolean,
	isSubmitting: boolean,
) => !canOpen || isSubmitting;

export const shouldDisableClearButton = (
	hasSelection: boolean,
	isSubmitting: boolean,
) => !hasSelection || isSubmitting;

export const shouldDisableSubmitButton = (
	isValid: boolean,
	isSubmitting: boolean,
) => !isValid || isSubmitting;

export const resolveStaffPickerClearHandler = (
	staff: StaffRecord | null,
	onClear: () => void,
) => (staff ? onClear : undefined);

import type { ClientStaffAssignmentLink } from '@/app/actions/clientStaffAssignments';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import type { Weekday } from '@/models/basicScheduleActionSchemas';
import type { StaffRecord } from '@/models/staffActionSchemas';
import type { TimeValue } from '@/models/valueObjects/time';
import type { StaffPickerOption } from '../StaffPickerDialog';

export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const parseTimeString = (value: string): TimeValue | null => {
	const match = TIME_PATTERN.exec(value);
	if (!match) return null;
	return { hour: Number(match[1]), minute: Number(match[2]) };
};

export const createServiceTypeNameMap = (serviceTypes: ServiceTypeOption[]) =>
	new Map(serviceTypes.map((type) => [type.id, type.name]));

export const createStaffMap = (staffs: StaffRecord[]) =>
	new Map(staffs.map((staff) => [staff.id, staff]));

export const computeAllowedStaffIds = (
	assignments: ClientStaffAssignmentLink[],
	clientId?: string,
	serviceTypeId?: string,
) => {
	if (!clientId || !serviceTypeId) {
		return new Set<string>();
	}
	return new Set(
		assignments
			.filter(
				(assignment) =>
					assignment.client_id === clientId && assignment.service_type_id === serviceTypeId,
			)
			.map((assignment) => assignment.staff_id),
	);
};

export const mapStaffPickerOptions = (
	staffs: StaffRecord[],
	allowedStaffIds: Set<string>,
	serviceTypeNameMap: Map<string, string>,
): StaffPickerOption[] =>
	staffs
		.filter((staff) => allowedStaffIds.has(staff.id))
		.map((staff) => ({
			id: staff.id,
			name: staff.name,
			role: staff.role,
			note: staff.note,
			serviceTypeNames: staff.service_type_ids
				.map((id) => serviceTypeNameMap.get(id))
				.filter((name): name is string => Boolean(name)),
		}));

export const getStaffStatusMessage = (
	clientId?: string,
	serviceTypeId?: string,
	optionCount: number = 0,
) => {
	if (!clientId || !serviceTypeId) {
		return '利用者とサービス区分を選択すると担当者を選べます。';
	}
	if (optionCount === 0) {
		return '選択された組み合わせで許可された担当者が存在しません。';
	}
	return `${optionCount}名の担当者が選択可能です。`;
};

export const getSelectedStaff = (staffMap: Map<string, StaffRecord>, staffId: string | null) => {
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

export const shouldDisableStaffPickerButton = (canOpen: boolean, isSubmitting: boolean) =>
	!canOpen || isSubmitting;

export const shouldDisableClearButton = (hasSelection: boolean, isSubmitting: boolean) =>
	!hasSelection || isSubmitting;

export const shouldDisableSubmitButton = (isValid: boolean, isSubmitting: boolean) =>
	!isValid || isSubmitting;

export const resolveStaffPickerClearHandler = (staff: StaffRecord | null, onClear: () => void) =>
	staff ? onClear : undefined;

export const WEEKDAY_LABELS: Record<Weekday, string> = {
	Sun: '日曜日',
	Mon: '月曜日',
	Tue: '火曜日',
	Wed: '水曜日',
	Thu: '木曜日',
	Fri: '金曜日',
	Sat: '土曜日',
};

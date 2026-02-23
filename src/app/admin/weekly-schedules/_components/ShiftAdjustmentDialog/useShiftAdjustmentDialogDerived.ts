import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { getJstDateOnly } from '@/utils/date';
import { useMemo } from 'react';
import type { ShiftDisplayRow } from '../ShiftTable';
import { toDateInputString } from './shiftAdjustmentDialogHelpers';

type UseShiftAdjustmentDialogDerivedParams = {
	staffOptions: StaffPickerOption[];
	shifts: ShiftDisplayRow[];
	weekStartDate: Date;
	staffId: string;
	startDateStr: string;
	endDateStr: string;
	todayDateStr: string;
};

export const useShiftAdjustmentDialogDerived = ({
	staffOptions,
	shifts,
	weekStartDate,
	staffId,
	startDateStr,
	endDateStr,
	todayDateStr,
}: UseShiftAdjustmentDialogDerivedParams) => {
	const helperStaffOptions = useMemo(
		() => staffOptions.filter((staff) => staff.role === 'helper'),
		[staffOptions],
	);

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

	return {
		helperStaffOptions,
		startDateMin,
		startDateMax,
		endDateMin,
		endDateMax,
		shiftMap,
		staffNameMap,
		selectedStaffName,
		targetableShifts,
	};
};

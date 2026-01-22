'use client';

import { generateWeeklyShiftsAction } from '@/app/actions/weeklySchedules';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { ServiceTypeLabels } from '@/models/valueObjects/serviceTypeId';
import { formatJstDateString, getJstDateOnly } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
	CancelShiftDialog,
	type CancelShiftDialogShift,
} from '../CancelShiftDialog';
import {
	ChangeStaffDialog,
	type ChangeStaffDialogShift,
} from '../ChangeStaffDialog';
import { EmptyState } from '../EmptyState';
import { GenerateButton, type GenerateResult } from '../GenerateButton';
import { ShiftTable, type ShiftDisplayRow } from '../ShiftTable';
import { WeekSelector } from '../WeekSelector';

export interface WeeklySchedulePageProps {
	weekStartDate: Date;
	initialShifts: ShiftDisplayRow[];
	staffOptions: StaffPickerOption[];
}

const shiftToDateTime = (
	date: Date,
	time: { hour: number; minute: number },
): Date => {
	const midnight = getJstDateOnly(date);
	return new Date(
		midnight.getTime() + time.hour * 3600000 + time.minute * 60000,
	);
};

const createChangeStaffDialogShift = (
	shift: ShiftDisplayRow,
): ChangeStaffDialogShift => ({
	id: shift.id,
	clientName: shift.clientName,
	serviceTypeName: ServiceTypeLabels[shift.serviceTypeId],
	date: shift.date,
	startTime: shiftToDateTime(shift.date, shift.startTime),
	endTime: shiftToDateTime(shift.date, shift.endTime),
	currentStaffName: shift.staffName ?? '未割当',
	currentStaffId: null, // ShiftDisplayRowにはstaffIdがないため
});

const createCancelShiftDialogShift = (
	shift: ShiftDisplayRow,
): CancelShiftDialogShift => ({
	id: shift.id,
	clientName: shift.clientName,
	serviceTypeName: ServiceTypeLabels[shift.serviceTypeId],
	date: shift.date,
	startTime: shiftToDateTime(shift.date, shift.startTime),
	endTime: shiftToDateTime(shift.date, shift.endTime),
	currentStaffName: shift.staffName ?? '未割当',
});

export const WeeklySchedulePage = ({
	weekStartDate,
	initialShifts,
	staffOptions,
}: WeeklySchedulePageProps) => {
	const router = useRouter();
	const [changeDialogShift, setChangeDialogShift] =
		useState<ShiftDisplayRow | null>(null);
	const [cancelDialogShift, setCancelDialogShift] =
		useState<ShiftDisplayRow | null>(null);

	const handleWeekChange = (date: Date) => {
		const weekParam = formatJstDateString(date);
		router.push(`/admin/weekly-schedules?week=${weekParam}`);
	};

	const handleGenerated = (_result: GenerateResult) => {
		router.refresh();
	};

	const handleGenerateFromEmpty = async () => {
		const result = await generateWeeklyShiftsAction(
			formatJstDateString(weekStartDate),
		);
		if (result.data) {
			router.refresh();
		}
	};

	const handleChangeStaff = (shift: ShiftDisplayRow) => {
		setChangeDialogShift(shift);
	};

	const handleAssignStaff = (shift: ShiftDisplayRow) => {
		// 割り当ても変更ダイアログを使用
		setChangeDialogShift(shift);
	};

	const handleCancelShift = (shift: ShiftDisplayRow) => {
		setCancelDialogShift(shift);
	};

	const handleDialogSuccess = () => {
		setChangeDialogShift(null);
		setCancelDialogShift(null);
		router.refresh();
	};

	const hasShifts = initialShifts.length > 0;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<WeekSelector
					currentWeek={weekStartDate}
					onWeekChange={handleWeekChange}
				/>
				<GenerateButton
					weekStartDate={weekStartDate}
					onGenerated={handleGenerated}
					disabled={false}
				/>
			</div>

			{hasShifts ? (
				<ShiftTable
					shifts={initialShifts}
					onChangeStaff={handleChangeStaff}
					onAssignStaff={handleAssignStaff}
					onCancelShift={handleCancelShift}
				/>
			) : (
				<EmptyState
					weekStartDate={weekStartDate}
					onGenerate={handleGenerateFromEmpty}
				/>
			)}

			{changeDialogShift && (
				<ChangeStaffDialog
					isOpen={!!changeDialogShift}
					shift={createChangeStaffDialogShift(changeDialogShift)}
					staffOptions={staffOptions}
					onClose={() => setChangeDialogShift(null)}
					onSuccess={handleDialogSuccess}
				/>
			)}

			{cancelDialogShift && (
				<CancelShiftDialog
					isOpen={!!cancelDialogShift}
					shift={createCancelShiftDialogShift(cancelDialogShift)}
					onClose={() => setCancelDialogShift(null)}
					onSuccess={handleDialogSuccess}
				/>
			)}
		</div>
	);
};

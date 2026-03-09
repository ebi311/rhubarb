'use client';

import { generateWeeklyShiftsAction } from '@/app/actions/weeklySchedules';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { ServiceTypeLabels } from '@/models/valueObjects/serviceTypeId';
import { formatJstDateString, getJstDateOnly } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdjustmentChatDialog } from '../AdjustmentChatDialog';
import type { ShiftContext } from '../AdjustmentChatDialog/useAdjustmentChat';
import {
	AdjustmentWizardDialog,
	type AdjustmentWizardSuggestion,
} from '../AdjustmentWizardDialog';
import {
	CancelShiftDialog,
	type CancelShiftDialogShift,
} from '../CancelShiftDialog';
import {
	ChangeStaffDialog,
	type ChangeStaffDialogShift,
} from '../ChangeStaffDialog';
import { CreateOneOffShiftButton } from '../CreateOneOffShiftButton';
import { CreateOneOffShiftDialog } from '../CreateOneOffShiftDialog';
import { EmptyState } from '../EmptyState';
import { GenerateButton, type GenerateResult } from '../GenerateButton';
import {
	RestoreShiftDialog,
	type RestoreShiftDialogShift,
} from '../RestoreShiftDialog';
import { ShiftTable, type ShiftDisplayRow } from '../ShiftTable';
import { WeekSelector } from '../WeekSelector';
import { StaffWeeklyShiftGrid, WeeklyShiftGrid } from '../WeeklyShiftGrid';
import {
	WeeklyViewToggleButton,
	type WeeklyViewMode,
} from '../WeeklyViewToggleButton';

export interface WeeklySchedulePageProps {
	weekStartDate: Date;
	initialShifts: ShiftDisplayRow[];
	staffOptions: StaffPickerOption[];
	clientOptions: { id: string; name: string }[];
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
	currentStaffId: shift.staffId,
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

const createRestoreShiftDialogShift = (
	shift: ShiftDisplayRow,
): RestoreShiftDialogShift => ({
	id: shift.id,
	clientName: shift.clientName,
	serviceTypeName: ServiceTypeLabels[shift.serviceTypeId],
	date: shift.date,
	startTime: shiftToDateTime(shift.date, shift.startTime),
	endTime: shiftToDateTime(shift.date, shift.endTime),
	currentStaffName: shift.staffName ?? '未割当',
	staffId: shift.staffId,
	cancelReason: shift.cancelReason ?? undefined,
	cancelCategory: shift.cancelCategory ?? undefined,
});

const findShiftById = (shifts: ShiftDisplayRow[], shiftId: string | null) => {
	if (!shiftId) {
		return null;
	}

	return shifts.find((shift) => shift.id === shiftId) ?? null;
};

const getReopenWizardShiftId = (
	shifts: ShiftDisplayRow[],
	shiftIds: string[],
) => {
	const reopenShiftId = shiftIds[0];
	if (!reopenShiftId) {
		return null;
	}

	return shifts.some((shift) => shift.id === reopenShiftId)
		? reopenShiftId
		: null;
};

const formatTimeStr = (time: { hour: number; minute: number }): string =>
	`${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

const createShiftContext = (shift: ShiftDisplayRow): ShiftContext => ({
	id: shift.id,
	clientName: shift.clientName,
	staffName: shift.staffName ?? undefined,
	date: formatJstDateString(shift.date),
	startTime: formatTimeStr(shift.startTime),
	endTime: formatTimeStr(shift.endTime),
});

const renderScheduleContent = ({
	hasShifts,
	viewMode,
	shifts,
	weekStartDate,
	onChangeStaff,
	onAssignStaff,
	onCancelShift,
	onRestoreShift,
	onAskAI,
	onOpenCreateOneOffShiftDialog,
	onGenerateFromEmpty,
}: {
	hasShifts: boolean;
	viewMode: WeeklyViewMode;
	shifts: ShiftDisplayRow[];
	weekStartDate: Date;
	onChangeStaff: (shift: ShiftDisplayRow) => void;
	onAssignStaff: (shift: ShiftDisplayRow) => void;
	onCancelShift: (shift: ShiftDisplayRow) => void;
	onRestoreShift: (shift: ShiftDisplayRow) => void;
	onAskAI: (shift: ShiftDisplayRow) => void;
	onOpenCreateOneOffShiftDialog: (dateStr: string, clientId?: string) => void;
	onGenerateFromEmpty: () => Promise<void>;
}) => {
	if (!hasShifts) {
		return (
			<EmptyState
				weekStartDate={weekStartDate}
				onGenerate={onGenerateFromEmpty}
			/>
		);
	}

	if (viewMode === 'list') {
		return (
			<ShiftTable
				shifts={shifts}
				onChangeStaff={onChangeStaff}
				onAssignStaff={onAssignStaff}
				onCancelShift={onCancelShift}
				onRestoreShift={onRestoreShift}
				onAskAI={onAskAI}
			/>
		);
	}

	if (viewMode === 'grid') {
		return (
			<WeeklyShiftGrid
				shifts={shifts}
				weekStartDate={weekStartDate}
				onChangeStaff={onChangeStaff}
				onAssignStaff={onAssignStaff}
				onCancelShift={onCancelShift}
				onRestoreShift={onRestoreShift}
				onAddOneOffShift={onOpenCreateOneOffShiftDialog}
			/>
		);
	}

	return (
		<StaffWeeklyShiftGrid
			shifts={shifts}
			weekStartDate={weekStartDate}
			onChangeStaff={onChangeStaff}
			onCancelShift={onCancelShift}
			onRestoreShift={onRestoreShift}
		/>
	);
};

export const WeeklySchedulePage = ({
	weekStartDate,
	initialShifts,
	staffOptions,
	clientOptions,
}: WeeklySchedulePageProps) => {
	const router = useRouter();
	const weekStartDateStr = formatJstDateString(weekStartDate);
	const [viewMode, setViewMode] = useState<WeeklyViewMode>('list');
	const [changeDialogShift, setChangeDialogShift] =
		useState<ShiftDisplayRow | null>(null);
	const [cancelDialogShift, setCancelDialogShift] =
		useState<ShiftDisplayRow | null>(null);
	const [restoreDialogShift, setRestoreDialogShift] =
		useState<ShiftDisplayRow | null>(null);
	const [isCreateOneOffOpen, setIsCreateOneOffOpen] = useState(false);
	const [wizardShiftId, setWizardShiftId] = useState<string | null>(null);
	const [wizardSuggestion, setWizardSuggestion] =
		useState<AdjustmentWizardSuggestion | null>(null);
	const [createOneOffDefaultDateStr, setCreateOneOffDefaultDateStr] = useState<
		string | undefined
	>();
	const [createOneOffDefaultClientId, setCreateOneOffDefaultClientId] =
		useState<string | undefined>();
	const [chatDialogShift, setChatDialogShift] =
		useState<ShiftDisplayRow | null>(null);

	const wizardShift = findShiftById(initialShifts, wizardShiftId);

	const handleOpenCreateOneOffShiftDialog = (
		defaultDateStr: string,
		defaultClientId?: string,
	) => {
		setCreateOneOffDefaultDateStr(defaultDateStr);
		setCreateOneOffDefaultClientId(defaultClientId);
		setIsCreateOneOffOpen(true);
	};

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

	const handleRestoreShift = (shift: ShiftDisplayRow) => {
		setRestoreDialogShift(shift);
	};

	const handleAskAI = (shift: ShiftDisplayRow) => {
		setChatDialogShift(shift);
	};

	const handleDialogSuccess = () => {
		setChangeDialogShift(null);
		setCancelDialogShift(null);
		setRestoreDialogShift(null);
		setWizardSuggestion(null);
		router.refresh();
	};

	const handleWizardAssigned = (suggestion: AdjustmentWizardSuggestion) => {
		setWizardShiftId(null);

		const targetShift =
			initialShifts.find((shift) => shift.id === suggestion.shiftId) ?? null;
		if (!targetShift) {
			setWizardSuggestion(null);
			return;
		}

		setWizardSuggestion(suggestion);
		setChangeDialogShift(targetShift);
	};

	const hasShifts = initialShifts.length > 0;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<WeekSelector
					currentWeek={weekStartDate}
					onWeekChange={handleWeekChange}
				/>
				<div className="flex items-center gap-2">
					<WeeklyViewToggleButton
						currentView={viewMode}
						onViewChange={setViewMode}
					/>
					<GenerateButton
						weekStartDate={weekStartDate}
						onGenerated={handleGenerated}
						disabled={false}
					/>
					<CreateOneOffShiftButton
						onOpen={() => handleOpenCreateOneOffShiftDialog(weekStartDateStr)}
					/>
				</div>
			</div>

			{renderScheduleContent({
				hasShifts,
				viewMode,
				shifts: initialShifts,
				weekStartDate,
				onChangeStaff: handleChangeStaff,
				onAssignStaff: handleAssignStaff,
				onCancelShift: handleCancelShift,
				onRestoreShift: handleRestoreShift,
				onAskAI: handleAskAI,
				onOpenCreateOneOffShiftDialog: handleOpenCreateOneOffShiftDialog,
				onGenerateFromEmpty: handleGenerateFromEmpty,
			})}

			<CreateOneOffShiftDialog
				isOpen={isCreateOneOffOpen}
				weekStartDate={weekStartDate}
				defaultDateStr={createOneOffDefaultDateStr}
				defaultClientId={createOneOffDefaultClientId}
				clientOptions={clientOptions}
				staffOptions={staffOptions}
				onClose={() => setIsCreateOneOffOpen(false)}
			/>

			{wizardShift && (
				<AdjustmentWizardDialog
					key={wizardShift.id}
					isOpen={true}
					shiftId={wizardShift.id}
					initialStartTime={shiftToDateTime(
						wizardShift.date,
						wizardShift.startTime,
					)}
					initialEndTime={shiftToDateTime(
						wizardShift.date,
						wizardShift.endTime,
					)}
					onClose={() => {
						setWizardShiftId(null);
					}}
					onAssigned={handleWizardAssigned}
					onCascadeReopen={(shiftIds) => {
						setWizardShiftId(getReopenWizardShiftId(initialShifts, shiftIds));
					}}
				/>
			)}

			{changeDialogShift && (
				<ChangeStaffDialog
					isOpen={!!changeDialogShift}
					shift={createChangeStaffDialogShift(changeDialogShift)}
					staffOptions={staffOptions}
					onClose={() => {
						setChangeDialogShift(null);
						setWizardSuggestion(null);
					}}
					onSuccess={handleDialogSuccess}
					initialSuggestion={
						wizardSuggestion?.shiftId === changeDialogShift.id
							? wizardSuggestion
							: undefined
					}
					onStartAdjustment={(shiftId) => {
						setChangeDialogShift(null);
						setWizardSuggestion(null);
						setWizardShiftId(shiftId);
					}}
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

			{restoreDialogShift && (
				<RestoreShiftDialog
					isOpen={!!restoreDialogShift}
					shift={createRestoreShiftDialogShift(restoreDialogShift)}
					onClose={() => setRestoreDialogShift(null)}
					onSuccess={handleDialogSuccess}
				/>
			)}

			{chatDialogShift && (
				<AdjustmentChatDialog
					isOpen={!!chatDialogShift}
					shiftContext={createShiftContext(chatDialogShift)}
					onClose={() => setChatDialogShift(null)}
				/>
			)}
		</div>
	);
};

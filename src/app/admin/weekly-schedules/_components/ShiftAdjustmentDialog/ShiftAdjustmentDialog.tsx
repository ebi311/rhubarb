'use client';

import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import type {
	ClientDatetimeChangeActionInput,
	SuggestClientDatetimeChangeAdjustmentsOutput,
	SuggestShiftAdjustmentsOutput,
} from '@/models/shiftAdjustmentActionSchemas';
import type { ShiftDisplayRow } from '../ShiftTable';
import { ClientDatetimeChangeForm } from './ClientDatetimeChangeForm';
import { StaffAbsenceForm } from './StaffAbsenceForm';
import { SuggestionResults } from './SuggestionResults';
import { useShiftAdjustmentDialog } from './useShiftAdjustmentDialog';

type ShiftAdjustmentDialogProps = {
	isOpen: boolean;
	weekStartDate: Date;
	staffOptions: StaffPickerOption[];
	shifts: ShiftDisplayRow[];
	onClose: () => void;
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

/* eslint-disable complexity */
export const ShiftAdjustmentDialog = ({
	isOpen,
	weekStartDate,
	staffOptions,
	shifts,
	onClose,
	requestSuggestions,
	requestClientDatetimeChangeSuggestions,
}: ShiftAdjustmentDialogProps) => {
	const {
		adjustmentType,
		helperStaffOptions,
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
		startDateMin,
		startDateMax,
		endDateMin,
		endDateMax,
		selectedStaffName,
		targetableShifts,
		shiftMap,
		staffNameMap,
		setStaffId,
		setStartDateStr,
		setEndDateStr,
		setTargetShiftId,
		setNewDateStr,
		setNewStartTime,
		setNewEndTime,
		setMemo,
		handleSubmit,
		handleAdjustmentTypeChange,
	} = useShiftAdjustmentDialog({
		isOpen,
		weekStartDate,
		staffOptions,
		shifts,
		requestSuggestions,
		requestClientDatetimeChangeSuggestions,
	});

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			className="modal-open modal modal-bottom sm:modal-middle"
			aria-modal="true"
		>
			<div className="modal-box max-w-3xl">
				<div className="flex items-start justify-between gap-2">
					<div>
						<h2 className="text-xl font-semibold">調整相談（Phase 1）</h2>
						<p className="text-sm text-base-content/70">
							調整タイプを選び、提案結果を確認できます（提案のみ・自動適用なし）
						</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						aria-label="閉じる"
						onClick={onClose}
						disabled={isSubmitting}
					>
						✕
					</button>
				</div>

				<div className="mt-4 space-y-4">
					<div role="radiogroup" aria-label="調整タイプ" className="join">
						<input
							type="radio"
							name="adjustment-type"
							className="btn join-item"
							aria-label="スタッフ欠勤"
							checked={adjustmentType === 'staff_absence'}
							onChange={() => handleAdjustmentTypeChange('staff_absence')}
							disabled={isSubmitting}
						/>
						<input
							type="radio"
							name="adjustment-type"
							className="btn join-item"
							aria-label="利用者都合の日時変更"
							checked={adjustmentType === 'client_datetime_change'}
							onChange={() =>
								handleAdjustmentTypeChange('client_datetime_change')
							}
							disabled={isSubmitting}
						/>
					</div>

					{adjustmentType === 'staff_absence' ? (
						<StaffAbsenceForm
							helperStaffOptions={helperStaffOptions}
							staffId={staffId}
							startDateStr={startDateStr}
							endDateStr={endDateStr}
							startDateMin={startDateMin}
							startDateMax={startDateMax}
							endDateMin={endDateMin}
							endDateMax={endDateMax}
							isSubmitting={isSubmitting}
							onStaffIdChange={setStaffId}
							onStartDateChange={setStartDateStr}
							onEndDateChange={setEndDateStr}
						/>
					) : (
						<ClientDatetimeChangeForm
							targetShiftId={targetShiftId}
							targetableShifts={targetableShifts}
							newDateStr={newDateStr}
							newStartTime={newStartTime}
							newEndTime={newEndTime}
							isSubmitting={isSubmitting}
							onTargetShiftChange={setTargetShiftId}
							onNewDateChange={setNewDateStr}
							onNewStartTimeChange={setNewStartTime}
							onNewEndTimeChange={setNewEndTime}
						/>
					)}

					<div>
						<label className="label" htmlFor="shift-adjust-memo">
							<span className="label-text">メモ（任意）</span>
						</label>
						<textarea
							id="shift-adjust-memo"
							className="textarea-bordered textarea w-full"
							rows={3}
							placeholder="例: 急な発熱のため休み"
							value={memo}
							onChange={(e) => setMemo(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					{adjustmentType === 'staff_absence' && selectedStaffName && (
						<div className="alert alert-info">
							<strong className="font-medium">対象:</strong> {selectedStaffName}
						</div>
					)}
					{errorMessage && (
						<div className="alert alert-error">{errorMessage}</div>
					)}

					<SuggestionResults
						adjustmentType={adjustmentType}
						resultData={resultData}
						clientResultData={clientResultData}
						shiftMap={shiftMap}
						staffNameMap={staffNameMap}
					/>
				</div>

				<div className="modal-action">
					<button
						type="button"
						className="btn btn-ghost"
						onClick={onClose}
						disabled={isSubmitting}
					>
						閉じる
					</button>
					<button
						type="button"
						className="btn btn-primary"
						onClick={handleSubmit}
						disabled={
							adjustmentType === 'staff_absence'
								? !staffId || !startDateStr || !endDateStr || isSubmitting
								: !targetShiftId ||
									!newDateStr ||
									!newStartTime ||
									!newEndTime ||
									isSubmitting
						}
					>
						{isSubmitting ? '取得中...' : '提案を取得'}
					</button>
				</div>
			</div>
		</div>
	);
};
/* eslint-enable complexity */

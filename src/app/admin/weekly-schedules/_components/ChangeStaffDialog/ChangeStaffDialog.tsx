'use client';

import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { StaffPickerDialog } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { useId } from 'react';
import type { AdjustmentWizardSuggestion } from '../AdjustmentWizardDialog';
import { ShiftInfoCard } from '../ShiftInfoCard';
import { StaffConflictWarning } from '../StaffConflictWarning';
import { useChangeStaffDialog } from './useChangeStaffDialog';

export type ChangeStaffDialogShift = {
	id: string;
	clientName: string;
	serviceTypeName: string;
	date: Date;
	startTime: Date;
	endTime: Date;
	currentStaffName: string;
	currentStaffId: string | null;
};

type ChangeStaffDialogProps = {
	isOpen: boolean;
	shift: ChangeStaffDialogShift;
	staffOptions: StaffPickerOption[];
	onClose: () => void;
	onSuccess?: () => void;
	onStartAdjustment?: (shiftId: string) => void;
	onStartAIChat?: (shiftId: string) => void;
	initialSuggestion?: AdjustmentWizardSuggestion;
};

type ChangeStaffDialogActionsProps = {
	shiftId: string;
	selectedStaffId: string | null;
	isInteractionLocked: boolean;
	isSubmitting: boolean;
	isPastShift: boolean;
	onClose: () => void;
	onStartAdjustment?: (shiftId: string) => void;
	onStartAIChat?: (shiftId: string) => void;
	handleSubmit: () => void;
};

const ChangeStaffDialogActions = ({
	shiftId,
	selectedStaffId,
	isInteractionLocked,
	isSubmitting,
	isPastShift,
	onClose,
	onStartAdjustment,
	onStartAIChat,
	handleSubmit,
}: ChangeStaffDialogActionsProps) => (
	<div className="modal-action">
		{onStartAdjustment && (
			<button
				type="button"
				className="btn btn-outline btn-sm"
				onClick={() => {
					onStartAdjustment(shiftId);
				}}
				disabled={isInteractionLocked}
			>
				調整相談
			</button>
		)}
		{onStartAIChat && !isPastShift && (
			<button
				type="button"
				className="btn btn-outline btn-sm"
				onClick={() => {
					onStartAIChat(shiftId);
				}}
				disabled={isSubmitting}
			>
				AIに相談
			</button>
		)}
		<button
			type="button"
			className="btn btn-ghost"
			onClick={onClose}
			disabled={isSubmitting}
		>
			キャンセル
		</button>
		<button
			type="button"
			className="btn btn-primary"
			onClick={handleSubmit}
			disabled={!selectedStaffId || isInteractionLocked}
		>
			{isSubmitting ? '変更中...' : '変更'}
		</button>
	</div>
);

export const ChangeStaffDialog = ({
	isOpen,
	shift,
	staffOptions,
	onClose,
	onSuccess,
	onStartAdjustment,
	onStartAIChat,
	initialSuggestion,
}: ChangeStaffDialogProps) => {
	const inputIdBase = useId();
	const reasonTextareaId = `${inputIdBase}-reason`;

	const {
		showStaffPicker,
		setShowStaffPicker,
		selectedStaffId,
		reason,
		setReason,
		dateStr,
		setDateStr,
		startTimeStr,
		setStartTimeStr,
		endTimeStr,
		setEndTimeStr,
		editedDate,
		editedStartTime,
		editedEndTime,
		conflictingShifts,
		isChecking,
		isSubmitting,
		isPastShift,
		handleStaffSelect,
		handleSubmit,
	} = useChangeStaffDialog(
		shift,
		isOpen,
		onSuccess,
		onClose,
		initialSuggestion,
	);

	const selectedStaff = staffOptions.find((s) => s.id === selectedStaffId);
	const isInteractionLocked = isSubmitting || isPastShift;

	if (!isOpen) return null;

	return (
		<>
			<div
				role="dialog"
				className="modal-open modal modal-bottom sm:modal-middle"
				aria-modal="true"
			>
				<div className="modal-box max-w-2xl">
					<div className="flex items-start justify-between gap-2">
						<div>
							<h2 className="text-xl font-semibold">担当者を変更</h2>
							<p className="text-sm text-base-content/70">
								シフトの担当者を別のスタッフに変更します
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
						<ShiftInfoCard
							shift={{
								...shift,
								date: editedDate,
								startTime: editedStartTime,
								endTime: editedEndTime,
							}}
						/>

						{/* 日時 */}
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div>
								<label className="label" htmlFor="change-staff-date">
									<span className="label-text font-medium">日付</span>
								</label>
								<input
									id="change-staff-date"
									type="date"
									className="input-bordered input w-full"
									value={dateStr}
									onChange={(e) => setDateStr(e.target.value)}
									disabled={isInteractionLocked}
								/>
							</div>
							<div>
								<label className="label" htmlFor="change-staff-start">
									<span className="label-text font-medium">開始</span>
								</label>
								<input
									id="change-staff-start"
									type="time"
									className="input-bordered input w-full"
									value={startTimeStr}
									onChange={(e) => setStartTimeStr(e.target.value)}
									disabled={isInteractionLocked}
								/>
							</div>
							<div>
								<label className="label" htmlFor="change-staff-end">
									<span className="label-text font-medium">終了</span>
								</label>
								<input
									id="change-staff-end"
									type="time"
									className="input-bordered input w-full"
									value={endTimeStr}
									onChange={(e) => setEndTimeStr(e.target.value)}
									disabled={isInteractionLocked}
								/>
							</div>
						</div>

						{/* スタッフ選択 */}
						<div>
							<label className="label">
								<span className="label-text font-medium">新しい担当者</span>
							</label>
							<button
								type="button"
								className="btn w-full btn-outline"
								aria-label={
									selectedStaff
										? `新しい担当者: ${selectedStaff.name}`
										: '新しい担当者'
								}
								onClick={() => setShowStaffPicker(true)}
								disabled={isInteractionLocked}
							>
								{selectedStaff ? selectedStaff.name : 'スタッフを選択'}
							</button>
						</div>

						{/* 時間重複警告 */}
						{isChecking ? (
							<div className="alert alert-info">可用性を確認中...</div>
						) : (
							<StaffConflictWarning conflictingShifts={conflictingShifts} />
						)}

						{/* 変更理由 */}
						<div>
							<label className="label" htmlFor={reasonTextareaId}>
								<span className="label-text">変更理由（任意）</span>
							</label>
							<textarea
								id={reasonTextareaId}
								className="textarea-bordered textarea w-full"
								rows={3}
								placeholder="変更理由を入力してください（任意）"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								disabled={isInteractionLocked}
							/>
						</div>
					</div>

					<ChangeStaffDialogActions
						shiftId={shift.id}
						selectedStaffId={selectedStaffId}
						isInteractionLocked={isInteractionLocked}
						isSubmitting={isSubmitting}
						isPastShift={isPastShift}
						onClose={onClose}
						onStartAdjustment={onStartAdjustment}
						onStartAIChat={onStartAIChat}
						handleSubmit={handleSubmit}
					/>
				</div>
			</div>

			<StaffPickerDialog
				isOpen={showStaffPicker}
				staffOptions={staffOptions}
				selectedStaffId={selectedStaffId}
				onClose={() => setShowStaffPicker(false)}
				onSelect={handleStaffSelect}
			/>
		</>
	);
};

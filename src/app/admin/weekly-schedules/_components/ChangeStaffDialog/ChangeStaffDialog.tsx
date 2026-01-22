'use client';

import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { StaffPickerDialog } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
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
};

export const ChangeStaffDialog = ({
	isOpen,
	shift,
	staffOptions,
	onClose,
	onSuccess,
}: ChangeStaffDialogProps) => {
	const {
		showStaffPicker,
		setShowStaffPicker,
		selectedStaffId,
		reason,
		setReason,
		conflictingShifts,
		isChecking,
		isSubmitting,
		handleStaffSelect,
		handleSubmit,
	} = useChangeStaffDialog(shift, isOpen, onSuccess, onClose);

	const selectedStaff = staffOptions.find((s) => s.id === selectedStaffId);

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
						<ShiftInfoCard shift={shift} />

						{/* スタッフ選択 */}
						<div>
							<label className="label">
								<span className="label-text font-medium">新しい担当者</span>
							</label>
							<button
								type="button"
								className="btn w-full btn-outline"
								onClick={() => setShowStaffPicker(true)}
								disabled={isSubmitting}
							>
								{selectedStaff ? selectedStaff.name : 'スタッフを選択'}
							</button>
						</div>

						{/* 時間重複警告 */}
						{isChecking && <div className="alert alert-info">可用性を確認中...</div>}
						{!isChecking && conflictingShifts.length > 0 && (
							<StaffConflictWarning conflictingShifts={conflictingShifts} />
						)}

						{/* 変更理由 */}
						<div>
							<label className="label">
								<span className="label-text">変更理由（任意）</span>
							</label>
							<textarea
								className="textarea-bordered textarea w-full"
								rows={3}
								placeholder="変更理由を入力してください（任意）"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								disabled={isSubmitting}
							/>
						</div>
					</div>

					<div className="modal-action">
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
							disabled={!selectedStaffId || isSubmitting}
						>
							{isSubmitting ? '変更中...' : '変更'}
						</button>
					</div>
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

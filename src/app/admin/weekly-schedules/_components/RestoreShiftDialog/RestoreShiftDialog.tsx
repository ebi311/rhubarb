'use client';

import {
	restoreShiftAction,
	validateStaffAvailabilityAction,
} from '@/app/actions/shifts';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import { useCallback, useEffect, useState } from 'react';
import { ShiftInfoCard } from '../ShiftInfoCard';
import { StaffConflictWarning } from '../StaffConflictWarning';

export type RestoreShiftDialogShift = {
	id: string;
	clientName: string;
	serviceTypeName: string;
	date: Date;
	startTime: Date;
	endTime: Date;
	currentStaffName: string;
	staffId: string | null;
	cancelReason?: string;
	cancelCategory?: string;
};

type ConflictingShift = {
	id: string;
	clientName: string;
	startTime: Date;
	endTime: Date;
};

type RestoreShiftDialogProps = {
	isOpen: boolean;
	shift: RestoreShiftDialogShift;
	onClose: () => void;
	onSuccess?: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
	client: '利用者都合',
	staff: 'スタッフ都合',
	other: 'その他',
};

// キャンセル情報表示コンポーネント
type CancelInfoCardProps = {
	cancelReason?: string;
	cancelCategory?: string;
};

const CancelInfoCard = ({
	cancelReason,
	cancelCategory,
}: CancelInfoCardProps) => {
	if (!cancelReason && !cancelCategory) return null;

	return (
		<div className="rounded-lg border border-base-200 bg-base-100 p-4">
			<h3 className="mb-2 font-semibold text-base-content/70">
				キャンセル情報
			</h3>
			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
				{cancelCategory && (
					<>
						<dt className="text-right text-base-content/70">カテゴリ</dt>
						<dd>{CATEGORY_LABELS[cancelCategory] ?? cancelCategory}</dd>
					</>
				)}
				{cancelReason && (
					<>
						<dt className="text-right text-base-content/70">理由</dt>
						<dd>{cancelReason}</dd>
					</>
				)}
			</dl>
		</div>
	);
};

// 時間重複チェックのカスタムフック
const useConflictCheck = (isOpen: boolean, shift: RestoreShiftDialogShift) => {
	const [conflictingShifts, setConflictingShifts] = useState<
		ConflictingShift[]
	>([]);
	const [isCheckingConflict, setIsCheckingConflict] = useState(false);

	useEffect(() => {
		if (!isOpen || !shift.staffId) {
			setConflictingShifts([]);
			return;
		}

		const checkConflict = async () => {
			setIsCheckingConflict(true);
			try {
				const result = await validateStaffAvailabilityAction({
					staffId: shift.staffId!,
					startTime: shift.startTime.toISOString(),
					endTime: shift.endTime.toISOString(),
					excludeShiftId: shift.id,
				});

				if (
					result.data &&
					!result.data.available &&
					result.data.conflictingShifts
				) {
					setConflictingShifts(result.data.conflictingShifts);
				} else {
					setConflictingShifts([]);
				}
			} catch {
				setConflictingShifts([]);
			} finally {
				setIsCheckingConflict(false);
			}
		};

		checkConflict();
	}, [isOpen, shift.staffId, shift.startTime, shift.endTime, shift.id]);

	return { conflictingShifts, isCheckingConflict };
};

export const RestoreShiftDialog = ({
	isOpen,
	shift,
	onClose,
	onSuccess,
}: RestoreShiftDialogProps) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { handleActionResult } = useActionResultHandler();
	const { conflictingShifts, isCheckingConflict } = useConflictCheck(
		isOpen,
		shift,
	);

	const handleSubmit = useCallback(async () => {
		// 最終確認
		const confirmed = window.confirm(
			'このシフトを復元しますか？ステータスが「予定」に戻ります。',
		);
		if (!confirmed) return;

		setIsSubmitting(true);
		try {
			const result = await restoreShiftAction({
				shiftId: shift.id,
			});

			const success = handleActionResult(result, {
				successMessage: 'シフトを復元しました',
				errorMessage: 'シフトの復元に失敗しました',
			});

			if (success) {
				onSuccess?.();
				onClose();
			}
		} finally {
			setIsSubmitting(false);
		}
	}, [shift.id, handleActionResult, onSuccess, onClose]);

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			className="modal-open modal modal-bottom sm:modal-middle"
			aria-modal="true"
		>
			<div className="modal-box max-w-2xl">
				<div className="flex items-start justify-between gap-2">
					<div>
						<h2 className="text-xl font-semibold">シフトを復元</h2>
						<p className="text-sm text-base-content/70">
							キャンセルされたシフトを復元します。ステータスが「予定」に戻ります。
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
					<CancelInfoCard
						cancelReason={shift.cancelReason ?? undefined}
						cancelCategory={shift.cancelCategory ?? undefined}
					/>
					{isCheckingConflict && (
						<div className="text-sm text-base-content/70">
							重複シフトを確認中...
						</div>
					)}
					{!isCheckingConflict && conflictingShifts.length > 0 && (
						<StaffConflictWarning conflictingShifts={conflictingShifts} />
					)}
				</div>

				<div className="modal-action">
					<button
						type="button"
						className="btn btn-ghost"
						onClick={onClose}
						disabled={isSubmitting}
					>
						戻る
					</button>
					<button
						type="button"
						className="btn btn-primary"
						onClick={handleSubmit}
						disabled={isSubmitting || isCheckingConflict}
					>
						{isSubmitting ? '復元中...' : '復元する'}
					</button>
				</div>
			</div>
		</div>
	);
};

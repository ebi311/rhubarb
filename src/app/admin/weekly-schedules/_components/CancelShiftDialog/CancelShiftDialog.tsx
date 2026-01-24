'use client';

import { cancelShiftAction } from '@/app/actions/shifts';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type { CancelShiftCategory } from '@/models/shiftActionSchemas';
import { useState } from 'react';
import { ShiftInfoCard } from '../ShiftInfoCard';

export type CancelShiftDialogShift = {
	id: string;
	clientName: string;
	serviceTypeName: string;
	date: Date;
	startTime: Date;
	endTime: Date;
	currentStaffName: string;
};

type CancelShiftDialogProps = {
	isOpen: boolean;
	shift: CancelShiftDialogShift;
	onClose: () => void;
	onSuccess?: () => void;
};

const CATEGORY_OPTIONS: { value: CancelShiftCategory; label: string }[] = [
	{ value: 'client', label: '利用者都合' },
	{ value: 'staff', label: 'スタッフ都合' },
	{ value: 'other', label: 'その他' },
];

export const CancelShiftDialog = ({
	isOpen,
	shift,
	onClose,
	onSuccess,
}: CancelShiftDialogProps) => {
	const [category, setCategory] = useState<CancelShiftCategory | null>(null);
	const [reason, setReason] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { handleActionResult } = useActionResultHandler();

	const canSubmit =
		category !== null && reason.trim().length > 0 && !isSubmitting;

	const handleSubmit = async () => {
		if (!category || !reason.trim()) return;

		// 最終確認
		const confirmed = window.confirm(
			'このシフトをキャンセルしてもよろしいですか？',
		);
		if (!confirmed) return;

		setIsSubmitting(true);
		try {
			const result = await cancelShiftAction({
				shiftId: shift.id,
				category,
				reason: reason.trim(),
			});

			const success = handleActionResult(result, {
				successMessage: 'シフトをキャンセルしました',
				errorMessage: 'シフトのキャンセルに失敗しました',
			});

			if (success) {
				onSuccess?.();
				onClose();
			}
		} finally {
			setIsSubmitting(false);
		}
	};

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
						<h2 className="text-xl font-semibold">シフトをキャンセル</h2>
						<p className="text-sm text-base-content/70">
							このシフトをキャンセルします。キャンセル理由を入力してください。
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

					{/* キャンセル理由カテゴリ */}
					<div>
						<label className="label">
							<span className="label-text font-medium">
								キャンセル理由カテゴリ
							</span>
						</label>
						<div className="flex flex-wrap gap-4">
							{CATEGORY_OPTIONS.map((option) => (
								<label
									key={option.value}
									className="label cursor-pointer gap-2"
								>
									<input
										type="radio"
										name="cancelCategory"
										className="radio radio-primary"
										checked={category === option.value}
										onChange={() => setCategory(option.value)}
										disabled={isSubmitting}
									/>
									<span className="label-text">{option.label}</span>
								</label>
							))}
						</div>
					</div>

					{/* キャンセル理由詳細 */}
					<div>
						<label className="label">
							<span className="label-text font-medium">
								キャンセル理由（必須）
							</span>
						</label>
						<textarea
							className="textarea-bordered textarea w-full"
							rows={3}
							placeholder="キャンセル理由を入力してください"
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
						戻る
					</button>
					<button
						type="button"
						className="btn btn-error"
						onClick={handleSubmit}
						disabled={!canSubmit}
					>
						{isSubmitting ? 'キャンセル中...' : 'キャンセルする'}
					</button>
				</div>
			</div>
		</div>
	);
};

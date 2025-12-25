'use client';

import { deleteStaffAction } from '@/app/actions/staffs';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const buildConfirmationSchema = (targetName: string) =>
	z.object({
		confirmationName: z
			.string()
			.min(1, { message: '担当者名を入力してください' })
			.refine((val) => val.trim() === targetName, {
				message: '担当者名が一致していません',
			}),
	});

type DeleteStaffFormValues = z.infer<ReturnType<typeof buildConfirmationSchema>>;

type DeleteStaffDialogProps = {
	isOpen: boolean;
	staff: Pick<StaffRecord, 'id' | 'name'>;
	onClose: () => void;
	onDeleted?: (staffId: string) => void;
};

export const DeleteStaffDialog = ({
	isOpen,
	staff,
	onClose,
	onDeleted,
}: DeleteStaffDialogProps) => {
	const [apiError, setApiError] = useState<string | null>(null);
	const confirmationSchema = useMemo(() => buildConfirmationSchema(staff.name), [staff.name]);
	const { handleActionResult } = useActionResultHandler();

	const { register, handleSubmit, reset, formState } = useForm<DeleteStaffFormValues>({
		resolver: zodResolver(confirmationSchema),
		mode: 'onChange',
		defaultValues: { confirmationName: '' },
	});

	const isSubmitting = formState.isSubmitting;
	const fieldError = formState.errors.confirmationName?.message;
	const isValid = formState.isValid;

	useEffect(() => {
		if (isOpen) {
			reset({ confirmationName: '' });
		}
	}, [isOpen, staff.id, reset]);

	const handleClose = () => {
		setApiError(null);
		reset({ confirmationName: '' });
		onClose();
	};

	const onSubmit = handleSubmit(async () => {
		setApiError(null);
		const result = await deleteStaffAction(staff.id);
		const handledSuccessfully = handleActionResult(result, {
			successMessage: '担当者を削除しました',
			errorMessage: '担当者の削除に失敗しました',
		});
		if (!handledSuccessfully) {
			setApiError(result.error ?? '不明なエラーが発生しました');
			return;
		}
		onDeleted?.(staff.id);
		handleClose();
	});

	if (!isOpen) {
		return null;
	}

	return (
		<dialog open className="modal">
			<div className="modal-box max-w-lg space-y-4">
				<div>
					<h3 className="font-bold text-lg">担当者を削除</h3>
					<p className="text-sm text-base-content/70">
						この操作は取り消せません。続行するには担当者名「{staff.name}」を入力してください。
					</p>
				</div>
				<form className="space-y-4" onSubmit={onSubmit}>
					<label className="form-control w-full">
						<div className="label">
							<span className="label-text">削除する担当者名</span>
						</div>
						<input
							type="text"
							className={`input input-bordered w-full ${fieldError ? 'input-error' : ''}`}
							placeholder={staff.name}
							{...register('confirmationName')}
							disabled={isSubmitting}
							aria-invalid={fieldError ? 'true' : 'false'}
						/>
					</label>
					{fieldError && <p className="text-error text-sm">{fieldError}</p>}
					{apiError && <p className="text-error text-sm">{apiError}</p>}
					<div className="modal-action">
						<button
							type="button"
							className="btn btn-ghost"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							キャンセル
						</button>
						<button
							type="submit"
							className={`btn btn-error ${isSubmitting ? 'loading' : ''}`}
							disabled={!isValid || isSubmitting}
						>
							削除
						</button>
					</div>
				</form>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button onClick={handleClose}>close</button>
			</form>
		</dialog>
	);
};

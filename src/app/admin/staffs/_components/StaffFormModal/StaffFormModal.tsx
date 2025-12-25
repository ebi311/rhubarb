'use client';

import { createStaffAction, updateStaffAction } from '@/app/actions/staffs';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import type { StaffRecord } from '@/models/staffActionSchemas';
import { StaffInputSchema } from '@/models/staffActionSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { ServiceTypeOption } from '../../_types';
import { ServiceTypeSelector } from '../ServiceTypeSelector';

const StaffFormSchema = StaffInputSchema.extend({
	email: StaffInputSchema.shape.email.or(z.literal('')),
	note: StaffInputSchema.shape.note.or(z.literal('')),
	service_type_ids: z.array(z.string().uuid()).default([]),
}).transform((value) => ({
	...value,
	email:
		typeof value.email === 'string' && value.email.trim() === '' ? null : (value.email ?? null),
	note:
		typeof value.note === 'string' && value.note.trim().length === 0
			? null
			: (value.note?.trim() ?? null),
	service_type_ids: value.service_type_ids ?? [],
}));

type StaffFormValues = z.input<typeof StaffFormSchema>;
type StaffSubmitValues = z.output<typeof StaffFormSchema>;

type BaseProps = {
	isOpen: boolean;
	serviceTypes: ServiceTypeOption[];
	onClose: () => void;
	onSuccess?: (staff: StaffRecord) => void;
};

type CreateProps = BaseProps & {
	mode: 'create';
};

type EditProps = BaseProps & {
	mode: 'edit';
	staff: StaffRecord;
};

export type StaffFormModalProps = CreateProps | EditProps;

const buildDefaultValues = (props: StaffFormModalProps): StaffFormValues => {
	if (props.mode === 'edit') {
		return {
			name: props.staff.name,
			email: props.staff.email ?? '',
			role: props.staff.role,
			note: props.staff.note ?? '',
			service_type_ids: props.staff.service_type_ids ?? [],
		};
	}
	return {
		name: '',
		email: '',
		role: 'helper',
		note: '',
		service_type_ids: [],
	};
};

export const StaffFormModal = (props: StaffFormModalProps) => {
	const { isOpen, mode, serviceTypes, onClose, onSuccess } = props;
	const [apiError, setApiError] = useState<string | null>(null);
	const { handleActionResult } = useActionResultHandler();

	const { control, register, reset, handleSubmit, formState } = useForm<
		StaffFormValues,
		unknown,
		StaffSubmitValues
	>({
		resolver: zodResolver(StaffFormSchema),
		mode: 'onChange',
		defaultValues: buildDefaultValues(props),
	});

	const noteValue = useWatch({ control, name: 'note' }) ?? '';
	const isSubmitting = formState.isSubmitting;

	useEffect(() => {
		reset(buildDefaultValues(props));
	}, [props, reset]);

	const dialogTitle = mode === 'create' ? '担当者を追加' : '担当者情報を編集';

	const handleModalClose = () => {
		setApiError(null);
		onClose();
	};

	const onSubmit = handleSubmit(async (values) => {
		setApiError(null);
		const result =
			mode === 'create'
				? await createStaffAction(values)
				: await updateStaffAction(props.staff.id, values);

		const handledSuccessfully = handleActionResult(result, {
			successMessage: mode === 'create' ? '担当者を登録しました' : '担当者情報を更新しました',
			errorMessage:
				mode === 'create' ? '担当者の登録に失敗しました' : '担当者情報の更新に失敗しました',
		});

		if (!handledSuccessfully || !result.data) {
			setApiError(result.error ?? '不明なエラーが発生しました');
			return;
		}

		onSuccess?.(result.data);
		handleModalClose();
		if (mode === 'create') {
			reset(buildDefaultValues(props));
		}
	});

	if (!isOpen) {
		return null;
	}

	return (
		<dialog open className="modal">
			<div className="modal-box max-w-2xl">
				<h3 className="font-bold text-lg mb-4">{dialogTitle}</h3>
				<form className="space-y-4" onSubmit={onSubmit}>
					<FormInput control={control} name="name" label="氏名" required disabled={isSubmitting} />
					<FormInput
						control={control}
						name="email"
						label="メールアドレス"
						type="email"
						disabled={isSubmitting}
						placeholder="example@example.com"
					/>

					<fieldset className="fieldset">
						<legend className="fieldset-legend">ロール</legend>
						<div className="flex flex-wrap gap-4">
							<label className="label cursor-pointer gap-2">
								<input
									type="radio"
									className="radio radio-primary"
									value="admin"
									{...register('role')}
									disabled={isSubmitting}
								/>
								<span className="label-text">管理者</span>
							</label>
							<label className="label cursor-pointer gap-2">
								<input
									type="radio"
									className="radio radio-secondary"
									value="helper"
									{...register('role')}
									disabled={isSubmitting}
								/>
								<span className="label-text">ヘルパー</span>
							</label>
						</div>
					</fieldset>

					<FormTextarea
						control={control}
						name="note"
						label="備考 (最大500文字)"
						rows={4}
						disabled={isSubmitting}
						placeholder="備考を入力"
					/>
					<p className="text-right text-xs text-base-content/60">{noteValue.length} / 500</p>

					<fieldset className="fieldset">
						<legend className="fieldset-legend">担当サービス区分</legend>
						<Controller
							control={control}
							name="service_type_ids"
							render={({ field }) => (
								<ServiceTypeSelector
									options={serviceTypes}
									selectedIds={field.value ?? []}
									onChange={field.onChange}
									disabled={isSubmitting}
								/>
							)}
						/>
						<p className="label-text-alt text-xs text-base-content/70">
							未選択の場合は全ての区分が許可されます
						</p>
					</fieldset>

					{apiError && <p className="text-error text-sm">{apiError}</p>}

					<div className="modal-action">
						<button
							type="button"
							className="btn btn-ghost"
							onClick={handleModalClose}
							disabled={isSubmitting}
						>
							キャンセル
						</button>
						<button
							type="submit"
							className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
							disabled={!formState.isValid || isSubmitting}
						>
							{mode === 'create' ? '登録' : '保存'}
						</button>
					</div>
				</form>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button onClick={handleModalClose}>close</button>
			</form>
		</dialog>
	);
};

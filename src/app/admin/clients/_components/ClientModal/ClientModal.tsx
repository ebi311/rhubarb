'use client';

import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import type {
	ContractStatus,
	ServiceUser,
	ServiceUserInput,
} from '@/models/serviceUser';
import { ServiceUserInputSchema } from '@/models/serviceUser';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

type CreateModalProps = {
	isOpen: boolean;
	mode: 'create';
	onClose: () => void;
	onSubmit: (data: ServiceUserInput) => void | Promise<void>;
};

type EditModalProps = {
	isOpen: boolean;
	mode: 'edit';
	client: ServiceUser;
	onClose: () => void;
	onSubmit: (
		data: ServiceUserInput,
		contractStatus?: ContractStatus,
	) => void | Promise<void>;
};

export type ClientModalProps = CreateModalProps | EditModalProps;

export const ClientModal = (props: ClientModalProps) => {
	const { isOpen, mode, onClose, onSubmit } = props;
	const client = mode === 'edit' ? props.client : undefined;
	const {
		handleSubmit: hookFormHandleSubmit,
		reset,
		setValue,
		formState,
		control,
	} = useForm<ServiceUserInput & { contract_status?: ContractStatus }>({
		resolver: zodResolver(ServiceUserInputSchema),
		mode: 'onBlur',
		defaultValues: {
			name: '',
			address: '',
		},
	});

	const contractStatus =
		useWatch({
			control,
			name: 'contract_status',
		}) ?? 'active';

	useEffect(() => {
		if (mode === 'edit' && client) {
			reset({
				name: client.name,
				address: client.address ?? '',
				contract_status: client.contract_status,
			});
		} else {
			reset({
				name: '',
				address: '',
				contract_status: 'active',
			});
		}
	}, [mode, client, isOpen, reset]);

	const onFormSubmit = async (
		data: ServiceUserInput & { contract_status?: ContractStatus },
	) => {
		if (mode === 'create') {
			await onSubmit({ name: data.name, address: data.address });
		} else {
			await onSubmit(
				{ name: data.name, address: data.address },
				data.contract_status ?? 'active',
			);
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<dialog open className="modal">
			<div className="modal-box">
				<h3 className="mb-4 text-lg font-bold">
					{mode === 'create' ? '利用者の新規登録' : '利用者情報の編集'}
				</h3>

				<form onSubmit={hookFormHandleSubmit(onFormSubmit)}>
					<FormInput
						id="name"
						label="氏名"
						required
						control={control}
						name="name"
					/>

					<FormTextarea
						id="address"
						label="住所(訪問先)"
						rows={3}
						control={control}
						name="address"
					/>

					{mode === 'edit' && (
						<>
							<fieldset className="fieldset">
								<legend className="fieldset-legend">契約ステータス</legend>
								<div className="flex gap-4">
									<label className="label cursor-pointer gap-2">
										<input
											type="radio"
											className="radio radio-primary"
											value="active"
											checked={contractStatus === 'active'}
											onChange={() => setValue('contract_status', 'active')}
											aria-label="契約中"
										/>
										<span className="label-text">契約中</span>
									</label>
									<label className="label cursor-pointer gap-2">
										<input
											type="radio"
											className="radio radio-warning"
											value="suspended"
											checked={contractStatus === 'suspended'}
											onChange={() => setValue('contract_status', 'suspended')}
											aria-label="中断中"
										/>
										<span className="label-text">中断中</span>
									</label>
								</div>
							</fieldset>

							{contractStatus === 'suspended' && (
								<div role="alert" className="mb-4 alert alert-warning">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-6 w-6 shrink-0 stroke-current"
										fill="none"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
									<span className="text-sm">
										契約を中断すると、この利用者は新規スケジュール作成時に選択できなくなります
									</span>
								</div>
							)}
						</>
					)}

					<div className="modal-action">
						<button type="button" className="btn btn-ghost" onClick={onClose}>
							キャンセル
						</button>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={!formState.isValid}
						>
							{mode === 'create' ? '登録' : '保存'}
						</button>
					</div>
				</form>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button onClick={onClose}>close</button>
			</form>
		</dialog>
	);
};

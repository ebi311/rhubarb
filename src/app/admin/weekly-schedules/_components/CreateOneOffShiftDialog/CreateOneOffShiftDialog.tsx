'use client';

import { createOneOffShiftAction } from '@/app/actions/shifts';
import type { StaffPickerOption } from '@/app/admin/basic-schedules/_components/StaffPickerDialog';
import { useActionResultHandler } from '@/hooks/useActionResultHandler';
import {
	ServiceTypeIdValues,
	ServiceTypeLabels,
	type ServiceTypeId,
} from '@/models/valueObjects/serviceTypeId';
import { addJstDays, formatJstDateString } from '@/utils/date';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useState } from 'react';

export type CreateOneOffShiftDialogClientOption = {
	id: string;
	name: string;
};

export type CreateOneOffShiftDialogProps = {
	isOpen: boolean;
	weekStartDate: Date;
	defaultDateStr?: string;
	defaultClientId?: string;
	clientOptions: CreateOneOffShiftDialogClientOption[];
	staffOptions: StaffPickerOption[];
	onClose: () => void;
};

const parseTimeString = (timeStr: string): { hour: number; minute: number } => {
	const [hourStr, minuteStr] = timeStr.split(':');
	const hour = Number(hourStr);
	const minute = Number(minuteStr);
	return { hour, minute };
};

const getCanSubmit = (params: {
	isSubmitting: boolean;
	clientId: string;
	dateStr: string;
	startTimeStr: string;
	endTimeStr: string;
}): boolean => {
	const { isSubmitting, clientId, dateStr, startTimeStr, endTimeStr } = params;
	return (
		!isSubmitting &&
		clientId.length > 0 &&
		dateStr.length > 0 &&
		startTimeStr.length > 0 &&
		endTimeStr.length > 0
	);
};

const normalizeOptionalId = (id: string): string | null => {
	return id.length > 0 ? id : null;
};

const getClientSelectDisabled = (
	isSubmitting: boolean,
	clientOptionsLength: number,
): boolean => {
	return isSubmitting || clientOptionsLength === 0;
};

const getInitialClientId = (
	defaultClientId: string | undefined,
	clientOptions: CreateOneOffShiftDialogClientOption[],
): string => {
	if (defaultClientId) {
		const exists = clientOptions.some((c) => c.id === defaultClientId);
		if (exists) return defaultClientId;
	}
	return clientOptions[0]?.id ?? '';
};

const renderClientOptions = (
	clientOptions: CreateOneOffShiftDialogClientOption[],
): ReactNode => {
	return clientOptions.length === 0 ? (
		<option value="">利用者がありません</option>
	) : (
		clientOptions.map((c) => (
			<option key={c.id} value={c.id}>
				{c.name}
			</option>
		))
	);
};

const getSubmitButtonLabel = (isSubmitting: boolean): string => {
	return isSubmitting ? '保存中...' : '保存';
};

export const CreateOneOffShiftDialog = ({
	isOpen,
	weekStartDate,
	defaultDateStr,
	defaultClientId,
	clientOptions,
	staffOptions,
	onClose,
}: CreateOneOffShiftDialogProps) => {
	const inputIdBase = useId();
	const dateInputId = `${inputIdBase}-date`;
	const startTimeInputId = `${inputIdBase}-start-time`;
	const endTimeInputId = `${inputIdBase}-end-time`;

	const router = useRouter();
	const { handleActionResult } = useActionResultHandler();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const weekStartDateStr = useMemo(
		() => formatJstDateString(weekStartDate),
		[weekStartDate],
	);
	const weekEndDateStr = useMemo(
		() => formatJstDateString(addJstDays(weekStartDate, 6)),
		[weekStartDate],
	);

	const [dateStr, setDateStr] = useState(defaultDateStr ?? weekStartDateStr);
	const [startTimeStr, setStartTimeStr] = useState('09:00');
	const [endTimeStr, setEndTimeStr] = useState('10:00');
	const [clientId, setClientId] = useState(() =>
		getInitialClientId(defaultClientId, clientOptions),
	);
	const [serviceTypeId, setServiceTypeId] = useState<ServiceTypeId>(
		ServiceTypeIdValues[0],
	);
	const [staffId, setStaffId] = useState('');

	useEffect(() => {
		if (!isOpen) return;
		setDateStr(defaultDateStr ?? weekStartDateStr);
		setClientId(getInitialClientId(defaultClientId, clientOptions));
	}, [
		isOpen,
		defaultDateStr,
		weekStartDateStr,
		defaultClientId,
		clientOptions,
	]);

	const canSubmit = getCanSubmit({
		isSubmitting,
		clientId,
		dateStr,
		startTimeStr,
		endTimeStr,
	});

	const handleSubmit = async () => {
		if (!canSubmit) return;

		setIsSubmitting(true);
		try {
			const result = await createOneOffShiftAction({
				weekStartDate: weekStartDateStr,
				client_id: clientId,
				service_type_id: serviceTypeId,
				staff_id: normalizeOptionalId(staffId),
				date: dateStr,
				start_time: parseTimeString(startTimeStr),
				end_time: parseTimeString(endTimeStr),
			});

			const success = handleActionResult(result, {
				successMessage: '単発シフトを追加しました',
				errorMessage: '単発シフトの追加に失敗しました',
			});

			if (success) {
				router.refresh();
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
						<h2 className="text-xl font-semibold">単発シフトを追加</h2>
						<p className="text-sm text-base-content/70">
							表示中の週に単発シフトを追加します。
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

				<div className="mt-4 grid grid-cols-1 gap-4">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<div>
							<label className="label" htmlFor={dateInputId}>
								<span className="label-text font-medium">日付（週内のみ）</span>
							</label>
							<input
								id={dateInputId}
								type="date"
								className="input-bordered input w-full"
								value={dateStr}
								min={weekStartDateStr}
								max={weekEndDateStr}
								onChange={(e) => setDateStr(e.target.value)}
								disabled={isSubmitting}
								required
							/>
						</div>

						<div>
							<label className="label" htmlFor={startTimeInputId}>
								<span className="label-text font-medium">開始</span>
							</label>
							<input
								id={startTimeInputId}
								type="time"
								className="input-bordered input w-full"
								value={startTimeStr}
								onChange={(e) => setStartTimeStr(e.target.value)}
								disabled={isSubmitting}
								required
							/>
						</div>
						<div>
							<label className="label" htmlFor={endTimeInputId}>
								<span className="label-text font-medium">終了</span>
							</label>
							<input
								id={endTimeInputId}
								type="time"
								className="input-bordered input w-full"
								value={endTimeStr}
								onChange={(e) => setEndTimeStr(e.target.value)}
								disabled={isSubmitting}
								required
							/>
						</div>
					</div>

					<div>
						<label className="label">
							<span className="label-text font-medium">利用者</span>
						</label>
						<select
							className="select-bordered select w-full"
							value={clientId}
							onChange={(e) => setClientId(e.target.value)}
							disabled={getClientSelectDisabled(
								isSubmitting,
								clientOptions.length,
							)}
							required
						>
							{renderClientOptions(clientOptions)}
						</select>
					</div>

					<div>
						<label className="label">
							<span className="label-text font-medium">サービス種別</span>
						</label>
						<select
							className="select-bordered select w-full"
							value={serviceTypeId}
							onChange={(e) =>
								setServiceTypeId(e.target.value as ServiceTypeId)
							}
							disabled={isSubmitting}
							required
						>
							{ServiceTypeIdValues.map((id) => (
								<option key={id} value={id}>
									{ServiceTypeLabels[id]}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="label">
							<span className="label-text font-medium">スタッフ（任意）</span>
						</label>
						<select
							className="select-bordered select w-full"
							value={staffId}
							onChange={(e) => setStaffId(e.target.value)}
							disabled={isSubmitting}
						>
							<option value="">未割当</option>
							{staffOptions.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
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
						className="btn btn-primary"
						onClick={handleSubmit}
						disabled={!canSubmit}
					>
						{getSubmitButtonLabel(isSubmitting)}
					</button>
				</div>
			</div>
		</div>
	);
};

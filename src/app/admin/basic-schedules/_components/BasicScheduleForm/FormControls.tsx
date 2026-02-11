import { ServiceTypeBadge } from '@/app/admin/_components/ServiceTypeBadges';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextarea } from '@/components/forms/FormTextarea';
import type { ServiceUser } from '@/models/serviceUser';
import type { DayOfWeek } from '@/models/valueObjects/dayOfWeek';
import { WEEKDAY_FULL_LABELS, WEEKDAYS } from '@/models/valueObjects/dayOfWeek';
import { useId } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { BasicScheduleFormValues } from './BasicScheduleForm';
import { FieldErrorMessage } from './FormMessages';
import { getFieldDescriptionId, getSelectClassName } from './helpers';

/** fixedClientId がある場合に利用者名を読み取り専用で表示 */
export const ClientReadOnlyField = ({ clientName }: { clientName: string }) => (
	<fieldset className="fieldset">
		<legend className="fieldset-legend">利用者</legend>
		<div className="input flex items-center input-ghost bg-base-200">
			{clientName}
		</div>
	</fieldset>
);

/** fixedWeekday がある場合に曜日を読み取り専用で表示 */
export const WeekdayReadOnlyField = ({ weekday }: { weekday: DayOfWeek }) => (
	<fieldset className="fieldset">
		<legend className="fieldset-legend">曜日</legend>
		<div className="input flex items-center input-ghost bg-base-200">
			{WEEKDAY_FULL_LABELS[weekday]}
		</div>
	</fieldset>
);

type ClientSelectFieldProps = {
	serviceUsers: ServiceUser[];
	disabled?: boolean;
};

export const ClientSelectField = ({
	serviceUsers,
	disabled = false,
}: ClientSelectFieldProps) => {
	const fieldId = useId();
	const {
		register,
		control,
		formState: { errors, isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();
	const hasError = Boolean(errors.clientId);
	const selectClass = getSelectClassName(hasError);
	const describedBy = getFieldDescriptionId(hasError, fieldId);
	const isDisabled = disabled || isSubmitting;

	// useWatch を使用してフィールドの変更時に再レンダリングをトリガー
	const clientId = useWatch({ control, name: 'clientId' });
	const isNewClient = clientId === 'new';

	// 編集モードでは新規利用者オプションを表示しない
	const options = disabled
		? [
				{ value: '', label: '選択してください' },
				...serviceUsers.map((client) => ({
					value: client.id,
					label: client.name,
				})),
			]
		: [
				{ value: '', label: '選択してください' },
				{ value: 'new', label: '➕ 新規利用者を登録' },
				...serviceUsers.map((client) => ({
					value: client.id,
					label: client.name,
				})),
			];

	return (
		<fieldset className="fieldset">
			<legend id={`${fieldId}-label`} className="fieldset-legend">
				利用者 *
				{disabled && (
					<span className="ml-2 text-xs text-base-content/60">(変更不可)</span>
				)}
			</legend>
			<FormSelect
				id={fieldId}
				className={selectClass}
				disabled={isDisabled}
				aria-labelledby={`${fieldId}-label`}
				aria-invalid={hasError}
				aria-describedby={describedBy}
				options={options}
				{...register('clientId')}
			/>
			<FieldErrorMessage fieldId={fieldId} error={errors.clientId} />

			{/* 新規利用者名入力フィールド */}
			{isNewClient && (
				<div className="mt-2">
					<FormInput
						control={control}
						name="newClientName"
						label="新規利用者の氏名"
						placeholder="氏名を入力してください"
						required
						disabled={isSubmitting}
					/>
				</div>
			)}
		</fieldset>
	);
};

type ServiceTypeSelectFieldProps = {
	serviceTypes: ServiceTypeOption[];
};

export const ServiceTypeSelectField = ({
	serviceTypes,
}: ServiceTypeSelectFieldProps) => {
	const fieldId = useId();
	const {
		formState: { errors, isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();
	const hasError = Boolean(errors.serviceTypeId);
	const describedBy = getFieldDescriptionId(hasError, fieldId);

	return (
		<fieldset className="fieldset">
			<legend id={`${fieldId}-label`} className="fieldset-legend">
				サービス区分 *
			</legend>
			<div
				className="flex flex-wrap gap-4"
				role="radiogroup"
				aria-labelledby={`${fieldId}-label`}
				aria-invalid={hasError}
				aria-describedby={describedBy}
			>
				{serviceTypes.map((type) => (
					<label
						key={type.id}
						className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors has-checked:border-primary has-checked:bg-primary/5 has-disabled:cursor-not-allowed has-disabled:opacity-50 ${
							hasError ? 'border-error' : 'border-base-300'
						}`}
					>
						<Controller
							name="serviceTypeId"
							render={({ field: { onChange, value, ref, ...rest } }) => (
								<input
									type="radio"
									className="radio radio-sm radio-primary"
									value={type.id}
									checked={value === type.id}
									disabled={isSubmitting}
									onChange={() => onChange(type.id)}
									ref={ref}
									{...rest}
								/>
							)}
						></Controller>
						<ServiceTypeBadge serviceTypeId={type.id} />
					</label>
				))}
			</div>
			<FieldErrorMessage fieldId={fieldId} error={errors.serviceTypeId} />
		</fieldset>
	);
};

export const WeekdayField = () => {
	const fieldId = useId();
	const {
		formState: { isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();

	return (
		<fieldset className="fieldset">
			<legend id={`${fieldId}-label`} className="fieldset-legend">
				曜日 *
			</legend>
			<Controller
				name="weekday"
				render={({ field }) => (
					<FormSelect
						id={fieldId}
						className="select"
						disabled={isSubmitting}
						aria-labelledby={`${fieldId}-label`}
						options={WEEKDAYS.map((weekday) => ({
							value: weekday,
							label: WEEKDAY_FULL_LABELS[weekday],
						}))}
						{...field}
					/>
				)}
			/>
		</fieldset>
	);
};

type TimeFieldProps = {
	name: 'startTime' | 'endTime';
	label: string;
};

export const TimeField = ({ name, label }: TimeFieldProps) => {
	const {
		control,
		formState: { isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();

	return (
		<div className="w-24">
			<FormInput
				control={control}
				name={name}
				label={label}
				type="time"
				step={300}
				required
				disabled={isSubmitting}
			/>
		</div>
	);
};

type NoteFieldProps = {
	valueLength: number;
};

export const NoteField = ({ valueLength }: NoteFieldProps) => {
	const {
		control,
		formState: { isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();

	return (
		<>
			<FormTextarea
				control={control}
				name="note"
				label="備考"
				rows={4}
				placeholder="メモがあれば入力してください (最大500文字)"
				disabled={isSubmitting}
			/>
			<p className="text-right text-xs text-base-content/60">
				{valueLength} / 500
			</p>
		</>
	);
};

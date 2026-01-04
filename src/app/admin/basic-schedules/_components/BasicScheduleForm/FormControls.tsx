import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import type { ServiceUser } from '@/models/serviceUser';
import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import type { BasicScheduleFormValues } from './BasicScheduleForm';
import { FieldErrorMessage } from './FormMessages';
import { getFieldDescriptionId, getSelectClassName, WEEKDAY_LABELS } from './helpers';

type ClientSelectFieldProps = {
	serviceUsers: ServiceUser[];
};

export const ClientSelectField = ({ serviceUsers }: ClientSelectFieldProps) => {
	const fieldId = useId();
	const {
		register,
		formState: { errors, isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();
	const hasError = Boolean(errors.clientId);
	const selectClass = getSelectClassName(hasError);
	const describedBy = getFieldDescriptionId(hasError, fieldId);

	return (
		<fieldset className="fieldset">
			<legend id={`${fieldId}-label`} className="fieldset-legend">
				利用者 *
			</legend>
			<select
				id={fieldId}
				className={selectClass}
				{...register('clientId')}
				disabled={isSubmitting}
				aria-labelledby={`${fieldId}-label`}
				aria-invalid={hasError}
				aria-describedby={describedBy}
			>
				<option value="">選択してください</option>
				{serviceUsers.map((client) => (
					<option key={client.id} value={client.id}>
						{client.name}
					</option>
				))}
			</select>
			<FieldErrorMessage fieldId={fieldId} error={errors.clientId} />
		</fieldset>
	);
};

type ServiceTypeSelectFieldProps = {
	serviceTypes: ServiceTypeOption[];
};

export const ServiceTypeSelectField = ({ serviceTypes }: ServiceTypeSelectFieldProps) => {
	const fieldId = useId();
	const {
		register,
		formState: { errors, isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();
	const hasError = Boolean(errors.serviceTypeId);
	const selectClass = getSelectClassName(hasError);
	const describedBy = getFieldDescriptionId(hasError, fieldId);

	return (
		<fieldset className="fieldset">
			<legend id={`${fieldId}-label`} className="fieldset-legend">
				サービス区分 *
			</legend>
			<select
				id={fieldId}
				className={selectClass}
				{...register('serviceTypeId')}
				disabled={isSubmitting}
				aria-labelledby={`${fieldId}-label`}
				aria-invalid={hasError}
				aria-describedby={describedBy}
			>
				<option value="">選択してください</option>
				{serviceTypes.map((type) => (
					<option key={type.id} value={type.id}>
						{type.name}
					</option>
				))}
			</select>
			<FieldErrorMessage fieldId={fieldId} error={errors.serviceTypeId} />
		</fieldset>
	);
};

export const WeekdayField = () => {
	const fieldId = useId();
	const {
		register,
		formState: { isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();

	return (
		<fieldset className="fieldset">
			<legend id={`${fieldId}-label`} className="fieldset-legend">
				曜日 *
			</legend>
			<select
				id={fieldId}
				className="select"
				{...register('weekday')}
				disabled={isSubmitting}
				aria-labelledby={`${fieldId}-label`}
			>
				{(Object.keys(WEEKDAY_LABELS) as Array<keyof typeof WEEKDAY_LABELS>).map((weekday) => (
					<option key={weekday} value={weekday}>
						{WEEKDAY_LABELS[weekday]}
					</option>
				))}
			</select>
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
			<p className="text-right text-xs text-base-content/60">{valueLength} / 500</p>
		</>
	);
};

import { ServiceTypeBadge } from '@/app/admin/_components/ServiceTypeBadges';
import type { ServiceTypeOption } from '@/app/admin/staffs/_types';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextarea } from '@/components/forms/FormTextarea';
import type { ServiceUser } from '@/models/serviceUser';
import { WEEKDAY_FULL_LABELS, WEEKDAYS } from '@/models/valueObjects/dayOfWeek';
import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import type { BasicScheduleFormValues } from './BasicScheduleForm';
import { FieldErrorMessage } from './FormMessages';
import { getFieldDescriptionId, getSelectClassName } from './helpers';

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
			<FormSelect
				id={fieldId}
				className={selectClass}
				disabled={isSubmitting}
				aria-labelledby={`${fieldId}-label`}
				aria-invalid={hasError}
				aria-describedby={describedBy}
				options={[
					{ value: '', label: '選択してください' },
					...serviceUsers.map((client) => ({
						value: client.id,
						label: client.name,
					})),
				]}
				{...register('clientId')}
			/>
			<FieldErrorMessage fieldId={fieldId} error={errors.clientId} />
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
		register,
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
						className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${
							hasError ? 'border-error' : 'border-base-300'
						}`}
					>
						<input
							type="radio"
							className="radio radio-sm radio-primary"
							value={type.id}
							disabled={isSubmitting}
							{...register('serviceTypeId')}
						/>
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
		register,
		formState: { isSubmitting },
	} = useFormContext<BasicScheduleFormValues>();

	return (
		<fieldset className="fieldset">
			<legend id={`${fieldId}-label`} className="fieldset-legend">
				曜日 *
			</legend>
			<FormSelect
				id={fieldId}
				className="select"
				disabled={isSubmitting}
				aria-labelledby={`${fieldId}-label`}
				options={WEEKDAYS.map((weekday) => ({
					value: weekday,
					label: WEEKDAY_FULL_LABELS[weekday],
				}))}
				{...register('weekday')}
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

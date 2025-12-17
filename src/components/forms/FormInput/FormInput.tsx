'use client';

import { useId } from 'react';
import { FieldValues, Path, useController, type Control } from 'react-hook-form';

export type FormInputProps<T extends FieldValues> = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	'className' | 'name'
> & {
	label: string;
	required?: boolean;
	control: Control<T>;
	name: Path<T>;
};

export const FormInput = <T extends FieldValues>(p: FormInputProps<T>) => {
	const { label, required, control, name, ...props } = p;
	const { fieldState, field } = useController<T>({
		control,
		name: name,
	});
	const id = useId();
	const legendId = `${id}-legend`;
	const error = fieldState.error?.message;
	return (
		<fieldset className="fieldset">
			<legend id={legendId} className="fieldset-legend">
				{label} {required && '*'}
			</legend>
			<input
				{...field}
				className={`input ${error ? 'input-error' : ''}`}
				aria-invalid={error ? 'true' : 'false'}
				aria-labelledby={legendId}
				aria-describedby={error ? `${id}-error` : undefined}
				{...props}
			/>
			{error && (
				<p id={`${id}-error`} className="label">
					<span className="label-text-alt text-error">{error}</span>
				</p>
			)}
		</fieldset>
	);
};

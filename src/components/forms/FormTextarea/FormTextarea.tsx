'use client';

import { useId } from 'react';
import {
	FieldValues,
	useController,
	type Control,
	type Path,
} from 'react-hook-form';

export type FormTextareaProps<T extends FieldValues> = Omit<
	React.TextareaHTMLAttributes<HTMLTextAreaElement>,
	'className' | 'name'
> & {
	label: string;
	required?: boolean;
	control: Control<T>;
	name: Path<T>;
};

export const FormTextarea = <T extends FieldValues>({
	label,
	required,
	control,
	name,
	...props
}: FormTextareaProps<T>) => {
	const { fieldState, field } = useController<T>({
		control,
		name: name,
	});
	const error = fieldState.error?.message;
	const id = useId();
	const legendId = `${id}-legend`;
	return (
		<fieldset className="fieldset">
			<legend id={legendId} className="fieldset-legend">
				{label} {required && '*'}
			</legend>
			<textarea
				{...field}
				className={`textarea ${error ? 'textarea-error' : ''}`}
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

FormTextarea.displayName = 'FormTextarea';

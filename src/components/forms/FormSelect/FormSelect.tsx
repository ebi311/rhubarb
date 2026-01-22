'use client';

import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export const FORM_SELECT_DEFAULT_CLASSNAME = 'select select-bordered';

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface FormSelectProps extends Omit<
	SelectHTMLAttributes<HTMLSelectElement>,
	'children'
> {
	options: SelectOption[];
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
	(props, ref) => {
		const { options, className, ...rest } = props;
		const mergedClassName = className ?? FORM_SELECT_DEFAULT_CLASSNAME;

		return (
			<select ref={ref} className={mergedClassName} {...rest}>
				{options.map((option) => (
					<option
						key={option.value}
						value={option.value}
						disabled={option.disabled}
					>
						{option.label}
					</option>
				))}
			</select>
		);
	},
);

FormSelect.displayName = 'FormSelect';

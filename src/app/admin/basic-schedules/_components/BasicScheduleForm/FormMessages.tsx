import type { FieldError } from 'react-hook-form';

type FieldErrorMessageProps = {
	fieldId: string;
	error?: FieldError;
};

export const FieldErrorMessage = ({
	fieldId,
	error,
}: FieldErrorMessageProps) => {
	if (!error) return null;
	return (
		<p id={`${fieldId}-error`} className="label">
			<span className="label-text-alt text-error">{error.message}</span>
		</p>
	);
};

type ApiErrorMessageProps = {
	message: string | null;
};

export const ApiErrorMessage = ({ message }: ApiErrorMessageProps) => {
	if (!message) return null;
	return <p className="text-sm text-error">{message}</p>;
};

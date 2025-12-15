"use client";

import { forwardRef } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

export interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string;
  required?: boolean;
  registration?: UseFormRegisterReturn;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, required, registration, ...props }, ref) => {
    const legendId = `${props.id}-legend`;
    return (
      <fieldset className="fieldset">
        <legend id={legendId} className="fieldset-legend">
          {label} {required && "*"}
        </legend>
        <input
          ref={ref}
          className={`input ${error ? "input-error" : ""}`}
          aria-invalid={error ? "true" : "false"}
          aria-labelledby={legendId}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...registration}
          {...props}
        />
        {error && (
          <p id={`${props.id}-error`} className="label">
            <span className="label-text-alt text-error">{error}</span>
          </p>
        )}
      </fieldset>
    );
  }
);

FormInput.displayName = "FormInput";

"use client";

import { forwardRef } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

export interface FormTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  label: string;
  error?: string;
  required?: boolean;
  registration?: UseFormRegisterReturn;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, required, registration, ...props }, ref) => {
    const legendId = `${props.id}-legend`;
    return (
      <fieldset className="fieldset">
        <legend id={legendId} className="fieldset-legend">
          {label} {required && "*"}
        </legend>
        <textarea
          ref={ref}
          className={`textarea ${error ? "textarea-error" : ""}`}
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

FormTextarea.displayName = "FormTextarea";

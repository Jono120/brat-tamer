/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const fieldClasses =
  "w-full p-4 bg-bg-primary rounded-2xl border-2 border-transparent focus:border-brand-primary outline-none transition-all font-semibold text-brand-ink min-h-[48px]";

/** Labelled text input. Falls back to aria-label when no visible label. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-widest text-muted-strong mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-label={label || props["aria-label"]}
          className={`${fieldClasses} ${className}`}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

/** Labelled textarea. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className = "", ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-widest text-muted-strong mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          aria-label={label || props["aria-label"]}
          className={`${fieldClasses} resize-none ${className}`}
          {...props}
        />
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

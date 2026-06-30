/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 active:scale-[0.98]",
  secondary:
    "bg-card-bg text-brand-secondary border-2 border-brand-secondary active:scale-[0.98]",
  ghost:
    "bg-card-bg text-brand-ink border border-brand-ink/10 active:scale-[0.98]",
  danger:
    "bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-[0.98]",
  accent: "bg-brand-accent text-brand-ink active:scale-[0.98]",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-[44px] px-4 text-sm rounded-xl",
  md: "min-h-[48px] px-5 text-base rounded-2xl",
  lg: "min-h-[52px] px-6 text-lg rounded-2xl",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

/** Accessible button primitive with consistent sizing and focus handling. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      type = "button",
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons must always have an accessible label. */
  label: string;
  size?: "sm" | "md";
}

/**
 * Icon-only button that enforces an `aria-label` and a >= 44px tap target.
 */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  IconButtonProps
>(({ label, size = "md", className = "", type = "button", children, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-50 ${
      size === "sm" ? "min-w-[44px] min-h-[44px] p-2" : "min-w-[48px] min-h-[48px] p-2.5"
    } ${className}`}
    {...props}
  >
    {children}
  </button>
));
IconButton.displayName = "IconButton";

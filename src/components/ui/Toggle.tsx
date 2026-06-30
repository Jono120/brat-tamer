/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

export interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  /** Accessible label describing what the switch controls. */
  label: string;
}

/** Accessible on/off switch (role="switch") with a 44px tap target. */
export const Toggle = ({ checked, onChange, label }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative inline-flex items-center w-14 h-8 min-h-[44px] min-w-[44px] justify-start px-1 rounded-full transition-all ${
      checked ? "bg-brand-primary" : "bg-brand-ink/15"
    }`}
  >
    <motion.span
      aria-hidden="true"
      animate={{ x: checked ? 24 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="block w-5 h-5 bg-white rounded-full shadow-sm"
    />
  </button>
);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  label?: string;
}

/** Accessible progress bar (role="progressbar"). */
export const ProgressBar = ({
  value,
  max = 100,
  className = "",
  barClassName = "bg-gradient-to-r from-brand-primary to-brand-accent",
  label,
}: ProgressBarProps) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={`h-3 bg-brand-ink/10 rounded-full overflow-hidden ${className}`}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className={`h-full ${barClassName}`}
      />
    </div>
  );
};

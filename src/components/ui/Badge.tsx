/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

type Tone = "primary" | "accent" | "success" | "neutral";

const TONES: Record<Tone, string> = {
  primary: "bg-brand-primary/10 text-brand-primary",
  accent: "bg-brand-accent/15 text-brand-ink",
  success: "bg-brand-success/15 text-brand-ink",
  neutral: "bg-brand-ink/10 text-muted-strong",
};

export interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

/** Small status pill. */
export const Badge = ({
  tone = "neutral",
  className = "",
  children,
}: BadgeProps) => (
  <span
    className={`inline-flex items-center font-black uppercase tracking-widest text-[11px] px-2 py-0.5 rounded-full ${TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

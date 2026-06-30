/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
}

/** Rounded surface card used across screens. */
export const Card = ({
  as: Tag = "div",
  className = "",
  children,
  ...props
}: CardProps) => (
  <Tag
    className={`bg-card-bg rounded-[32px] p-6 border-2 border-brand-ink/5 shadow-sm ${className}`}
    {...props}
  >
    {children}
  </Tag>
);

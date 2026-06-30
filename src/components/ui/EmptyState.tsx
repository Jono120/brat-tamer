/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Friendly placeholder shown when a list has no items. */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) => (
  <div
    className={`bg-bg-primary rounded-[32px] p-10 text-center border-2 border-dashed border-brand-ink/10 ${className}`}
  >
    {icon && (
      <div className="mx-auto text-brand-ink/30 mb-4 flex justify-center">
        {icon}
      </div>
    )}
    <p className="text-brand-ink text-sm font-bold">{title}</p>
    {description && (
      <p className="text-muted text-sm mt-1 font-medium">{description}</p>
    )}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

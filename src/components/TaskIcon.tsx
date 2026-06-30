/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Droplets,
  Moon,
  Sun,
  Book,
  Coffee,
  Smile,
  Zap,
  Heart,
} from "lucide-react";

/**
 * Renders a task icon with consistent styling.
 */
export const TaskIcon = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const icons: Record<string, React.ReactNode> = {
    droplets: <Droplets size={20} strokeWidth={2} className={className} />,
    moon: <Moon size={20} strokeWidth={2} className={className} />,
    sun: <Sun size={20} strokeWidth={2} className={className} />,
    book: <Book size={20} strokeWidth={2} className={className} />,
    coffee: <Coffee size={20} strokeWidth={2} className={className} />,
    smile: <Smile size={20} strokeWidth={2} className={className} />,
    zap: <Zap size={20} strokeWidth={2} className={className} />,
    heart: <Heart size={20} strokeWidth={2} className={className} />,
  };
  return (
    icons[name] || <Heart size={20} strokeWidth={2} className={className} />
  );
};

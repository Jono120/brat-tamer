/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** "bottom" = slide-up sheet (default), "center" = centered dialog. */
  variant?: "bottom" | "center";
  maxHeight?: boolean;
}

/**
 * Accessible modal surface. Handles ESC-to-close, overlay click, focus
 * restoration, and labelled dialog semantics. Used by both bottom sheets
 * and centered dialogs.
 */
export const Sheet = ({
  open,
  onClose,
  title,
  children,
  variant = "bottom",
  maxHeight = false,
}: SheetProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the dialog.
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const isBottom = variant === "bottom";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className={`absolute inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex ${
            isBottom ? "items-end" : "items-center justify-center p-6"
          }`}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={isBottom ? { y: "100%" } : { scale: 0.92, opacity: 0 }}
            animate={isBottom ? { y: 0 } : { scale: 1, opacity: 1 }}
            exit={isBottom ? { y: "100%" } : { scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className={
              isBottom
                ? `w-full bg-card-bg rounded-t-[40px] p-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] outline-none ${
                    maxHeight ? "max-h-[88vh] overflow-y-auto" : ""
                  }`
                : `w-full max-w-sm bg-card-bg rounded-[40px] p-8 shadow-2xl outline-none ${
                    maxHeight ? "max-h-[80vh] overflow-y-auto" : ""
                  }`
            }
          >
            <div className="flex justify-between items-center mb-6">
              <h2
                id={titleId}
                className="text-xl font-bold text-brand-ink"
              >
                {title}
              </h2>
              <IconButton
                label="Close dialog"
                size="sm"
                onClick={onClose}
                className="text-muted hover:text-brand-ink"
              >
                <X size={24} strokeWidth={2} />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

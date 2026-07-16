/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

const MAIN_SCROLL_SELECTOR = ".app-container > main";

function lockMainScroll(): (() => void) | undefined {
  const main = document.querySelector<HTMLElement>(MAIN_SCROLL_SELECTOR);
  if (!main) return undefined;
  const scrollTop = main.scrollTop;
  main.style.overflow = "hidden";
  return () => {
    main.style.overflow = "";
    main.scrollTop = scrollTop;
  };
}

function focusWithoutScroll(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true });
}

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
  const reduceMotion = useReducedMotion();

  // Callers pass inline `onClose` handlers whose identity changes on every
  // render (including the 4s data-polling refresh). Reading it through a ref
  // keeps the focus effect below scoped to open/close transitions only;
  // otherwise each refresh would tear it down and steal focus from whatever
  // field the user is typing in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const unlockScroll = lockMainScroll();
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the dialog, unless something inside it (e.g. an
    // autoFocus field) already claimed focus.
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      focusWithoutScroll(panel);
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      unlockScroll?.();
      focusWithoutScroll(previouslyFocused.current);
    };
  }, [open]);

  const isBottom = variant === "bottom";
  const panelTransition = reduceMotion
    ? { duration: 0 }
    : isBottom
      ? { type: "tween" as const, duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }
      : { type: "tween" as const, duration: 0.2, ease: [0.32, 0.72, 0, 1] as const };

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
            transition={panelTransition}
            className={
              isBottom
                ? `w-full max-w-xl mx-auto bg-card-bg rounded-t-[40px] lg:rounded-b-[40px] lg:mb-6 p-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] outline-none ${
                    maxHeight ? "max-h-[88vh] overflow-y-auto" : ""
                  }`
                : `w-full max-w-sm md:max-w-md bg-card-bg rounded-[40px] p-8 shadow-2xl outline-none ${
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

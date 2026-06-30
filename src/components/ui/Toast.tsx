/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Check size={18} strokeWidth={3} />,
  error: <AlertTriangle size={18} strokeWidth={2.5} />,
  info: <Info size={18} strokeWidth={2.5} />,
};

const TONES: Record<ToastType, string> = {
  success: "bg-brand-success text-brand-ink",
  error: "bg-red-500 text-white",
  info: "bg-brand-secondary text-white",
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    info: (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.9 }}
              role="status"
              className={`pointer-events-auto flex items-center gap-3 w-full max-w-sm px-4 py-3 rounded-2xl shadow-xl font-bold text-sm ${TONES[t.type]}`}
            >
              <span className="shrink-0">{ICONS[t.type]}</span>
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => remove(t.id)}
                className="shrink-0 opacity-80 hover:opacity-100"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

/** Access the toast API. Must be used within <ToastProvider>. */
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};

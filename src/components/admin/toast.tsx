"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastType = "success" | "error";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

function useToastInstance(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>.");
  }
  return ctx;
}

export function useToast(): ToastApi {
  return useToastInstance();
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, type, message }].slice(-5));
      timers.current[id] = setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const api = useRef<ToastApi>({
    success: (message: string) => show("success", message),
    error: (message: string) => show("error", message),
  });

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-[0_16px_48px_rgba(15,23,42,0.16)] ${isSuccess ? "border-emerald-300/60 bg-white dark:border-emerald-500/30 dark:bg-[#0F172A]" : "border-red-300/60 bg-white dark:border-red-500/30 dark:bg-[#0F172A]"}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isSuccess ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"}`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </span>
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                {toast.message}
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(toast.id)}
                className="ml-auto shrink-0 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

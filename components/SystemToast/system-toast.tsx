"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
  XCircleIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/ssr";

type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = Required<ToastInput> & {
  id: string;
};

type SystemToastContextValue = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const SystemToastContext = createContext<SystemToastContextValue | null>(null);

const toastStyles = {
  success: {
    icon: CheckCircleIcon,
    className: "border-[#d6f3e2] bg-[#f0fff6] text-[#0f7b3d]",
    iconClassName: "text-[#10b981]",
    progressClassName: "bg-[#10b981]",
  },
  error: {
    icon: XCircleIcon,
    className: "border-[#ffd8d4] bg-[#fff4f2] text-[#b42318]",
    iconClassName: "text-[#ef4444]",
    progressClassName: "bg-[#ef4444]",
  },
  warning: {
    icon: WarningCircleIcon,
    className: "border-[#ffe4c2] bg-[#fff8ed] text-[#a35400]",
    iconClassName: "text-[#ff7417]",
    progressClassName: "bg-[#ff7417]",
  },
  info: {
    icon: InfoIcon,
    className:
      "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary)]",
    iconClassName: "text-[var(--color-primary)]",
    progressClassName: "bg-[var(--color-primary)]",
  },
  loading: {
    icon: SpinnerGapIcon,
    className:
      "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)]",
    iconClassName: "text-[var(--color-primary)] animate-spin",
    progressClassName: "bg-[var(--color-primary)]",
  },
} satisfies Record<
  ToastVariant,
  {
    icon: typeof CheckCircleIcon;
    className: string;
    iconClassName: string;
    progressClassName: string;
  }
>;

export function SystemToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  const dismissToast = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  const showToast = useCallback(
    ({
      title,
      description = "",
      variant = "info",
      duration: userDuration,
    }: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const duration =
        userDuration ?? (variant === "loading" ? 60000 : 4200);

      setToasts((currentToasts) => [
        ...currentToasts,
        { id, title, description, variant, duration },
      ]);

      if (variant !== "loading") {
        window.setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast]
  );

  return (
    <SystemToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[10000] flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 flex-col items-center gap-3 sm:top-6">
        {toasts.map((toast) => {
          const styles = toastStyles[toast.variant];
          const Icon = styles.icon;
          const isSpinner = toast.variant === "loading";

          return (
            <div
              key={toast.id}
              className={`system-toast-enter pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[18px] border p-4 pb-5 shadow-[0_16px_40px_rgba(16,29,105,0.14)] backdrop-blur-sm transition ${styles.className}`}
            >
              <Icon
                size={24}
                weight={isSpinner ? "bold" : "fill"}
                className={`mt-0.5 shrink-0 ${styles.iconClassName}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-sm font-circular-regular leading-5 opacity-80">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5"
                aria-label="Cerrar notificacion"
              >
                <XIcon size={16} weight="bold" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-[18px] bg-black/5">
                <div
                  className={`system-toast-progress h-full rounded-br-full ${styles.progressClassName}`}
                  style={{
                    animationDuration: `${toast.duration}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SystemToastContext.Provider>
  );
}

export function useSystemToast() {
  const context = useContext(SystemToastContext);

  if (!context) {
    throw new Error("useSystemToast must be used within SystemToastProvider");
  }

  return context;
}

"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
  XCircleIcon,
  SpinnerGapIcon,
  TicketIcon,
} from "@phosphor-icons/react/ssr";

type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    href: string;
  };
};

type ToastItem = Required<Omit<ToastInput, "action">> & {
  id: string;
  action?: ToastInput["action"];
  leaving: boolean;
};

type SystemToastContextValue = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

type TimerRecord = {
  handle: number;
  startedAt: number;
  remaining: number;
};

const SystemToastContext = createContext<SystemToastContextValue | null>(null);

const DEFAULT_DURATION = 4200;
const LOADING_DURATION = 60000;
const EXIT_MS = 200;
const MAX_VISIBLE = 4;

const toastStyles = {
  success: {
    icon: CheckCircleIcon,
    accent: "#10b981",
    spin: false,
  },
  error: {
    icon: XCircleIcon,
    accent: "#ef4444",
    spin: false,
  },
  warning: {
    icon: WarningCircleIcon,
    accent: "#f59e0b",
    spin: false,
  },
  info: {
    icon: InfoIcon,
    accent: "var(--color-primary)",
    spin: false,
  },
  loading: {
    icon: SpinnerGapIcon,
    accent: "var(--color-primary)",
    spin: true,
  },
} satisfies Record<
  ToastVariant,
  {
    icon: typeof CheckCircleIcon;
    accent: string;
    spin: boolean;
  }
>;

export function SystemToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastLayerRef = useRef<HTMLDivElement>(null);
  const toastsRef = useRef<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, TimerRecord>());
  const exitTimersRef = useRef(new Set<number>());

  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  const removeNow = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const beginLeave = useCallback(
    (id: string) => {
      const target = toastsRef.current.find((toast) => toast.id === id);
      if (!target || target.leaving) return;

      const timer = timersRef.current.get(id);
      if (timer) {
        window.clearTimeout(timer.handle);
        timersRef.current.delete(id);
      }

      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, leaving: true } : toast,
        ),
      );

      const exitHandle = window.setTimeout(() => {
        exitTimersRef.current.delete(exitHandle);
        removeNow(id);
      }, EXIT_MS + 40);
      exitTimersRef.current.add(exitHandle);
    },
    [removeNow],
  );

  const scheduleRemoval = useCallback(
    (id: string, ms: number) => {
      const existing = timersRef.current.get(id);
      if (existing) window.clearTimeout(existing.handle);

      const handle = window.setTimeout(() => {
        timersRef.current.delete(id);
        beginLeave(id);
      }, ms);

      timersRef.current.set(id, {
        handle,
        startedAt: Date.now(),
        remaining: ms,
      });
    },
    [beginLeave],
  );

  const pauseToast = useCallback((id: string) => {
    const record = timersRef.current.get(id);
    if (!record || record.handle === 0) return;

    window.clearTimeout(record.handle);
    record.remaining = Math.max(
      0,
      record.remaining - (Date.now() - record.startedAt),
    );
    record.handle = 0;
  }, []);

  const resumeToast = useCallback(
    (id: string) => {
      const record = timersRef.current.get(id);
      if (!record || record.handle !== 0) return;

      const toast = toastsRef.current.find((item) => item.id === id);
      if (!toast || toast.leaving || toast.duration <= 0) {
        timersRef.current.delete(id);
        return;
      }

      if (record.remaining <= 0) {
        timersRef.current.delete(id);
        beginLeave(id);
        return;
      }

      const handle = window.setTimeout(() => {
        timersRef.current.delete(id);
        beginLeave(id);
      }, record.remaining);

      record.handle = handle;
      record.startedAt = Date.now();
    },
    [beginLeave],
  );

  const dismissToast = useCallback(
    (id: string) => {
      beginLeave(id);
    },
    [beginLeave],
  );

  const showToast = useCallback(
    ({
      title,
      description = "",
      variant = "info",
      duration: userDuration,
      action,
    }: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const duration =
        userDuration ??
        (variant === "loading" ? LOADING_DURATION : DEFAULT_DURATION);

      setToasts((current) => [
        ...current,
        {
          id,
          title,
          description,
          variant,
          duration,
          action,
          leaving: false,
        },
      ]);

      if (duration > 0) scheduleRemoval(id, duration);

      return id;
    },
    [scheduleRemoval],
  );

  const raiseAboveDialogs = useCallback(() => {
    const layer = toastLayerRef.current;
    if (!layer) return;

    try {
      if (!layer.matches(":popover-open")) return;
      if (!document.querySelector("dialog[open]")) return;
      // Los <dialog> modales viven en la top layer del navegador, donde el
      // z-index no aplica. Para quedar por encima hay que reinsertar la capa
      // de toasts al final de esa capa con hidePopover() + showPopover().
      layer.hidePopover();
      layer.showPopover();
    } catch {
      // Popover API no disponible: se mantiene el z-index como respaldo.
    }
  }, []);

  useEffect(() => {
    const layer = toastLayerRef.current;
    if (!layer) return;

    try {
      if (toasts.length > 0) {
        if (!layer.matches(":popover-open")) {
          layer.showPopover();
        } else {
          raiseAboveDialogs();
        }
      } else if (layer.matches(":popover-open")) {
        layer.hidePopover();
      }
    } catch {
      // Popover API no disponible: se mantiene el z-index como respaldo.
    }
  }, [toasts.length, raiseAboveDialogs]);

  useEffect(() => {
    const observer = new MutationObserver((records) => {
      const dialogToggled = records.some(
        (record) => record.target instanceof HTMLDialogElement,
      );
      if (dialogToggled) raiseAboveDialogs();
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });

    return () => observer.disconnect();
  }, [raiseAboveDialogs]);

  useEffect(() => {
    const active = toasts.filter((toast) => !toast.leaving);
    if (active.length <= MAX_VISIBLE) return;

    active
      .slice(0, active.length - MAX_VISIBLE)
      .forEach((toast) => beginLeave(toast.id));
  }, [toasts, beginLeave]);

  useEffect(() => {
    const timers = timersRef.current;
    const exitTimers = exitTimersRef.current;

    return () => {
      timers.forEach((record) => window.clearTimeout(record.handle));
      timers.clear();
      exitTimers.forEach((handle) => window.clearTimeout(handle));
      exitTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <SystemToastContext.Provider value={value}>
      {children}
      <div
        ref={toastLayerRef}
        popover="manual"
        role="region"
        aria-label="Notificaciones del sistema"
        className="pointer-events-none fixed left-1/2 top-4 z-[10000] flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 flex-col items-center [margin:0] [border:0] [background:transparent] [padding:0] [overflow:visible] [right:auto] [bottom:auto] sm:top-6"
      >
        {toasts.map((toast) => {
          const styles = toastStyles[toast.variant];
          const Icon = styles.icon;
          const isSpinner = styles.spin;
          const isLeaving = toast.leaving;

          return (
            <div
              key={toast.id}
              className={`system-toast-slot ${
                isLeaving ? "system-toast-slot--leaving" : ""
              }`}
              onMouseEnter={() => pauseToast(toast.id)}
              onMouseLeave={() => resumeToast(toast.id)}
              onFocusCapture={() => pauseToast(toast.id)}
              onBlurCapture={(event: FocusEvent<HTMLDivElement>) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(nextTarget)) {
                  resumeToast(toast.id);
                }
              }}
            >
              <div className="system-toast-slot-inner">
                <div
                  role={toast.variant === "error" ? "alert" : "status"}
                  className={`system-toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border py-3.5 pl-4 pr-3 ${
                    isLeaving ? "system-toast--leaving" : ""
                  }`}
                  style={
                    {
                      "--toast-accent": styles.accent,
                    } as CSSProperties
                  }
                >
                  <span className="system-toast-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon
                      size={19}
                      weight={isSpinner ? "bold" : "fill"}
                      className={isSpinner ? "animate-spin" : undefined}
                    />
                  </span>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13.5px] font-semibold leading-5 tracking-[-0.01em]">
                      {toast.title}
                    </p>
                    {toast.description ? (
                      <p className="mt-0.5 text-[13px] leading-[1.35] opacity-70">
                        {toast.description}
                      </p>
                    ) : null}
                  </div>

                  {toast.action ? (
                    <Link
                      href={toast.action.href}
                      onClick={() => beginLeave(toast.id)}
                      aria-label={toast.action.label}
                      title={toast.action.label}
                      className="system-toast-action mt-1 flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold"
                    >
                      <TicketIcon size={14} weight="fill" />
                      <span className="max-w-[88px] truncate">
                        {toast.action.label}
                      </span>
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => beginLeave(toast.id)}
                    className="system-toast-close mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    aria-label="Cerrar notificacion"
                  >
                    <XIcon size={15} weight="bold" />
                  </button>

                  {toast.duration > 0 ? (
                    <div className="system-toast-track" aria-hidden="true">
                      <div
                        className={`system-toast-progress ${
                          isSpinner
                            ? "system-toast-progress--indeterminate"
                            : ""
                        }`}
                        style={
                          isSpinner
                            ? undefined
                            : { animationDuration: `${toast.duration}ms` }
                        }
                      />
                    </div>
                  ) : null}
                </div>
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

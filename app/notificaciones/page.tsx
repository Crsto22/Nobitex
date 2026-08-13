"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowRightIcon,
  ArrowClockwiseIcon,
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeOpenIcon,
} from "@phosphor-icons/react/ssr";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  notificationsApi,
  type AppNotification,
  type NotificationsResponse,
} from "@/lib/api/notifications";
import { formatDateShort as formatDate, formatTime24 as formatTime } from "@/lib/intl";
import { cn } from "@/lib/utils";

const pageSize = 10;
const emptyResult: NotificationsResponse = {
  data: [],
  unreadCount: 0,
  nextCursor: null,
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [result, setResult] = useState(emptyResult);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options: RequestInit = {}) => {
    setLoading(true);
    setError(null);
    try {
      setResult(await notificationsApi.findMine(pageSize, page, options));
    } catch (requestError) {
      if (options.signal?.aborted) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar las notificaciones.",
      );
    } finally {
      if (!options.signal?.aborted) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => void load({ signal: controller.signal }),
      0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [load]);

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      setResult((current) => ({
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
        data: current.data.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      }));
      try {
        await notificationsApi.markRead(notification.id);
      } catch {
        void load();
      }
    }
    if (notification.link) router.push(notification.link);
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      await load();
    } catch {
      setError("No se pudieron marcar las notificaciones.");
    }
  };

  return (
    <DashboardShell headerTitle="Notificaciones">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            label="Notificaciones"
            value={result.meta.total}
            icon={<BellIcon size={19} />}
            featured
          />
          <MetricCard
            label="No leidas"
            value={result.unreadCount}
            icon={<EnvelopeOpenIcon size={19} />}
            color="#f59e0b"
          />
          <MetricCard
            label="Leidas"
            value={Math.max(0, result.meta.total - result.unreadCount)}
            icon={<CheckCircleIcon size={19} />}
            color="#10b981"
          />
        </section>

        <section className="sticky -top-4 z-30 -mx-4 flex items-center justify-between gap-3 bg-white px-4 py-2 lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <p className="text-sm font-circular-bold text-[var(--color-text)]">
            Historial de notificaciones
          </p>
          <div className="flex items-center gap-2">
            {result.unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex h-11 items-center justify-center rounded-[16px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white"
              >
                Marcar todas como leidas
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              title="Actualizar"
              aria-label="Actualizar notificaciones"
              className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-[var(--color-input-bg)] text-[var(--color-text)]"
            >
              <ArrowClockwiseIcon
                size={18}
                weight="bold"
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 pb-2 pr-1">
          {loading && result.data.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => (
              <NotificationSkeleton key={index} />
            ))
          ) : result.data.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <BellIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-circular-bold text-[var(--color-text)]">
                  No tienes notificaciones
                </p>
              </div>
            </div>
          ) : (
            result.data.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onOpen={() => void openNotification(notification)}
              />
            ))
          )}
        </section>

        <footer className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {result.data.length} de {result.meta.total} notificaciones
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-8 items-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="grid size-8 place-items-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {page}
            </span>
            <button
              type="button"
              disabled={page >= result.meta.totalPages || loading}
              onClick={() =>
                setPage((current) =>
                  Math.min(result.meta.totalPages, current + 1),
                )
              }
              className="flex h-8 items-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </div>
    </DashboardShell>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color = "#ffffff",
  featured = false,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  color?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.12)]",
        featured
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[var(--color-card)] text-[var(--color-text)]",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: featured ? "rgba(255,255,255,0.18)" : `${color}1a`,
            color,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            className={cn(
              "text-sm",
              featured
                ? "text-white/75"
                : "text-[var(--color-muted-foreground)]",
            )}
          >
            {label}
          </p>
          <p className="text-2xl font-circular-bold leading-none">
            {value.toLocaleString("es-PE")}
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: () => void;
}) {
  const level = levelConfig[notification.level];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 text-left shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(160px,1fr)_minmax(260px,2.2fr)_minmax(120px,0.8fr)_minmax(145px,0.9fr)_110px_32px] md:items-center md:gap-4 md:gap-y-0"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <BellIcon size={20} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-circular-bold text-[var(--color-text)]">
            {notification.title}
          </span>
          <span className="block text-[10px] uppercase text-[var(--color-muted-foreground)]">
            {categoryLabel(notification.category)}
          </span>
        </span>
      </span>

      <span className="line-clamp-2 text-sm leading-5 text-[var(--color-muted-foreground)]">
        {notification.message}
      </span>

      <span
        className={cn(
          "w-fit rounded-full px-3 py-1 text-xs font-circular-bold",
          level.className,
        )}
      >
        {level.label}
      </span>

      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <CalendarIcon
            size={14}
            className="text-[var(--color-muted-foreground)]"
          />
          {formatDate(notification.createdAt)}
        </span>
        <span className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <ClockIcon
            size={14}
            className="text-[var(--color-muted-foreground)]"
          />
          {formatTime(notification.createdAt)}
        </span>
      </span>

      <span
        className={cn(
          "w-fit rounded-full px-3 py-1 text-xs font-circular-bold",
          notification.readAt
            ? "bg-[#64748b]/10 text-[#64748b]"
            : "bg-[#2563eb]/10 text-[#2563eb]",
        )}
      >
        {notification.readAt ? "Leida" : "Nueva"}
      </span>

      <span className="grid size-8 place-items-center rounded-[8px] text-[var(--color-muted-foreground)]">
        <ArrowRightIcon size={18} weight="bold" />
      </span>
    </button>
  );
}

function NotificationSkeleton() {
  return (
    <div className="h-[78px] animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]" />
  );
}

const levelConfig = {
  informacion: {
    label: "Informacion",
    className: "bg-[#3b82f6]/10 text-[#2563eb]",
  },
  exito: { label: "Exito", className: "bg-[#10b981]/10 text-[#059669]" },
  advertencia: {
    label: "Advertencia",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  error: { label: "Error", className: "bg-[#ef4444]/10 text-[#dc2626]" },
} satisfies Record<
  AppNotification["level"],
  { label: string; className: string }
>;

function categoryLabel(category: AppNotification["category"]) {
  return {
    aviso: "Aviso",
    plan: "Plan",
    facturacion: "Facturacion",
    sunat: "SUNAT",
    limite: "Limite",
    stock: "Stock",
    empresa: "Empresa",
  }[category];
}

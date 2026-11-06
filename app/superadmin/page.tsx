"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  BuildingsIcon,
  CalendarPlusIcon,
  ClockCountdownIcon,
  CreditCardIcon,
  CurrencyCircleDollarIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { useAuth } from "@/lib/auth/auth-provider";
import { getUserDisplayName } from "@/lib/auth/session";
import {
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "@/components/DashboardShell/recharts-components";
import {
  platformAdminApi,
  type PlatformAdminDashboardResponse,
  type PlatformDashboardDateFilter,
  type PlatformPlanCode,
  type CourierAgencySyncStatus,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("es-PE");
const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dashboardFilters: Array<{
  value: PlatformDashboardDateFilter;
  label: string;
}> = [
  { value: "today", label: "Hoy" },
  { value: "7days", label: "7 días" },
  { value: "14days", label: "14 días" },
  { value: "30days", label: "30 días" },
  { value: "month", label: "Este mes" },
  { value: "year", label: "Este año" },
];

export default function SuperAdminDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useSystemToast();
  const [dashboard, setDashboard] =
    useState<PlatformAdminDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] =
    useState<PlatformDashboardDateFilter>("month");
  const [courierSyncStatus, setCourierSyncStatus] = useState<
    Array<CourierAgencySyncStatus | null>
  >([]);
  const [isSyncingCouriers, setIsSyncingCouriers] = useState(false);

  const loadCourierSyncStatus = useCallback(async () => {
    try {
      setCourierSyncStatus(await platformAdminApi.getCourierAgenciesSyncStatus());
    } catch {
      setCourierSyncStatus([]);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setDashboard(await platformAdminApi.getDashboard(dateFilter));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el dashboard administrativo",
      );
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
      void loadCourierSyncStatus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCourierSyncStatus, loadDashboard]);

  const syncCourierAgencies = async () => {
    if (isSyncingCouriers) return;
    setIsSyncingCouriers(true);
    try {
      const results = await platformAdminApi.syncCourierAgencies();
      const failed = results.filter((result) => !result.ok);
      if (failed.length) {
        showToast({
          title: "No se completó la sincronización",
          description: failed.map((result) => result.courier).join(", "),
          variant: "error",
        });
      } else {
        showToast({
          title: "Agencias actualizadas",
          description: results
            .map((result) => `${result.courier}: ${result.totalRecibidas ?? 0}`)
            .join(" · "),
          variant: "success",
        });
      }
      await loadCourierSyncStatus();
    } catch (syncError) {
      showToast({
        title: "No se pudieron actualizar las agencias",
        description:
          syncError instanceof Error
            ? syncError.message
            : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSyncingCouriers(false);
    }
  };

  return (
    <DashboardShell headerTitle="Dashboard administrativo">
      <div className="flex flex-1 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:px-10 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-lg font-circular-bold text-[var(--color-text)] sm:text-xl text-fixed-lg">
            Hola, bienvenido{" "}
            <span className="text-[var(--color-primary)]">
              {getUserDisplayName(user) || "Administrador"}
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {dashboardFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setDateFilter(filter.value)}
                className={cn(
                  "h-9 rounded-xl px-4 text-xs font-circular-bold transition-colors",
                  dateFilter === filter.value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)]",
                )}
              >
                {filter.label}
              </button>
            ))}
            <button
              type="button"
              onClick={loadDashboard}
              disabled={isLoading}
              className={cn(
                "flex h-9 items-center gap-2 rounded-xl bg-[var(--color-sidebar-active)] px-4 text-xs font-circular-bold text-white shadow-md transition-colors duration-200 dark:bg-[var(--color-secondary)]",
                isLoading && "cursor-not-allowed opacity-70",
              )}
            >
              <ArrowClockwiseIcon
                size={15}
                weight="bold"
                className={cn(isLoading && "animate-spin")}
              />
              Actualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 xl:flex-row">
          <SummaryGrid
            dashboard={dashboard}
            isLoading={isLoading}
            dateFilter={dateFilter}
          />
          <div className="xl:w-[380px] xl:shrink-0">
            <PlanDistribution data={dashboard?.planDistribution ?? []} />
          </div>
          <div className="xl:w-[260px] xl:shrink-0">
            <CourierAgencySyncCard
              statuses={courierSyncStatus}
              isSyncing={isSyncingCouriers}
              onSync={syncCourierAgencies}
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          <CompanyTrendChart data={dashboard?.companyTrend ?? []} />
          <RecentCompanies companies={dashboard?.recentCompanies ?? []} />
        </div>
      </div>
    </DashboardShell>
  );
}

function CourierAgencySyncCard({
  statuses,
  isSyncing,
  onSync,
}: {
  statuses: Array<CourierAgencySyncStatus | null>;
  isSyncing: boolean;
  onSync: () => void;
}) {
  const statusFor = (courier: "SHALOM" | "OLVA") =>
    statuses.find((status) => status?.courier === courier) ?? null;

  return (
    <article className="flex h-full min-h-[250px] flex-col rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-circular-bold text-[var(--color-text)]">
            Agencias courier
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
            Catálogo de Shalom y Olva
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <BuildingsIcon size={18} weight="bold" />
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {(["SHALOM", "OLVA"] as const).map((courier) => {
          const status = statusFor(courier);
          const successful = status?.estado === "completada";
          return (
            <div
              key={courier}
              className="rounded-xl bg-[var(--color-background)] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-circular-bold text-[var(--color-text)]">
                  {courier === "SHALOM" ? "Shalom" : "Olva"}
                </span>
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    successful
                      ? "bg-[#10b981]"
                      : status?.estado === "fallida"
                        ? "bg-[#ef4444]"
                        : "bg-[#f59e0b]",
                  )}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                {status
                  ? `${status.totalRecibidas} agencias · ${formatSyncDate(status.finalizadaAt ?? status.iniciadaAt)}`
                  : "Aún no sincronizado"}
              </p>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSync}
        disabled={isSyncing}
        className={cn(
          "mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <ArrowClockwiseIcon
          size={16}
          weight="bold"
          className={cn(isSyncing && "animate-spin")}
        />
        {isSyncing ? "Actualizando..." : "Actualizar agencias"}
      </button>
    </article>
  );
}

function formatSyncDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SummaryGrid({
  dashboard,
  isLoading,
  dateFilter,
}: {
  dashboard: PlatformAdminDashboardResponse | null;
  isLoading: boolean;
  dateFilter: PlatformDashboardDateFilter;
}) {
  const summary = dashboard?.summary;
  const items = [
    {
      label: "Total recaudado",
      value: currencyFormatter.format(Number(summary?.totalCollected ?? 0)),
      icon: CurrencyCircleDollarIcon,
      color: "bg-[var(--color-primary)] text-white",
      iconColor: "bg-white/20 text-white",
      active: true,
    },
    {
      label: "Empresas totales",
      value: numberFormatter.format(summary?.totalCompanies ?? 0),
      icon: BuildingsIcon,
      color: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
      iconColor: "bg-[#eff6ff] text-[#3b82f6]",
    },
    {
      label:
        dashboardFilters.find((filter) => filter.value === dateFilter)
          ?.label === "Este mes"
          ? "Nuevas este mes"
          : "Nuevas en el periodo",
      value: numberFormatter.format(summary?.companiesInPeriod ?? 0),
      icon: CalendarPlusIcon,
      color: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
      iconColor: "bg-[#ecfdf5] text-[#10b981]",
    },
    {
      label: "Pruebas activas",
      value: numberFormatter.format(summary?.activeTrials ?? 0),
      icon: ClockCountdownIcon,
      color: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
      iconColor: "bg-[#eff6ff] text-[#3b82f6]",
    },
    {
      label: "Suscripciones activas",
      value: numberFormatter.format(summary?.activeSubscriptions ?? 0),
      icon: CreditCardIcon,
      color: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
      iconColor: "bg-[#ecfdf5] text-[#10b981]",
    },
    {
      label: "Planes vencidos",
      value: numberFormatter.format(summary?.expiredCompanies ?? 0),
      icon: ClockCountdownIcon,
      color: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
      iconColor: "bg-[#fef2f2] text-[#ef4444]",
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article
            key={item.label}
            className={cn(
              "flex min-h-[140px] flex-col gap-4 rounded-2xl p-5 shadow-sm",
              item.color,
            )}
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                item.iconColor,
              )}
            >
              <Icon size={18} weight="bold" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  item.active
                    ? "text-white/70"
                    : "text-[var(--color-muted-foreground)]",
                )}
              >
                {item.label}
              </p>
              <p className="truncate text-2xl leading-none font-circular-bold text-fixed-2xl">
                {!dashboard && isLoading ? "..." : item.value}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function CompanyTrendChart({
  data,
}: {
  data: PlatformAdminDashboardResponse["companyTrend"];
}) {
  return (
    <article className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
        Nuevas empresas
      </h2>
      <div className="h-[280px]">
        {data.some((item) => item.value > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id="platformCompanyGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dx={-10}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#platformCompanyGradient)"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "#8b5cf6",
                  stroke: "#fff",
                  strokeWidth: 3,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
            Sin empresas nuevas en el periodo
          </div>
        )}
      </div>
    </article>
  );
}

function PlanDistribution({
  data,
}: {
  data: PlatformAdminDashboardResponse["planDistribution"];
}) {
  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({ ...item, fill: item.color }));
  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <article className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="relative h-[190px] w-full">
        {chartData.length ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="none"
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-circular-bold text-[var(--color-text)] text-fixed-2xl">
                {numberFormatter.format(total)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
            Sin empresas activas
          </div>
        )}
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        {data.map((item) => (
          <div
            key={item.code}
            className="flex min-w-0 items-center gap-2 rounded-xl bg-[var(--color-background)] p-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-[var(--color-text)]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="ml-auto font-circular-bold text-[var(--color-text)]">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function RecentCompanies({
  companies,
}: {
  companies: PlatformAdminDashboardResponse["recentCompanies"];
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-[var(--color-sidebar-bg)] shadow-sm">
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
          Empresas recientes
        </h2>
      </div>
      {companies.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[var(--color-input-bg)] text-xs text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-circular-bold">Empresa</th>
                <th className="px-4 py-3 font-circular-bold">Documento</th>
                <th className="px-4 py-3 font-circular-bold">Plan</th>
                <th className="px-4 py-3 font-circular-bold">Estado</th>
                <th className="px-4 py-3 font-circular-bold">Registro</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-t border-[var(--color-border)] text-sm"
                >
                  <td className="px-4 py-3 font-circular-bold text-[var(--color-text)]">
                    {company.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {company.document ?? "Sin documento"}
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge
                      code={company.planCode}
                      name={company.planName}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={company.planStatus} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {dateFormatter.format(new Date(company.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
          Todavia no hay empresas registradas
        </div>
      )}
    </section>
  );
}

function PlanBadge({ code, name }: { code: PlatformPlanCode; name: string }) {
  const colors: Record<PlatformPlanCode, string> = {
    prueba: "bg-[#2563eb]/10 text-[#2563eb]",
    basico: "bg-[#06b6d4]/10 text-[#0891b2]",
    impulsa: "bg-[#e11d48]/10 text-[#be123c]",
    emprendedor: "bg-[#10b981]/10 text-[#059669]",
    crecimiento: "bg-[#f59e0b]/10 text-[#d97706]",
    empresarial: "bg-[#8b5cf6]/10 text-[#7c3aed]",
    pos_basico: "bg-[#0ea5e9]/10 text-[#0284c7]",
    asistencias_basico: "bg-[#14b8a6]/10 text-[#0f766e]",
    asistencias_pro: "bg-[#22c55e]/10 text-[#15803d]",
    completo_emprende: "bg-[#f97316]/10 text-[#ea580c]",
    completo_empresa: "bg-[#7c3aed]/10 text-[#6d28d9]",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        colors[code],
      )}
    >
      {name}
    </span>
  );
}

function StatusBadge({ status }: { status: "trial" | "active" | "expired" }) {
  const values = {
    trial: {
      label: "Prueba",
      className: "bg-[#0ea5e9]/10 text-[#0284c7]",
    },
    active: {
      label: "Activo",
      className: "bg-[#10b981]/10 text-[#059669]",
    },
    expired: {
      label: "Vencido",
      className: "bg-[#ef4444]/10 text-[#dc2626]",
    },
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        values[status].className,
      )}
    >
      {values[status].label}
    </span>
  );
}

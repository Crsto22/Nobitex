"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  CalendarCheckIcon,
  ClockCountdownIcon,
  ClockUserIcon,
  IdentificationBadgeIcon,
  MapPinAreaIcon,
  QrCodeIcon,
  UserCheckIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";
import type { TooltipContentProps } from "recharts";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/DashboardShell/recharts-components";
import {
  attendanceDashboardApi,
  type AttendanceDashboardBranchItem,
  type AttendanceDashboardResponse,
  type AttendanceDashboardStatusItem,
  type AttendanceDashboardSummary,
  type AttendanceDashboardTrendItem,
} from "@/lib/api/attendance-dashboard";
import { branchesApi, type Branch } from "@/lib/api/branches";
import type { DashboardDateFilter } from "@/lib/api/dashboard";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

const emptySummary: AttendanceDashboardSummary = {
  attendances: 0,
  absences: 0,
  lateArrivals: 0,
  incompleteEntries: 0,
  activeEmployees: 0,
  inactiveEmployees: 0,
  employeesWithShift: 0,
  employeesWithoutShift: 0,
  activeShifts: 0,
  activeQrPoints: 0,
};

export default function AsistenciasDashboardPage() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<DashboardDateFilter>("today");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dashboard, setDashboard] =
    useState<AttendanceDashboardResponse | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const assistantMessage = getAssistantMessage(dashboard, isLoadingDashboard);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      branchesApi
        .findAll({ limit: 100, estado: "activo", tipo: "asistencia" })
        .then((response) => {
          if (!isMounted) return;
          setBranches(response.data);
          setSelectedBranch((current) => {
            if (current) return current;

            const principalBranch =
              response.data.find((branch) => branch.esPrincipal) ??
              response.data[0];

            return principalBranch?.id ?? "all";
          });
        })
        .catch(() => {
          if (!isMounted) return;
          setBranches([]);
          setSelectedBranch((current) => current || "all");
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const loadDashboard = useCallback(
    (options: RequestInit = {}) => {
      if (!selectedBranch) return;

      setIsLoadingDashboard(true);
      setDashboardError(null);

      attendanceDashboardApi
        .find(
          {
            sucursalId: selectedBranch === "all" ? undefined : selectedBranch,
            dateFilter: selectedFilter,
          },
          options,
        )
        .then((response) => {
          setDashboard(response);
        })
        .catch((error: unknown) => {
          if (options.signal?.aborted) return;
          setDashboard(null);
          setDashboardError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los datos del dashboard",
          );
        })
        .finally(() => {
          if (options.signal?.aborted) return;
          setIsLoadingDashboard(false);
        });
    },
    [selectedBranch, selectedFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Data is intentionally synchronized with the selected dashboard filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard({ signal: controller.signal });
    return () => controller.abort();
  }, [loadDashboard]);

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:px-10 md:py-10">
        <FilterBar
          selectedDateFilter={selectedFilter}
          onDateFilterChange={(value) =>
            setSelectedFilter(value as DashboardDateFilter)
          }
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
          onRefresh={loadDashboard}
          isRefreshing={isLoadingDashboard}
          allowAllBranches={!user?.sucursalId}
          ownOperations={user?.visibilidadOperaciones === "propias"}
        />
        {dashboardError ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm font-circular-regular text-[#ef4444]">
            {dashboardError}
          </div>
        ) : null}
        <AttendanceStatsGrid summary={dashboard?.summary} />
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[2fr_1fr_1fr]">
          <AttendanceTrendChart data={dashboard?.attendanceTrend} />
          <AttendanceStatusChart data={dashboard?.attendanceByStatus} />
          <AttendanceByBranchChart data={dashboard?.attendanceByBranch} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <OperationalStatusCard dashboard={dashboard} />
          <AssistantCard message={assistantMessage} />
        </div>
      </div>
    </DashboardShell>
  );
}

function AttendanceStatsGrid({
  summary,
}: {
  summary?: AttendanceDashboardSummary | null;
}) {
  const currentSummary = summary ?? emptySummary;
  const totalAttendance =
    currentSummary.attendances +
    currentSummary.absences +
    currentSummary.lateArrivals +
    currentSummary.incompleteEntries;
  const attendancePercent =
    totalAttendance > 0
      ? Math.round((currentSummary.attendances / totalAttendance) * 100)
      : 0;

  const stats = [
    {
      label: "Asistencias",
      value: String(currentSummary.attendances),
      icon: <CalendarCheckIcon size={18} weight="bold" />,
      iconBg: "bg-[#eff6ff]",
      iconColor: "text-[#3b82f6]",
      active: true,
      badge: `${attendancePercent}%`,
    },
    {
      label: "Faltas",
      value: String(currentSummary.absences),
      icon: <XCircleIcon size={18} weight="bold" />,
      iconBg: "bg-white/20",
      iconColor: "text-white",
      bgColor: "bg-[#ef4444]",
      textColor: "text-white",
    },
    {
      label: "Tardanzas",
      value: String(currentSummary.lateArrivals),
      icon: <ClockCountdownIcon size={18} weight="bold" />,
      iconBg: "bg-[#fff7ed]",
      iconColor: "text-[#f97316]",
    },
    {
      label: "Incompletos",
      value: String(currentSummary.incompleteEntries),
      icon: <WarningCircleIcon size={18} weight="bold" />,
      iconBg: "bg-[#fefce8]",
      iconColor: "text-[#eab308]",
    },
    {
      label: "Personal activo",
      value: String(currentSummary.activeEmployees),
      icon: <UserCheckIcon size={18} weight="bold" />,
      iconBg: "bg-[#eff6ff]",
      iconColor: "text-[#3b82f6]",
    },
    {
      label: "Puntos QR activos",
      value: String(currentSummary.activeQrPoints),
      icon: <QrCodeIcon size={18} weight="bold" />,
      iconBg: "bg-[#ecfdf5]",
      iconColor: "text-[#10b981]",
    },
  ];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((stat) => (
          <AttendanceStatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid w-full gap-4 lg:w-[500px] lg:shrink-0">
        <AttendanceCompactCard summary={currentSummary} />
      </div>
    </div>
  );
}

function AttendanceStatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  active,
  badge,
  bgColor,
  textColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  active?: boolean;
  badge?: string;
  bgColor?: string;
  textColor?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5 shadow-sm transition-colors duration-200",
        bgColor ||
          (active
            ? "bg-[var(--color-sidebar-active)]"
            : "bg-[var(--color-sidebar-bg)]"),
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            active ? "bg-white/20" : iconBg,
          )}
        >
          <span className={textColor || (active ? "text-white" : iconColor)}>
            {icon}
          </span>
        </div>
        {badge ? (
          <span className="rounded-full bg-[#10b981]/20 px-2.5 py-1 text-xs font-circular-regular text-[#10b981]">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "text-sm font-medium",
            textColor ||
              (active
                ? "text-white/70"
                : "text-[var(--color-muted-foreground)]"),
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-circular-bold text-2xl leading-none text-fixed-2xl",
            textColor || (active ? "text-white" : "text-[var(--color-text)]"),
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function AttendanceCompactCard({
  summary,
}: {
  summary: AttendanceDashboardSummary;
}) {
  const total =
    summary.attendances +
    summary.absences +
    summary.lateArrivals +
    summary.incompleteEntries;
  const attendancePercent =
    total > 0 ? Math.round((summary.attendances / total) * 100) : 0;
  const absencePercent =
    total > 0
      ? Math.round(((summary.absences + summary.lateArrivals) / total) * 100)
      : 0;

  const radius1 = 70;
  const radius2 = 52;
  const strokeWidth = 12;
  const cx = 80;
  const cy = 80;
  const circumference1 = 2 * Math.PI * radius1;
  const circumference2 = 2 * Math.PI * radius2;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx={cx}
            cy={cy}
            r={radius1}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference1}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius1}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${(attendancePercent / 100) * circumference1} ${circumference1}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius2}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference2}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius2}
            fill="none"
            stroke="#f97316"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${(absencePercent / 100) * circumference2} ${circumference2}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-circular-bold text-2xl text-[var(--color-text)]">
            {total}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            Registros
          </span>
        </div>
      </div>
      <div className="flex w-full gap-4">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--color-background)] p-3">
          <div className="h-3 w-3 rounded-full bg-[#10b981]" />
          <div className="min-w-0">
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
              Asistencias
            </p>
            <p className="font-circular-bold text-base text-[var(--color-text)]">
              {summary.attendances}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--color-background)] p-3">
          <div className="h-3 w-3 rounded-full bg-[#f97316]" />
          <div className="min-w-0">
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
              Faltas/tard.
            </p>
            <p className="font-circular-bold text-base text-[var(--color-text)]">
              {summary.absences + summary.lateArrivals}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceTrendChart({
  data = [],
}: {
  data?: AttendanceDashboardTrendItem[];
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
            Asistencias por dia
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Resumen del periodo seleccionado
          </p>
        </div>
      </div>
      <div className="h-[280px]">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dx={-10}
              />
              <Tooltip content={TrendTooltip} cursor={false} />
              <Bar
                dataKey="asistencias"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                barSize={18}
              />
              <Bar dataKey="faltas" fill="#ef4444" radius={[8, 8, 0, 0]} />
              <Bar dataKey="tardanzas" fill="#f97316" radius={[8, 8, 0, 0]} />
              <Bar dataKey="incompletos" fill="#eab308" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartMessage />
        )}
      </div>
    </div>
  );
}

function AttendanceStatusChart({
  data = [],
}: {
  data?: AttendanceDashboardStatusItem[];
}) {
  const chartData = data.filter((item) => item.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
        Marcajes por estado
      </h3>
      <div className="relative flex h-[220px] items-center justify-center">
        {chartData.length ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={StatusTooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-circular-bold text-2xl text-[var(--color-text)]">
                {total}
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            Sin datos para el periodo
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-center gap-6">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {item.name}
              </span>
              <span className="font-circular-bold text-xs text-[var(--color-text)]">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceByBranchChart({
  data = [],
}: {
  data?: AttendanceDashboardBranchItem[];
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
            Marcajes por sede
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Entradas y salidas registradas
          </p>
        </div>
      </div>
      <div className="h-[280px]">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={8}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dx={-10}
              />
              <Tooltip content={BranchTooltip} cursor={false} />
              <Bar
                dataKey="value"
                fill="var(--color-primary)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartMessage />
        )}
      </div>
    </div>
  );
}

function OperationalStatusCard({
  dashboard,
}: {
  dashboard: AttendanceDashboardResponse | null;
}) {
  const alerts = dashboard?.alerts ?? {
    employeesWithoutShift: 0,
    inactiveShifts: 0,
    inactiveQrPoints: 0,
    branchesWithQrTotal: 0,
  };

  const items = [
    {
      label: "Trabajadores sin turno",
      value: alerts.employeesWithoutShift,
      href: "/asistencias/personal",
      icon: <IdentificationBadgeIcon size={21} weight="fill" />,
    },
    {
      label: "Turnos inactivos",
      value: alerts.inactiveShifts,
      href: "/asistencias/turnos",
      icon: <ClockUserIcon size={21} weight="fill" />,
    },
    {
      label: "Puntos QR inactivos",
      value: alerts.inactiveQrPoints,
      href: "/asistencias/puntos-qr",
      icon: <QrCodeIcon size={21} weight="fill" />,
    },
    {
      label: "Sucursales con QR",
      value: alerts.branchesWithQrTotal,
      href: "/asistencias/puntos-qr",
      icon: <MapPinAreaIcon size={21} weight="fill" />,
    },
  ];

  return (
    <section className="flex min-h-28 flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#3b82f6]">
            <UsersThreeIcon size={21} weight="fill" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-circular-regular text-[var(--color-muted-foreground)]">
              Estado operativo
            </p>
            <p className="truncate text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
              Configuracion de asistencias
            </p>
          </div>
        </div>
        <Link
          href="/asistencias/personal"
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white transition-opacity hover:opacity-90"
        >
          Revisar
          <ArrowUpRightIcon size={16} weight="bold" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl bg-[var(--color-background)] p-3 transition-colors hover:bg-[var(--color-button-hover)]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                {item.label}
              </span>
              <span className="block font-circular-bold text-base text-[var(--color-text)]">
                {item.value}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function AssistantCard({ message }: { message: string }) {
  return (
    <section className="flex min-h-28 items-center gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <span
        className="nuvex-mascot nuvex-mascot--celebrate shrink-0"
        style={{ "--nuvex-scale": 0.32 } as CSSProperties}
        aria-hidden="true"
      />
      <div className="relative min-w-0 flex-1 rounded-[18px] bg-[var(--color-input-bg)] px-4 py-3 shadow-sm ring-1 ring-[var(--color-border)]">
        <span
          className="absolute top-6 -left-3 size-3 rounded-full bg-[var(--color-input-bg)] ring-1 ring-[var(--color-border)]"
          aria-hidden="true"
        />
        <span
          className="absolute top-4 -left-7 size-2 rounded-full bg-[var(--color-input-bg)] ring-1 ring-[var(--color-border)]"
          aria-hidden="true"
        />
        <p className="text-sm font-circular-bold text-[var(--color-text)]">
          Tu asistente Nuvex
        </p>
        <p className="mt-1 text-sm leading-5 text-[var(--color-muted-foreground)]">
          {message}
        </p>
      </div>
    </section>
  );
}

function TrendTooltip({ active, payload }: TooltipContentProps) {
  if (active && payload && payload.length) {
    const row = payload[0].payload as AttendanceDashboardTrendItem;
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2.5 shadow-lg">
        <p className="mb-1 text-sm font-circular-bold text-white">
          {row.label}
        </p>
        <p className="text-xs font-circular-bold text-white/80">
          Asistencias: {row.asistencias}
        </p>
        <p className="text-xs font-circular-bold text-white/80">
          Faltas: {row.faltas}
        </p>
        <p className="text-xs font-circular-bold text-white/80">
          Tardanzas: {row.tardanzas}
        </p>
        <p className="text-xs font-circular-bold text-white/80">
          Incompletos: {row.incompletos}
        </p>
      </div>
    );
  }
  return null;
}

function StatusTooltip({ active, payload }: TooltipContentProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2 shadow-lg">
        <p className="text-sm font-circular-bold text-white">
          {payload[0].payload.name}
        </p>
        <p className="text-xs font-circular-bold text-white/70">
          {payload[0].value} trabajadores
        </p>
      </div>
    );
  }
  return null;
}

function BranchTooltip({ active, payload }: TooltipContentProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2.5 shadow-lg">
        <p className="text-sm font-circular-bold text-white">
          {payload[0].payload.name}
        </p>
        <p className="text-xs font-circular-bold text-white/70">
          {payload[0].value} marcajes
        </p>
      </div>
    );
  }
  return null;
}

function EmptyChartMessage() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      Sin datos para el periodo
    </div>
  );
}

function getAssistantMessage(
  dashboard: AttendanceDashboardResponse | null,
  isLoading: boolean,
) {
  if (isLoading && !dashboard) {
    return "Estoy revisando los marcajes del periodo seleccionado.";
  }

  if (!dashboard || dashboard.summary.activeEmployees === 0) {
    return "Empieza registrando tu personal para preparar los marcajes por QR.";
  }

  if (
    dashboard.summary.attendances === 0 &&
    dashboard.summary.absences === 0 &&
    dashboard.summary.lateArrivals === 0 &&
    dashboard.summary.incompleteEntries === 0
  ) {
    return "Todavia no hay marcajes en este periodo. Cuando el personal escanee el QR, aqui veras asistencias, faltas y tardanzas.";
  }

  if (dashboard.summary.absences > 0) {
    return `Hay ${dashboard.summary.absences} faltas en el periodo seleccionado. Revisa el modulo de asistencias para ver el detalle por trabajador.`;
  }

  return `Periodo revisado: ${dashboard.summary.attendances} asistencias, ${dashboard.summary.lateArrivals} tardanzas y ${dashboard.summary.incompleteEntries} marcajes incompletos.`;
}

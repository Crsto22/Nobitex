"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CalendarBlankIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  PresentationChartIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  BuildingsIcon,
  CaretDownIcon,
} from "@phosphor-icons/react/ssr";
import type { TooltipContentProps } from "recharts";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
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
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  attendanceDashboardApi,
  type AttendanceDashboardDateFilter,
  type AttendanceDashboardResponse,
  type AttendanceDashboardStatusItem,
  type AttendanceDashboardTrendItem,
} from "@/lib/api/attendance-dashboard";
import {
  attendanceTimeEntriesApi,
  type AttendanceTimeEntryHistoryItem,
} from "@/lib/api/attendance-time-entries";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { cn } from "@/lib/utils";

const emptyReport: AttendanceDashboardResponse = {
  filters: {
    sucursalId: null,
    dateFilter: "30days",
    range: { start: "", end: "" },
  },
  summary: {
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
  },
  employeesByStatus: [],
  attendanceByStatus: [],
  attendanceTrend: [],
  attendanceByBranch: [],
  employeesByShift: [],
  qrPointsByBranch: [],
  alerts: {
    employeesWithoutShift: 0,
    inactiveShifts: 0,
    inactiveQrPoints: 0,
    branchesWithQrTotal: 0,
  },
};

export default function AsistenciasReportesPage() {
  const { showToast } = useSystemToast();
  const [report, setReport] = useState<AttendanceDashboardResponse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] =
    useState<AttendanceDashboardDateFilter>("month");
  const [fromDate, setFromDate] = useState(() => dateInputValue(new Date()));
  const [toDate, setToDate] = useState(() => dateInputValue(new Date()));
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState<"csv" | "excel" | null>(
    null,
  );

  const loadReport = useCallback(async () => {
    const response = await attendanceDashboardApi.find({
      dateFilter: selectedDateFilter,
      sucursalId: selectedBranch,
      desde: selectedDateFilter === "custom" ? fromDate : undefined,
      hasta: selectedDateFilter === "custom" ? toDate : undefined,
    });
    setReport(response);
  }, [fromDate, selectedBranch, selectedDateFilter, toDate]);

  useEffect(() => {
    let mounted = true;
    branchesApi
      .findAll({ estado: "activo", limit: 100 })
      .then((response) => {
        if (mounted) setBranches(response.data);
      })
      .catch(() => {
        if (mounted) setBranches([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      loadReport()
        .catch((error) => {
          if (!mounted) return;
          showToast({
            title: "No se pudo cargar reportes",
            description: getErrorMessage(error),
            variant: "error",
          });
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [loadReport, showToast]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await loadReport();
    } catch (error) {
      showToast({
        title: "No se pudo actualizar",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const download = async (format: "csv" | "excel") => {
    const current = report ?? emptyReport;
    setIsDownloading(format);
    try {
      const rows = await attendanceTimeEntriesApi.findHistory({
        page: 1,
        limit: 100,
        sucursalId: selectedBranch,
        desde: current.filters.range.start,
        hasta: current.filters.range.end,
      });
      let allRows = rows.data;
      for (let page = 2; page <= rows.meta.totalPages; page += 1) {
        const next = await attendanceTimeEntriesApi.findHistory({
          page,
          limit: 100,
          sucursalId: selectedBranch,
          desde: current.filters.range.start,
          hasta: current.filters.range.end,
        });
        allRows = allRows.concat(next.data);
      }
      const fileRows = allRows.map(toExportRow);
      downloadBlob(
        format === "csv"
          ? new Blob([toCsv(fileRows)], { type: "text/csv;charset=utf-8" })
          : new Blob([toExcelHtml(fileRows)], {
              type: "application/vnd.ms-excel;charset=utf-8",
            }),
        fileName(format === "csv" ? "csv" : "xls"),
      );
    } catch (error) {
      showToast({
        title: "No se pudo descargar",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const current = report ?? emptyReport;
  const summary = current.summary;

  return (
    <DashboardShell headerTitle="Reportes">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:p-4 lg:px-6 lg:py-5">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-circular-bold text-[var(--color-text)]">
              Reportes de asistencias
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Descarga marcaciones y revisa el comportamiento del periodo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DownloadButton
              label="CSV"
              loading={isDownloading === "csv"}
              onClick={() => void download("csv")}
            />
            <DownloadButton
              label="Excel"
              loading={isDownloading === "excel"}
              onClick={() => void download("excel")}
            />
          </div>
        </header>

        <ReportFilters
          selectedDateFilter={selectedDateFilter}
          onDateFilterChange={setSelectedDateFilter}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
          onRefresh={() => void refresh()}
          isRefreshing={isRefreshing}
        />

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <ReportMetric
            label="Asistencias"
            value={summary.attendances}
            color="#10b981"
            icon={<UsersThreeIcon size={20} weight="fill" />}
            loading={isLoading}
          />
          <ReportMetric
            label="Faltas"
            value={summary.absences}
            color="#ef4444"
            icon={<WarningCircleIcon size={20} weight="fill" />}
            loading={isLoading}
          />
          <ReportMetric
            label="Tardanzas"
            value={summary.lateArrivals}
            color="#f97316"
            icon={<CalendarBlankIcon size={20} weight="fill" />}
            loading={isLoading}
          />
          <ReportMetric
            label="Incompletos"
            value={summary.incompleteEntries}
            color="#eab308"
            icon={<FileTextIcon size={20} weight="fill" />}
            loading={isLoading}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <TrendChart data={current.attendanceTrend} loading={isLoading} />
          <StatusPie data={current.attendanceByStatus} loading={isLoading} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <SimpleBarChart
            title="Por sucursal"
            description="Marcaciones agrupadas por tienda."
            data={current.attendanceByBranch.map((item) => ({
              label: item.name,
              value: item.value,
            }))}
            loading={isLoading}
            color="#2563eb"
          />
          <SimpleBarChart
            title="Trabajadores por turno"
            description="Distribución del personal asignado."
            data={current.employeesByShift.map((item) => ({
              label: item.name,
              value: item.value,
            }))}
            loading={isLoading}
            color="#8b5cf6"
          />
        </section>
      </div>
    </DashboardShell>
  );
}

function DownloadButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#107c41] px-4 text-sm font-circular-bold text-white shadow-sm transition-opacity hover:bg-[#0e6f3a] disabled:opacity-60"
    >
      <DownloadSimpleIcon
        size={17}
        weight="bold"
        className={loading ? "animate-bounce" : ""}
      />
      {loading ? "Descargando..." : `Descargar ${label}`}
    </button>
  );
}

const periodOptions: Array<{
  label: string;
  value: AttendanceDashboardDateFilter;
}> = [
  { label: "Semana", value: "week" },
  { label: "Quincena", value: "fortnight" },
  { label: "Mes", value: "month" },
  { label: "Por fecha", value: "custom" },
];

function ReportFilters({
  selectedDateFilter,
  onDateFilterChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  branches,
  selectedBranch,
  onBranchChange,
  onRefresh,
  isRefreshing,
}: {
  selectedDateFilter: AttendanceDashboardDateFilter;
  onDateFilterChange: (value: AttendanceDashboardDateFilter) => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const branchOptions = [
    { label: "Todas", value: "all" },
    ...branches.map((branch) => ({ label: branch.nombre, value: branch.id })),
  ];
  const currentBranch = branchOptions.find((branch) => branch.value === selectedBranch);

  return (
    <section className="rounded-[14px] border border-[#107c41]/15 bg-[#107c41]/5 p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onDateFilterChange(option.value)}
              className={cn(
                "h-10 shrink-0 rounded-[10px] px-4 text-sm font-circular-bold transition-colors",
                selectedDateFilter === option.value
                  ? "bg-[#107c41] text-white shadow-sm"
                  : "bg-[var(--color-card)] text-[#107c41] hover:bg-[#107c41]/10",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          {selectedDateFilter === "custom" ? (
            <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => onFromDateChange(event.target.value)}
                className="h-10 rounded-[10px] border border-[#107c41]/20 bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] outline-none"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => onToDateChange(event.target.value)}
                className="h-10 rounded-[10px] border border-[#107c41]/20 bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] outline-none"
              />
            </div>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-card)] px-4 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[#107c41]/10 sm:w-auto"
            >
              <BuildingsIcon size={16} weight="bold" />
              {currentBranch?.label ?? "Cargando..."}
              <CaretDownIcon size={14} weight="bold" />
            </button>
            {isOpen ? (
              <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {branchOptions.map((branch) => (
                  <button
                    key={branch.value}
                    type="button"
                    onClick={() => {
                      onBranchChange(branch.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-bold transition-colors",
                      selectedBranch === branch.value
                        ? "bg-[#107c41] text-white"
                        : "text-[var(--color-text)] hover:bg-[#107c41]/10",
                    )}
                  >
                    <BuildingsIcon size={16} weight="bold" />
                    {branch.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-10 items-center justify-center rounded-[10px] bg-[#107c41] px-4 text-sm font-circular-bold text-white shadow-sm transition-opacity hover:bg-[#0e6f3a] disabled:opacity-60"
          >
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ReportMetric({
  label,
  value,
  color,
  icon,
  loading,
}: {
  label: string;
  value: number;
  color: string;
  icon: ReactNode;
  loading: boolean;
}) {
  return (
    <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      {loading ? (
        <div className="h-20 animate-pulse rounded-[12px] bg-[var(--color-input-bg)]" />
      ) : (
        <>
          <span
            className="grid size-10 place-items-center rounded-[11px]"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {icon}
          </span>
          <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-circular-bold text-[var(--color-text)]">
            {value.toLocaleString("es-PE")}
          </p>
        </>
      )}
    </article>
  );
}

function TrendChart({
  data,
  loading,
}: {
  data: AttendanceDashboardTrendItem[];
  loading: boolean;
}) {
  return (
    <ChartCard
      title="Asistencias por día"
      description="Barras por estado dentro del periodo."
      loading={loading}
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <Tooltip content={TrendTooltip} cursor={false} />
          <Bar dataKey="asistencias" fill="#10b981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="faltas" fill="#ef4444" radius={[8, 8, 0, 0]} />
          <Bar dataKey="tardanzas" fill="#f97316" radius={[8, 8, 0, 0]} />
          <Bar dataKey="incompletos" fill="#eab308" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function StatusPie({
  data,
  loading,
}: {
  data: AttendanceDashboardStatusItem[];
  loading: boolean;
}) {
  const chartData = data.filter((item) => item.value > 0);
  return (
    <ChartCard
      title="Distribución"
      description="Pastel por estado de asistencia."
      loading={loading}
      empty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={92}
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
    </ChartCard>
  );
}

function SimpleBarChart({
  title,
  description,
  data,
  loading,
  color,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; value: number }>;
  loading: boolean;
  color: string;
}) {
  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      empty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <Tooltip content={SimpleTooltip} cursor={false} />
          <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({
  title,
  description,
  loading,
  empty,
  children,
}: {
  title: string;
  description: string;
  loading: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-circular-bold text-[var(--color-text)]">
            {title}
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {description}
          </p>
        </div>
        <PresentationChartIcon
          size={26}
          weight="fill"
          className="text-[var(--color-secondary)]"
        />
      </div>
      <div className="h-[280px]">
        {loading ? (
          <div className="h-full animate-pulse rounded-[14px] bg-[var(--color-input-bg)]" />
        ) : empty ? (
          <div className="grid h-full place-items-center text-sm text-[var(--color-muted-foreground)]">
            Sin datos para mostrar
          </div>
        ) : (
          children
        )}
      </div>
    </article>
  );
}

function TrendTooltip(props: TooltipContentProps) {
  if (!props.active || !props.payload?.length) return null;
  return (
    <TooltipBox label={String(props.label ?? "")}>
      {props.payload.map((item) => (
        <TooltipLine
          key={String(item.dataKey)}
          label={String(item.name ?? item.dataKey)}
          value={Number(item.value ?? 0)}
          color={String(item.color ?? "#101d69")}
        />
      ))}
    </TooltipBox>
  );
}

function StatusTooltip(props: TooltipContentProps) {
  if (!props.active || !props.payload?.length) return null;
  const item = props.payload[0];
  return (
    <TooltipBox label={String(item.name ?? "")}>
      <TooltipLine
        label="Total"
        value={Number(item.value ?? 0)}
        color={String(item.color ?? "#101d69")}
      />
    </TooltipBox>
  );
}

function SimpleTooltip(props: TooltipContentProps) {
  if (!props.active || !props.payload?.length) return null;
  return (
    <TooltipBox label={String(props.label ?? "")}>
      <TooltipLine
        label="Total"
        value={Number(props.payload[0].value ?? 0)}
        color={String(props.payload[0].color ?? "#101d69")}
      />
    </TooltipBox>
  );
}

function TooltipBox({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] bg-[var(--color-card)] p-3 text-xs shadow-lg ring-1 ring-[var(--color-border)]">
      <p className="mb-2 font-circular-bold text-[var(--color-text)]">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TooltipLine({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <p className="flex items-center justify-between gap-5 text-[var(--color-muted-foreground)]">
      <span className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="font-circular-bold text-[var(--color-text)]">
        {value.toLocaleString("es-PE")}
      </span>
    </p>
  );
}

function toExportRow(entry: AttendanceTimeEntryHistoryItem) {
  return {
    Fecha: formatDateTime(entry.fechaHora),
    Trabajador: employeeName(entry.empleado),
    Documento: entry.empleado.numeroDocumento,
    Tipo: capitalize(entry.tipo),
    Metodo: entry.metodo.toUpperCase(),
    Estado: capitalize(entry.estado),
    Turno: entry.turno
      ? `${entry.turno.nombre} ${entry.turno.horaEntrada}-${entry.turno.horaSalida}`
      : "",
    Sucursal: entry.sucursal?.nombre ?? "",
    "Punto QR": entry.puntoQr?.nombre ?? "",
  };
}

function toCsv(rows: Array<Record<string, string>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvValue(row[header] ?? "")).join(","),
    ),
  ].join("\n");
}

function toExcelHtml(rows: Array<Record<string, string>>) {
  if (rows.length === 0) return "<table></table>";
  const headers = Object.keys(rows[0]);
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th { background: #107c41; color: #ffffff; font-weight: 700; }
          th, td { border: 1px solid #b7dfc8; padding: 8px 10px; }
          tr:nth-child(even) td { background: #eef8f2; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${headers
                    .map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`)
                    .join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function fileName(extension: "csv" | "xls") {
  return `reporte-asistencias-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function employeeName(employee: AttendanceTimeEntryHistoryItem["empleado"]) {
  return [employee.nombres, employee.apellidoPaterno, employee.apellidoMaterno]
    .filter(Boolean)
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operacion.";
}

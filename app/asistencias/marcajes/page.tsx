"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  WarningCircleIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Select } from "@/components/ui/select";
import {
  attendanceTimeEntriesApi,
  type AttendanceDayResult,
  type AttendanceDayStatus,
  type AttendanceTimeEntryRange,
  type AttendanceTimeEntriesResponse,
  type AttendanceTimeEntryStatusFilter,
} from "@/lib/api/attendance-time-entries";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { employeesApi, type Employee } from "@/lib/api/employees";
import { shiftsApi, type Shift } from "@/lib/api/shifts";
import { cn } from "@/lib/utils";

const rangeOptions: {
  label: string;
  value: AttendanceTimeEntryRange;
}[] = [
  { label: "7 dias", value: "7days" },
  { label: "14 dias", value: "14days" },
  { label: "21 dias", value: "21days" },
  { label: "Mes completo", value: "month" },
];

const statusOptions: {
  label: string;
  value: AttendanceTimeEntryStatusFilter;
}[] = [
  { label: "Todos", value: "todos" },
  { label: "Asistencias", value: "asistencias" },
  { label: "Faltas", value: "faltas" },
  { label: "Tardanzas", value: "tardanzas" },
  { label: "Incompletos", value: "incompletos" },
];

const dayStatusConfig: Record<
  AttendanceDayStatus,
  { label: string; className: string; dot: string }
> = {
  asistencia: {
    label: "Asistencia",
    className: "bg-[#ecfdf5] text-[#047857] ring-[#10b981]/20",
    dot: "bg-[#10b981]",
  },
  tardanza: {
    label: "Tardanza",
    className: "bg-[#fff7ed] text-[#c2410c] ring-[#f97316]/20",
    dot: "bg-[#f97316]",
  },
  falta: {
    label: "Falta",
    className: "bg-[#fef2f2] text-[#dc2626] ring-[#ef4444]/20",
    dot: "bg-[#ef4444]",
  },
  incompleto: {
    label: "Incompleto",
    className: "bg-[#fefce8] text-[#a16207] ring-[#eab308]/20",
    dot: "bg-[#eab308]",
  },
  descanso: {
    label: "Descanso",
    className:
      "bg-[var(--color-background)] text-[var(--color-muted-foreground)] ring-[var(--color-border)]",
    dot: "bg-[#94a3b8]",
  },
  sin_turno: {
    label: "Sin turno",
    className: "bg-[#eff6ff] text-[#2563eb] ring-[#3b82f6]/20",
    dot: "bg-[#3b82f6]",
  },
  pendiente: {
    label: "Pendiente",
    className:
      "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] ring-[var(--color-border)]",
    dot: "bg-[#cbd5e1]",
  },
};

export default function AsistenciasMarcajesPage() {
  const { showToast } = useSystemToast();
  const [data, setData] = useState<AttendanceTimeEntriesResponse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [range, setRange] = useState<AttendanceTimeEntryRange>("7days");
  const [status, setStatus] =
    useState<AttendanceTimeEntryStatusFilter>("todos");
  const [selectedBranch, setSelectedBranch] = useState("todos");
  const [selectedShift, setSelectedShift] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const loadEntries = useCallback(async () => {
    return attendanceTimeEntriesApi.findAll({
      range,
      status,
      search: searchTerm,
      sucursalId: selectedBranch,
      turnoId: selectedShift,
    });
  }, [range, searchTerm, selectedBranch, selectedShift, status]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      branchesApi.findAll({ estado: "activo", limit: 100 }),
      shiftsApi.findAll({ estado: "activo", limit: 100 }),
      employeesApi.findAll({ estado: "activo", limit: 100 }),
    ])
      .then(([branchesResponse, shiftsResponse, employeesResponse]) => {
        if (!isMounted) return;
        setBranches(branchesResponse.data);
        setShifts(shiftsResponse.data);
        setEmployees(employeesResponse.data);
      })
      .catch(() => {
        if (!isMounted) return;
        setBranches([]);
        setShifts([]);
        setEmployees([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      loadEntries()
        .then((response) => {
          if (isMounted) setData(response);
        })
        .catch((error) => {
          if (!isMounted) return;
          showToast({
            title: "Error al cargar marcajes",
            description:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los marcajes.",
            variant: "error",
          });
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadEntries, showToast]);

  const refreshAll = useCallback(async () => {
    const entriesResponse = await loadEntries();
    setData(entriesResponse);
  }, [loadEntries]);

  return (
    <DashboardShell headerTitle="Marcaciones">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white shadow-[0_8px_18px_rgba(80,113,255,0.24)] transition-colors hover:bg-[var(--color-primary)]/90"
          >
            <PlusIcon size={18} weight="bold" />
            Agregar marcacion
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Asistencias"
            value={data?.summary.asistencias ?? 0}
            tone="success"
          />
          <MetricCard
            icon={<XCircleIcon size={22} weight="fill" />}
            label="Faltas"
            value={data?.summary.faltas ?? 0}
            tone="danger"
          />
          <MetricCard
            icon={<ClockCountdownIcon size={22} weight="fill" />}
            label="Tardanzas"
            value={data?.summary.tardanzas ?? 0}
            tone="warning"
          />
          <MetricCard
            icon={<WarningCircleIcon size={22} weight="fill" />}
            label="Incompletos"
            value={data?.summary.incompletos ?? 0}
            tone="primary"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 grid gap-3 bg-white px-4 py-2 sm:grid-cols-2 lg:-mx-6 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar trabajador o documento..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <Select
            value={range}
            onChange={(value) => setRange(value as AttendanceTimeEntryRange)}
            options={rangeOptions.map((o) => ({ label: o.label, value: o.value }))}
            className="w-[140px]"
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value as AttendanceTimeEntryStatusFilter)}
            options={statusOptions.map((o) => ({ label: o.label, value: o.value }))}
            className="w-[150px]"
          />
          <Select
            value={selectedShift}
            onChange={setSelectedShift}
            searchable
            placeholder="Todos los turnos"
            options={[
              { label: "Todos los turnos", value: "todos" },
              ...shifts.map((shift) => ({ label: shift.nombre, value: shift.id })),
            ]}
            className="w-[180px]"
          />
          <Select
            value={selectedBranch}
            onChange={setSelectedBranch}
            searchable
            placeholder="Todas las sucursales"
            options={[
              { label: "Todas las sucursales", value: "todos" },
              ...branches.map((branch) => ({ label: branch.nombre, value: branch.id })),
            ]}
            className="w-[180px]"
          />
        </div>

        <Legend />

        {isLoading ? (
          <div className="grid gap-3 pb-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))}
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState message="No hay marcajes para mostrar" />
        ) : (
          <AttendanceMatrix data={data} />
        )}

        {isManualModalOpen ? (
          <ManualEntryModal
            branches={branches}
            employees={employees}
            onClose={() => setIsManualModalOpen(false)}
            onSaved={async () => {
              setIsManualModalOpen(false);
              await refreshAll();
            }}
          />
        ) : null}
      </div>
    </DashboardShell>
  );
}

function ManualEntryModal({
  branches,
  employees,
  onClose,
  onSaved,
}: {
  branches: Branch[];
  employees: Employee[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useSystemToast();
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<"entrada" | "salida">("entrada");
  const [branchId, setBranchId] = useState("todos");
  const [dateTime, setDateTime] = useState(() => currentDateTimeLocal());
  const [isSaving, setIsSaving] = useState(false);
  const canSave = Boolean(employeeId && dateTime && !isSaving);

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await attendanceTimeEntriesApi.createManual({
        empleadoId: employeeId,
        tipo: type,
        fechaHora: new Date(dateTime).toISOString(),
        ...(branchId !== "todos" ? { sucursalId: branchId } : {}),
      });
      showToast({
        title: "Marcacion registrada",
        description: "La marcacion manual se guardo correctamente.",
        variant: "success",
      });
      await onSaved();
    } catch (error) {
      showToast({
        title: "No se pudo registrar",
        description:
          error instanceof Error
            ? error.message
            : "Revisa los datos de la marcacion.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[16px] bg-[var(--color-card)] p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[var(--color-text)]">
            Agregar marcacion
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-[10px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
            aria-label="Cerrar"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <Select
            label="Trabajador"
            value={employeeId}
            onChange={setEmployeeId}
            searchable
            placeholder="Seleccionar trabajador"
            options={employees.map((employee) => ({
              label: `${employeeName(employee)} · ${employee.numeroDocumento}`,
              value: employee.id,
            }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Tipo"
              value={type}
              onChange={(value) => setType(value as "entrada" | "salida")}
              options={[
                { label: "Entrada", value: "entrada" },
                { label: "Salida", value: "salida" },
              ]}
            />
            <label>
              <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
                Fecha y hora
              </span>
              <input
                type="datetime-local"
                value={dateTime}
                max={currentDateTimeLocal()}
                onChange={(event) => setDateTime(event.target.value)}
                className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>
          </div>
          <Select
            label="Sucursal"
            value={branchId}
            onChange={setBranchId}
            searchable
            placeholder="Sin sucursal"
            options={[
              { label: "Sin sucursal", value: "todos" },
              ...branches.map((branch) => ({
                label: branch.nombre,
                value: branch.id,
              })),
            ]}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[12px] px-4 text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="h-10 rounded-[12px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
      <div className="text-center">
        <CalendarBlankIcon
          size={48}
          weight="light"
          className="mx-auto text-[var(--color-muted-foreground)]"
        />
        <p className="mt-3 text-sm font-black text-[var(--color-text)]">
          {message}
        </p>
      </div>
    </div>
  );
}

function AttendanceMatrix({ data }: { data: AttendanceTimeEntriesResponse }) {
  return (
    <div className="overflow-hidden rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="content-scrollbar overflow-x-auto">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `260px repeat(${data.days.length}, minmax(112px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-20 border-b border-r border-[var(--color-border)] bg-[var(--color-card)] p-3">
            <p className="text-xs font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Trabajador
            </p>
          </div>
          {data.days.map((day) => (
            <div
              key={day.date}
              className="border-b border-r border-[var(--color-border)] bg-[var(--color-card)] p-3 text-center"
            >
              <p className="text-xs font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                {day.weekday}
              </p>
              <p className="mt-1 text-sm font-circular-bold text-[var(--color-text)]">
                {formatShortDate(day.date)}
              </p>
            </div>
          ))}

          {data.rows.map((row) => (
            <div key={row.employee.id} className="contents">
              <div
                className="sticky left-0 z-10 min-h-[92px] border-b border-r border-[var(--color-border)] bg-[var(--color-card)] p-3"
              >
                <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                  {employeeName(row.employee)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Doc. {row.employee.numeroDocumento}
                </p>
                <p className="mt-2 truncate text-xs font-circular-bold text-[var(--color-primary)]">
                  {row.turno
                    ? `${row.turno.nombre} · ${row.turno.horaEntrada}-${row.turno.horaSalida}`
                    : "Sin turno asignado"}
                </p>
              </div>
              {row.days.map((day) => (
                <DayCell key={`${row.employee.id}:${day.date}`} day={day} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayCell({ day }: { day: AttendanceDayResult }) {
  const config = dayStatusConfig[day.status];

  return (
    <div className="min-h-[92px] border-b border-r border-[var(--color-border)] bg-[var(--color-card)] p-2">
      <div
        className={cn(
          "flex h-full min-h-[72px] flex-col justify-between rounded-[12px] px-3 py-2 ring-1",
          config.className,
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", config.dot)} />
          <span className="truncate text-xs font-circular-bold">
            {config.label}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          <p>Entrada: {day.entrada?.hora ?? "--:--"}</p>
          <p>Salida: {day.salida?.hora ?? "--:--"}</p>
          {day.sucursal ? (
            <p className="truncate text-[11px] opacity-80">{day.sucursal.nombre}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    warning: "bg-[#f97316]/10 text-[#f97316]",
    danger: "bg-[#ef4444]/10 text-[#ef4444]",
  };

  return (
    <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
            toneClasses[tone],
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-xl font-black text-[var(--color-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const statuses: AttendanceDayStatus[] = [
    "asistencia",
    "tardanza",
    "falta",
    "incompleto",
    "descanso",
    "sin_turno",
    "pendiente",
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      {statuses.map((status) => {
        const config = dayStatusConfig[status];
        return (
          <span
            key={status}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-background)] px-3 py-1 text-xs font-circular-bold text-[var(--color-muted-foreground)]"
          >
            <span className={cn("size-2 rounded-full", config.dot)} />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

function employeeName(employee: {
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
}) {
  return [employee.nombres, employee.apellidoPaterno, employee.apellidoMaterno]
    .filter(Boolean)
    .join(" ");
}

function formatShortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function currentDateTimeLocal() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

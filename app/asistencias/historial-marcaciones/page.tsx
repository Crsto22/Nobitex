"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarBlankIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Select } from "@/components/ui/select";
import {
  attendanceTimeEntriesApi,
  type AttendanceTimeEntryHistoryItem,
  type AttendanceTimeEntryHistoryResponse,
} from "@/lib/api/attendance-time-entries";
import { branchesApi, type Branch } from "@/lib/api/branches";

const entryTypeOptions = [
  { label: "Todos los tipos", value: "todos" },
  { label: "Entrada", value: "entrada" },
  { label: "Salida", value: "salida" },
];

const methodOptions = [
  { label: "Todos los metodos", value: "todos" },
  { label: "QR", value: "qr" },
  { label: "Manual", value: "manual" },
];

export default function HistorialMarcacionesPage() {
  const { showToast } = useSystemToast();
  const [history, setHistory] =
    useState<AttendanceTimeEntryHistoryResponse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("todos");
  const [selectedType, setSelectedType] = useState("todos");
  const [selectedMethod, setSelectedMethod] = useState("todos");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    return attendanceTimeEntriesApi.findHistory({
      page,
      limit: 20,
      search: searchTerm,
      sucursalId: selectedBranch,
      tipo: selectedType as "todos" | "entrada" | "salida",
      metodo: selectedMethod as "todos" | "qr" | "manual",
    });
  }, [page, searchTerm, selectedBranch, selectedMethod, selectedType]);

  useEffect(() => {
    let isMounted = true;
    branchesApi
      .findAll({ estado: "activo", limit: 100 })
      .then((response) => {
        if (isMounted) setBranches(response.data);
      })
      .catch(() => {
        if (isMounted) setBranches([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      loadHistory()
        .then((response) => {
          if (isMounted) setHistory(response);
        })
        .catch((error) => {
          if (!isMounted) return;
          showToast({
            title: "Error al cargar historial",
            description:
              error instanceof Error
                ? error.message
                : "No se pudo cargar el historial de marcaciones.",
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
  }, [loadHistory, showToast]);

  const resetPage = () => setPage(1);

  return (
    <DashboardShell headerTitle="Historial">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="sticky -top-4 z-30 -mx-4 grid grid-cols-2 gap-3 bg-white px-4 py-2 lg:-mx-6 lg:grid-cols-[1fr_auto_auto_auto] lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative col-span-2 lg:col-span-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar trabajador o documento..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                resetPage();
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <Select
            value={selectedType}
            onChange={(value) => {
              setSelectedType(value);
              resetPage();
            }}
            options={entryTypeOptions}
            className="min-w-0 lg:w-[155px]"
          />
          <Select
            value={selectedMethod}
            onChange={(value) => {
              setSelectedMethod(value);
              resetPage();
            }}
            options={methodOptions}
            className="min-w-0 lg:w-[165px]"
          />
          <Select
            value={selectedBranch}
            onChange={(value) => {
              setSelectedBranch(value);
              resetPage();
            }}
            searchable
            placeholder="Todas las sucursales"
            options={[
              { label: "Todas las sucursales", value: "todos" },
              ...branches.map((branch) => ({
                label: branch.nombre,
                value: branch.id,
              })),
            ]}
            className="min-w-0 lg:w-[180px]"
          />
        </div>

        <AttendanceHistory
          data={history}
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
        />
      </div>
    </DashboardShell>
  );
}

function AttendanceHistory({
  data,
  isLoading,
  page,
  onPageChange,
}: {
  data: AttendanceTimeEntryHistoryResponse | null;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3 pb-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
          />
        ))}
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return <EmptyState message="No hay historial de marcaciones" />;
  }

  return (
    <div className="overflow-hidden rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="content-scrollbar overflow-x-auto">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-4 py-3 font-circular-bold">Fecha y hora</th>
              <th className="px-4 py-3 font-circular-bold">Trabajador</th>
              <th className="px-4 py-3 font-circular-bold">Tipo</th>
              <th className="px-4 py-3 font-circular-bold">Metodo</th>
              <th className="px-4 py-3 font-circular-bold">Estado</th>
              <th className="px-4 py-3 font-circular-bold">Turno</th>
              <th className="px-4 py-3 font-circular-bold">Sucursal</th>
              <th className="px-4 py-3 font-circular-bold">Punto QR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {data.data.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
        <span>
          Pagina {data.meta.page} de {data.meta.totalPages} · {data.meta.total}{" "}
          registros
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="h-9 rounded-[10px] px-3 font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)] disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= data.meta.totalPages}
            onClick={() => onPageChange(page + 1)}
            className="h-9 rounded-[10px] px-3 font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)] disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: AttendanceTimeEntryHistoryItem }) {
  return (
    <tr className="text-[var(--color-text)]">
      <td className="px-4 py-3 font-circular-bold">
        {formatDateTime(entry.fechaHora)}
      </td>
      <td className="px-4 py-3">
        <p className="font-circular-bold">{employeeName(entry.empleado)}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Doc. {entry.empleado.numeroDocumento}
        </p>
      </td>
      <td className="px-4 py-3 capitalize">{entry.tipo}</td>
      <td className="px-4 py-3 uppercase">{entry.metodo}</td>
      <td className="px-4 py-3 capitalize">{entry.estado}</td>
      <td className="px-4 py-3">
        {entry.turno
          ? `${entry.turno.nombre} · ${entry.turno.horaEntrada}-${entry.turno.horaSalida}`
          : "--"}
      </td>
      <td className="px-4 py-3">{entry.sucursal?.nombre ?? "--"}</td>
      <td className="px-4 py-3">{entry.puntoQr?.nombre ?? "--"}</td>
    </tr>
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

function employeeName(employee: {
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
}) {
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

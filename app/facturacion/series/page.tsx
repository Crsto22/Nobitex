"use client";

import { useMemo, useState } from "react";
import {
  CaretDownIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { cn } from "@/lib/utils";

const seriesData = [
  {
    id: "SER-001",
    type: "boleta",
    serie: "B001",
    correlativoActual: 186,
    correlativoInicio: 1,
    correlativoFin: 9999,
    estado: "activo",
    fechaCreacion: "01/01/2025",
    sunatAutorizado: true,
  },
  {
    id: "SER-002",
    type: "factura",
    serie: "F001",
    correlativoActual: 69,
    correlativoInicio: 1,
    correlativoFin: 9999,
    estado: "activo",
    fechaCreacion: "01/01/2025",
    sunatAutorizado: true,
  },
  {
    id: "SER-003",
    type: "nota_credito",
    serie: "FC01",
    correlativoActual: 14,
    correlativoInicio: 1,
    correlativoFin: 9999,
    estado: "activo",
    fechaCreacion: "15/02/2025",
    sunatAutorizado: true,
  },
  {
    id: "SER-004",
    type: "nota_credito",
    serie: "BC01",
    correlativoActual: 36,
    correlativoInicio: 1,
    correlativoFin: 9999,
    estado: "activo",
    fechaCreacion: "15/02/2025",
    sunatAutorizado: true,
  },
  {
    id: "SER-005",
    type: "nota_debito",
    serie: "FD01",
    correlativoActual: 0,
    correlativoInicio: 1,
    correlativoFin: 9999,
    estado: "inactivo",
    fechaCreacion: "20/03/2025",
    sunatAutorizado: false,
  },
  {
    id: "SER-006",
    type: "nota_debito",
    serie: "BD01",
    correlativoActual: 0,
    correlativoInicio: 1,
    correlativoFin: 9999,
    estado: "inactivo",
    fechaCreacion: "20/03/2025",
    sunatAutorizado: false,
  },
];

const estadoConfig = {
  activo: {
    label: "Activo",
    bg: "bg-[#10b981]",
    text: "text-white",
    icon: CheckCircleIcon,
  },
  inactivo: {
    label: "Inactivo",
    bg: "bg-[#6b7280]",
    text: "text-white",
    icon: WarningCircleIcon,
  },
};

const typeConfig = {
  boleta: { label: "Boleta", badge: "bg-[#3b82f6]/10 text-[#3b82f6]" },
  factura: { label: "Factura", badge: "bg-[#8b5cf6]/10 text-[#8b5cf6]" },
  nota_credito: { label: "Nota Credito", badge: "bg-[#f59e0b]/10 text-[#d97706]" },
  nota_debito: { label: "Nota Debito", badge: "bg-[#ef4444]/10 text-[#ef4444]" },
};

export default function SeriesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("todos");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isEstadoOpen, setIsEstadoOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredSeries = seriesData.filter((serie) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      serie.serie.toLowerCase().includes(normalizedSearch) ||
      serie.id.toLowerCase().includes(normalizedSearch) ||
      serie.type.toLowerCase().includes(normalizedSearch);

    const matchesType =
      selectedType === "todos" || serie.type === selectedType;
    const matchesEstado =
      selectedEstado === "todos" || serie.estado === selectedEstado;

    return matchesSearch && matchesType && matchesEstado;
  });

  const summary = useMemo(() => {
    const activos = filteredSeries.filter(
      (item) => item.estado === "activo",
    ).length;
    const inactivos = filteredSeries.filter(
      (item) => item.estado === "inactivo",
    ).length;
    const autorizados = filteredSeries.filter(
      (item) => item.sunatAutorizado,
    ).length;
    const totalCorrelativos = filteredSeries
      .filter((item) => item.estado === "activo")
      .reduce((sum, item) => sum + item.correlativoActual, 0);

    return { activos, inactivos, autorizados, totalCorrelativos };
  }, [filteredSeries]);

  return (
    <DashboardShell headerTitle="Series y Correlativos">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <CheckCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Series Activas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.activos}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6b7280]/10">
                <WarningCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#6b7280]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Series Inactivas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.inactivos}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#101d69]/10 dark:bg-[#fd741a]/10">
                <CheckCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[var(--color-primary)]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Autorizados SUNAT
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.autorizados}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                <PlusIcon
                  size={22}
                  weight="fill"
                  className="text-[#f59e0b]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Emitidos
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.totalCorrelativos}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por serie, tipo o ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-full sm:w-[160px]">
            <button
              type="button"
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsEstadoOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedType === "todos"
                  ? "Tipo"
                  : typeConfig[selectedType as keyof typeof typeConfig]?.label}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isTypeOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Boleta", value: "boleta" },
                  { label: "Factura", value: "factura" },
                  { label: "Nota Credito", value: "nota_credito" },
                  { label: "Nota Debito", value: "nota_debito" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedType(option.value);
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedType === option.value
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative w-full sm:w-[160px]">
            <button
              type="button"
              onClick={() => {
                setIsEstadoOpen(!isEstadoOpen);
                setIsTypeOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedEstado === "todos"
                  ? "Estado"
                  : selectedEstado === "activo"
                    ? "Activo"
                    : "Inactivo"}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isEstadoOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Activo", value: "activo" },
                  { label: "Inactivo", value: "inactivo" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedEstado(option.value);
                      setIsEstadoOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedEstado === option.value
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary)]/90"
          >
            <PlusIcon size={16} weight="bold" />
            Nueva Serie
          </button>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {filteredSeries.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <WarningCircleIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron series
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            filteredSeries.map((serie) => {
              const estado =
                estadoConfig[serie.estado as keyof typeof estadoConfig];
              const EstadoIcon = estado.icon;
              const typeInfo =
                typeConfig[serie.type as keyof typeof typeConfig];

              return (
                <div
                  key={serie.id}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[1.2fr_0.8fr_1fr_0.7fr_0.7fr_0.9fr_40px] md:items-center md:gap-3 xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <PlusIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {serie.serie}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        {serie.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex rounded-lg px-3 py-1.5 text-xs font-bold",
                        typeInfo.badge,
                      )}
                    >
                      {typeInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Correlativo actual
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {String(serie.correlativoActual).padStart(4, "0")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">
                        Desde
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {String(serie.correlativoInicio).padStart(4, "0")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">
                        Hasta
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {String(serie.correlativoFin).padStart(4, "0")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                        estado.bg,
                        estado.text,
                      )}
                    >
                      <EstadoIcon size={14} weight="fill" />
                      {estado.label}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                      {serie.sunatAutorizado ? "Autorizado SUNAT" : "Sin autorizar"}
                    </span>
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === serie.id ? null : serie.id,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === serie.id ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <EyeIcon size={16} weight="bold" />
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <PencilSimpleIcon size={16} weight="bold" />
                          Editar serie
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#ef4444] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <TrashSimpleIcon size={16} weight="bold" />
                          Eliminar serie
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filteredSeries.length} de {seriesData.length} series
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled
            >
              Anterior
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-bold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

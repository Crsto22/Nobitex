"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CaretDownIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PowerIcon,
  StorefrontIcon,
  TruckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  enviosConfigApi,
  type EnvioMetodoConfig,
} from "@/lib/api/envios-config";
import { cn } from "@/lib/utils";

type EnvioStatusFilter = "todos" | "active" | "inactive";

const metodosCatalog: Record<
  string,
  { image?: string; descripcion: string }
> = {
  RECOJO: {
    descripcion: "Entrega directa en tienda",
  },
  SHALOM: {
    image: "/envios/shalom.svg",
    descripcion: "Entrega a agencias Shalom",
  },
  OLVA: {
    image: "/envios/olva.webp",
    descripcion: "Entrega a agencias Olva",
  },
};

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const statusOptions: { label: string; value: EnvioStatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "active" },
  { label: "Inactivo", value: "inactive" },
];

export default function EnviosConfigPage() {
  const { showToast } = useSystemToast();
  const [configs, setConfigs] = useState<EnvioMetodoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<EnvioStatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [direccionDraft, setDireccionDraft] = useState<Record<string, string>>(
    {},
  );
  const [savingDireccion, setSavingDireccion] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await enviosConfigApi.findAll();
      setConfigs(data);
      setDireccionDraft(
        Object.fromEntries(
          data.map((config) => [config.metodo, config.direccion ?? ""]),
        ),
      );
    } catch (error: unknown) {
      showToast({
        title: "No se pudieron cargar los métodos de envío",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const withStatus = useMemo(
    () =>
      configs.map((config) => ({
        ...config,
        catalog: metodosCatalog[config.metodo],
      })),
    [configs],
  );

  const totals = useMemo(
    () => ({
      total: withStatus.length,
      activos: withStatus.filter((item) => item.activo).length,
      inactivos: withStatus.filter((item) => !item.activo).length,
    }),
    [withStatus],
  );

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return withStatus.filter((item) => {
      const matchesSearch =
        !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.metodo.toLowerCase().includes(term);
      const matchesStatus =
        selectedStatus === "todos" ||
        (selectedStatus === "active" && item.activo) ||
        (selectedStatus === "inactive" && !item.activo);
      return matchesSearch && matchesStatus;
    });
  }, [withStatus, searchTerm, selectedStatus]);

  const toggle = async (metodo: string, activo: boolean) => {
    if (toggling) return;
    setOpenMenuId(null);
    setToggling(metodo);
    const previous = configs;
    setConfigs((current) =>
      current.map((config) =>
        config.metodo === metodo ? { ...config, activo } : config,
      ),
    );
    try {
      const updated = await enviosConfigApi.update(metodo, { activo });
      setConfigs((current) =>
        current.map((config) =>
          config.metodo === updated.metodo ? updated : config,
        ),
      );
      showToast({
        title: activo ? "Método activado" : "Método inactivado",
        description: updated.nombre,
        variant: "success",
      });
    } catch (error: unknown) {
      setConfigs(previous);
      showToast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setToggling(null);
    }
  };

  const saveDireccion = async (metodo: string, activo: boolean) => {
    if (savingDireccion) return;
    setSavingDireccion(metodo);
    try {
      const updated = await enviosConfigApi.update(metodo, {
        activo,
        direccion: direccionDraft[metodo] ?? "",
      });
      setConfigs((current) =>
        current.map((config) =>
          config.metodo === updated.metodo ? updated : config,
        ),
      );
      setDireccionDraft((current) => ({
        ...current,
        [metodo]: updated.direccion ?? "",
      }));
      showToast({
        title: "Dirección de recojo guardada",
        description: updated.nombre,
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo guardar la dirección",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSavingDireccion(null);
    }
  };

  return (
    <DashboardShell headerTitle="Envíos">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <MetricCard
            icon={<TruckIcon size={22} weight="fill" />}
            label="Total Métodos"
            value={totals.total}
            tone="primary"
          />
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Activos"
            value={totals.activos}
            tone="success"
          />
          <MetricCard
            icon={<WarningCircleIcon size={22} weight="fill" />}
            label="Inactivos"
            value={totals.inactivos}
            tone="warning"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:flex-row lg:items-center lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar método de envío..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <DropdownFilter
            value={selectedStatus}
            label={
              selectedStatus === "todos"
                ? "Estado"
                : selectedStatus === "active"
                  ? "Activo"
                  : "Inactivo"
            }
            options={statusOptions}
            isOpen={isStatusOpen}
            onToggle={() => {
              setIsStatusOpen(!isStatusOpen);
            }}
            onSelect={(value) => {
              setSelectedStatus(value as EnvioStatusFilter);
              setIsStatusOpen(false);
            }}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-3 pb-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-3 pb-2">
            {filtered.map((item) => {
              const status = item.activo
                ? statusConfig.activo
                : statusConfig.inactivo;
              const isToggling = toggling === item.metodo;

              return (
                <div
                  key={item.metodo}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(210px,1.2fr)_minmax(230px,1.25fr)_minmax(140px,0.75fr)_minmax(132px,0.7fr)] md:items-center md:gap-4 md:gap-y-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                      {item.catalog?.image ? (
                        <Image
                          src={item.catalog.image}
                          width={64}
                          height={44}
                          alt={item.nombre}
                          unoptimized
                          className="h-full w-full rounded-xl object-contain"
                        />
                      ) : item.tipo === "recojo" ? (
                        <StorefrontIcon
                          size={24}
                          weight="fill"
                          className="text-[var(--color-primary)]"
                        />
                      ) : (
                        <TruckIcon
                          size={22}
                          weight="fill"
                          className="text-[var(--color-primary)]"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {item.nombre}
                      </p>
                      <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                        {item.metodo}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-circular-regular text-[var(--color-text)]">
                      {item.catalog?.descripcion || "Método de envío"}
                    </p>
                    <p className="truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                      Método de envío
                    </p>
                  </div>

                  <div className="flex justify-end md:justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-circular-bold",
                        status.bg,
                        status.text,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === item.metodo ? null : item.metodo,
                        )
                      }
                      disabled={isToggling}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:opacity-50"
                      aria-label="Más opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    <div className="relative">
                      {openMenuId === item.metodo && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                          <button
                            type="button"
                            onClick={() =>
                              void toggle(item.metodo, !item.activo)
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <PowerIcon size={16} weight="bold" />
                            {item.activo ? "Inactivar" : "Activar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.tipo === "recojo" ? (
                    <div className="col-span-2 mt-1 rounded-[12px] bg-[var(--color-input-bg)] p-3 md:col-span-4">
                      <label className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                        Dirección de recojo
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={direccionDraft[item.metodo] ?? ""}
                          onChange={(event) =>
                            setDireccionDraft((current) => ({
                              ...current,
                              [item.metodo]: event.target.value,
                            }))
                          }
                          placeholder="Ej. Av. Principal 123, Lima"
                          maxLength={300}
                          className="h-10 min-w-0 flex-1 rounded-[12px] bg-[var(--color-card)] px-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void saveDireccion(item.metodo, item.activo)
                          }
                          disabled={savingDireccion === item.metodo}
                          className="h-10 rounded-[12px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white transition-colors hover:opacity-90 disabled:opacity-60"
                        >
                          {savingDireccion === item.metodo
                            ? "Guardando..."
                            : "Guardar"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] p-8 text-center shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <TruckIcon size={28} weight="fill" />
            </div>
            <h2 className="mt-4 text-lg font-black text-[var(--color-text)]">
              No hay métodos de envío para mostrar
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium text-[var(--color-muted-foreground)]">
              Cambia los filtros o actualiza la lista.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filtered.length} de {totals.total} métodos
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "success" | "info" | "warning";
}) {
  const toneClass = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    info: "bg-[#3b82f6]/10 text-[#3b82f6]",
    warning: "bg-[#f59e0b]/10 text-[#d97706]",
  }[tone];

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            toneClass,
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DropdownFilter({
  value,
  label,
  options,
  isOpen,
  onToggle,
  onSelect,
}: {
  value: string;
  label: string;
  options: { label: string; value: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="relative w-full lg:w-[180px]">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
      >
        <span className="truncate">{label}</span>
        <CaretDownIcon
          size={16}
          className="shrink-0 text-[var(--color-muted-foreground)]"
        />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                value === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  ReceiptIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { NativeSelect, Select } from "@/components/ui/select";
import {
  platformBillingApi,
  type PlatformReceiptType,
  type PlatformSeries,
  type PlatformSeriesResponse,
} from "@/lib/api/platform-billing";
import { cn } from "@/lib/utils";

const pageSize = 10;
const emptyResult: PlatformSeriesResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
  summary: { active: 0, inactive: 0, issued: 0 },
};

const typeConfig: Record<
  PlatformReceiptType,
  { label: string; badge: string }
> = {
  nota_venta: {
    label: "Nota de venta",
    badge: "bg-[#f59e0b]/10 text-[#d97706]",
  },
  boleta: {
    label: "Boleta",
    badge: "bg-[#3b82f6]/10 text-[#3b82f6]",
  },
  factura: {
    label: "Factura",
    badge: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  },
  nota_credito: {
    label: "Nota de credito",
    badge: "bg-[#0ea5e9]/10 text-[#0284c7]",
  },
};

const typeOptions = Object.entries(typeConfig).map(([value, config]) => ({
  value,
  label: config.label,
}));

const defaultForm = {
  type: "nota_venta" as PlatformReceiptType,
  series: "",
  active: true,
};

type StatusFilter = "todos" | "activo" | "inactivo";

export default function PlatformSeriesPage() {
  const { showToast } = useSystemToast();
  const [result, setResult] = useState<PlatformSeriesResponse>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; editing: PlatformSeries | null; form: typeof defaultForm; error: string }>({
    isOpen: false,
    editing: null,
    form: defaultForm,
    error: "",
  });
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<
    PlatformReceiptType | "todos"
  >("todos");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setModal((prev) => ({ ...prev, error: "" }));
    try {
      setResult(
        await platformBillingApi.findSeries({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          type: selectedType === "todos" ? undefined : selectedType,
          status: selectedStatus === "todos" ? undefined : selectedStatus,
        }),
      );
    } catch (requestError) {
      setModal((prev) => ({ ...prev, error: getErrorMessage(requestError) }));
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus, selectedType]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const rows = result.data;
  const summary = result.summary;
  const safePage = result.meta.page;
  const totalPages = result.meta.totalPages;

  const openCreate = () => {
    setModal({ isOpen: true, editing: null, form: defaultForm, error: "" });
    setOpenMenuId(null);
  };

  const openEdit = (row: PlatformSeries) => {
    setModal({
      isOpen: true,
      editing: row,
      form: { type: row.type, series: row.series, active: row.active },
      error: "",
    });
    setOpenMenuId(null);
  };

  const closeModal = () => {
    if (submitting) return;
    setModal({ isOpen: false, editing: null, form: defaultForm, error: "" });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const series = normalizeSeries(modal.form.series);
    if (series.length !== 4) {
      setModal((prev) => ({ ...prev, error: "La serie debe tener exactamente 4 letras o numeros." }));
      return;
    }

    setSubmitting(true);
    setModal((prev) => ({ ...prev, error: "" }));
    try {
      const saved = modal.editing
        ? await platformBillingApi.updateSeries(modal.editing.id, {
            type: modal.form.type,
            series,
            active: modal.form.active,
          })
        : await platformBillingApi.createSeries({
            type: modal.form.type,
            series,
            active: modal.form.active,
          });
      await load();
      setModal((prev) => ({ ...prev, isOpen: false, editing: null, form: defaultForm }));
      showToast({
        title: modal.editing ? "Serie actualizada" : "Serie creada",
        description: `${saved.series} quedo disponible para la plataforma.`,
        variant: "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setModal((prev) => ({ ...prev, error: message }));
      showToast({
        title: "No se pudo guardar",
        description: message,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (row: PlatformSeries) => {
    setOpenMenuId(null);
    try {
      const updated = await platformBillingApi.updateSeries(row.id, {
        type: row.type,
        series: row.series,
        active: !row.active,
      });
      await load();
      showToast({
        title: updated.active ? "Serie activada" : "Serie inactivada",
        description: updated.series,
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudo actualizar",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    }
  };

  return (
    <DashboardShell headerTitle="Series y Correlativos">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Series activas"
            value={summary.active}
            tone="success"
          />
          <MetricCard
            icon={<WarningCircleIcon size={22} weight="fill" />}
            label="Series inactivas"
            value={summary.inactive}
            tone="muted"
          />
          <MetricCard
            icon={<PlusIcon size={22} weight="fill" />}
            label="Total emitidos"
            value={summary.issued}
            tone="warning"
          />
        </section>

        <section className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="search"
              placeholder="Buscar por serie..."
              aria-label="Buscar por serie..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <NativeSelect
            aria-label="Filtrar por tipo"
            value={selectedType}
            onChange={(event) => {
              setSelectedType(
                event.target.value as PlatformReceiptType | "todos",
              );
              setPage(1);
            }}
            className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text)] outline-none sm:w-[180px]"
          >
            <option value="todos">Todos los tipos</option>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filtrar por estado"
            value={selectedStatus}
            onChange={(event) => {
              setSelectedStatus(event.target.value as StatusFilter);
              setPage(1);
            }}
            className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text)] outline-none sm:w-[160px]"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </NativeSelect>
          <button
            type="button"
            onClick={() => void load()}
            title="Actualizar"
            aria-label="Actualizar series"
            className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[var(--color-input-bg)] text-[var(--color-text)]"
          >
            <ArrowClockwiseIcon
              size={18}
              weight="bold"
              className={loading ? "animate-spin" : ""}
            />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90"
          >
            <PlusIcon size={16} weight="bold" />
            Nueva serie
          </button>
        </section>

        {modal.error && !modal.isOpen ? (
          <p className="rounded-[12px] bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {modal.error}
          </p>
        ) : null}

        <section className="space-y-3 pb-2 pr-1">
          {loading && rows.length === 0 ? (
            <SeriesSkeleton />
          ) : rows.length === 0 ? (
            <EmptySeries />
          ) : (
            rows.map((row) => (
              <SeriesRow
                key={row.id}
                row={row}
                menuOpen={openMenuId === row.id}
                onToggleMenu={() =>
                  setOpenMenuId(openMenuId === row.id ? null : row.id)
                }
                onEdit={() => openEdit(row)}
                onToggleStatus={() => void toggleStatus(row)}
              />
            ))
          )}
        </section>

        <footer className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {rows.length} de {result.meta.total} series
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={loading || safePage <= 1}
              className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="grid size-8 place-items-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {safePage}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={loading || safePage >= totalPages}
              className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </footer>

        <Modal
          isOpen={modal.isOpen}
          onClose={closeModal}
          title={modal.editing ? "Editar serie" : "Nueva serie"}
          description="Configura la numeracion disponible para los comprobantes de Nuvex."
          size="md"
        >
          <form className="space-y-4" onSubmit={submit}>
            <Select
              options={typeOptions}
              value={modal.form.type}
              onChange={(value) =>
                setModal((prev) => ({
                  ...prev,
                  form: { ...prev.form, type: value as PlatformReceiptType },
                }))
              }
              placeholder="Seleccionar tipo"
              label="Tipo de comprobante"
            />
            <InputField
              id="platform-series-code"
              label="Serie"
              value={modal.form.series}
              placeholder="F001"
              disabled={submitting}
              onChange={(value) =>
                setModal((prev) => ({
                  ...prev,
                  form: { ...prev.form, series: normalizeSeries(value) },
                }))
              }
            />
            <div>
              <p className="mb-2 text-sm text-[#4e5671]">Correlativo actual</p>
              <div className="flex h-11 items-center rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]">
                {String(modal.editing?.currentNumber ?? 0).padStart(8, "0")}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-circular-bold text-[var(--color-text)]">
              Serie activa
              <input
                type="checkbox"
                checked={modal.form.active}
                onChange={(event) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, active: event.target.checked },
                  }))
                }
                className="size-5 accent-[var(--color-primary)]"
              />
            </label>
            {modal.error && modal.isOpen ? (
              <p className="text-sm text-[#dc2626]">{modal.error}</p>
            ) : null}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={submitting}
                className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white"
              >
                {submitting
                  ? "Guardando..."
                  : modal.editing
                    ? "Guardar"
                    : "Crear serie"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardShell>
  );
}

function SeriesRow({
  row,
  menuOpen,
  onToggleMenu,
  onEdit,
  onToggleStatus,
}: {
  row: PlatformSeries;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const type = typeConfig[row.type];
  return (
    <article className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[1.1fr_0.9fr_1fr_0.9fr_40px] md:items-center md:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <ReceiptIcon size={20} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {row.series}
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            Serie de plataforma
          </p>
        </div>
      </div>
      <div>
        <span
          className={cn(
            "inline-flex rounded-lg px-3 py-1.5 text-xs font-circular-bold",
            type.badge,
          )}
        >
          {type.label}
        </span>
      </div>
      <div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Correlativo actual
        </p>
        <p className="text-sm font-circular-bold text-[var(--color-text)]">
          {String(row.currentNumber).padStart(8, "0")}
        </p>
      </div>
      <div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-circular-bold text-white",
            row.active ? "bg-[#10b981]" : "bg-[#6b7280]",
          )}
        >
          {row.active ? (
            <CheckCircleIcon size={14} weight="fill" />
          ) : (
            <WarningCircleIcon size={14} weight="fill" />
          )}
          {row.active ? "Activo" : "Inactivo"}
        </span>
      </div>
      <div className="relative flex md:justify-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Mas opciones"
          className="grid size-8 place-items-center rounded-[8px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
        >
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
            <button
              type="button"
              onClick={onEdit}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              <PencilSimpleIcon size={16} weight="bold" />
              Editar serie
            </button>
            <button
              type="button"
              onClick={onToggleStatus}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-button-hover)]",
                row.active ? "text-[#ef4444]" : "text-[#10b981]",
              )}
            >
              <PowerIcon size={16} weight="bold" />
              {row.active ? "Inactivar" : "Activar"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
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
  tone: "success" | "muted" | "warning";
}) {
  const toneClass = {
    success: "bg-[#10b981]/10 text-[#10b981]",
    muted: "bg-[#6b7280]/10 text-[#6b7280]",
    warning: "bg-[#f59e0b]/10 text-[#d97706]",
  }[tone];
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            toneClass,
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
            {value.toLocaleString("es-PE")}
          </p>
        </div>
      </div>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-[#4e5671]">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={4}
        disabled={disabled}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm uppercase text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      />
    </div>
  );
}

function SeriesSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-[var(--color-input-bg)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-[var(--color-input-bg)]" />
              <div className="h-3 w-40 rounded bg-[var(--color-input-bg)]" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function EmptySeries() {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
      <div className="text-center">
        <WarningCircleIcon
          size={48}
          weight="light"
          className="mx-auto text-[var(--color-muted-foreground)]"
        />
        <p className="mt-3 text-sm font-circular-bold text-[var(--color-text)]">
          No se encontraron series
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Intenta con otros filtros de busqueda
        </p>
      </div>
    </div>
  );
}

function normalizeSeries(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo guardar la serie.";
}

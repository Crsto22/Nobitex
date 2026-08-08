"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CaretDownIcon,
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
import { Select } from "@/components/ui/select";
import { branchesApi, type Branch } from "@/lib/api/branches";
import {
  seriesApi,
  type SerieComprobante,
  type VentaTipoComprobante,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";

const estadoConfig = {
  true: {
    label: "Activo",
    bg: "bg-[#10b981]",
    text: "text-white",
    icon: CheckCircleIcon,
  },
  false: {
    label: "Inactivo",
    bg: "bg-[#6b7280]",
    text: "text-white",
    icon: WarningCircleIcon,
  },
};

const typeConfig: Record<
  VentaTipoComprobante,
  { label: string; badge: string }
> = {
  boleta: { label: "Boleta", badge: "bg-[#3b82f6]/10 text-[#3b82f6]" },
  factura: { label: "Factura", badge: "bg-[#8b5cf6]/10 text-[#8b5cf6]" },
  nota_venta: {
    label: "Nota Venta",
    badge: "bg-[#f59e0b]/10 text-[#d97706]",
  },
  guia_remision: {
    label: "Guia Remision",
    badge: "bg-[#10b981]/10 text-[#059669]",
  },
  nota_credito_factura: {
    label: "N/C Factura",
    badge: "bg-[#6366f1]/10 text-[#4f46e5]",
  },
  nota_credito_boleta: {
    label: "N/C Boleta",
    badge: "bg-[#0ea5e9]/10 text-[#0284c7]",
  },
};

const seriesTypeOptions = [
  { label: "Boleta", value: "boleta" },
  { label: "Factura", value: "factura" },
  { label: "Nota Venta", value: "nota_venta" },
  { label: "Guia Remision", value: "guia_remision" },
  { label: "N/C Factura", value: "nota_credito_factura" },
  { label: "N/C Boleta", value: "nota_credito_boleta" },
];
const typeOptions = [{ label: "Todos", value: "todos" }, ...seriesTypeOptions];

const estadoOptions = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

const defaultForm = {
  tipoComprobante: "nota_venta" as VentaTipoComprobante,
  serie: "",
  activo: true,
  esPrincipal: false,
  alcance: "todas" as SeriesScope,
  sucursalIds: [] as string[],
};

type SeriesScope = "todas" | "especificas";
type SeriesForm = typeof defaultForm;
type EstadoFilter = "activo" | "inactivo" | "todos";

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function normalizeSerie(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export default function SeriesPage() {
  const { showToast } = useSystemToast();
  const [series, setSeries] = useState<SerieComprobante[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBranchesLoading, setIsBranchesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; editing: SerieComprobante | null; form: SeriesForm; error: string }>({
    isOpen: false,
    editing: null,
    form: defaultForm,
    error: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<
    VentaTipoComprobante | "todos"
  >("todos");
  const [selectedEstado, setSelectedEstado] = useState<EstadoFilter>("todos");
  const [selectedBranch, setSelectedBranch] = useState("todos");
  const [page, setPage] = useState(1);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isEstadoOpen, setIsEstadoOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const typeRef = useRef<HTMLDivElement>(null);
  const estadoRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    let isMounted = true;

    branchesApi
      .findAll({ estado: "activo", tipo: "tienda", limit: 100 })
      .then((response) => {
        if (isMounted) {
          setBranches(response.data);
        }
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudieron cargar tiendas.";
        if (isMounted) {
          showToast({
            title: "Error al cargar tiendas",
            description: message,
            variant: "error",
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsBranchesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) {
        return;
      }

      setIsLoading(true);

      seriesApi
        .findAll({
          page,
          limit: 10,
          search: debouncedSearchTerm || undefined,
          tipoComprobante: selectedType === "todos" ? undefined : selectedType,
          activo:
            selectedEstado === "activo"
              ? true
              : selectedEstado === "inactivo"
                ? false
                : undefined,
          sucursalId: selectedBranch === "todos" ? undefined : selectedBranch,
        })
        .then((response) => {
          if (isMounted) {
            setSeries(response.data);
            setMeta(response.meta);
          }
        })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudieron cargar series.";

          if (isMounted) {
            setSeries([]);
            setMeta({ page: 1, limit: 10, total: 0, totalPages: 1 });
            showToast({
              title: "Error al cargar series",
              description: message,
              variant: "error",
            });
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [
    page,
    debouncedSearchTerm,
    selectedType,
    selectedEstado,
    selectedBranch,
    showToast,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (typeRef.current && !typeRef.current.contains(target)) {
        setIsTypeOpen(false);
      }
      if (estadoRef.current && !estadoRef.current.contains(target)) {
        setIsEstadoOpen(false);
      }
      if (branchRef.current && !branchRef.current.contains(target)) {
        setIsBranchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshSeries = async (targetPage = page) => {
    setIsLoading(true);

    try {
      const response = await seriesApi.findAll({
        page: targetPage,
        limit: 10,
        search: debouncedSearchTerm || undefined,
        tipoComprobante: selectedType === "todos" ? undefined : selectedType,
        activo:
          selectedEstado === "activo"
            ? true
            : selectedEstado === "inactivo"
              ? false
              : undefined,
        sucursalId: selectedBranch === "todos" ? undefined : selectedBranch,
      });
      setSeries(response.data);
      setMeta(response.meta);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar series.";
      setSeries([]);
      setMeta({ page: 1, limit: 10, total: 0, totalPages: 1 });
      showToast({
        title: "Error al cargar series",
        description: message,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setModal({ isOpen: true, editing: null, form: defaultForm, error: "" });
    setOpenMenuId(null);
  };

  const openEditModal = (serie: SerieComprobante) => {
    setModal({
      isOpen: true,
      editing: serie,
      form: {
      tipoComprobante: serie.tipoComprobante,
      serie: serie.serie,
      activo: serie.activo,
      esPrincipal: serie.esPrincipal,
      alcance: serie.aplicaTodasSucursales ? "todas" : "especificas",
      sucursalIds: serie.sucursales.map((sucursal) => sucursal.id),
    },
      error: "",
    });
    setOpenMenuId(null);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setModal({ isOpen: false, editing: null, form: defaultForm, error: "" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModal((prev) => ({ ...prev, error: "" }));

    const serie = normalizeSerie(modal.form.serie);

    if (!serie) {
      setModal((prev) => ({ ...prev, error: "Ingresa el codigo de serie." }));
      return;
    }

    if (modal.form.alcance === "especificas" && modal.form.sucursalIds.length === 0) {
      setModal((prev) => ({ ...prev, error: "Selecciona al menos una sucursal." }));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        esPrincipal: modal.form.esPrincipal,
        activo: modal.form.activo,
        aplicaTodasSucursales: modal.form.alcance === "todas",
        sucursalIds: modal.form.alcance === "todas" ? [] : modal.form.sucursalIds,
      };

      const savedSerie = modal.editing
        ? await seriesApi.update(modal.editing.id, payload)
        : await seriesApi.create({
            ...payload,
            serie,
            tipoComprobante: modal.form.tipoComprobante,
          });
      const targetPage = modal.editing ? page : 1;

      setPage(targetPage);
      await refreshSeries(targetPage);
      showToast({
        title: modal.editing ? "Serie actualizada" : "Serie creada",
        description: `${savedSerie.serie} quedo guardada correctamente.`,
        variant: "success",
      });
      closeModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la serie.";
      setModal((prev) => ({ ...prev, error: message }));
      showToast({
        title: "No se pudo guardar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (serie: SerieComprobante) => {
    setOpenMenuId(null);

    try {
      const updated = await seriesApi.update(serie.id, {
        activo: !serie.activo,
      });
      await refreshSeries();
      showToast({
        title: updated.activo ? "Serie activada" : "Serie inactivada",
        description: updated.serie,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cambiar el estado.";
      showToast({
        title: "No se pudo actualizar",
        description: message,
        variant: "error",
      });
    }
  };

  const toggleSucursal = (sucursalId: string) => {
    setModal((prev) => {
      const selected = prev.form.sucursalIds.includes(sucursalId);
      return {
        ...prev,
        form: {
          ...prev.form,
          sucursalIds: selected
            ? prev.form.sucursalIds.filter((id) => id !== sucursalId)
            : [...prev.form.sucursalIds, sucursalId],
        },
      };
    });
  };

  const branchOptions = [
    { label: "Todas", value: "todos" },
    ...branches.map((branch) => ({
      label: branch.nombre,
      value: branch.id,
    })),
  ];
  const selectedBranchLabel =
    branchOptions.find((branch) => branch.value === selectedBranch)?.label ??
    "Sucursal";
  const summary = {
    activos: series.filter((s) => s.activo).length,
    inactivos: series.filter((s) => !s.activo).length,
    totalEmitidos: series.reduce((sum, s) => sum + s.numeroActual, 0),
  };
  const selectedSucursalIds = new Set(modal.form.sucursalIds);

  return (
    <DashboardShell headerTitle="Series y Correlativos">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Series Activas"
            value={summary.activos}
            tone="success"
          />
          <MetricCard
            icon={<WarningCircleIcon size={22} weight="fill" />}
            label="Series Inactivas"
            value={summary.inactivos}
            tone="muted"
          />
          <MetricCard
            icon={<PlusIcon size={22} weight="fill" />}
            label="Total Emitidos"
            value={summary.totalEmitidos}
            tone="warning"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por serie..."
              aria-label="Buscar por serie..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1 sm:w-[160px] sm:flex-none" ref={typeRef}>
            <DropdownButton
              label={
                selectedType === "todos"
                  ? "Tipo"
                  : typeConfig[selectedType].label
              }
              isOpen={isTypeOpen}
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsEstadoOpen(false);
                setIsBranchOpen(false);
              }}
            />
            {isTypeOpen && (
              <DropdownMenu
                options={typeOptions}
                selectedValue={selectedType}
                onSelect={(value) => {
                  setSelectedType(value as VentaTipoComprobante | "todos");
                  setPage(1);
                  setIsTypeOpen(false);
                }}
              />
            )}
          </div>

          <div className="relative flex-1 sm:w-[160px] sm:flex-none" ref={estadoRef}>
            <DropdownButton
              label={
                selectedEstado === "todos"
                  ? "Estado"
                  : selectedEstado === "activo"
                    ? "Activo"
                    : "Inactivo"
              }
              isOpen={isEstadoOpen}
              onClick={() => {
                setIsEstadoOpen(!isEstadoOpen);
                setIsTypeOpen(false);
                setIsBranchOpen(false);
              }}
            />
            {isEstadoOpen && (
              <DropdownMenu
                options={estadoOptions}
                selectedValue={selectedEstado}
                onSelect={(value) => {
                  setSelectedEstado(value as EstadoFilter);
                  setPage(1);
                  setIsEstadoOpen(false);
                }}
              />
            )}
          </div>

          <div className="relative flex-1 sm:w-[180px] sm:flex-none" ref={branchRef}>
            <DropdownButton
              label={selectedBranch === "todos" ? "Sucursal" : selectedBranchLabel}
              isOpen={isBranchOpen}
              onClick={() => {
                setIsBranchOpen(!isBranchOpen);
                setIsTypeOpen(false);
                setIsEstadoOpen(false);
              }}
            />
            {isBranchOpen && (
              <DropdownMenu
                options={branchOptions}
                selectedValue={selectedBranch}
                onSelect={(value) => {
                  setSelectedBranch(value);
                  setPage(1);
                  setIsBranchOpen(false);
                }}
              />
            )}
          </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-colors hover:bg-[var(--color-primary)]/90 sm:w-auto"
          >
            <PlusIcon size={16} weight="bold" />
            Nueva Serie
          </button>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {isLoading ? (
            <SeriesSkeleton />
          ) : series.length === 0 ? (
            <EmptySeries />
          ) : (
            series.map((serie) => {
              const estado =
                estadoConfig[String(serie.activo) as keyof typeof estadoConfig];
              const EstadoIcon = estado.icon;
              const typeInfo = typeConfig[serie.tipoComprobante];

              return (
                <div
                  key={serie.id}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[1.1fr_0.7fr_0.9fr_1.2fr_0.7fr_40px] md:items-center md:gap-3 md:gap-y-0 xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <ReceiptIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {serie.serie}
                      </p>
                      <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        {formatDate(serie.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex rounded-lg px-3 py-1.5 text-xs font-circular-bold",
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
                      <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {String(serie.numeroActual).padStart(6, "0")}
                      </p>
                    </div>
                  </div>

                  <SeriesScopeCell serie={serie} />

                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-circular-bold",
                        estado.bg,
                        estado.text,
                      )}
                    >
                      <EstadoIcon size={14} weight="fill" />
                      {estado.label}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-end md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === serie.id ? null : serie.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === serie.id && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => openEditModal(serie)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <PencilSimpleIcon size={16} weight="bold" />
                          Editar serie
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(serie)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular transition-colors hover:bg-[var(--color-button-hover)]",
                            serie.activo ? "text-[#ef4444]" : "text-[#10b981]",
                          )}
                        >
                          <PowerIcon size={16} weight="bold" />
                          {serie.activo ? "Inactivar" : "Activar"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {series.length} de {meta.total} series
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={isLoading || page <= 1}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {page}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={isLoading || page >= meta.totalPages}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>

        <Modal
          isOpen={modal.isOpen}
          onClose={closeModal}
          title={modal.editing ? "Editar serie" : "Nueva serie"}
          description="Configura el correlativo y las sucursales donde se podra usar."
          size="lg"
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                options={seriesTypeOptions}
                value={modal.form.tipoComprobante}
                onChange={(value) =>
                  setModal((prev) => ({ ...prev, form: { ...prev.form, tipoComprobante: value as VentaTipoComprobante, } }))
                }
                placeholder="Seleccionar tipo"
                label="Tipo de comprobante"
                disabled={isSubmitting || Boolean(modal.editing)}
              />

              <InputField
                id="serie-code"
                label="Serie"
                value={modal.form.serie}
                placeholder="NV01"
                maxLength={4}
                disabled={isSubmitting || Boolean(modal.editing)}
                onChange={(value) =>
                  setModal((prev) => ({ ...prev, form: { ...prev.form, serie: normalizeSerie(value), } }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                options={[
                  { label: "Activo", value: "activo" },
                  { label: "Inactivo", value: "inactivo" },
                ]}
                value={modal.form.activo ? "activo" : "inactivo"}
                onChange={(value) =>
                  setModal((prev) => ({ ...prev, form: { ...prev.form, activo: value === "activo", } }))
                }
                placeholder="Seleccionar estado"
                label="Estado"
              />

              <div>
                <p className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
                  Correlativo actual
                </p>
                <div className="flex h-11 items-center rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]">
                  {String(modal.editing?.numeroActual ?? 0).padStart(6, "0")}
                </div>
              </div>
            </div>

            <div
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-circular-bold transition-colors hover:bg-[var(--color-button-hover)]",
                modal.form.esPrincipal
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-muted-foreground)]",
              )}
            >
              <label htmlFor="serie-principal">Serie principal</label>
              <input
                id="serie-principal"
                type="checkbox"
                checked={modal.form.esPrincipal}
                onChange={(event) =>
                  setModal((prev) => ({ ...prev, form: { ...prev.form, esPrincipal: event.target.checked, } }))
                }
                disabled={isSubmitting}
                className="h-5 w-5 accent-[var(--color-primary)]"
              />
            </div>

            <div className="rounded-[16px] bg-[var(--color-input-bg)] p-4">
              <p className="text-sm font-circular-bold text-[var(--color-text)]">
                Alcance
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <ScopeButton
                  label="Todas las tiendas"
                  selected={modal.form.alcance === "todas"}
                  disabled={isSubmitting}
                  onClick={() =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, alcance: "todas", sucursalIds: [] },
                    }))
                  }
                />
                <ScopeButton
                  label="Tiendas especificas"
                  selected={modal.form.alcance === "especificas"}
                  disabled={isSubmitting || branches.length === 0}
                  onClick={() =>
                    setModal((prev) => ({ ...prev, form: { ...prev.form, alcance: "especificas", } }))
                  }
                />
              </div>

              {modal.form.alcance === "especificas" && (
                <div className="mt-4">
                  {isBranchesLoading ? (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Cargando sucursales...
                    </p>
                  ) : branches.length === 0 ? (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      No tienes tiendas activas disponibles.
                    </p>
                  ) : (
                    <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {branches.map((branch) => {
                        const checked = selectedSucursalIds.has(branch.id);

                        return (
                          <label
                            key={branch.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-[var(--color-card)] px-3 py-2 text-sm transition-colors ring-1 ring-[var(--color-border)] hover:bg-[var(--color-button-hover)]",
                              checked && "text-[var(--color-primary)]",
                            )}
                          >
                            <span className="min-w-0 truncate">
                              {branch.nombre}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSucursal(branch.id)}
                              disabled={isSubmitting}
                              className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {modal.error && (
              <p className="text-sm font-circular-regular text-[#d9480f]">
                {modal.error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
              >
                {isSubmitting
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
    <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
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

function DropdownButton({
  label,
  isOpen,
  onClick,
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
    >
      <span className="truncate">{label}</span>
      <CaretDownIcon
        size={16}
        className={cn(
          "shrink-0 text-[var(--color-muted-foreground)] transition-transform",
          isOpen && "rotate-180",
        )}
      />
    </button>
  );
}

function DropdownMenu({
  options,
  selectedValue,
  onSelect,
}: {
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="absolute right-0 top-full z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
            selectedValue === option.value
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SeriesScopeCell({ serie }: { serie: SerieComprobante }) {
  if (serie.aplicaTodasSucursales) {
    return (
      <div className="flex items-center">
        <span className="rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs font-circular-bold text-[var(--color-text)]">
          Todas las sucursales
        </span>
      </div>
    );
  }

  const visible = serie.sucursales.slice(0, 2);
  const hiddenCount = Math.max(0, serie.sucursales.length - visible.length);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {visible.map((sucursal) => (
        <span
          key={sucursal.id}
          className="max-w-[120px] truncate rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs font-circular-bold text-[var(--color-text)]"
        >
          {sucursal.nombre}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-circular-bold text-[var(--color-primary)]">
          +{hiddenCount} mas
        </span>
      )}
      {serie.sucursales.length === 0 && (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Sin sucursales
        </span>
      )}
    </div>
  );
}

function ScopeButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-11 items-center justify-center rounded-[14px] px-3 text-sm font-circular-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[var(--color-card)] text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-button-hover)]",
      )}
    >
      {label}
    </button>
  );
}

function InputField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      />
    </div>
  );
}

function SeriesSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-input-bg)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-[var(--color-input-bg)]" />
              <div className="h-3 w-40 rounded bg-[var(--color-input-bg)]" />
            </div>
            <div className="h-4 w-20 rounded bg-[var(--color-input-bg)]" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptySeries() {
  return (
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
  );
}

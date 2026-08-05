"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CaretDownIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PlusIcon,
  ReceiptIcon,
  StarIcon,
  StorefrontIcon,
  TrashIcon,
  WarehouseIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  branchesApi,
  type Branch,
  type BranchStatus,
  type BranchType,
} from "@/lib/api/branches";
import peruUbigeos from "@/lib/data/peru-ubigeos.json";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const typeConfig = {
  tienda: {
    label: "Tienda",
    icon: StorefrontIcon,
    bg: "bg-[#3b82f6]/10",
    text: "text-[#3b82f6]",
  },
  almacen: {
    label: "Almacen",
    icon: WarehouseIcon,
    bg: "bg-[#f59e0b]/10",
    text: "text-[#d97706]",
  },
};

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const defaultForm = {
  nombre: "",
  tipo: "tienda" as BranchType,
  ubigeo: "",
  distrito: "",
  direccion: "",
  codigoEstablecimientoSunat: "",
  estado: "activo" as BranchStatus,
  esPrincipal: false,
  modoCajaHabilitado: false,
};

const pageSize = defaultPageSize;
type BranchForm = typeof defaultForm;
type TypeFilter = "todos" | BranchType;
type StatusFilter = "todos" | BranchStatus;
type PeruUbigeo = {
  ubigeo: string;
  distrito: string;
  provincia: string;
  departamento: string;
  label: string;
};

const ubigeos = peruUbigeos as PeruUbigeo[];

const typeOptions: { label: string; value: TypeFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Tienda", value: "tienda" },
  { label: "Almacen", value: "almacen" },
];

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

export default function SucursalesPage() {
  const { showToast } = useSystemToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
    storeTotal: 0,
    warehouseTotal: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<TypeFilter>("todos");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; editing: Branch | null; form: BranchForm; error: string; delete: Branch | null }>({
    isOpen: false,
    editing: null,
    form: defaultForm,
    error: "",
    delete: null,
  });

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      branchesApi
        .findAll({
          page: currentPage,
          limit: pageSize,
          search: searchTerm,
          tipo: selectedType === "todos" ? undefined : selectedType,
          estado: selectedStatus === "todos" ? undefined : selectedStatus,
        })
        .then((response) => {
          if (isMounted) {
            setBranches(response.data);
            setMeta(response.meta);
          }
        })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudieron cargar sucursales.";

          if (isMounted) {
            showToast({
              title: "Error al cargar sucursales",
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
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [currentPage, searchTerm, selectedStatus, selectedType, showToast]);

  const refreshBranches = async (targetPage = currentPage) => {
    const response = await branchesApi.findAll({
      page: targetPage,
      limit: pageSize,
      search: searchTerm,
      tipo: selectedType === "todos" ? undefined : selectedType,
      estado: selectedStatus === "todos" ? undefined : selectedStatus,
    });

    setBranches(response.data);
    setMeta(response.meta);
  };

  const openCreateModal = () => {
    setModal({ isOpen: true, editing: null, form: defaultForm, error: "", delete: null });
  };

  const openEditModal = (branch: Branch) => {
    setModal({
      isOpen: true,
      editing: branch,
      form: {
      nombre: branch.nombre,
      tipo: branch.tipo,
      ubigeo: branch.ubigeo,
      distrito: branch.distrito,
      direccion: branch.direccion,
      codigoEstablecimientoSunat: branch.codigoEstablecimientoSunat ?? "",
      estado: branch.estado,
      esPrincipal: branch.esPrincipal,
      modoCajaHabilitado: branch.modoCajaHabilitado,
    },
      error: "",
      delete: null,
    });
    setOpenMenuId(null);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setModal({ isOpen: false, editing: null, form: defaultForm, error: "", delete: null });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModal((prev) => ({ ...prev, error: "" }));

    const nombre = modal.form.nombre.trim();
    const ubigeo = modal.form.ubigeo.trim();
    const distrito = modal.form.distrito.trim();
    const direccion = modal.form.direccion.trim();
    const codigoEstablecimientoSunat =
      modal.form.codigoEstablecimientoSunat.trim() || null;

    if (!nombre || !ubigeo || !distrito || !direccion) {
      setModal((prev) => ({ ...prev, error: "Completa nombre, ubigeo, distrito y direccion." }));
      return;
    }

    if (!/^\d{6}$/.test(ubigeo)) {
      setModal((prev) => ({ ...prev, error: "El ubigeo debe tener 6 digitos." }));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        nombre,
        tipo: modal.form.tipo,
        ubigeo,
        distrito,
        direccion,
        codigoEstablecimientoSunat,
        estado: modal.form.estado,
        esPrincipal: modal.form.esPrincipal,
        modoCajaHabilitado:
          modal.form.tipo === "tienda" ? modal.form.modoCajaHabilitado : false,
      };
      const savedBranch = modal.editing
        ? await branchesApi.update(modal.editing.id, payload)
        : await branchesApi.create(payload);
      const targetPage = modal.editing ? currentPage : 1;

      setCurrentPage(targetPage);
      await refreshBranches(targetPage);
      showToast({
        title: modal.editing ? "Sucursal actualizada" : "Sucursal creada",
        description: `${savedBranch.nombre} quedo guardada correctamente.`,
        variant: "success",
      });
      closeModal();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la sucursal.";
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

  const toggleStatus = async (branch: Branch) => {
    setOpenMenuId(null);

    try {
      const updatedBranch = await branchesApi.update(branch.id, {
        estado: branch.estado === "activo" ? "inactivo" : "activo",
      });
      await refreshBranches();
      showToast({
        title:
          updatedBranch.estado === "activo"
            ? "Sucursal activada"
            : "Sucursal inactivada",
        description: updatedBranch.nombre,
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

  const setAsPrincipal = async (branch: Branch) => {
    setOpenMenuId(null);

    try {
      const updatedBranch = await branchesApi.update(branch.id, {
        esPrincipal: true,
        estado: "activo",
      });
      await refreshBranches();
      showToast({
        title: "Sucursal principal actualizada",
        description: updatedBranch.nombre,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo marcar como principal.";
      showToast({
        title: "No se pudo actualizar",
        description: message,
        variant: "error",
      });
    }
  };

  const removeBranch = async (branch: Branch) => {
    setOpenMenuId(null);
    setModal((prev) => ({ ...prev, delete: branch }));
  };

  const confirmDelete = async () => {
    if (!modal.delete) return;

    try {
      await branchesApi.remove(modal.delete.id);
      const targetPage =
        branches.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      setCurrentPage(targetPage);
      await refreshBranches(targetPage);
      showToast({
        title: "Sucursal inactivada",
        description: "No se elimino fisicamente; quedo como inactiva.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la sucursal.";
      showToast({
        title: "No se pudo eliminar",
        description: message,
        variant: "error",
      });
    } finally {
      setModal((prev) => ({ ...prev, delete: null }));
    }
  };

  return (
    <DashboardShell headerTitle="Sucursales">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<StorefrontIcon size={22} weight="fill" />}
            label="Total Sucursales"
            value={meta.activeTotal + meta.inactiveTotal}
            tone="primary"
          />
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Activas"
            value={meta.activeTotal}
            tone="success"
          />
          <MetricCard
            icon={<StorefrontIcon size={22} weight="fill" />}
            label="Tiendas"
            value={meta.storeTotal}
            tone="info"
          />
          <MetricCard
            icon={<WarehouseIcon size={22} weight="fill" />}
            label="Almacenes"
            value={meta.warehouseTotal}
            tone="warning"
          />
          <MetricCard
            icon={<ReceiptIcon size={22} weight="fill" />}
            label="Tiendas con caja"
            value={branches.filter((branch) => branch.modoCajaHabilitado).length}
            tone="success"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por sucursal, direccion, distrito o ubigeo..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <DropdownFilter
            value={selectedType}
            label={
              selectedType === "todos" ? "Tipo" : typeConfig[selectedType].label
            }
            options={typeOptions}
            isOpen={isTypeOpen}
            onToggle={() => {
              setIsTypeOpen(!isTypeOpen);
              setIsStatusOpen(false);
            }}
            onSelect={(value) => {
              setSelectedType(value as TypeFilter);
              setCurrentPage(1);
              setIsTypeOpen(false);
            }}
          />

          <DropdownFilter
            value={selectedStatus}
            label={
              selectedStatus === "todos"
                ? "Estado"
                : statusConfig[selectedStatus].label
            }
            options={statusOptions}
            isOpen={isStatusOpen}
            onToggle={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsTypeOpen(false);
            }}
            onSelect={(value) => {
              setSelectedStatus(value as StatusFilter);
              setCurrentPage(1);
              setIsStatusOpen(false);
            }}
          />

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
          >
            <PlusIcon size={16} weight="bold" />
            Nueva Sucursal
          </button>
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
        ) : branches.length > 0 ? (
          <div className="space-y-3 pb-2">
            {branches.map((branch) => {
              const type = typeConfig[branch.tipo];
              const TypeIcon = type.icon;
              const status = statusConfig[branch.estado];

              return (
                <div
                  key={branch.id}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(190px,1.1fr)_minmax(110px,0.6fr)_minmax(220px,1.3fr)_minmax(120px,0.7fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)_40px] md:items-center md:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <StorefrontIcon size={22} weight="fill" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-black text-[var(--color-text)]">
                          {branch.nombre}
                        </p>
                        {branch.esPrincipal ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ff7417]/10 px-2 py-0.5 text-[10px] font-black text-[#d9480f]">
                            <StarIcon size={11} weight="fill" />
                            Principal
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        SUC-{branch.id.padStart(3, "0")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-circular-bold",
                        type.bg,
                        type.text
                      )}
                    >
                      <TypeIcon size={14} weight="fill" />
                      {type.label}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <MapPinIcon
                      size={16}
                      className="shrink-0 text-[var(--color-muted-foreground)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {branch.direccion}
                      </p>
                      <p className="truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                        {branch.distrito} - {branch.ubigeo}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      Cod. SUNAT
                    </p>
                    <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                      {branch.codigoEstablecimientoSunat || "Sin codigo"}
                    </p>
                  </div>

                  <div className="flex md:justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-circular-bold",
                        status.bg,
                        status.text
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex md:justify-center">
                    {branch.tipo === "tienda" ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-circular-bold",
                          branch.modoCajaHabilitado
                            ? "bg-[#10b981]/10 text-[#10b981]"
                            : "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
                        )}
                      >
                        <ReceiptIcon size={13} weight="bold" />
                        {branch.modoCajaHabilitado ? "Caja activa" : "Sin caja"}
                      </span>
                    ) : (
                      <span className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                        No aplica
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === branch.id ? null : branch.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === branch.id && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => openEditModal(branch)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                        >
                          <PencilSimpleIcon size={16} weight="bold" />
                          Editar sucursal
                        </button>
                        {!branch.esPrincipal ? (
                          <button
                            type="button"
                            onClick={() => void setAsPrincipal(branch)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <StarIcon size={16} weight="bold" />
                            Marcar principal
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void toggleStatus(branch)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                        >
                          <WarningCircleIcon size={16} weight="bold" />
                          {branch.estado === "activo" ? "Inactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeBranch(branch)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[#ef4444] hover:bg-[var(--color-button-hover)]"
                        >
                          <TrashIcon size={16} weight="bold" />
                          Eliminar sucursal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] p-8 text-center shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <StorefrontIcon size={28} weight="fill" />
            </div>
            <h2 className="mt-4 text-lg font-black text-[var(--color-text)]">
              No hay sucursales para mostrar
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium text-[var(--color-muted-foreground)]">
              Crea tiendas o almacenes para organizar ventas, stock y futuras
              guias de remision.
            </p>
            <Button
              type="button"
              onClick={openCreateModal}
              className="mt-5 h-10 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90"
            >
              Crear sucursal
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {branches.length} de {meta.total} sucursales
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {meta.page}
            </span>
            <button
              type="button"
              disabled={currentPage >= meta.totalPages || isLoading}
              onClick={() =>
                setCurrentPage((page) => Math.min(meta.totalPages, page + 1))
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.editing ? "Editar sucursal" : "Nueva sucursal"}
        description="Registra una tienda o almacen de la empresa."
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="branch-name"
              label="Nombre"
              value={modal.form.nombre}
              placeholder="Sede Principal"
              maxLength={120}
              disabled={isSubmitting}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, nombre: value } }))
              }
            />

            <Select
              options={[
                { label: "Tienda", value: "tienda" },
                { label: "Almacen", value: "almacen" },
              ]}
              value={modal.form.tipo}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form,
                  tipo: value as BranchType,
                  esPrincipal: value === "tienda" ? prev.form.esPrincipal : false,
                  modoCajaHabilitado:
                    value === "tienda"
                      ? prev.form.modoCajaHabilitado
                      : false,
                } }))
              }
              placeholder="Seleccionar tipo"
              label="Tipo"
            />
          </div>

          <UbigeoSelect
            value={modal.form.ubigeo}
            disabled={isSubmitting}
            onSelect={(item) =>
              setModal((prev) => ({ ...prev, form: { ...prev.form,
                ubigeo: item.ubigeo,
                distrito: item.distrito,
              } }))
            }
          />

          <InputField
            id="branch-address"
            label="Direccion"
            value={modal.form.direccion}
            placeholder="Av. Principal 123"
            maxLength={255}
            disabled={isSubmitting}
            onChange={(value) =>
              setModal((prev) => ({ ...prev, form: { ...prev.form, direccion: value } }))
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="branch-sunat-code"
              label="Codigo establecimiento SUNAT"
              value={modal.form.codigoEstablecimientoSunat}
              placeholder="0001"
              maxLength={10}
              disabled={isSubmitting}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, codigoEstablecimientoSunat: value, } }))
              }
            />

            <Select
              options={[
                { label: "Activo", value: "activo" },
                { label: "Inactivo", value: "inactivo" },
              ]}
              value={modal.form.estado}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, estado: value as BranchStatus, } }))
              }
              placeholder="Seleccionar estado"
              label="Estado"
            />
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-circular-bold transition-colors hover:bg-[var(--color-button-hover)]",
              modal.form.esPrincipal
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted-foreground)]"
            )}
          >
            <span>Sucursal principal</span>
            <input
              type="checkbox"
              checked={modal.form.esPrincipal}
              onChange={(event) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, esPrincipal: event.target.checked, } }))
              }
              disabled={isSubmitting || modal.form.tipo === "almacen"}
              className="h-5 w-5 accent-[var(--color-primary)]"
            />
          </label>

          <label
            className={cn(
              "flex items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-circular-bold transition-colors",
              modal.form.tipo === "almacen"
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:bg-[var(--color-button-hover)]",
              modal.form.modoCajaHabilitado
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted-foreground)]",
            )}
          >
            <span className="flex items-center gap-2">
              <ReceiptIcon size={16} weight="bold" />
              Caja habilitada
            </span>
            <input
              type="checkbox"
              checked={modal.form.modoCajaHabilitado}
              onChange={(event) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form,
                  modoCajaHabilitado:
                    prev.form.tipo === "tienda"
                      ? event.target.checked
                      : false,
                } }))
              }
              disabled={isSubmitting || modal.form.tipo === "almacen"}
              className="h-5 w-5 accent-[var(--color-primary)]"
            />
          </label>

          <div className="rounded-[16px] bg-[var(--color-input-bg)] p-3">
            <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              Vista previa
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
                {modal.form.tipo === "tienda" ? (
                  <StorefrontIcon size={22} weight="fill" />
                ) : (
                  <WarehouseIcon size={22} weight="fill" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--color-text)]">
                  {modal.form.nombre.trim() || "Nombre de la sucursal"}
                </p>
                <p className="truncate text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                  {modal.form.direccion.trim() || "Direccion"} -{" "}
                  {modal.form.distrito.trim() || "Distrito"}
                </p>
                <p className="mt-1 text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
                  {modal.form.tipo === "tienda" && modal.form.modoCajaHabilitado
                    ? "Caja activa para ventas"
                    : "Caja no requerida"}
                </p>
              </div>
            </div>
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
                  : "Crear sucursal"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={modal.delete !== null}
        onClose={() => setModal((prev) => ({ ...prev, delete: null }))}
        onConfirm={() => void confirmDelete()}
        title="Eliminar sucursal"
        description="Seguro que deseas eliminar esta sucursal? Se marcara como inactiva."
        itemName={modal.delete?.nombre}
      />
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
            toneClass
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
    <div className="relative w-full sm:w-[160px]">
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
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
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

function UbigeoSelect({
  value,
  disabled,
  onSelect,
}: {
  value: string;
  disabled: boolean;
  onSelect: (item: PeruUbigeo) => void;
}) {
  const selectedUbigeo = ubigeos.find((item) => item.ubigeo === value) ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const displayValue = selectedUbigeo
    ? `${selectedUbigeo.distrito} - ${selectedUbigeo.ubigeo}`
    : "";

  const normalizedSearch = normalizeSearch(search);
  const results =
    normalizedSearch.length < 2
      ? ubigeos.slice(0, 12)
      : ubigeos
          .filter((item) =>
            normalizeSearch(
              `${item.label} ${item.distrito} ${item.provincia} ${item.departamento}`
            ).includes(normalizedSearch)
          )
          .slice(0, 18);

  useEffect(() => {
    if (isOpen && !disabled) {
      const animationFrame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [isOpen, disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setSearch("");
      setIsOpen(true);
    }
  };

  const handleSelect = (item: PeruUbigeo) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <p className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        Ubigeo / distrito
      </p>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none transition-colors hover:bg-[var(--color-button-hover)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-70",
          !displayValue && "text-[var(--color-placeholder)]",
        )}
        aria-label="Ubigeo"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {displayValue || "Buscar distrito, provincia o ubigeo"}
          <span className="ml-0.5 text-[var(--color-primary)]">*</span>
        </span>
        <CaretDownIcon
          size={16}
          className={cn(
            "shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)] animate-in fade-in zoom-in-95 duration-200">
          <div className="relative px-1 pb-1">
            <MagnifyingGlassIcon
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar..."
              className="h-9 w-full rounded-lg bg-[var(--color-input-bg)] pl-9 pr-4 text-xs font-circular-regular text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {results.length > 0 ? (
              results.map((item) => (
                <button
                  key={item.ubigeo}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-button-hover)]",
                    value === item.ubigeo && "bg-[var(--color-primary)] text-white",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {item.distrito}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]",
                        value === item.ubigeo && "text-white/80",
                      )}
                    >
                      {item.provincia}, {item.departamento}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-black text-[var(--color-primary)] font-circular-regular",
                      value === item.ubigeo && "text-white",
                    )}
                  >
                    {item.ubigeo}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                No se encontraron ubigeos
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
      <label htmlFor={id} className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={id !== "branch-sunat-code"}
        disabled={disabled}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      />
    </div>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

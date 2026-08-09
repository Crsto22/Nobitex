"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CaretDownIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusIcon,
  RulerIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { defaultPageSize } from "@/lib/pagination";
import { sizesApi, type Size } from "@/lib/api/sizes";
import { cn } from "@/lib/utils";

const statusConfig = {
  active: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactive: { label: "Inactivo", bg: "bg-[#ef4444]", text: "text-white" },
};

const defaultForm = {
  nombre: "",
  activo: true,
};

const pageSize = defaultPageSize;
type SizeForm = typeof defaultForm;
type StatusFilter = "todos" | "active" | "inactive";

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "active" },
  { label: "Inactivo", value: "inactive" },
];

export default function CatalogoTallasPage() {
  const { showToast } = useSystemToast();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; editing: Size | null; form: SizeForm; error: string; delete: Size | null }>({
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

      sizesApi
        .findAll({
          page: currentPage,
          limit: pageSize,
          search: searchTerm,
          status: selectedStatus === "todos" ? undefined : selectedStatus,
        })
        .then((response) => {
          if (isMounted) {
            setSizes(response.data);
            setMeta(response.meta);
          }
        })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudieron cargar tallas.";

          if (isMounted) {
            showToast({
              title: "Error al cargar tallas",
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
  }, [currentPage, searchTerm, selectedStatus, showToast]);

  const refreshSizes = async (targetPage = currentPage) => {
    const response = await sizesApi.findAll({
      page: targetPage,
      limit: pageSize,
      search: searchTerm,
      status: selectedStatus === "todos" ? undefined : selectedStatus,
    });

    setSizes(response.data);
    setMeta(response.meta);
  };

  const activeCount = meta.activeTotal;
  const inactiveCount = meta.inactiveTotal;
  const totalCount = meta.activeTotal + meta.inactiveTotal;

  const openCreateModal = () => {
    setModal({ isOpen: true, editing: null, form: defaultForm, error: "", delete: null });
  };

  const openEditModal = (size: Size) => {
    setModal({
      isOpen: true,
      editing: size,
      form: {
      nombre: size.nombre,
      activo: size.activo,
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

    if (!nombre) {
      setModal((prev) => ({ ...prev, error: "Ingresa el nombre de la talla." }));
      return;
    }

    setIsSubmitting(true);

    try {
      const savedSize = modal.editing
        ? await sizesApi.update(modal.editing.id, {
            nombre,
            activo: modal.form.activo,
          })
        : await sizesApi.create({
            nombre,
            activo: modal.form.activo,
          });
      const targetPage = modal.editing ? currentPage : 1;

      setCurrentPage(targetPage);
      await refreshSizes(targetPage);
      showToast({
        title: modal.editing ? "Talla actualizada" : "Talla creada",
        description: `${savedSize.nombre} quedo guardada correctamente.`,
        variant: "success",
      });
      closeModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la talla.";
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

  const toggleActive = async (size: Size) => {
    setOpenMenuId(null);

    try {
      const updatedSize = await sizesApi.update(size.id, {
        activo: !size.activo,
      });
      await refreshSizes();
      showToast({
        title: updatedSize.activo ? "Talla activada" : "Talla inactivada",
        description: updatedSize.nombre,
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

  const removeSize = async (size: Size) => {
    setOpenMenuId(null);
    setModal((prev) => ({ ...prev, delete: size }));
  };

  const confirmDelete = async () => {
    if (!modal.delete) return;

    try {
      await sizesApi.remove(modal.delete.id);
      const targetPage =
        sizes.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      setCurrentPage(targetPage);
      await refreshSizes(targetPage);
      showToast({
        title: "Talla eliminada",
        description: "Se elimino de manera logica. Puedes recrearla luego.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar la talla.";
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
    <DashboardShell headerTitle="Tallas">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            icon={<RulerIcon size={22} weight="fill" />}
            label="Total Tallas"
            value={totalCount}
            tone="primary"
          />
          <MetricCard
            icon={<RulerIcon size={22} weight="fill" />}
            label="Activas"
            value={activeCount}
            tone="success"
          />
          <MetricCard
            icon={<PackageIcon size={22} weight="fill" />}
            label="Inactivas"
            value={inactiveCount}
            tone="info"
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
              placeholder="Buscar por talla o codigo..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <div className="relative w-full sm:w-[180px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedStatus === "todos"
                  ? "Todos"
                  : statusConfig[selectedStatus as keyof typeof statusConfig]
                      ?.label}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isStatusOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setCurrentPage(1);
                      setIsStatusOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                      selectedStatus === option.value
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

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90 sm:w-auto"
          >
            <PlusIcon size={18} weight="bold" />
            Nueva Talla
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 pb-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))}
          </div>
        ) : sizes.length > 0 ? (
          <div className="grid gap-3 pb-2">
            {sizes.map((size) => {
              const status = size.activo
                ? statusConfig.active
                : statusConfig.inactive;

              return (
                <div
                  key={size.id}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(180px,1.4fr)_minmax(130px,0.8fr)_minmax(110px,0.7fr)_40px] md:items-center md:gap-5 md:gap-y-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-black text-white font-circular-regular">
                      {size.nombre}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        Talla {size.nombre}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        TAL-{size.id.padStart(3, "0")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      Actualizado
                    </p>
                    <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                      {formatDate(size.updatedAt)}
                    </p>
                  </div>

                  <div className="flex justify-end md:justify-center">
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

                  <div className="relative flex items-center justify-end md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === size.id ? null : size.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === size.id && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => openEditModal(size)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                        >
                          <PencilSimpleIcon size={16} weight="bold" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(size)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                        >
                          <RulerIcon size={16} weight="bold" />
                          {size.activo ? "Inactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeSize(size)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[#ef4444] hover:bg-[var(--color-button-hover)]"
                        >
                          <TrashIcon size={16} weight="bold" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] p-8 text-center shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <RulerIcon size={26} weight="fill" />
            </div>
            <h2 className="mt-4 text-lg font-black text-[var(--color-text)]">
              No hay tallas para mostrar
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium text-[var(--color-muted-foreground)]">
              Crea tallas como S, M, L, XL, 36, 37 o talla unica para tus
              variantes.
            </p>
            <Button
              type="button"
              onClick={openCreateModal}
              className="mt-5 h-10 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90"
            >
              Crear talla
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {sizes.length} de {meta.total} tallas
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
        title={modal.editing ? "Editar talla" : "Nueva talla"}
        description="Define el nombre de la talla para tus variantes."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="size-name"
              className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
            >
              Nombre de la talla
            </label>
            <input
              id="size-name"
              type="text"
              value={modal.form.nombre}
              onChange={(event) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, nombre: event.target.value, } }))
              }
              placeholder="S, M, L, XL, 36, Talla unica"
              maxLength={80}
              required
              disabled={isSubmitting}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
            />
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-circular-bold transition-colors hover:bg-[var(--color-button-hover)]",
              modal.form.activo
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted-foreground)]"
            )}
          >
            <span>Talla activa</span>
            <input
              type="checkbox"
              checked={modal.form.activo}
              onChange={(event) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, activo: event.target.checked, } }))
              }
              disabled={isSubmitting}
              className="h-5 w-5 accent-[var(--color-primary)]"
            />
          </label>

          <div className="rounded-[16px] bg-[var(--color-input-bg)] p-3">
            <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              Vista previa
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-black text-white font-circular-regular">
                {modal.form.nombre.trim() || "M"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--color-text)]">
                  Talla {modal.form.nombre.trim() || "Nombre de la talla"}
                </p>
                <p className="text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                  {modal.form.activo ? "Activa" : "Inactiva"}
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
                  : "Crear talla"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={modal.delete !== null}
        onClose={() => setModal((prev) => ({ ...prev, delete: null }))}
        onConfirm={() => void confirmDelete()}
        title="Eliminar talla"
        description="Seguro que deseas eliminar esta talla? Esta accion no se puede deshacer."
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
  tone: "primary" | "success" | "info";
}) {
  const toneClass = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    info: "bg-[#3b82f6]/10 text-[#3b82f6]",
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

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

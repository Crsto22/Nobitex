"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CaretDownIcon,
  DotsThreeVerticalIcon,
  LockKeyIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  WalletIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  paymentMethodsApi,
  type PaymentMethod,
  type PaymentMethodStatus,
  type PaymentMethodStatusFilter,
} from "@/lib/api/payment-methods";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type PaymentMethodForm = {
  nombre: string;
  descripcion: string;
  estado: PaymentMethodStatus;
};

const defaultForm: PaymentMethodForm = {
  nombre: "",
  descripcion: "",
  estado: "activo",
};

const statusConfig: Record<PaymentMethodStatus, { label: string; bg: string; text: string }> = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const paymentMethodConfig: Record<string, { src: string; label: string; bgColor: string }> = {
  Efectivo: { src: "/svg/metodo-pago/efectivo.png", label: "Efectivo", bgColor: "bg-[#10b981]" },
  Yape: { src: "/svg/metodo-pago/Yape.svg", label: "Yape", bgColor: "bg-[#a221af]" },
  Plin: { src: "/svg/metodo-pago/Plin.svg", label: "Plin", bgColor: "bg-[#00E2CE]" },
  Transferencia: { src: "/svg/metodo-pago/transferencia.png", label: "Transferencia", bgColor: "bg-[#3b82f6]" },
};

const getPaymentMethodConfig = (name: string) => {
  const normalized = name.trim().toLowerCase();
  for (const [key, config] of Object.entries(paymentMethodConfig)) {
    if (key.toLowerCase() === normalized) {
      return config;
    }
  }
  return null;
};

const pageSize = defaultPageSize;
const statusOptions: {
  label: string;
  value: "todos" | PaymentMethodStatusFilter;
}[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "active" },
  { label: "Inactivo", value: "inactive" },
];

export default function PaymentMethodsPage() {
  const { showToast } = useSystemToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
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
  const [selectedStatus, setSelectedStatus] = useState<"todos" | PaymentMethodStatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; editing: PaymentMethod | null; form: PaymentMethodForm; error: string; delete: PaymentMethod | null }>({
    isOpen: false,
    editing: null,
    form: defaultForm,
    error: "",
    delete: null,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadMethods = useCallback(() => {
    setIsLoading(true);

    paymentMethodsApi
      .findAll({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        status: selectedStatus === "todos" ? undefined : selectedStatus,
      })
      .then((response) => {
        setMethods(response.data);
        setMeta(response.meta);
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los metodos de pago.";
        showToast({
          title: "Error al cargar",
          description: message,
          variant: "error",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentPage, searchTerm, selectedStatus, showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadMethods();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadMethods]);

  const refreshMethods = async (targetPage = currentPage) => {
    const response = await paymentMethodsApi.findAll({
      page: targetPage,
      limit: pageSize,
      search: searchTerm,
      status: selectedStatus === "todos" ? undefined : selectedStatus,
    });

    setMethods(response.data);
    setMeta(response.meta);
  };

  const openCreateModal = () => {
    setModal({ isOpen: true, editing: null, form: defaultForm, error: "", delete: null });
  };

  const openEditModal = (method: PaymentMethod) => {
    setModal({
      isOpen: true,
      editing: method,
      form: {
        nombre: method.nombre,
        descripcion: method.descripcion ?? "",
        estado: method.estado,
      },
      error: "",
      delete: null,
    });
    setOpenMenuId(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;

    setModal({ isOpen: false, editing: null, form: defaultForm, error: "", delete: null });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModal((prev) => ({ ...prev, error: "" }));

    if (!modal.form.nombre.trim()) {
      setModal((prev) => ({ ...prev, error: "Ingresa el nombre del metodo de pago." }));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        nombre: modal.form.nombre.trim(),
        descripcion: modal.form.descripcion.trim() || undefined,
        activo: modal.form.estado === "activo",
      };

      const savedMethod = modal.editing
        ? await paymentMethodsApi.update(modal.editing.id, {
            nombre: !modal.editing.esSistema && payload.nombre !== modal.editing.nombre ? payload.nombre : undefined,
            descripcion: payload.descripcion !== (modal.editing.descripcion ?? undefined) ? payload.descripcion : undefined,
            estado: payload.activo !== (modal.editing.estado === "activo") ? (payload.activo ? "activo" : "inactivo") : undefined,
          })
        : await paymentMethodsApi.create(payload);

      const targetPage = modal.editing ? currentPage : 1;
      setCurrentPage(targetPage);
      await refreshMethods(targetPage);
      showToast({
        title: modal.editing ? "Metodo actualizado" : "Metodo creado",
        description: `${savedMethod.nombre} quedo guardado correctamente.`,
        variant: "success",
      });
      closeModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el metodo.";
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

  const toggleStatus = async (method: PaymentMethod) => {
    setOpenMenuId(null);

    try {
      const updatedMethod = await paymentMethodsApi.update(method.id, {
        estado: method.estado === "activo" ? "inactivo" : "activo",
      });
      await refreshMethods();
      showToast({
        title:
          updatedMethod.estado === "activo"
            ? "Metodo activado"
            : "Metodo inactivado",
        description: updatedMethod.nombre,
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

  const confirmDelete = async () => {
    if (!modal.delete) return;

    try {
      await paymentMethodsApi.remove(modal.delete.id);
      const targetPage =
        methods.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      setCurrentPage(targetPage);
      await refreshMethods(targetPage);
      showToast({
        title: "Metodo eliminado",
        description: "Se marco como inactivo correctamente.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el metodo.";
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
    <DashboardShell headerTitle="Metodos de Pago">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <MetricCard
            icon={<WalletIcon size={22} weight="fill" />}
            label="Total Metodos"
            value={meta.activeTotal + meta.inactiveTotal}
            tone="primary"
          />
          <MetricCard
            icon={<WalletIcon size={22} weight="fill" />}
            label="Activos"
            value={meta.activeTotal}
            tone="success"
          />
          <MetricCard
            icon={<WarningCircleIcon size={22} weight="fill" />}
            label="Inactivos"
            value={meta.inactiveTotal}
            tone="warning"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:flex-row lg:items-center lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative flex-1">
            <WalletIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar metodo de pago..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
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
              setSelectedStatus(value as "todos" | PaymentMethodStatusFilter);
              setCurrentPage(1);
              setIsStatusOpen(false);
            }}
          />

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90 lg:w-auto"
          >
            <PlusIcon size={18} weight="bold" />
            Nuevo Metodo
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
        ) : methods.length > 0 ? (
          <div className="grid gap-3 pb-2">
            {methods.map((method) => {
              const status = statusConfig[method.estado];

              return (
                <div
                  key={method.id}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(210px,1.2fr)_minmax(230px,1.25fr)_minmax(140px,0.75fr)_minmax(132px,0.7fr)] md:items-center md:gap-4 md:gap-y-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {(() => {
                      const config = getPaymentMethodConfig(method.nombre);
                      return config ? (
                        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", config.bgColor)}>
                          <Image src={config.src} width={44} height={44} alt={config.label} className="h-7 w-7 object-contain" />
                        </div>
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <WalletIcon size={22} weight="fill" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {method.nombre}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        PM-{method.id.padStart(3, "0")}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                      {method.descripcion || "Sin descripcion"}
                    </p>
                    <p className="truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                      Creado: {new Date(method.createdAt).toLocaleDateString("es-PE")}
                    </p>
                  </div>

                  <div className="flex justify-end md:justify-center">
                    <div className="flex flex-wrap gap-2 md:justify-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-circular-bold",
                          status.bg,
                          status.text
                        )}
                      >
                        {status.label}
                      </span>
                      {method.esSistema ? (
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          title="Metodo del sistema"
                        >
                          <LockKeyIcon size={12} weight="bold" />
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === method.id ? null : method.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    <div className="relative">
                      {openMenuId === method.id && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                          <button
                            type="button"
                            onClick={() => openEditModal(method)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <PencilSimpleIcon size={16} weight="bold" />
                            Editar metodo
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleStatus(method)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <WarningCircleIcon size={16} weight="bold" />
                            {method.estado === "activo" ? "Inactivar" : "Activar"}
                          </button>
                          {!method.esSistema ? (
                            <button
                              type="button"
                              onClick={() => setModal((prev) => ({ ...prev, delete: method }))}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[#ef4444] hover:bg-[var(--color-button-hover)]"
                            >
                              <TrashIcon size={16} weight="bold" />
                              Eliminar metodo
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                              <LockKeyIcon size={15} weight="bold" />
                              Metodo del sistema
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] p-8 text-center shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <WalletIcon size={28} weight="fill" />
            </div>
            <h2 className="mt-4 text-lg font-black text-[var(--color-text)]">
              No hay metodos de pago para mostrar
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium text-[var(--color-muted-foreground)]">
              Crea metodos de pago como efectivo, tarjetas, Yape, Plin, etc.
            </p>
            <Button
              type="button"
              onClick={openCreateModal}
              className="mt-5 h-10 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90"
            >
              Crear metodo de pago
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {methods.length} de {meta.total} metodos
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
        title={modal.editing ? "Editar metodo de pago" : "Nuevo metodo de pago"}
        description="Registra un nuevo metodo de pago para tus ventas."
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <InputField
            id="payment-name"
            label="Nombre"
            value={modal.form.nombre}
            placeholder="Efectivo, Visa, Yape, etc."
            maxLength={120}
            disabled={isSubmitting || !!modal.editing?.esSistema}
            onChange={(value) =>
              setModal((prev) => ({ ...prev, form: { ...prev.form, nombre: value } }))
            }
          />

          <InputField
            id="payment-description"
            label="Descripcion"
            value={modal.form.descripcion}
            placeholder="Breve descripcion del metodo de pago"
            maxLength={500}
            disabled={isSubmitting}
            required={false}
            onChange={(value) =>
              setModal((prev) => ({ ...prev, form: { ...prev.form, descripcion: value } }))
            }
          />

          <Select
            options={[
              { label: "Activo", value: "activo" },
              { label: "Inactivo", value: "inactivo" },
            ]}
            value={modal.form.estado}
            onChange={(value) =>
              setModal((prev) => ({
                ...prev,
                form: { ...prev.form, estado: value as PaymentMethodStatus },
              }))
            }
            placeholder="Seleccionar estado"
            label="Estado"
          />

          <div className="rounded-[16px] bg-[var(--color-input-bg)] p-3">
            <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              Vista previa
            </p>
            <div className="mt-3 flex items-center gap-3">
              {(() => {
                const config = getPaymentMethodConfig(modal.form.nombre);
                return config ? (
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", config.bgColor)}>
                    <Image src={config.src} width={48} height={48} alt={config.label} className="h-8 w-8 object-contain" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    <WalletIcon size={22} weight="fill" />
                  </div>
                );
              })()}
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--color-text)]">
                  {modal.form.nombre || "Nombre del metodo"}
                </p>
                <p className="truncate text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                  Metodo de pago
                </p>
              </div>
            </div>
          </div>

          {modal.error && (
            <p className="text-sm font-circular-regular text-[#d9480f]">{modal.error}</p>
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
                  : "Crear metodo"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={modal.delete !== null}
        onClose={() => setModal((prev) => ({ ...prev, delete: null }))}
        onConfirm={() => void confirmDelete()}
        title="Eliminar metodo de pago"
        description="Seguro que deseas eliminar este metodo personalizado? Se marcara como inactivo."
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

function InputField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  disabled,
  onChange,
  required = true,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  disabled: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      />
    </div>
  );
}

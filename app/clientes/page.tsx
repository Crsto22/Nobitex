"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  CaretDownIcon,
  DotsThreeVerticalIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { UserAvatar } from "@/components/UserAvatar/user-avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  clientsApi,
  type Client,
  type ClientDocumentType,
  type ClientStatus,
} from "@/lib/api/clients";
import peruUbigeos from "@/lib/data/peru-ubigeos.json";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const documentConfig = {
  dni: { label: "DNI", bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]" },
  ruc: { label: "RUC", bg: "bg-[#f59e0b]/10", text: "text-[#d97706]" },
  sin_documento: {
    label: "Sin documento",
    bg: "bg-[var(--color-primary)]/10",
    text: "text-[var(--color-primary)]",
  },
};

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const defaultForm = {
  tipoDocumento: "sin_documento" as ClientDocumentType,
  numeroDocumento: "",
  nombre: "",
  razonSocial: "",
  telefono: "",
  email: "",
  direccion: "",
  ubigeo: "",
  distrito: "",
  estado: "activo" as ClientStatus,
};

const pageSize = defaultPageSize;
type ClientForm = typeof defaultForm;
type DocumentFilter = "todos" | ClientDocumentType;
type StatusFilter = "todos" | ClientStatus;
type PeruUbigeo = {
  ubigeo: string;
  distrito: string;
  provincia: string;
  departamento: string;
  label: string;
};

const ubigeos = peruUbigeos as PeruUbigeo[];

const documentOptions: { label: string; value: DocumentFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "DNI", value: "dni" },
  { label: "RUC", value: "ruc" },
  { label: "Sin documento", value: "sin_documento" },
];

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

export default function ClientesPage() {
  const { showToast } = useSystemToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
    dniTotal: 0,
    rucTotal: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentFilter>("todos");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingDocument, setIsSearchingDocument] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; editing: Client | null; form: ClientForm; error: string; delete: Client | null }>({
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

      clientsApi
        .findAll({
          page: currentPage,
          limit: pageSize,
          search: searchTerm,
          tipoDocumento:
            selectedDocument === "todos" ? undefined : selectedDocument,
          estado: selectedStatus === "todos" ? undefined : selectedStatus,
        })
        .then((response) => {
          if (isMounted) {
            setClients(response.data);
            setMeta(response.meta);
          }
        })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudieron cargar clientes.";

          if (isMounted) {
            showToast({
              title: "Error al cargar clientes",
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
  }, [currentPage, searchTerm, selectedDocument, selectedStatus, showToast]);

  const refreshClients = async (targetPage = currentPage) => {
    const response = await clientsApi.findAll({
      page: targetPage,
      limit: pageSize,
      search: searchTerm,
      tipoDocumento:
        selectedDocument === "todos" ? undefined : selectedDocument,
      estado: selectedStatus === "todos" ? undefined : selectedStatus,
    });

    setClients(response.data);
    setMeta(response.meta);
  };

  const openCreateModal = () => {
    setModal({ isOpen: true, editing: null, form: defaultForm, error: "", delete: null });
  };

  const openEditModal = (client: Client) => {
    setModal({
      isOpen: true,
      editing: client,
      form: {
      tipoDocumento: client.tipoDocumento,
      numeroDocumento: client.numeroDocumento ?? "",
      nombre: client.nombre ?? "",
      razonSocial: client.razonSocial ?? "",
      telefono: client.telefono ?? "",
      email: client.email ?? "",
      direccion: client.direccion ?? "",
      ubigeo: client.ubigeo ?? "",
      distrito: client.distrito ?? "",
      estado: client.estado,
    },
      error: "",
      delete: null,
    });
    setOpenMenuId(null);
  };

  const closeModal = () => {
    if (isSubmitting || isSearchingDocument) {
      return;
    }

    setModal({ isOpen: false, editing: null, form: defaultForm, error: "", delete: null });
  };

  const handleSearchDocument = async () => {
    const numeroDocumento = modal.form.numeroDocumento.trim();
    const documentLabel = documentConfig[modal.form.tipoDocumento].label;
    const expectedLength = modal.form.tipoDocumento === "dni" ? 8 : 11;

    if (
      modal.form.tipoDocumento === "sin_documento" ||
      numeroDocumento.length !== expectedLength
    ) {
      setModal((prev) => ({ ...prev, error: `El ${documentLabel} debe tener ${expectedLength} digitos.` }));
      return;
    }

    setModal((prev) => ({ ...prev, error: "" }));
    setIsSearchingDocument(true);

    try {
      if (modal.form.tipoDocumento === "dni") {
        const response = await clientsApi.consultarDni(numeroDocumento);
        const nombre = [
          response.nombres,
          response.apellidoPaterno,
          response.apellidoMaterno,
        ]
          .filter(Boolean)
          .join(" ");

        setModal((prev) => {
          if (!(prev.form.tipoDocumento === "dni" && prev.form.numeroDocumento === numeroDocumento)) return prev;
          return { ...prev, form: { ...prev.form, nombre } };
        });
      }

      if (modal.form.tipoDocumento === "ruc") {
        const response = await clientsApi.consultarRuc(numeroDocumento);

        setModal((prev) => {
          if (!(prev.form.tipoDocumento === "ruc" && prev.form.numeroDocumento === numeroDocumento)) return prev;
          return { ...prev, form: { ...prev.form, razonSocial: response.razonSocial ?? prev.form.razonSocial, direccion: response.direccion ?? prev.form.direccion, ubigeo: response.ubigeo ?? prev.form.ubigeo, distrito: response.distrito ?? prev.form.distrito } };
        });
      }

      showToast({
        title: "Datos encontrados",
        description: `Se completo la informacion del ${documentLabel}.`,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo consultar el documento.";

      setModal((prev) => ({ ...prev, error: message }));
      showToast({
        title: "No se pudo consultar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSearchingDocument(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModal((prev) => ({ ...prev, error: "" }));

    const payload = buildPayload(modal.form);
    const validationError = validateForm(payload);

    if (validationError) {
      setModal((prev) => ({ ...prev, error: validationError }));
      return;
    }

    setIsSubmitting(true);

    try {
      const savedClient = modal.editing
        ? await clientsApi.update(modal.editing.id, payload)
        : await clientsApi.create(payload);
      const targetPage = modal.editing ? currentPage : 1;

      setCurrentPage(targetPage);
      await refreshClients(targetPage);
      showToast({
        title: modal.editing ? "Cliente actualizado" : "Cliente creado",
        description: `${savedClient.displayName} quedo guardado correctamente.`,
        variant: "success",
      });
      closeModal();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el cliente.";
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

  const toggleStatus = async (client: Client) => {
    setOpenMenuId(null);

    try {
      const updatedClient = await clientsApi.update(client.id, {
        estado: client.estado === "activo" ? "inactivo" : "activo",
      });
      await refreshClients();
      showToast({
        title:
          updatedClient.estado === "activo"
            ? "Cliente activado"
            : "Cliente inactivado",
        description: updatedClient.displayName,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado.";
      showToast({
        title: "No se pudo actualizar",
        description: message,
        variant: "error",
      });
    }
  };

  const removeClient = async (client: Client) => {
    setOpenMenuId(null);
    setModal((prev) => ({ ...prev, delete: client }));
  };

  const confirmDelete = async () => {
    if (!modal.delete) return;

    try {
      await clientsApi.remove(modal.delete.id);
      const targetPage =
        clients.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

      setCurrentPage(targetPage);
      await refreshClients(targetPage);
      showToast({
        title: "Cliente inactivado",
        description: "No se elimino fisicamente; quedo como inactivo.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el cliente.";
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
    <DashboardShell headerTitle="Clientes">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricCard
            icon={<UsersThreeIcon size={22} weight="fill" />}
            label="Total Clientes"
            value={meta.activeTotal + meta.inactiveTotal}
            tone="primary"
          />
          <MetricCard
            icon={<UserIcon size={22} weight="fill" />}
            label="Activos"
            value={meta.activeTotal}
            tone="success"
          />
          <MetricCard
            icon={<IdentificationCardIcon size={22} weight="fill" />}
            label="DNI"
            value={meta.dniTotal}
            tone="info"
          />
          <MetricCard
            icon={<IdentificationCardIcon size={22} weight="fill" />}
            label="RUC"
            value={meta.rucTotal}
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
              placeholder="Buscar por nombre, documento, email o telefono..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <DropdownFilter
            value={selectedDocument}
            label={
              selectedDocument === "todos"
                ? "Documento"
                : documentConfig[selectedDocument].label
            }
            options={documentOptions}
            isOpen={isDocumentOpen}
            onToggle={() => {
              setIsDocumentOpen(!isDocumentOpen);
              setIsStatusOpen(false);
            }}
            onSelect={(value) => {
              setSelectedDocument(value as DocumentFilter);
              setCurrentPage(1);
              setIsDocumentOpen(false);
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
              setIsDocumentOpen(false);
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
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
          >
            <PlusIcon size={18} weight="bold" />
            Nuevo Cliente
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
        ) : clients.length > 0 ? (
          <div className="grid gap-3 pb-2">
            {clients.map((client) => {
              const document = documentConfig[client.tipoDocumento];
              const status = statusConfig[client.estado];

              return (
                <div
                  key={client.id}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(210px,1.2fr)_minmax(140px,0.75fr)_minmax(230px,1.25fr)_minmax(140px,0.75fr)_minmax(100px,0.55fr)_minmax(132px,0.7fr)] md:items-center md:gap-4 md:gap-y-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      seed={client.id}
                      name={client.displayName}
                      size={44}
                      className="size-11 ring-1 ring-[var(--color-border)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {client.displayName}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        CLI-{client.id.padStart(3, "0")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-circular-bold",
                        document.bg,
                        document.text,
                      )}
                    >
                      <IdentificationCardIcon size={14} weight="fill" />
                      {document.label}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                      {client.numeroDocumento || "Sin numero"}
                    </p>
                    <p className="truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                      {client.email || "Sin email"}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <InfoLine
                      icon={<PhoneIcon size={15} />}
                      value={client.telefono}
                      fallback="Sin telefono"
                    />
                    <InfoLine
                      icon={<MapPinIcon size={15} />}
                      value={client.direccion || client.distrito}
                      fallback="Sin direccion"
                    />
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

                  <div className="flex items-center gap-2 justify-end md:justify-end">
                    <QuickContactButtons client={client} />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === client.id ? null : client.id,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    <div className="relative">
                      {openMenuId === client.id && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                          <button
                            type="button"
                            onClick={() => openEditModal(client)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <PencilSimpleIcon size={16} weight="bold" />
                            Editar cliente
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleStatus(client)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <WarningCircleIcon size={16} weight="bold" />
                            {client.estado === "activo"
                              ? "Inactivar"
                              : "Activar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeClient(client)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[#ef4444] hover:bg-[var(--color-button-hover)]"
                          >
                            <TrashIcon size={16} weight="bold" />
                            Eliminar cliente
                          </button>
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
              <UsersThreeIcon size={28} weight="fill" />
            </div>
            <h2 className="mt-4 text-lg font-black text-[var(--color-text)]">
              No hay clientes para mostrar
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium text-[var(--color-muted-foreground)]">
              Crea clientes con DNI, RUC o sin documento para usarlos en ventas
              y comprobantes.
            </p>
            <Button
              type="button"
              onClick={openCreateModal}
              className="mt-5 h-10 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90"
            >
              Crear cliente
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {clients.length} de {meta.total} clientes
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
        title={modal.editing ? "Editar cliente" : "Nuevo cliente"}
        description="Registra los datos comerciales del cliente."
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              options={[
                { label: "DNI", value: "dni" },
                { label: "RUC", value: "ruc" },
                { label: "Sin documento", value: "sin_documento" },
              ]}
              value={modal.form.tipoDocumento}
              onChange={(value) => {
                setModal((prev) => ({ ...prev, error: "" }));
                setModal((prev) => ({ ...prev, form: { ...prev.form,
                  tipoDocumento: value as ClientDocumentType,
                  numeroDocumento:
                    value === "sin_documento"
                      ? ""
                      : prev.form.numeroDocumento,
                } }));
              }}
              placeholder="Seleccionar documento"
              label="Tipo de documento"
              required
            />

            {modal.form.tipoDocumento !== "sin_documento" ? (
              <DocumentInputField
                id="client-document"
                label="Numero de documento"
                documentType={modal.form.tipoDocumento}
                value={modal.form.numeroDocumento}
                placeholder={
                  modal.form.tipoDocumento === "dni" ? "12345678" : "20601234567"
                }
                maxLength={modal.form.tipoDocumento === "dni" ? 8 : 11}
                disabled={isSubmitting || isSearchingDocument}
                isSearching={isSearchingDocument}
                onChange={(value) => {
                  setModal((prev) => ({ ...prev, error: "" }));
                  setModal((prev) => ({ ...prev, form: { ...prev.form, numeroDocumento: value.replace(/\D/g, ""), } }));
                }}
                onSearch={() => void handleSearchDocument()}
              />
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          {modal.form.tipoDocumento === "ruc" ? (
            <InputField
              id="client-business-name"
              label="Razon social"
              value={modal.form.razonSocial}
              placeholder="Textiles Demo SAC"
              maxLength={200}
              disabled={isSubmitting}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, razonSocial: value, } }))
              }
            />
          ) : (
            <InputField
              id="client-name"
              label="Nombre"
              value={modal.form.nombre}
              placeholder="Juan Perez"
              maxLength={150}
              disabled={isSubmitting}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, nombre: value } }))
              }
            />
          )}

          {modal.form.tipoDocumento === "ruc" ? (
            <InputField
              id="client-contact-name"
              label="Contacto"
              value={modal.form.nombre}
              placeholder="Nombre de contacto"
              maxLength={150}
              disabled={isSubmitting}
              required={false}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, nombre: value } }))
              }
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="client-phone"
              label="Telefono"
              value={modal.form.telefono}
              placeholder="999888777"
              maxLength={30}
              disabled={isSubmitting}
              required={false}
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, telefono: value } }))
              }
            />

            <InputField
              id="client-email"
              label="Email"
              value={modal.form.email}
              placeholder="cliente@email.com"
              maxLength={150}
              disabled={isSubmitting}
              required={false}
              type="email"
              onChange={(value) =>
                setModal((prev) => ({ ...prev, form: { ...prev.form, email: value } }))
              }
            />
          </div>

          <h3 className="text-sm font-circular-bold text-[var(--color-text)]">
            Ubicacion - opcional, para guia de remision
          </h3>

          <InputField
            id="client-address"
            label="Direccion"
            value={modal.form.direccion}
            placeholder="Av. Principal 123"
            maxLength={255}
            disabled={isSubmitting}
            required={false}
            onChange={(value) =>
              setModal((prev) => ({ ...prev, form: { ...prev.form, direccion: value } }))
            }
          />

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

          <Select
            options={[
              { label: "Activo", value: "activo" },
              { label: "Inactivo", value: "inactivo" },
            ]}
            value={modal.form.estado}
            onChange={(value) =>
              setModal((prev) => ({ ...prev, form: { ...prev.form, estado: value as ClientStatus, } }))
            }
            placeholder="Seleccionar estado"
            label="Estado"
          />

          <div className="rounded-[16px] bg-[var(--color-input-bg)] p-3">
            <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              Vista previa
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <UserIcon size={25} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--color-text)]">
                  {previewName(modal.form)}
                </p>
                <p className="truncate text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                  {documentConfig[modal.form.tipoDocumento].label}{" "}
                  {modal.form.numeroDocumento || "sin numero"}
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
              disabled={isSubmitting || isSearchingDocument}
              className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isSearchingDocument}
              className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
            >
              {isSubmitting
                ? "Guardando..."
                : modal.editing
                  ? "Guardar"
                  : "Crear cliente"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={modal.delete !== null}
        onClose={() => setModal((prev) => ({ ...prev, delete: null }))}
        onConfirm={() => void confirmDelete()}
        title="Eliminar cliente"
        description="Seguro que deseas eliminar este cliente? Se marcara como inactivo."
        itemName={modal.delete?.displayName}
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

function InfoLine({
  icon,
  value,
  fallback,
}: {
  icon: React.ReactNode;
  value?: string | null;
  fallback: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[var(--color-muted-foreground)]">
        {icon}
      </span>
      <span className="truncate text-xs font-circular-regular text-[var(--color-text)]">
        {value || fallback}
      </span>
    </div>
  );
}

function QuickContactButtons({ client }: { client: Client }) {
  const whatsappNumber = client.telefono?.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/51${whatsappNumber}` : "";
  const emailUrl = client.email
    ? `mailto:${client.email}?subject=${encodeURIComponent(
        `Contacto Nobitex - ${client.displayName}`,
      )}`
    : "";

  return (
    <div className="flex items-center gap-2">
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] transition-colors hover:bg-[#20bd5a] hover:shadow-[0_4px_12px_rgba(37,211,102,0.35)]"
          aria-label={`Enviar WhatsApp a ${client.displayName}`}
          title="WhatsApp"
        >
          <Image
            src="/svg/redes-sociales/whatsapp.svg"
            width={18}
            height={18}
            alt="WhatsApp"
          />
        </a>
      ) : (
        <span
          className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-[var(--color-input-bg)] opacity-45"
          title="Sin telefono"
          aria-label="Sin telefono"
        >
          <Image
            src="/svg/redes-sociales/whatsapp.svg"
            width={18}
            height={18}
            alt="WhatsApp"
          />
        </span>
      )}

      {emailUrl ? (
        <a
          href={emailUrl}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6B75A] transition-colors hover:bg-[#EAA12F] hover:shadow-[0_4px_12px_rgba(246,183,90,0.35)]"
          aria-label={`Enviar correo a ${client.displayName}`}
          title="Correo"
        >
          <Image
            src="/svg/redes-sociales/email.svg"
            width={18}
            height={18}
            alt="Email"
          />
        </a>
      ) : (
        <span
          className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-[var(--color-input-bg)] opacity-45"
          title="Sin email"
          aria-label="Sin email"
        >
          <Image
            src="/svg/redes-sociales/email.svg"
            width={18}
            height={18}
            alt="Email"
          />
        </span>
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
              `${item.label} ${item.distrito} ${item.provincia} ${item.departamento}`,
            ).includes(normalizedSearch),
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

  return (
    <div ref={containerRef} className="relative">
      <p className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        Ubigeo / distrito
      </p>
      <button
        type="button"
        onClick={() => {
          setSearch("");
          setIsOpen((current) => !current);
        }}
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
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
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
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-button-hover)]",
                    value === item.ubigeo &&
                      "bg-[var(--color-primary)] text-white",
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
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
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

function DocumentInputField({
  id,
  label,
  documentType,
  value,
  placeholder,
  maxLength,
  disabled,
  isSearching,
  onChange,
  onSearch,
}: {
  id: string;
  label: string;
  documentType: Exclude<ClientDocumentType, "sin_documento">;
  value: string;
  placeholder: string;
  maxLength: number;
  disabled: boolean;
  isSearching: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
}) {
  const documentLabel = documentConfig[documentType].label;
  const canSearch = value.trim().length === maxLength && !disabled;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
        {label}
      </label>
      <div className="flex min-w-0 gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          required
          disabled={disabled}
          className="h-11 min-w-0 flex-1 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={onSearch}
          disabled={!canSearch}
          title={`Buscar ${documentLabel}`}
          aria-label={`Buscar ${documentLabel}`}
          className="h-11 w-11 rounded-[16px] border-transparent bg-[var(--color-input-bg)] text-[var(--color-primary)] hover:bg-[var(--color-button-hover)]"
        >
          <MagnifyingGlassIcon
            size={18}
            weight="bold"
            className={cn(isSearching && "animate-spin")}
          />
        </Button>
      </div>
    </div>
  );
}

function buildPayload(form: ClientForm) {
  const tipoDocumento = form.tipoDocumento;
  const numeroDocumento =
    tipoDocumento === "sin_documento"
      ? null
      : form.numeroDocumento.trim() || null;

  return {
    tipoDocumento,
    numeroDocumento,
    nombre: form.nombre.trim() || null,
    razonSocial: form.razonSocial.trim() || null,
    telefono: form.telefono.trim() || null,
    email: form.email.trim() || null,
    direccion: form.direccion.trim() || null,
    ubigeo: form.ubigeo.trim() || null,
    distrito: form.distrito.trim() || null,
    estado: form.estado,
  };
}

function validateForm(payload: ReturnType<typeof buildPayload>) {
  if (payload.tipoDocumento === "dni") {
    if (!payload.numeroDocumento || !/^\d{8}$/.test(payload.numeroDocumento)) {
      return "El DNI debe tener 8 digitos.";
    }

    if (!payload.nombre) {
      return "Ingresa el nombre del cliente.";
    }
  }

  if (payload.tipoDocumento === "ruc") {
    if (!payload.numeroDocumento || !/^\d{11}$/.test(payload.numeroDocumento)) {
      return "El RUC debe tener 11 digitos.";
    }

    if (!payload.razonSocial) {
      return "Ingresa la razon social.";
    }
  }

  if (
    payload.tipoDocumento === "sin_documento" &&
    !payload.nombre &&
    !payload.razonSocial
  ) {
    return "Ingresa un nombre o razon social.";
  }

  return "";
}

function previewName(form: ClientForm) {
  return (
    form.razonSocial.trim() ||
    form.nombre.trim() ||
    (form.tipoDocumento === "ruc" ? "Razon social" : "Nombre del cliente")
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  clientsApi,
  type Client,
  type ClientDocumentType,
  type ClientStatus,
} from "@/lib/api/clients";
import peruUbigeos from "@/lib/data/peru-ubigeos.json";
import { cn } from "@/lib/utils";

const documentConfig = {
  dni: { label: "DNI" },
  ruc: { label: "RUC" },
  sin_documento: { label: "Sin documento" },
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

function clientToForm(client?: Client | null) {
  if (!client) return defaultForm;

  return {
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
  };
}

type ClientForm = typeof defaultForm;
type PeruUbigeo = {
  ubigeo: string;
  distrito: string;
  provincia: string;
  departamento: string;
  label: string;
};

const ubigeos = peruUbigeos as PeruUbigeo[];

type ClientCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
  client?: Client | null;
};

export function ClientCreateModal({
  isOpen,
  onClose,
  onCreated,
  client,
}: ClientCreateModalProps) {
  const { showToast } = useSystemToast();
  const [form, setForm] = useState<ClientForm>(() => clientToForm(client));
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingDocument, setIsSearchingDocument] = useState(false);

  const closeModal = () => {
    if (isSubmitting || isSearchingDocument) return;
    setForm(clientToForm(client));
    setFormError("");
    onClose();
  };

  const handleSearchDocument = async () => {
    const numeroDocumento = form.numeroDocumento.trim();
    const documentLabel = documentConfig[form.tipoDocumento].label;
    const expectedLength = form.tipoDocumento === "dni" ? 8 : 11;

    if (
      form.tipoDocumento === "sin_documento" ||
      numeroDocumento.length !== expectedLength
    ) {
      setFormError(`El ${documentLabel} debe tener ${expectedLength} digitos.`);
      return;
    }

    setFormError("");
    setIsSearchingDocument(true);

    try {
      if (form.tipoDocumento === "dni") {
        const response = await clientsApi.consultarDni(numeroDocumento);
        const nombre = [
          response.nombres,
          response.apellidoPaterno,
          response.apellidoMaterno,
        ]
          .filter(Boolean)
          .join(" ");

        setForm((currentForm) =>
          currentForm.tipoDocumento === "dni" &&
          currentForm.numeroDocumento === numeroDocumento
            ? { ...currentForm, nombre }
            : currentForm,
        );
      }

      if (form.tipoDocumento === "ruc") {
        const response = await clientsApi.consultarRuc(numeroDocumento);

        setForm((currentForm) =>
          currentForm.tipoDocumento === "ruc" &&
          currentForm.numeroDocumento === numeroDocumento
            ? {
                ...currentForm,
                razonSocial: response.razonSocial ?? currentForm.razonSocial,
                direccion: response.direccion ?? currentForm.direccion,
                ubigeo: response.ubigeo ?? currentForm.ubigeo,
                distrito: response.distrito ?? currentForm.distrito,
              }
            : currentForm,
        );
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
      setFormError(message);
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
    setFormError("");

    const payload = buildPayload(form);
    const validationError = validateForm(payload);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const savedClient = client
        ? await clientsApi.update(client.id, payload)
        : await clientsApi.create(payload);
      showToast({
        title: client ? "Cliente actualizado" : "Cliente creado",
        description: `${savedClient.displayName} quedo seleccionado.`,
        variant: "success",
      });
      onCreated(savedClient);
      setForm(defaultForm);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el cliente.";
      setFormError(message);
      showToast({
        title: "No se pudo guardar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={client ? "Editar cliente" : "Nuevo cliente"}
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
            value={form.tipoDocumento}
            onChange={(value) => {
              setFormError("");
              setForm((currentForm) => ({
                ...currentForm,
                tipoDocumento: value as ClientDocumentType,
                numeroDocumento:
                  value === "sin_documento" ? "" : currentForm.numeroDocumento,
              }));
            }}
            placeholder="Seleccionar documento"
            label="Tipo de documento"
            required
          />

          {form.tipoDocumento !== "sin_documento" ? (
            <DocumentInputField
              id="quick-client-document"
              label="Numero de documento"
              documentType={form.tipoDocumento}
              value={form.numeroDocumento}
              placeholder={form.tipoDocumento === "dni" ? "12345678" : "20601234567"}
              maxLength={form.tipoDocumento === "dni" ? 8 : 11}
              disabled={isSubmitting || isSearchingDocument}
              isSearching={isSearchingDocument}
              onChange={(value) => {
                setFormError("");
                setForm((currentForm) => ({
                  ...currentForm,
                  numeroDocumento: value.replace(/\D/g, ""),
                }));
              }}
              onSearch={() => void handleSearchDocument()}
            />
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {form.tipoDocumento === "ruc" ? (
          <InputField
            id="quick-client-business-name"
            label="Razon social"
            value={form.razonSocial}
            placeholder="Textiles Demo SAC"
            maxLength={200}
            disabled={isSubmitting}
            onChange={(value) =>
              setForm((currentForm) => ({ ...currentForm, razonSocial: value }))
            }
          />
        ) : (
          <InputField
            id="quick-client-name"
            label="Nombre"
            value={form.nombre}
            placeholder="Juan Perez"
            maxLength={150}
            disabled={isSubmitting}
            onChange={(value) =>
              setForm((currentForm) => ({ ...currentForm, nombre: value }))
            }
          />
        )}

        {form.tipoDocumento === "ruc" ? (
          <InputField
            id="quick-client-contact-name"
            label="Contacto"
            value={form.nombre}
            placeholder="Nombre de contacto"
            maxLength={150}
            disabled={isSubmitting}
            required={false}
            onChange={(value) =>
              setForm((currentForm) => ({ ...currentForm, nombre: value }))
            }
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="quick-client-phone"
            label="Telefono"
            value={form.telefono}
            placeholder="999888777"
            maxLength={30}
            disabled={isSubmitting}
            required={false}
            onChange={(value) =>
              setForm((currentForm) => ({ ...currentForm, telefono: value }))
            }
          />
          <InputField
            id="quick-client-email"
            label="Email"
            value={form.email}
            placeholder="cliente@email.com"
            maxLength={150}
            disabled={isSubmitting}
            required={false}
            type="email"
            onChange={(value) =>
              setForm((currentForm) => ({ ...currentForm, email: value }))
            }
          />
        </div>

        <h3 className="text-sm font-circular-bold text-[var(--color-text)]">
          Ubicacion - opcional, para guia de remision
        </h3>

        <InputField
          id="quick-client-address"
          label="Direccion"
          value={form.direccion}
          placeholder="Av. Principal 123"
          maxLength={255}
          disabled={isSubmitting}
          required={false}
          onChange={(value) =>
            setForm((currentForm) => ({ ...currentForm, direccion: value }))
          }
        />

        <UbigeoSelect
          value={form.ubigeo}
          disabled={isSubmitting}
          onSelect={(item) =>
            setForm((currentForm) => ({
              ...currentForm,
              ubigeo: item.ubigeo,
              distrito: item.distrito,
            }))
          }
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
                {previewName(form)}
              </p>
              <p className="truncate text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                {documentConfig[form.tipoDocumento].label}{" "}
                {form.numeroDocumento || "sin numero"}
              </p>
            </div>
          </div>
        </div>

        {formError ? (
          <p className="text-sm font-circular-regular text-[#d9480f]">
            {formError}
          </p>
        ) : null}

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
            {isSubmitting ? "Guardando..." : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Modal>
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
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

      {isOpen ? (
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
      ) : null}
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
            className={cn(isSearchingDocumentClass(isSearching))}
          />
        </Button>
      </div>
    </div>
  );
}

function isSearchingDocumentClass(isSearching: boolean) {
  return isSearching ? "animate-spin" : "";
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

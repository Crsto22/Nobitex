"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  InfoIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  SpinnerGapIcon,
  TruckIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  salesApi,
  type ShalomOrigin,
  type ShalomPackageType,
  type VentaResponse,
} from "@/lib/api/sales";
import { securityKeyIssue } from "@/lib/shalom/security-key";
import { cn } from "@/lib/utils";

const PACKAGE_OPTIONS: Array<{
  type: ShalomPackageType;
  label: string;
  detail: string;
}> = [
  { type: "SOBRE", label: "Sobre", detail: "Documento A4" },
  { type: "PAQUETE XXS", label: "XXS", detail: "15×10×10 cm · 250 g" },
  { type: "PAQUETE XS", label: "XS", detail: "20×15×12 cm · 500 g" },
  { type: "PAQUETE S", label: "S", detail: "20×13×12 cm · 2 kg" },
  { type: "PAQUETE M", label: "M", detail: "24×30×20 cm · 5 kg" },
  { type: "PAQUETE L", label: "L", detail: "42×30×23 cm · 10 kg" },
];

type ShalomRegisterModalProps = {
  isOpen: boolean;
  sale: VentaResponse | null;
  defaultPackageType?: ShalomPackageType;
  onClose: () => void;
  /** Se dispara cuando el job quedo encolado (o ya estaba registrado). */
  onRegistered: (publicId: string) => void;
  /** Despacha la venta sin generar guia de Shalom. */
  onShipWithoutShalom?: () => void;
};

export function ShalomRegisterModal({
  isOpen,
  sale,
  defaultPackageType = "PAQUETE S",
  onClose,
  onRegistered,
  onShipWithoutShalom,
}: ShalomRegisterModalProps) {
  const toast = useSystemToast();
  const [securityKey, setSecurityKey] = useState("");
  const [packageType, setPackageType] = useState<ShalomPackageType>(
    defaultPackageType,
  );
  const [documentType, setDocumentType] = useState<"DNI" | "CE">("DNI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [extraSecurity, setExtraSecurity] = useState(false);
  const [cashOnDelivery, setCashOnDelivery] = useState(false);
  const [names, setNames] = useState("");
  const [paternal, setPaternal] = useState("");
  const [maternal, setMaternal] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("");
  const [originPickerOpen, setOriginPickerOpen] = useState(false);
  const [originQuery, setOriginQuery] = useState("");
  const [debouncedOriginQuery, setDebouncedOriginQuery] = useState("");
  const [origins, setOrigins] = useState<ShalomOrigin[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingOrigins, setIsLoadingOrigins] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const needsOrigin = Boolean(isOpen) && (!origin || originPickerOpen);
  const keyIssue = securityKey ? securityKeyIssue(securityKey) : null;

  useEffect(() => {
    if (!isOpen) return;
    const nameParts = splitFullName(sale?.envio?.nombreCompleto ?? "");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecurityKey("");
    setPackageType(defaultPackageType);
    setDocumentType(sale?.envio?.tipoDocumento ?? "DNI");
    setDocumentNumber(sale?.envio?.dni ?? "");
    setExtraSecurity(false);
    setCashOnDelivery(false);
    setNames(nameParts.names);
    setPaternal(nameParts.paternal);
    setMaternal(nameParts.maternal);
    setPhone(sale?.envio?.celular ?? "");
    setOrigin("");
    setOriginPickerOpen(false);
    setOriginQuery("");
    setDebouncedOriginQuery("");
    setIsLoadingSettings(true);

    salesApi
      .getShalomExportSettings()
      .then((response) => {
        if (!isOpen) return;
        setOrigin(response?.origen ?? "");
      })
      .catch(() => {
        if (!isOpen) return;
      })
      .finally(() => {
        if (isOpen) setIsLoadingSettings(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale?.publicId]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedOriginQuery(originQuery.trim()),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [originQuery]);

  useEffect(() => {
    if (!isOpen || !needsOrigin) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingOrigins(true);

    salesApi
      .getShalomExportOrigins({
        page: 1,
        limit: 12,
        search: debouncedOriginQuery || undefined,
      })
      .then((response) => {
        if (active) setOrigins(response.data ?? []);
      })
      .catch(() => {
        if (active) setOrigins([]);
      })
      .finally(() => {
        if (active) setIsLoadingOrigins(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, needsOrigin, debouncedOriginQuery]);

  const generatePin = () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      const candidate = String(1000 + (buffer[0] % 9000));
      if (!securityKeyIssue(candidate)) {
        setSecurityKey(candidate);
        return;
      }
    }
  };

  const submit = async () => {
    if (!sale || isSaving) return;

    const issue = securityKeyIssue(securityKey);
    if (issue) {
      toast.showToast({
        title: "Clave de seguridad inválida",
        description: issue,
        variant: "error",
      });
      return;
    }

    if (!/^\d{6,12}$/.test(documentNumber.trim())) {
      toast.showToast({
        title: "Documento inválido",
        description: "Ingresa un DNI o CE de 6 a 12 dígitos.",
        variant: "error",
      });
      return;
    }

    if (!names.trim() || !paternal.trim() || !maternal.trim()) {
      toast.showToast({
        title: "Completa el destinatario",
        description:
          "Shalom exige nombres y ambos apellidos cuando no reconoce el documento.",
        variant: "error",
      });
      return;
    }

    if (!origin.trim()) {
      toast.showToast({
        title: "Falta la agencia de origen",
        description: "Selecciona desde qué agencia de Shalom sale el envío.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await salesApi.registerShalom(sale.publicId, {
        securityKey,
        packageType,
        extraSecurity,
        cashOnDelivery,
        documentType,
        recipientDocument: documentNumber.trim(),
        recipientName: names.trim() || undefined,
        recipientPaternalLastName: paternal.trim() || undefined,
        recipientMaternalLastName: maternal.trim() || undefined,
        recipientPhone: phone.replace(/\D/g, "") || undefined,
        originAgency: origin.trim() || undefined,
      });

      toast.showToast({
        title: response.alreadyRegistered
          ? "Esta venta ya estaba en Shalom"
          : "Registro enviado a Shalom",
        description: response.alreadyRegistered
          ? `Orden ${response.orden ?? ""}`.trim()
          : "Shalom está procesando el registro. La fila se actualizará sola.",
        variant: response.alreadyRegistered ? "info" : "success",
      });

      onRegistered(sale.publicId);
      onClose();
    } catch (error) {
      toast.showToast({
        title: "No se pudo registrar en Shalom",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const originSelector = (
    <div className="rounded-[14px] bg-[var(--color-input-bg)] p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
          Origen
        </span>
        {origin && !needsOrigin ? (
          <button
            type="button"
            onClick={() => setOriginPickerOpen(true)}
            className="text-[11px] font-circular-bold text-[var(--color-primary)]"
          >
            Cambiar
          </button>
        ) : null}
      </div>

      {isLoadingSettings ? (
        <div className="flex items-center gap-2 rounded-[12px] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
          <SpinnerGapIcon size={14} className="animate-spin" />
          Revisando la agencia de origen…
        </div>
      ) : needsOrigin ? (
        <>
          <div className="relative">
            <MagnifyingGlassIcon
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={originQuery}
              onChange={(event) => setOriginQuery(event.target.value)}
              placeholder="Busca por código, agencia o distrito…"
              aria-label="Buscar agencia de origen"
              className="h-11 w-full rounded-[14px] bg-[var(--color-card)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {isLoadingOrigins ? (
              <div className="flex items-center justify-center gap-2 rounded-[12px] border border-dashed border-[var(--color-border)] px-3 py-4 text-xs text-[var(--color-muted-foreground)]">
                <SpinnerGapIcon size={15} className="animate-spin" />
                Buscando agencias…
              </div>
            ) : origins.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
                No encontramos agencias para esta búsqueda.
              </div>
            ) : (
              origins.map((item) => {
                const active = origin === item.nombre;
                return (
                  <button
                    key={item.externalId}
                    type="button"
                    onClick={() => {
                      setOrigin(item.nombre);
                      setOriginPickerOpen(false);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-[var(--color-primary)]/10"
                        : "bg-[var(--color-sidebar-bg)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    <MapPinIcon
                      size={16}
                      weight="fill"
                      className={cn(
                        "shrink-0",
                        active ? "text-[var(--color-primary)]" : "text-[#dc2626]",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          active
                            ? "font-circular-bold text-[var(--color-primary)]"
                            : "text-[var(--color-text)]",
                        )}
                      >
                        {item.nombre}
                      </span>
                      {item.departamento || item.provincia ? (
                        <span className="block truncate text-[10px] text-[var(--color-muted-foreground)]">
                          {[item.departamento, item.provincia, item.distrito]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    {active ? (
                      <CheckCircleIcon
                        size={17}
                        weight="fill"
                        className="shrink-0 text-[#059669]"
                      />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          {origin ? (
            <button
              type="button"
              onClick={() => setOriginPickerOpen(false)}
              className="mt-2 text-[11px] font-circular-bold text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]"
            >
              Mantener {origin}
            </button>
          ) : null}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <MapPinIcon size={16} weight="fill" className="shrink-0 text-[#dc2626]" />
          <span className="min-w-0 flex-1 truncate text-sm font-circular-bold text-[var(--color-text)]">
            {origin}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar en Shalom"
      description={sale ? `${sale.correlativo} · ${customerNameOf(sale)}` : undefined}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          {originSelector}
          <div className="hidden shrink-0 items-center justify-center gap-1 md:flex">
            <span className="size-2 rounded-full border-2 border-[#dc2626]" />
            <span className="h-0 w-5 border-t-2 border-dashed border-[#dc2626]/40" />
            <TruckIcon size={18} weight="fill" className="text-[#dc2626]" />
            <span className="h-0 w-5 border-t-2 border-dashed border-[#dc2626]/40" />
            <span className="size-2 rounded-full bg-[#dc2626]" />
          </div>
          <div className="flex items-start gap-2 rounded-[14px] bg-[var(--color-input-bg)] p-3">
            <MapPinIcon
              size={16}
              weight="fill"
              className="mt-0.5 shrink-0 text-[#dc2626]"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                Destino
              </p>
              <p
                className="truncate text-sm font-circular-bold text-[var(--color-text)]"
                title={sale?.envio?.agenciaNombre ?? undefined}
              >
                {sale?.envio?.agenciaNombre ?? "Agencia seleccionada"}
              </p>
              <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                {[
                  sale?.envio?.agenciaDistrito,
                  sale?.envio?.agenciaProvincia,
                  sale?.envio?.agenciaDepartamento,
                ]
                  .filter(Boolean)
                  .join(" · ") || "La eligió el cliente en el enlace de envío"}
              </p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-[var(--color-card)] px-2 py-1 text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
              Aéreo según destino
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
        <div>
          <span className="mb-2 block text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Destinatario
          </span>
          <div className="grid gap-3">
            <label className="min-w-0">
              <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                Documento
              </span>
              <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                <select
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value as "DNI" | "CE")
                  }
                  aria-label="Tipo de documento"
                  className="h-11 shrink-0 bg-transparent text-sm font-circular-bold text-[var(--color-input-text)] outline-none"
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                </select>
                <input
                  value={documentNumber}
                  onChange={(event) =>
                    setDocumentNumber(
                      event.target.value.replace(/\D/g, "").slice(0, 12),
                    )
                  }
                  inputMode="numeric"
                  placeholder="Número de documento"
                  aria-label="Número de documento del destinatario"
                  className="h-11 w-full bg-transparent text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)]"
                />
              </div>
            </label>
            <TextField
              label="Nombres"
              value={names}
              onChange={setNames}
              placeholder="Nombres del destinatario"
            />
            <TextField
              label="Apellido paterno"
              value={paternal}
              onChange={setPaternal}
              placeholder="Apellido paterno"
            />
            <TextField
              label="Apellido materno"
              value={maternal}
              onChange={setMaternal}
              placeholder="Apellido materno"
            />
            <TextField
              label="Celular"
              value={phone}
              onChange={(value) => setPhone(value.replace(/[^\d\s+]/g, ""))}
              placeholder="Opcional"
            />
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-[var(--color-muted-foreground)]">
            <InfoIcon size={13} className="mt-0.5 shrink-0" />
            Corrige el documento si la venta lo tiene mal. Nombres y ambos
            apellidos son obligatorios cuando Shalom no reconoce el documento.
          </p>
        </div>
          </div>

          <div className="space-y-4">
        <div>
          <span className="mb-2 block text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Tamaño del paquete
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PACKAGE_OPTIONS.map((option) => {
              const active = packageType === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setPackageType(option.type)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-[14px] border-2 px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-xs font-circular-bold",
                        active
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-text)]",
                      )}
                    >
                      {option.label}
                    </span>
                    {active ? (
                      <CheckCircleIcon
                        size={15}
                        weight="fill"
                        className="shrink-0 text-[#059669]"
                      />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] leading-tight text-[var(--color-muted-foreground)]">
                    {option.detail}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Clave de retiro del cliente
          </span>
          <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
            <KeyIcon
              size={16}
              className="shrink-0 text-[var(--color-muted-foreground)]"
            />
            <input
              value={securityKey}
              onChange={(event) =>
                setSecurityKey(event.target.value.replace(/\D/g, "").slice(0, 4))
              }
              inputMode="numeric"
              autoComplete="off"
              placeholder="4 dígitos"
              aria-label="Clave de retiro de Shalom"
              className="h-11 w-full bg-transparent text-sm tracking-[0.35em] text-[var(--color-input-text)] outline-none placeholder:tracking-normal placeholder:text-[var(--color-placeholder)]"
            />
            <button
              type="button"
              onClick={generatePin}
              className="shrink-0 rounded-full bg-[var(--color-card)] px-3 py-1.5 text-[11px] font-circular-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              Generar PIN
            </button>
          </div>
          <span className="mt-1 block text-[10px] leading-4 text-[var(--color-muted-foreground)]">
            {keyIssue ?? "La define el vendedor. Shalom rechaza 1234 y 1111."}
          </span>
        </div>

        <div className="grid gap-2">
          <ToggleOption
            label="Sobreprotegido"
            description="Servicio adicional de Shalom"
            active={extraSecurity}
            onToggle={() => setExtraSecurity((current) => !current)}
          />
          <ToggleOption
            label="Cobro seguro"
            description="Shalom cobra al destinatario al entregar"
            active={cashOnDelivery}
            onToggle={() => setCashOnDelivery((current) => !current)}
          />
        </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSaving || isLoadingSettings}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <SpinnerGapIcon size={17} className="animate-spin" />
            ) : null}
            Registrar en Shalom
          </button>
        </div>

        {onShipWithoutShalom ? (
          <button
            type="button"
            onClick={onShipWithoutShalom}
            disabled={isSaving}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] text-xs font-circular-bold text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
          >
            <TruckIcon size={16} weight="bold" />
            Enviar sin registrar en Shalom
          </button>
        ) : null}
      </div>
    </Modal>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)]"
      />
    </label>
  );
}

function ToggleOption({
  label,
  description,
  active,
  onToggle,
}: {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-between gap-3 rounded-[14px] border-2 px-3 py-2.5 text-left transition-colors",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40",
      )}
    >
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-xs font-circular-bold",
            active
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text)]",
          )}
        >
          {label}
        </span>
        <span className="block truncate text-[10px] text-[var(--color-muted-foreground)]">
          {description}
        </span>
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          active ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition-all",
            active ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function customerNameOf(sale: VentaResponse) {
  return sale.envio?.nombreCompleto?.trim() || sale.cliente?.nombre || "Cliente";
}

/** Reparte "Juan Pérez Gómez" en nombres y apellidos editables. */
function splitFullName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { names: parts[0] ?? "", paternal: "", maternal: "" };
  }
  if (parts.length === 2) {
    // Ambiguo: "Cristhofer Leonardo" suele ser nombre + segundo nombre.
    return { names: parts.join(" "), paternal: "", maternal: "" };
  }
  if (parts.length === 3) {
    return {
      names: parts[0] ?? "",
      paternal: parts[1] ?? "",
      maternal: parts[2] ?? "",
    };
  }

  return {
    names: parts.slice(0, 2).join(" "),
    paternal: parts[2] ?? "",
    maternal: parts.slice(3).join(" "),
  };
}

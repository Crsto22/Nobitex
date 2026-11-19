"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  InfoIcon,
  KeyIcon,
  PackageIcon,
  ShieldCheckIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  shalomProApi,
  type ShalomProConnectionStatus,
  type ShalomProStatus,
} from "@/lib/api/shalom-pro";

const PACKAGE_TYPES = [
  "SOBRE",
  "PAQUETE XXS",
  "PAQUETE XS",
  "PAQUETE S",
  "PAQUETE M",
  "PAQUETE L",
];

const STATUS_UI: Record<
  ShalomProConnectionStatus,
  { label: string; className: string }
> = {
  SIN_CONECTAR: {
    label: "Sin conectar",
    className: "bg-amber-500/10 text-amber-600",
  },
  PENDING: {
    label: "Conectando",
    className: "bg-sky-500/10 text-sky-600",
  },
  ACTIVE: {
    label: "Conectado",
    className: "bg-[#059669]/10 text-[#047857]",
  },
  ERROR: {
    label: "Requiere atención",
    className: "bg-[#dc2626]/10 text-[#dc2626]",
  },
};

export default function ShalomProPage() {
  const toast = useSystemToast();
  const [status, setStatus] = useState<ShalomProStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [packageType, setPackageType] = useState("PAQUETE S");

  const loadStatus = useCallback(async () => {
    try {
      const data = await shalomProApi.status();
      setStatus(data);
      if (data.defaultPackageType) setPackageType(data.defaultPackageType);
    } catch (error) {
      toast.showToast({
        title: "No se pudo consultar Shalom PRO",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatus();
  }, [loadStatus]);

  const connect = async () => {
    if (isSaving) return;

    if (!email.trim() || !password) {
      toast.showToast({
        title: "Completa los datos",
        description: "Ingresa el correo y la contraseña de Shalom PRO.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await shalomProApi.provision({
        username: email.trim(),
        password,
        packageType,
      });
      setStatus(result);
      setPassword("");
      toast.showToast({
        title: result.valid ? "Shalom PRO conectado" : "Revisa las credenciales",
        description:
          result.message ??
          (result.valid
            ? "La cuenta quedó vinculada y la sesión está activa."
            : "Shalom rechazó el acceso."),
        variant: result.valid ? "success" : "error",
      });
    } catch (error) {
      toast.showToast({
        title: "No se pudo conectar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const validate = async () => {
    if (isValidating) return;
    setIsValidating(true);
    try {
      const result = await shalomProApi.validate();
      setStatus(result);
      toast.showToast({
        title: result.valid ? "Credenciales válidas" : "Credenciales rechazadas",
        description: result.message ?? undefined,
        variant: result.valid ? "success" : "error",
      });
    } catch (error) {
      toast.showToast({
        title: "No se pudo validar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const ui = STATUS_UI[status?.status ?? "SIN_CONECTAR"];
  const connected = status?.connected ?? false;

  return (
    <DashboardShell
      headerTitle="Shalom PRO"
      headerParent={{ label: "Gestión de Envíos", href: "/entregas-pendientes" }}
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e11d2e]/10 text-[#e11d2e]">
            <ShieldCheckIcon size={24} weight="fill" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-circular-bold text-[var(--color-text)]">
              Cuenta de Shalom PRO de la empresa
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              Conecta la cuenta de Shalom PRO para registrar envíos desde Nuvex. La contraseña se
              guarda cifrada en el servicio de Shalom; Nuvex no la almacena.
            </p>
          </div>
          <span className="ml-auto shrink-0">
            {isLoading ? (
              <span className="flex items-center gap-2 rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                <SpinnerGapIcon size={14} className="animate-spin" />
                Cargando
              </span>
            ) : (
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-circular-bold ${ui.className}`}
              >
                {ui.label}
              </span>
            )}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
            <h3 className="text-xs font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Credenciales
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Correo de Shalom
                </span>
                <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                  <EnvelopeSimpleIcon size={16} className="text-[var(--color-muted-foreground)]" />
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="cuenta@empresa.com"
                    className="h-11 w-full bg-transparent text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)]"
                  />
                </div>
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Contraseña
                </span>
                <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                  <KeyIcon size={16} className="text-[var(--color-muted-foreground)]" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={connected ? "Escribe la nueva contraseña" : "••••••••"}
                    className="h-11 w-full bg-transparent text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)]"
                  />
                </div>
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Paquete por defecto
                </span>
                <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                  <PackageIcon size={16} className="text-[var(--color-muted-foreground)]" />
                  <select
                    value={packageType}
                    onChange={(event) => setPackageType(event.target.value)}
                    className="h-11 w-full bg-transparent text-sm text-[var(--color-input-text)] outline-none"
                  >
                    {PACKAGE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Agencia de origen
                </span>
                <input
                  value="Se toma de Configuración → Envíos"
                  readOnly
                  className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-muted-foreground)] outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void connect()}
                disabled={isSaving || isLoading}
                className="flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <SpinnerGapIcon size={16} className="animate-spin" /> : null}
                {connected ? "Actualizar credenciales" : "Guardar y conectar"}
              </button>
              <button
                type="button"
                onClick={() => void validate()}
                disabled={!connected || isValidating || isLoading}
                className="flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-5 text-sm font-circular-bold text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isValidating ? <SpinnerGapIcon size={16} className="animate-spin" /> : null}
                Validar credenciales
              </button>
            </div>

            {status?.lastError ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#dc2626]/10 p-2 text-[11px] leading-4 text-[#b91c1c]">
                <WarningCircleIcon size={15} className="mt-0.5 shrink-0" />
                {status.lastError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <h3 className="text-xs font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Estado del servicio
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-[var(--color-muted-foreground)]">
                <li className="flex items-center gap-2">
                  {connected ? (
                    <CheckCircleIcon size={16} weight="fill" className="text-[#059669]" />
                  ) : (
                    <WarningCircleIcon size={16} className="text-amber-500" />
                  )}
                  {connected ? "Cuenta conectada" : "Cuenta sin conectar"}
                </li>
                <li className="flex items-center gap-2">
                  {status?.hasWebhook ? (
                    <CheckCircleIcon size={16} weight="fill" className="text-[#059669]" />
                  ) : (
                    <InfoIcon size={16} />
                  )}
                  {status?.hasWebhook ? "Webhook registrado" : "Webhook pendiente"}
                </li>
                {status?.valid !== undefined ? (
                  <li className="flex items-center gap-2">
                    {status.valid ? (
                      <CheckCircleIcon size={16} weight="fill" className="text-[#059669]" />
                    ) : (
                      <WarningCircleIcon size={16} className="text-[#dc2626]" />
                    )}
                    {status.valid ? "Login validado" : "Login no validado"}
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <h3 className="text-xs font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Cómo funciona
              </h3>
              <ol className="mt-3 space-y-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
                <li className="flex gap-2">
                  <span className="text-[var(--color-primary)]">1.</span>
                  Ingresa el correo y la contraseña de Shalom PRO.
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-primary)]">2.</span>
                  El servicio valida el acceso y guarda la sesión cifrada.
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-primary)]">3.</span>
                  En Entregas y envíos aparecerá el botón “Registrar en Shalom”.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

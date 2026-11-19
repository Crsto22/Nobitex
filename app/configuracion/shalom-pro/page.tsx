"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  EnvelopeSimpleIcon,
  KeyIcon,
  PackageIcon,
  SealCheckIcon,
  SpinnerGapIcon,
  UserCircleIcon,
  WarningCircleIcon,
  WebhooksLogoIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { shalomProApi, type ShalomProStatus } from "@/lib/api/shalom-pro";

const PACKAGE_TYPES = [
  "SOBRE",
  "PAQUETE XXS",
  "PAQUETE XS",
  "PAQUETE S",
  "PAQUETE M",
  "PAQUETE L",
];

type StatusTone = "ok" | "warn" | "error" | "muted";

const TONE: Record<StatusTone, { tile: string; color: string }> = {
  ok: { tile: "bg-[#10b981]/10", color: "text-[#10b981]" },
  warn: { tile: "bg-[#f59e0b]/10", color: "text-[#f59e0b]" },
  error: { tile: "bg-[#ef4444]/10", color: "text-[#ef4444]" },
  muted: { tile: "bg-[#64748b]/10", color: "text-[#64748b]" },
};

type StatusCard = {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number; weight?: "fill"; className?: string }>;
  tone: StatusTone;
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

  const connected = status?.connected ?? false;

  const statusCards: StatusCard[] = [
    {
      label: "Cuenta de Shalom",
      value: isLoading ? "Consultando" : connected ? "Conectada" : "Sin conectar",
      icon: connected ? SealCheckIcon : UserCircleIcon,
      tone: connected ? "ok" : "warn",
    },
    {
      label: "Webhook",
      value: isLoading ? "Consultando" : status?.hasWebhook ? "Registrado" : "Pendiente",
      icon: WebhooksLogoIcon,
      tone: status?.hasWebhook ? "ok" : "muted",
    },
    {
      label: "Sesión",
      value: isLoading
        ? "Consultando"
        : status?.valid === true
          ? "Validada"
          : status?.valid === false
            ? "Rechazada"
            : "Sin validar",
      icon:
        status?.valid === true
          ? SealCheckIcon
          : status?.valid === false
            ? WarningCircleIcon
            : KeyIcon,
      tone:
        status?.valid === true ? "ok" : status?.valid === false ? "error" : "muted",
    },
  ];

  return (
    <DashboardShell
      headerTitle="Shalom PRO"
      headerParent={{ label: "Gestión de Envíos", href: "/entregas-pendientes" }}
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {statusCards.map((card) => {
            const Icon = card.icon;
            const tone = TONE[card.tone];

            return (
              <div
                key={card.label}
                className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.tile}`}
                  >
                    <Icon size={22} weight="fill" className={tone.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-muted-foreground)]">
                      {card.label}
                    </p>
                    <p className="truncate text-xl leading-tight text-[var(--color-text)] font-circular-bold">
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl bg-[var(--color-card)] p-4 sm:p-5">
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
            <div className="rounded-2xl bg-[var(--color-card)] p-4">
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

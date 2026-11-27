"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PackageIcon,
  SealCheckIcon,
  SpinnerGapIcon,
  UserCircleIcon,
  WarningCircleIcon,
  WebhooksLogoIcon,
} from "@/lib/icons";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  salesApi,
  type ShalomExportSettings,
  type ShalomOrigin,
} from "@/lib/api/sales";
import { shalomProApi, type ShalomProStatus } from "@/lib/api/shalom-pro";
import { cn } from "@/lib/utils";

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
  const [isRepairingWebhook, setIsRepairingWebhook] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [packageType, setPackageType] = useState("PAQUETE S");
  const [exportSettings, setExportSettings] =
    useState<ShalomExportSettings | null>(null);
  const [origin, setOrigin] = useState("");
  const [originQuery, setOriginQuery] = useState("");
  const [debouncedOriginQuery, setDebouncedOriginQuery] = useState("");
  const [origins, setOrigins] = useState<ShalomOrigin[]>([]);
  const [isLoadingOrigins, setIsLoadingOrigins] = useState(false);
  const [isSavingOrigin, setIsSavingOrigin] = useState(false);

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

  useEffect(() => {
    let active = true;
    salesApi
      .getShalomExportSettings()
      .then((data) => {
        if (!active) return;
        setExportSettings(data);
        setOrigin(data?.origen ?? "");
      })
      .catch(() => {
        if (active) setExportSettings(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedOriginQuery(originQuery.trim()),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [originQuery]);

  useEffect(() => {
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
  }, [debouncedOriginQuery]);

  const repairWebhook = async () => {
    if (isRepairingWebhook) return;
    setIsRepairingWebhook(true);
    try {
      const result = await shalomProApi.repairWebhook();
      toast.showToast({
        title: result.registered ? "Webhook registrado" : "Sin cambios",
        description: result.message,
        variant: "success",
      });
      await loadStatus();
    } catch (error) {
      toast.showToast({
        title: "No se pudo registrar el webhook",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsRepairingWebhook(false);
    }
  };

  const chooseOrigin = async (nombre: string) => {    if (isSavingOrigin || nombre === origin) return;
    setIsSavingOrigin(true);
    try {
      const base: ShalomExportSettings = exportSettings ?? {
        origen: null,
        modo: "ninguno",
        mercaderia: null,
        alto: null,
        ancho: null,
        largo: null,
        peso: null,
      };
      const saved = await salesApi.updateShalomExportSettings({
        ...base,
        origen: nombre,
      });
      setExportSettings(saved);
      setOrigin(saved.origen ?? nombre);
      toast.showToast({
        title: "Agencia de origen guardada",
        description: nombre,
        variant: "success",
      });
    } catch (error) {
      toast.showToast({
        title: "No se pudo guardar la agencia",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSavingOrigin(false);
    }
  };

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
            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Agencia de origen
                </span>
                {origin ? (
                  <span className="max-w-[60%] truncate rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-circular-bold text-[var(--color-primary)]">
                    {origin}
                  </span>
                ) : null}
              </div>

              <div className="relative">
                <MagnifyingGlassIcon
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                />
                <input
                  value={originQuery}
                  onChange={(event) => setOriginQuery(event.target.value)}
                  placeholder="Busca por código, agencia o distrito…"
                  aria-label="Buscar agencia de origen de Shalom"
                  className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
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
                    const location = [
                      item.departamento,
                      item.provincia,
                      item.distrito,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <button
                        key={item.externalId}
                        type="button"
                        onClick={() => void chooseOrigin(item.nombre)}
                        aria-pressed={active}
                        disabled={isSavingOrigin}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left transition-colors disabled:opacity-60",
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
                            active
                              ? "text-[var(--color-primary)]"
                              : "text-[#dc2626]",
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
                          {location ? (
                            <span className="block truncate text-[10px] text-[var(--color-muted-foreground)]">
                              {location}
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
              {connected && !status?.hasWebhook ? (
                <button
                  type="button"
                  onClick={() => void repairWebhook()}
                  disabled={isRepairingWebhook || isLoading}
                  className="flex h-11 items-center gap-2 rounded-[14px] bg-[#f59e0b]/10 px-5 text-sm font-circular-bold text-[#b45309] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRepairingWebhook ? (
                    <SpinnerGapIcon size={16} className="animate-spin" />
                  ) : null}
                  Registrar webhook
                </button>
              ) : null}
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

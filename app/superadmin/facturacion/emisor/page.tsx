"use client";

import { NativeSelect } from "@/components/ui/select";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BuildingIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  FileTextIcon,
  IdentificationCardIcon,
  KeyIcon,
  MapPinIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  TagIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { formatDate } from "@/lib/intl";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformBillingApi,
  type PlatformIssuerConfig,
} from "@/lib/api/platform-billing";
import { cn } from "@/lib/utils";

type IssuerForm = {
  ruc: string;
  businessName: string;
  tradeName: string;
  address: string;
  ubigeo: string;
  environment: "BETA" | "PRODUCCION";
  solUser: string;
  solPassword: string;
  igvPercent: string;
  active: boolean;
};

const defaultForm: IssuerForm = {
  ruc: "",
  businessName: "",
  tradeName: "",
  address: "",
  ubigeo: "",
  environment: "BETA",
  solUser: "",
  solPassword: "",
  igvPercent: "18.00",
  active: false,
};

const maxCertificateSize = 2 * 1024 * 1024;

export default function PlatformIssuerPage() {
  const { showToast } = useSystemToast();
  const [config, setConfig] = useState<PlatformIssuerConfig | null>(null);
  const [form, setForm] = useState<IssuerForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await platformBillingApi.getIssuer();
      setConfig(data);
      setForm({
        ruc: data.ruc ?? "",
        businessName: data.businessName ?? "",
        tradeName: data.tradeName ?? "",
        address: data.address ?? "",
        ubigeo: data.ubigeo ?? "",
        environment: data.environment,
        solUser: "",
        solPassword: "",
        igvPercent: data.igvPercent,
        active: data.active,
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo cargar el emisor."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const ruc = form.ruc.trim();
    const businessName = form.businessName.trim();
    const address = form.address.trim();
    const ubigeo = form.ubigeo.trim();
    const igvPercent = Number(form.igvPercent);

    if (!/^\d{11}$/.test(ruc)) {
      setError("El RUC debe tener 11 digitos.");
      return;
    }
    if (!businessName) {
      setError("La razon social es obligatoria.");
      return;
    }
    if (!address) {
      setError("La direccion fiscal es obligatoria.");
      return;
    }
    if (!/^\d{6}$/.test(ubigeo)) {
      setError("El ubigeo debe tener 6 digitos.");
      return;
    }
    if (!Number.isFinite(igvPercent) || igvPercent < 0 || igvPercent > 100) {
      setError("El porcentaje de IGV debe estar entre 0 y 100.");
      return;
    }

    setSaving(true);
    try {
      const updated = await platformBillingApi.updateIssuer({
        ruc,
        businessName,
        tradeName: form.tradeName.trim(),
        address,
        ubigeo,
        environment: form.environment,
        solUser: form.solUser.trim() || undefined,
        solPassword: form.solPassword.trim() || undefined,
        igvPercent,
        active: form.active,
      });
      setConfig(updated);
      setForm((current) => ({
        ...current,
        solUser: "",
        solPassword: "",
      }));
      showToast({
        title: "Conexion SUNAT actualizada",
        description: "Los siguientes comprobantes usaran estos datos.",
        variant: "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "No se pudo guardar la configuracion SUNAT.",
      );
      setError(message);
      showToast({
        title: "No se pudo guardar",
        description: message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !config) {
    return (
      <DashboardShell headerTitle="Configuracion del emisor">
        <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 sm:gap-4 sm:p-4 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[76px] animate-pulse rounded-[14px] bg-[var(--color-card)]"
              />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="h-[520px] animate-pulse rounded-[14px] bg-[var(--color-card)]" />
            <div className="h-[420px] animate-pulse rounded-[14px] bg-[var(--color-card)]" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell headerTitle="Configuracion del emisor">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatusTile
            icon={<ShieldCheckIcon size={22} weight="fill" />}
            label="Facturacion electronica"
            value={form.active ? "Activa" : "Inactiva"}
            ok={form.active}
          />
          <StatusTile
            icon={<KeyIcon size={22} weight="fill" />}
            label="Credenciales SOL"
            value={
              config?.solUserConfigured && config.solPasswordConfigured
                ? "Configuradas"
                : "Pendientes"
            }
            ok={
              Boolean(config?.solUserConfigured) &&
              Boolean(config?.solPasswordConfigured)
            }
          />
          <StatusTile
            icon={<FileTextIcon size={22} weight="fill" />}
            label="Certificado digital"
            value={config?.certificate ? "Subido" : "Pendiente"}
            ok={Boolean(config?.certificate)}
          />
        </section>

        <form className="space-y-4" onSubmit={submit}>
          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4 p-1 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Emisor Nuvex
                  </h2>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Datos fiscales y acceso usados para emitir comprobantes de la
                    plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      active: !current.active,
                    }))
                  }
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-[12px] px-4 text-xs font-circular-bold transition-colors",
                    form.active
                      ? "bg-[#10b981] text-white"
                      : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                  )}
                >
                  {form.active ? (
                    <CheckCircleIcon size={16} weight="bold" />
                  ) : (
                    <WarningCircleIcon size={16} weight="bold" />
                  )}
                  {form.active ? "Activo" : "Inactivo"}
                </button>
              </div>

              <SectionTitle
                icon={<BuildingIcon size={16} weight="bold" />}
                title="Datos fiscales"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  id="issuer-ruc"
                  label="RUC"
                  value={form.ruc}
                  placeholder="20123456789"
                  maxLength={11}
                  inputMode="numeric"
                  icon={<IdentificationCardIcon size={16} weight="bold" />}
                  disabled={saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      ruc: value.replace(/\D/g, "").slice(0, 11),
                    }))
                  }
                />
                <InputField
                  id="issuer-business-name"
                  label="Razon social"
                  value={form.businessName}
                  placeholder="Razon social registrada en SUNAT"
                  maxLength={200}
                  icon={<BuildingIcon size={16} weight="bold" />}
                  disabled={saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      businessName: value,
                    }))
                  }
                />
                <InputField
                  id="issuer-trade-name"
                  label="Nombre comercial"
                  value={form.tradeName}
                  placeholder="Nuvex"
                  maxLength={150}
                  icon={<StorefrontIcon size={16} weight="bold" />}
                  disabled={saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      tradeName: value,
                    }))
                  }
                />
                <InputField
                  id="issuer-ubigeo"
                  label="Ubigeo"
                  value={form.ubigeo}
                  placeholder="150101"
                  maxLength={6}
                  inputMode="numeric"
                  icon={<MapPinIcon size={16} weight="bold" />}
                  disabled={saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      ubigeo: value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                />
              </div>
              <InputField
                id="issuer-address"
                label="Direccion fiscal"
                value={form.address}
                placeholder="Direccion registrada en SUNAT"
                maxLength={300}
                icon={<MapPinIcon size={16} weight="bold" />}
                disabled={saving}
                onChange={(value) =>
                  setForm((current) => ({ ...current, address: value }))
                }
              />

              <SectionTitle
                icon={<ShieldCheckIcon size={16} weight="bold" />}
                title="Conexion SUNAT"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  id="issuer-environment"
                  label="Ambiente"
                  value={form.environment}
                  disabled={saving}
                  options={[
                    { label: "BETA", value: "BETA" },
                    { label: "PRODUCCION", value: "PRODUCCION" },
                  ]}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      environment: value as IssuerForm["environment"],
                    }))
                  }
                />
                <InputField
                  id="issuer-igv"
                  label="IGV (%)"
                  value={form.igvPercent}
                  placeholder="18.00"
                  maxLength={6}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  icon={<TagIcon size={16} weight="bold" />}
                  disabled={saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      igvPercent: value,
                    }))
                  }
                />
              </div>

              <SectionTitle
                icon={<KeyIcon size={16} weight="bold" />}
                title="Credenciales SOL"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretInput
                  id="issuer-sol-user"
                  label="Usuario SOL"
                  configured={Boolean(config?.solUserConfigured)}
                  value={form.solUser}
                  placeholder="Ingresa usuario SOL"
                  disabled={saving}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, solUser: value }))
                  }
                />
                <SecretInput
                  id="issuer-sol-password"
                  label="Clave SOL"
                  configured={Boolean(config?.solPasswordConfigured)}
                  value={form.solPassword}
                  placeholder="Nueva clave SOL"
                  disabled={saving}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, solPassword: value }))
                  }
                />
              </div>

              {error ? (
                <p className="rounded-[12px] bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-[14px] bg-[var(--color-primary)] px-8 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? "Guardando..." : "Guardar conexion"}
                </button>
              </div>
            </div>

            <CertificatePanel config={config} onUploaded={load} />
          </section>
        </form>
      </div>
    </DashboardShell>
  );
}

function CertificatePanel({
  config,
  onUploaded,
}: {
  config: PlatformIssuerConfig | null;
  onUploaded: () => Promise<void>;
}) {
  const { showToast } = useSystemToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    if (!/\.(pfx|p12)$/i.test(selected.name)) {
      setError("Solo se permiten certificados .pfx o .p12.");
      return;
    }
    if (selected.size > maxCertificateSize) {
      setError("El certificado no debe superar los 2 MB.");
      return;
    }

    setError("");
    setFile(selected);
  };

  const upload = async () => {
    if (!file || !password.trim()) return;
    setSaving(true);
    setError("");
    try {
      await platformBillingApi.uploadCertificate(file, password.trim());
      setFile(null);
      setPassword("");
      await onUploaded();
      showToast({
        title: "Certificado actualizado",
        description: "El archivo se almaceno de forma privada.",
        variant: "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "No se pudo subir el certificado.",
      );
      setError(message);
      showToast({
        title: "No se pudo subir",
        description: message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="space-y-4 p-1 sm:p-6">
      <div>
        <h2 className="text-sm font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Certificado digital
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Archivo privado en R2. No se publica por URL.
        </p>
      </div>

      <div className="rounded-[16px] bg-[var(--color-input-bg)] p-4">
        {config?.certificate ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#10b981]">
                <FileTextIcon size={20} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                  {config.certificate.name}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {formatFileSize(config.certificate.sizeBytes)}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Subido: {formatDate(config.certificate.uploadedAt)}
                </p>
              </div>
            </div>
            <p className="rounded-[10px] bg-[#10b981]/10 px-3 py-2 text-xs text-[#047857]">
              Para reemplazarlo, selecciona un nuevo archivo.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileTextIcon
              size={34}
              weight="fill"
              className="text-[var(--color-muted-foreground)]"
            />
            <p className="mt-2 text-sm font-circular-bold text-[var(--color-text)]">
              Sin certificado
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Sube un archivo .pfx o .p12.
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pfx,.p12"
        onChange={selectFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:opacity-50"
      >
        <CloudArrowUpIcon size={18} weight="bold" />
        Seleccionar certificado
      </button>

      {file ? (
        <p className="truncate text-xs font-circular-bold text-[var(--color-primary)]">
          {file.name} ({formatFileSize(file.size)})
        </p>
      ) : null}

      <InputField
        id="issuer-certificate-password"
        label="Contrasena certificado"
        value={password}
        placeholder="Contrasena .pfx/.p12"
        maxLength={150}
        type="password"
        icon={<KeyIcon size={16} weight="bold" />}
        disabled={saving}
        onChange={setPassword}
      />

      {error ? <p className="text-xs text-[#dc2626]">{error}</p> : null}

      <button
        type="button"
        onClick={() => void upload()}
        disabled={!file || !password.trim() || saving}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <CloudArrowUpIcon size={18} weight="bold" />
        {saving ? "Guardando..." : "Subir certificado"}
      </button>
    </aside>
  );
}

function StatusTile({
  icon,
  label,
  value,
  ok,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            ok
              ? "bg-[#10b981]/10 text-[#10b981]"
              : "bg-[#f59e0b]/10 text-[#d97706]",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-4">
      <span className="text-[var(--color-primary)]">{icon}</span>
      <h3 className="text-sm font-circular-bold text-[var(--color-text)]">
        {title}
      </h3>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  icon,
  disabled,
  onChange,
  type = "text",
  inputMode,
  step,
  min,
  max,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  icon: ReactNode;
  disabled: boolean;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric";
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-[#4e5671]">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          step={step}
          min={min}
          max={max}
          className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
        />
      </div>
    </div>
  );
}

function SecretInput({
  id,
  label,
  configured,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  configured: boolean;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-[#4e5671]">
          {label}
        </label>
        {configured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[11px] font-circular-bold text-[#047857]">
            <CheckCircleIcon size={12} weight="bold" />
            Configurado
          </span>
        ) : null}
      </div>
      <div className="relative">
        <KeyIcon
          size={16}
          weight="bold"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
        />
        <input
          id={id}
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={configured ? "Dejar vacio para mantener" : placeholder}
          maxLength={150}
          disabled={disabled}
          className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
        />
      </div>
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-[#4e5671]">
        {label}
      </label>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

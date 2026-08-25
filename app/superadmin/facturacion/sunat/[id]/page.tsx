"use client";

import { NativeSelect } from "@/components/ui/select";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BuildingsIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  FileTextIcon,
  IdentificationCardIcon,
  KeyIcon,
  MapPinIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  TagIcon,
  TrashIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformSunatCompanyDetail,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";

type FiscalForm = {
  nombreComercial: string;
  razonSocial: string;
  ruc: string;
  direccion: string;
};

type SunatForm = {
  ambiente: "BETA" | "PRODUCCION";
  activo: boolean;
  igvPorcentaje: string;
  usuarioSol: string;
  claveSol: string;
  clientId: string;
  clientSecret: string;
};

const defaultFiscalForm: FiscalForm = {
  nombreComercial: "",
  razonSocial: "",
  ruc: "",
  direccion: "",
};

const defaultSunatForm: SunatForm = {
  ambiente: "BETA",
  activo: false,
  igvPorcentaje: "18.00",
  usuarioSol: "",
  claveSol: "",
  clientId: "",
  clientSecret: "",
};

const maxCertificateSize = 2 * 1024 * 1024;

export default function PlatformCompanySunatDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;
  const { showToast } = useSystemToast();
  const [detail, setDetail] = useState<PlatformSunatCompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [savingSunat, setSavingSunat] = useState(false);
  const [error, setError] = useState("");
  const [fiscalForm, setFiscalForm] =
    useState<FiscalForm>(defaultFiscalForm);
  const [sunatForm, setSunatForm] = useState<SunatForm>(defaultSunatForm);

  const applyDetail = useCallback((data: PlatformSunatCompanyDetail) => {
    setDetail(data);
    setFiscalForm({
      nombreComercial: data.fiscal.nombreComercial,
      razonSocial: data.fiscal.razonSocial ?? "",
      ruc: data.fiscal.ruc ?? "",
      direccion: data.fiscal.direccion ?? "",
    });
    setSunatForm({
      ambiente: data.sunat.ambiente,
      activo: data.sunat.activo,
      igvPorcentaje: data.sunat.igvPorcentaje,
      usuarioSol: "",
      claveSol: "",
      clientId: "",
      clientSecret: "",
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      applyDetail(await platformAdminApi.getSunatCompany(companyId));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo cargar la empresa."));
    } finally {
      setLoading(false);
    }
  }, [applyDetail, companyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submitFiscal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;

    const ruc = fiscalForm.ruc.trim();
    if (ruc && !/^\d{11}$/.test(ruc)) {
      setError("El RUC debe tener 11 digitos.");
      return;
    }
    if (!fiscalForm.nombreComercial.trim()) {
      setError("El nombre comercial es obligatorio.");
      return;
    }

    setSavingFiscal(true);
    setError("");
    try {
      const updated = await platformAdminApi.updateSunatFiscal(detail.id, {
        nombreComercial: fiscalForm.nombreComercial.trim(),
        razonSocial: fiscalForm.razonSocial.trim(),
        ruc,
        direccion: fiscalForm.direccion.trim(),
      });
      applyDetail(updated);
      showToast({
        title: "Datos fiscales actualizados",
        description: "La empresa quedo actualizada para la emision.",
        variant: "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError, "No se pudo guardar.");
      setError(message);
      showToast({ title: "No se pudo guardar", description: message, variant: "error" });
    } finally {
      setSavingFiscal(false);
    }
  };

  const submitSunat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;

    const igv = Number(sunatForm.igvPorcentaje);
    if (!Number.isFinite(igv) || igv < 0 || igv > 100) {
      setError("El IGV debe estar entre 0 y 100.");
      return;
    }

    setSavingSunat(true);
    setError("");
    try {
      const updated = await platformAdminApi.updateSunatConfig(detail.id, {
        ambiente: sunatForm.ambiente,
        activo: sunatForm.activo,
        igvPorcentaje: igv.toFixed(2),
        usuarioSol: sunatForm.usuarioSol.trim() || undefined,
        claveSol: sunatForm.claveSol.trim() || undefined,
        clientId: sunatForm.clientId.trim() || undefined,
        clientSecret: sunatForm.clientSecret.trim() || undefined,
      });
      applyDetail(updated);
      showToast({
        title: "Conexion SUNAT actualizada",
        description: "Los secretos guardados se mantienen privados.",
        variant: "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError, "No se pudo guardar SUNAT.");
      setError(message);
      showToast({ title: "No se pudo guardar", description: message, variant: "error" });
    } finally {
      setSavingSunat(false);
    }
  };

  return (
    <DashboardShell
      headerTitle={
        detail
          ? `SUNAT por empresa / ${detail.name}`
          : "SUNAT por empresa / Configuracion"
      }
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6 lg:py-5">
        {error ? (
          <p className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </p>
        ) : null}

        {loading && !detail ? (
          <div className="h-[560px] animate-pulse rounded-[14px] bg-[var(--color-card)]" />
        ) : detail ? (
          <div className="space-y-4">
            <HeaderPanel detail={detail} />
            <ReadinessPanel detail={detail} />

            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                <form
                  onSubmit={submitFiscal}
                  className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm"
                >
                  <SectionTitle
                    icon={<StorefrontIcon size={16} weight="bold" />}
                    title="Datos fiscales"
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <InputField
                      id="sunat-company-name"
                      label="Nombre comercial"
                      value={fiscalForm.nombreComercial}
                      placeholder="Nombre visible"
                      maxLength={150}
                      icon={<StorefrontIcon size={16} weight="bold" />}
                      disabled={savingFiscal}
                      onChange={(value) =>
                        setFiscalForm((current) => ({
                          ...current,
                          nombreComercial: value,
                        }))
                      }
                    />
                    <InputField
                      id="sunat-ruc"
                      label="RUC"
                      value={fiscalForm.ruc}
                      placeholder="20123456789"
                      maxLength={11}
                      inputMode="numeric"
                      icon={<IdentificationCardIcon size={16} weight="bold" />}
                      disabled={savingFiscal}
                      onChange={(value) =>
                        setFiscalForm((current) => ({
                          ...current,
                          ruc: value.replace(/\D/g, "").slice(0, 11),
                        }))
                      }
                    />
                    <InputField
                      id="sunat-legal-name"
                      label="Razon social"
                      value={fiscalForm.razonSocial}
                      placeholder="Razon social SUNAT"
                      maxLength={200}
                      icon={<BuildingsIcon size={16} weight="bold" />}
                      disabled={savingFiscal}
                      onChange={(value) =>
                        setFiscalForm((current) => ({
                          ...current,
                          razonSocial: value,
                        }))
                      }
                    />
                    <InputField
                      id="sunat-address"
                      label="Direccion fiscal"
                      value={fiscalForm.direccion}
                      placeholder="Direccion fiscal"
                      maxLength={500}
                      icon={<MapPinIcon size={16} weight="bold" />}
                      disabled={savingFiscal}
                      onChange={(value) =>
                        setFiscalForm((current) => ({
                          ...current,
                          direccion: value,
                        }))
                      }
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingFiscal}
                      className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
                    >
                      {savingFiscal ? "Guardando..." : "Guardar datos"}
                    </button>
                  </div>
                </form>

                <form
                  onSubmit={submitSunat}
                  className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm"
                >
                  <SectionTitle
                    icon={<ShieldCheckIcon size={16} weight="bold" />}
                    title="Conexion SUNAT"
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <SelectField
                      id="sunat-environment"
                      label="Ambiente"
                      value={sunatForm.ambiente}
                      disabled={savingSunat}
                      options={[
                        { label: "BETA", value: "BETA" },
                        { label: "PRODUCCION", value: "PRODUCCION" },
                      ]}
                      onChange={(value) =>
                        setSunatForm((current) => ({
                          ...current,
                          ambiente: value as SunatForm["ambiente"],
                        }))
                      }
                    />
                    <InputField
                      id="sunat-igv"
                      label="IGV (%)"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={sunatForm.igvPorcentaje}
                      placeholder="18.00"
                      maxLength={6}
                      icon={<TagIcon size={16} weight="bold" />}
                      disabled={savingSunat}
                      onChange={(value) =>
                        setSunatForm((current) => ({
                          ...current,
                          igvPorcentaje: value,
                        }))
                      }
                    />
                  </div>

                  <label className="mt-4 flex items-center justify-between rounded-xl bg-[var(--color-input-bg)] p-3 text-sm font-circular-bold text-[var(--color-text)]">
                    Conexion activa
                    <input
                      type="checkbox"
                      checked={sunatForm.activo}
                      onChange={(event) =>
                        setSunatForm((current) => ({
                          ...current,
                          activo: event.target.checked,
                        }))
                      }
                      disabled={savingSunat}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                  </label>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <SecretInput
                      id="sunat-sol-user"
                      label="Usuario SOL"
                      configured={detail.sunat.usuarioSolConfigurado}
                      value={sunatForm.usuarioSol}
                      placeholder="Ingresa usuario SOL"
                      disabled={savingSunat}
                      onChange={(value) =>
                        setSunatForm((current) => ({
                          ...current,
                          usuarioSol: value,
                        }))
                      }
                    />
                    <SecretInput
                      id="sunat-sol-password"
                      label="Clave SOL"
                      configured={detail.sunat.claveSolConfigurada}
                      value={sunatForm.claveSol}
                      placeholder="Nueva clave SOL"
                      disabled={savingSunat}
                      onChange={(value) =>
                        setSunatForm((current) => ({
                          ...current,
                          claveSol: value,
                        }))
                      }
                    />
                    <SecretInput
                      id="sunat-client-id"
                      label="Client ID"
                      configured={detail.sunat.clientIdConfigurado}
                      value={sunatForm.clientId}
                      placeholder="Client ID"
                      disabled={savingSunat}
                      onChange={(value) =>
                        setSunatForm((current) => ({
                          ...current,
                          clientId: value,
                        }))
                      }
                    />
                    <SecretInput
                      id="sunat-client-secret"
                      label="Client Secret"
                      configured={detail.sunat.clientSecretConfigurado}
                      value={sunatForm.clientSecret}
                      placeholder="Client Secret"
                      disabled={savingSunat}
                      onChange={(value) =>
                        setSunatForm((current) => ({
                          ...current,
                          clientSecret: value,
                        }))
                      }
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingSunat}
                      className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
                    >
                      {savingSunat ? "Guardando..." : "Guardar SUNAT"}
                    </button>
                  </div>
                </form>
              </div>

              <CertificatePanel detail={detail} onUpdated={applyDetail} />
            </section>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function HeaderPanel({ detail }: { detail: PlatformSunatCompanyDetail }) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-lg font-circular-bold text-[var(--color-text)]">
            {detail.name}
          </h2>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-circular-bold",
              detail.readiness.ready
                ? "bg-[#10b981]/10 text-[#047857]"
                : "bg-[#f59e0b]/10 text-[#d97706]",
            )}
          >
            {detail.readiness.ready ? "Lista para emitir" : "Pendiente"}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {detail.document ?? "Sin documento"} · {detail.planName} ·{" "}
          {detail.sunat.ambiente}
        </p>
      </div>
      <StatusBadge
        ok={detail.sunat.activo}
        label={detail.sunat.activo ? "SUNAT activo" : "SUNAT inactivo"}
      />
    </section>
  );
}

function ReadinessPanel({ detail }: { detail: PlatformSunatCompanyDetail }) {
  return (
    <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
      <SectionTitle
        icon={<CheckCircleIcon size={16} weight="bold" />}
        title="Checklist de emision"
      />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {detail.readiness.checks.map((check) => (
          <div
            key={check.key}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-input-bg)] px-3 py-2 text-sm"
          >
            {check.ok ? (
              <CheckCircleIcon
                size={17}
                weight="fill"
                className="shrink-0 text-[#10b981]"
              />
            ) : (
              <XCircleIcon
                size={17}
                weight="fill"
                className="shrink-0 text-[#ef4444]"
              />
            )}
            <span className="truncate text-[var(--color-text)]">
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CertificatePanel({
  detail,
  onUpdated,
}: {
  detail: PlatformSunatCompanyDetail;
  onUpdated: (detail: PlatformSunatCompanyDetail) => void;
}) {
  const { showToast } = useSystemToast();
  const inputRef = useRef<HTMLInputElement>(null);
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
      const updated = await platformAdminApi.uploadSunatCertificate(
        detail.id,
        file,
        password.trim(),
      );
      setFile(null);
      setPassword("");
      onUpdated(updated);
      showToast({
        title: "Certificado actualizado",
        description: "El certificado quedo asociado a la empresa.",
        variant: "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError, "No se pudo subir.");
      setError(message);
      showToast({ title: "No se pudo subir", description: message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await platformAdminApi.deleteSunatCertificate(detail.id);
      setFile(null);
      setPassword("");
      onUpdated(updated);
      showToast({
        title: "Certificado eliminado",
        description: "La empresa quedo sin certificado SUNAT.",
        variant: "success",
      });
    } catch (requestError) {
      const message = getErrorMessage(requestError, "No se pudo eliminar.");
      setError(message);
      showToast({ title: "No se pudo eliminar", description: message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
      <SectionTitle
        icon={<FileTextIcon size={16} weight="bold" />}
        title="Certificado digital"
      />

      <div className="mt-4 rounded-xl bg-[var(--color-input-bg)] p-4">
        {detail.sunat.certificado ? (
          <div className="space-y-2">
            <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
              {detail.sunat.certificado.nombre ?? "Certificado"}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {formatFileSize(detail.sunat.certificado.sizeBytes)}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Subido:{" "}
              {detail.sunat.certificado.uploadedAt
                ? new Date(detail.sunat.certificado.uploadedAt).toLocaleDateString(
                    "es-PE",
                  )
                : "Sin fecha"}
            </p>
            <StatusBadge
              ok={detail.sunat.certificadoPasswordConfigurado}
              label={
                detail.sunat.certificadoPasswordConfigurado
                  ? "Con contrasena"
                  : "Sin contrasena"
              }
            />
          </div>
        ) : (
          <div className="py-6 text-center">
            <FileTextIcon
              size={34}
              weight="fill"
              className="mx-auto text-[var(--color-muted-foreground)]"
            />
            <p className="mt-2 text-sm font-circular-bold text-[var(--color-text)]">
              Sin certificado
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pfx,.p12"
        onChange={selectFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={saving}
        className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] disabled:opacity-50"
      >
        <CloudArrowUpIcon size={17} weight="bold" />
        Seleccionar certificado
      </button>

      {file ? (
        <p className="mt-2 truncate text-xs font-circular-bold text-[var(--color-primary)]">
          {file.name} ({formatFileSize(file.size)})
        </p>
      ) : null}

      <InputField
        id="sunat-certificate-password"
        label="Contrasena certificado"
        value={password}
        placeholder="Contrasena .pfx/.p12"
        maxLength={255}
        type="password"
        icon={<KeyIcon size={16} weight="bold" />}
        disabled={saving}
        onChange={setPassword}
      />

      {error ? <p className="mt-2 text-xs text-[#dc2626]">{error}</p> : null}

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => void upload()}
          disabled={!file || !password.trim() || saving}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-sm font-circular-bold text-white disabled:opacity-50"
        >
          <CloudArrowUpIcon size={17} weight="bold" />
          {saving ? "Guardando..." : "Subir certificado"}
        </button>
        {detail.sunat.certificado ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={saving}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#ef4444]/10 text-sm font-circular-bold text-[#dc2626] disabled:opacity-50"
          >
            <TrashIcon size={17} weight="bold" />
            Eliminar certificado
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-primary)]">{icon}</span>
      <h3 className="text-sm font-circular-bold text-[var(--color-text)]">
        {title}
      </h3>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-circular-bold",
        ok ? "bg-[#10b981]/10 text-[#047857]" : "bg-[#f59e0b]/10 text-[#d97706]",
      )}
    >
      {ok ? (
        <CheckCircleIcon size={13} weight="bold" />
      ) : (
        <WarningCircleIcon size={13} weight="bold" />
      )}
      {label}
    </span>
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
    <label htmlFor={id} className="mt-4 block">
      <span className="mb-2 block text-sm text-[#4e5671]">{label}</span>
      <span className="relative block">
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
          className="h-11 w-full rounded-xl bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
        />
      </span>
    </label>
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
      <div className="mt-4 mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-[#4e5671]">
          {label}
        </label>
        {configured ? (
          <span className="rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[11px] font-circular-bold text-[#047857]">
            Configurado
          </span>
        ) : null}
      </div>
      <span className="relative block">
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
          maxLength={255}
          disabled={disabled}
          className="h-11 w-full rounded-xl bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
        />
      </span>
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
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm text-[#4e5671]">{label}</span>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

function formatFileSize(size: number | null | undefined) {
  if (!size) return "Tamano no disponible";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

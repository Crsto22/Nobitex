"use client";

import { NativeSelect } from "@/components/ui/select";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BuildingIcon,
  CameraIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  IdentificationCardIcon,
  KeyIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  TagIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  companyApi,
  type Company,
  type SunatAmbiente,
  type SunatConfig,
  type UpdateCompanyPayload,
  type UpdateSunatConfigPayload,
} from "@/lib/api/company";
import { useAuth } from "@/lib/auth/auth-provider";
import { setStoredCompanyInfo } from "@/lib/auth/session";
import peruUbigeos from "@/lib/data/peru-ubigeos.json";
import { cn } from "@/lib/utils";

type PeruUbigeo = {
  ubigeo: string;
  distrito: string;
  provincia: string;
  departamento: string;
  label: string;
};

type ActiveTab = "empresa" | "sunat";

type SunatForm = {
  ambiente: SunatAmbiente;
  activo: boolean;
  igvPorcentaje: string;
  usuarioSol: string;
  claveSol: string;
  clientId: string;
  clientSecret: string;
};

const ubigeos = peruUbigeos as PeruUbigeo[];

const defaultForm = {
  nombreComercial: "",
  razonSocial: "",
  ruc: "",
  email: "",
  telefono: "",
  direccion: "",
  ubigeo: "",
  distrito: "",
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

export default function EmpresaPage() {
  const { showToast } = useSystemToast();
  const { updateCompanyInfo, currentPlan } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("empresa");
  const [company, setCompany] = useState<Company | null>(null);
  const [sunatConfig, setSunatConfig] = useState<SunatConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConvertingToRuc, setIsConvertingToRuc] = useState(false);
  const [isSunatSubmitting, setIsSunatSubmitting] = useState(false);
  const [isCertificateSubmitting, setIsCertificateSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [sunatError, setSunatError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [sunatForm, setSunatForm] = useState<SunatForm>(defaultSunatForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([companyApi.getCompany(), companyApi.getSunatConfig()])
      .then(([companyData, sunatData]) => {
        setCompany(companyData);
        setSunatConfig(sunatData);
        setForm({
          nombreComercial: companyData.nombreComercial,
          razonSocial: companyData.razonSocial ?? "",
          ruc: companyData.ruc ?? "",
          email: companyData.email ?? "",
          telefono: companyData.telefono ?? "",
          direccion: companyData.direccion ?? "",
          ubigeo: "",
          distrito: "",
        });
        setSunatForm(toSunatForm(sunatData));

        if (companyData.logoUrl) {
          setLogoPreview(companyData.logoUrl);
        }
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos de la empresa.";
        showToast({
          title: "Error al cargar",
          description: message,
          variant: "error",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [showToast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const payload: UpdateCompanyPayload = {};

    const nombreComercial = form.nombreComercial.trim();
    if (!nombreComercial) {
      setFormError("El nombre comercial es obligatorio.");
      return;
    }
    payload.nombreComercial = nombreComercial;

    const razonSocial = form.razonSocial.trim();
    if (company?.dni && !company.ruc && isConvertingToRuc && !razonSocial) {
      setFormError("La razon social es obligatoria para cambiar a RUC.");
      return;
    }
    if (razonSocial) {
      payload.razonSocial = razonSocial;
    }

    const ruc = form.ruc.trim();
    if (company?.dni && !company.ruc && isConvertingToRuc && !ruc) {
      setFormError("Ingresa el RUC para reemplazar el DNI registrado.");
      return;
    }
    if (ruc) {
      if (!/^\d{11}$/.test(ruc)) {
        setFormError("El RUC debe tener 11 digitos.");
        return;
      }
      payload.ruc = ruc;
    }

    const email = form.email.trim();
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError("El email no es valido.");
        return;
      }
      payload.email = email;
    }

    const telefono = form.telefono.trim();
    if (telefono) {
      payload.telefono = telefono;
    }

    const direccion = form.direccion.trim();
    if (direccion) {
      payload.direccion = direccion;
    }

    setIsSubmitting(true);

    try {
      let logoUrl = company?.logoUrl ?? null;

      if (logoFile) {
        const logoResponse = await companyApi.uploadLogo(logoFile);
        logoUrl = logoResponse.logoUrl;
      }

      const updated = await companyApi.updateCompany(payload);

      if (logoUrl) {
        updated.logoUrl = logoUrl;
      }

      setCompany(updated);
      setIsConvertingToRuc(false);

      const info = {
        nombreComercial: updated.nombreComercial,
        logoUrl: updated.logoUrl,
        documento: updated.ruc ?? updated.dni,
      };
      setStoredCompanyInfo(info);
      updateCompanyInfo(info);

      setLogoFile(null);
      showToast({
        title: "Empresa actualizada",
        description:
          "Los datos de tu empresa quedaron guardados correctamente.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios.";
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

  const handleSunatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSunatError("");

    const igvPorcentaje = sunatForm.igvPorcentaje.trim();
    const parsedIgv = Number(igvPorcentaje);

    if (!Number.isFinite(parsedIgv) || parsedIgv < 0 || parsedIgv > 100) {
      setSunatError("El porcentaje de IGV debe estar entre 0 y 100.");
      return;
    }

    const payload: UpdateSunatConfigPayload = {
      ambiente: sunatForm.ambiente,
      activo: sunatForm.activo,
      igvPorcentaje,
    };

    if (sunatForm.usuarioSol.trim()) {
      payload.usuarioSol = sunatForm.usuarioSol.trim();
    }

    if (sunatForm.claveSol.trim()) {
      payload.claveSol = sunatForm.claveSol.trim();
    }

    if (sunatForm.clientId.trim()) {
      payload.clientId = sunatForm.clientId.trim();
    }

    if (sunatForm.clientSecret.trim()) {
      payload.clientSecret = sunatForm.clientSecret.trim();
    }

    setIsSunatSubmitting(true);

    try {
      const updated = await companyApi.updateSunatConfig(payload);
      setSunatConfig(updated);
      setSunatForm(toSunatForm(updated));
      showToast({
        title: "Conexion SUNAT actualizada",
        description: "La configuracion tributaria quedo guardada.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuracion SUNAT.";
      setSunatError(message);
      showToast({
        title: "No se pudo guardar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSunatSubmitting(false);
    }
  };

  const handleCertificateChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "pfx" && extension !== "p12") {
      showToast({
        title: "Certificado invalido",
        description: "Solo se permiten archivos .pfx o .p12.",
        variant: "error",
      });
      event.target.value = "";
      return;
    }

    if (file.size > maxCertificateSize) {
      showToast({
        title: "Archivo muy grande",
        description: "El certificado no debe superar los 2MB.",
        variant: "error",
      });
      event.target.value = "";
      return;
    }

    setCertificateFile(file);
    event.target.value = "";
  };

  const uploadCertificate = async () => {
    setSunatError("");

    if (!certificateFile) {
      setSunatError("Selecciona un certificado .pfx o .p12.");
      return;
    }

    if (!certificatePassword.trim()) {
      setSunatError("Ingresa la contrasena del certificado.");
      return;
    }

    setIsCertificateSubmitting(true);

    try {
      const updated = await companyApi.uploadSunatCertificate(
        certificateFile,
        certificatePassword.trim(),
      );
      setSunatConfig(updated);
      setSunatForm(toSunatForm(updated));
      setCertificateFile(null);
      setCertificatePassword("");
      showToast({
        title: "Certificado guardado",
        description: "El certificado digital se subio de forma privada.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo subir el certificado.";
      setSunatError(message);
      showToast({
        title: "No se pudo subir",
        description: message,
        variant: "error",
      });
    } finally {
      setIsCertificateSubmitting(false);
    }
  };

  const deleteCertificate = async () => {
    setSunatError("");
    setIsCertificateSubmitting(true);

    try {
      const updated = await companyApi.deleteSunatCertificate();
      setSunatConfig(updated);
      setSunatForm(toSunatForm(updated));
      setCertificateFile(null);
      setCertificatePassword("");
      showToast({
        title: "Certificado eliminado",
        description: "La conexion SUNAT quedo sin certificado asociado.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el certificado.";
      setSunatError(message);
      showToast({
        title: "No se pudo eliminar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsCertificateSubmitting(false);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        title: "Archivo invalido",
        description: "Solo se permiten archivos de imagen.",
        variant: "error",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: "Archivo muy grande",
        description: "El logo no debe superar los 5MB.",
        variant: "error",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setLogoFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
  };

  const hasChanges = (() => {
    if (!company) return false;
    if (logoFile) return true;
    if (form.nombreComercial.trim() !== company.nombreComercial) return true;
    if (form.razonSocial.trim() !== (company.razonSocial ?? "")) return true;
    if (form.ruc.trim() !== (company.ruc ?? "")) return true;
    if (form.email.trim() !== (company.email ?? "")) return true;
    if (form.telefono.trim() !== (company.telefono ?? "")) return true;
    if (form.direccion.trim() !== (company.direccion ?? "")) return true;
    return false;
  })();

  const hasSunatChanges = (() => {
    const saved = sunatConfig ? toSunatForm(sunatConfig) : defaultSunatForm;

    if (sunatForm.ambiente !== saved.ambiente) return true;
    if (sunatForm.activo !== saved.activo) return true;
    if (sunatForm.igvPorcentaje.trim() !== saved.igvPorcentaje) return true;
    if (sunatForm.usuarioSol.trim()) return true;
    if (sunatForm.claveSol.trim()) return true;
    if (sunatForm.clientId.trim()) return true;
    if (sunatForm.clientSecret.trim()) return true;
    return false;
  })();

  if (isLoading) {
    return (
      <DashboardShell headerTitle="Empresa">
        <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6">
          <div className="h-11 w-full max-w-md animate-pulse rounded-[16px] bg-[var(--color-input-bg)]" />
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="animate-pulse p-6">
              <div className="mb-4 h-4 w-32 rounded bg-[var(--color-input-bg)]" />
              <div className="mx-auto h-40 w-40 rounded-2xl bg-[var(--color-input-bg)]" />
            </div>
            <div className="animate-pulse p-6">
              <div className="mb-4 h-4 w-40 rounded bg-[var(--color-input-bg)]" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-11 rounded-[16px] bg-[var(--color-input-bg)]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell headerTitle="Empresa">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="flex flex-wrap gap-2 rounded-[16px] bg-[var(--color-input-bg)] p-1">
          <TabButton
            active={activeTab === "empresa"}
            label="Datos de empresa"
            icon={<BuildingIcon size={16} weight="bold" />}
            onClick={() => setActiveTab("empresa")}
          />
          <TabButton
            active={activeTab === "sunat"}
            label="Conexion SUNAT"
            icon={<ShieldCheckIcon size={16} weight="bold" />}
            onClick={() => setActiveTab("sunat")}
          />
        </div>

        {activeTab === "empresa" ? (
          <form
            className="grid gap-4 lg:grid-cols-[320px_1fr]"
            onSubmit={handleSubmit}
          >
            <div className="p-6">
              <h3 className="mb-4 text-sm font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Logo de la empresa
              </h3>
              <div
                onClick={handleLogoClick}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleLogoClick();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Seleccionar logo de la empresa"
                className="group relative mx-auto flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-input-bg)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo empresa"
                    fill
                    sizes="160px"
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[var(--color-muted-foreground)]">
                    <CameraIcon size={32} weight="bold" />
                    <span className="text-xs font-circular-bold">
                      Subir logo
                    </span>
                  </div>
                )}
                {logoPreview && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeLogo();
                    }}
                    className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#ef4444] text-xs font-circular-bold leading-none text-white opacity-0 shadow-md transition-opacity hover:bg-[#dc2626] group-hover:opacity-100"
                    aria-label="Quitar logo"
                  >
                    X
                  </button>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <CameraIcon size={24} weight="bold" className="text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <p className="mt-4 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
                Haz clic para subir o cambiar el logo
              </p>
              {logoFile && (
                <p className="mt-2 text-center text-xs font-circular-bold text-[var(--color-primary)]">
                  {logoFile.name}
                </p>
              )}
            </div>

            <div className="p-6">
              <h3 className="mb-4 text-sm font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Datos de la empresa
              </h3>
              <div className="space-y-4">
                {company?.dni && !company.ruc ? (
                  <div className="flex flex-wrap items-end gap-3 rounded-[16px] bg-[var(--color-input-bg)] p-4">
                    <div className="min-w-[220px] flex-1">
                      <InputField
                        id="dni-registrado"
                        label="DNI registrado"
                        value={company.dni}
                        placeholder=""
                        maxLength={8}
                        icon={
                          <IdentificationCardIcon size={16} weight="bold" />
                        }
                        disabled
                        onChange={() => {}}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isConvertingToRuc) {
                          setForm((current) => ({
                            ...current,
                            razonSocial: company.razonSocial ?? "",
                            ruc: company.ruc ?? "",
                          }));
                        }
                        setIsConvertingToRuc((current) => !current);
                      }}
                      className="h-11 rounded-[14px] bg-[var(--color-card)] px-5 text-sm font-circular-bold text-[var(--color-primary)] shadow-sm transition-colors hover:bg-[var(--color-button-hover)]"
                    >
                      {isConvertingToRuc ? "Cancelar cambio" : "Cambiar a RUC"}
                    </button>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    id="nombre-comercial"
                    label="Nombre comercial"
                    value={form.nombreComercial}
                    placeholder="Nombre de tu marca o negocio"
                    maxLength={150}
                    icon={<TagIcon size={16} weight="bold" />}
                    disabled={isSubmitting}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        nombreComercial: value,
                      }))
                    }
                  />

                  {(!company?.dni || company.ruc || isConvertingToRuc) && (
                    <InputField
                      id="razon-social"
                      label="Razon social juridica"
                      value={form.razonSocial}
                      placeholder="Razon social registrada en SUNAT"
                      maxLength={200}
                      icon={<BuildingIcon size={16} weight="bold" />}
                      disabled={isSubmitting}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          razonSocial: value,
                        }))
                      }
                    />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(!company?.dni || company.ruc || isConvertingToRuc) && (
                    <InputField
                      id="ruc"
                      label="RUC"
                      value={form.ruc}
                      placeholder="20123456789"
                      maxLength={11}
                      icon={<IdentificationCardIcon size={16} weight="bold" />}
                      disabled={isSubmitting}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          ruc: value.replace(/\D/g, ""),
                        }))
                      }
                    />
                  )}

                  <InputField
                    id="email"
                    label="Correo comercial"
                    value={form.email}
                    placeholder="contacto@miempresa.com"
                    maxLength={150}
                    type="email"
                    icon={<EnvelopeSimpleIcon size={16} weight="bold" />}
                    disabled={isSubmitting}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, email: value }))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    id="telefono"
                    label="Telefono"
                    value={form.telefono}
                    placeholder="987654321"
                    maxLength={30}
                    icon={<PhoneIcon size={16} weight="bold" />}
                    disabled={isSubmitting}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, telefono: value }))
                    }
                  />

                  <UbigeoSelect
                    value={form.ubigeo}
                    disabled={isSubmitting}
                    onSelect={(item) =>
                      setForm((current) => ({
                        ...current,
                        ubigeo: item.ubigeo,
                        distrito: item.distrito,
                      }))
                    }
                  />
                </div>

                <InputField
                  id="direccion"
                  label="Direccion"
                  value={form.direccion}
                  placeholder="Av. Principal 123, Oficina 401"
                  maxLength={255}
                  icon={<MapPinIcon size={16} weight="bold" />}
                  disabled={isSubmitting}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, direccion: value }))
                  }
                />

                {formError && (
                  <p className="text-sm font-circular-regular text-[#d9480f]">
                    {formError}
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!hasChanges || isSubmitting}
                    className="h-11 rounded-[14px] bg-[var(--color-primary)] px-8 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSubmitting
                      ? logoFile
                        ? "Subiendo logo y guardando..."
                        : "Guardando..."
                      : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleSunatSubmit}>
            <div className="grid gap-4 lg:grid-cols-3">
              <StatusTile
                icon={<ShieldCheckIcon size={22} weight="fill" />}
                label="Facturacion electronica"
                value={sunatForm.activo ? "Activa" : "Inactiva"}
                ok={sunatForm.activo}
              />
              <StatusTile
                icon={<KeyIcon size={22} weight="fill" />}
                label="Credenciales SOL"
                value={
                  sunatConfig?.usuarioSolConfigurado &&
                  sunatConfig.claveSolConfigurada
                    ? "Configuradas"
                    : "Pendientes"
                }
                ok={
                  Boolean(sunatConfig?.usuarioSolConfigurado) &&
                  Boolean(sunatConfig?.claveSolConfigurada)
                }
              />
              <StatusTile
                icon={<FileTextIcon size={22} weight="fill" />}
                label="Certificado digital"
                value={
                  sunatConfig?.certificadoConfigurado ? "Subido" : "Pendiente"
                }
                ok={Boolean(sunatConfig?.certificadoConfigurado)}
              />
            </div>

            <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Conexion SUNAT
                    </h3>
                    <p className="mt-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                      Los secretos se reemplazan solo si escribes un nuevo
                      valor.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSunatForm((current) => ({
                        ...current,
                        activo: !current.activo,
                      }))
                    }
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-[12px] px-4 text-xs font-circular-bold transition-colors",
                      sunatForm.activo
                        ? "bg-[#10b981] text-white"
                        : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {sunatForm.activo ? (
                      <CheckCircleIcon size={16} weight="bold" />
                    ) : (
                      <WarningCircleIcon size={16} weight="bold" />
                    )}
                    {sunatForm.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    id="sunat-ambiente"
                    label="Ambiente"
                    value={sunatForm.ambiente}
                    disabled={isSunatSubmitting}
                    options={[
                      { label: "BETA", value: "BETA" },
                      ...(currentPlan?.plan.code === "prueba"
                        ? []
                        : [{ label: "PRODUCCION", value: "PRODUCCION" }]),
                    ]}
                    onChange={(value) =>
                      setSunatForm((current) => ({
                        ...current,
                        ambiente: value as SunatAmbiente,
                      }))
                    }
                  />

                  <InputField
                    id="sunat-igv"
                    label="IGV (%)"
                    value={sunatForm.igvPorcentaje}
                    placeholder="18.00"
                    maxLength={6}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    icon={<TagIcon size={16} weight="bold" />}
                    disabled={isSunatSubmitting}
                    onChange={(value) =>
                      setSunatForm((current) => ({
                        ...current,
                        igvPorcentaje: value,
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
                    id="usuario-sol"
                    label="Usuario SOL"
                    configured={Boolean(sunatConfig?.usuarioSolConfigurado)}
                    value={sunatForm.usuarioSol}
                    placeholder="Ingresa usuario SOL"
                    disabled={isSunatSubmitting}
                    onChange={(value) =>
                      setSunatForm((current) => ({
                        ...current,
                        usuarioSol: value,
                      }))
                    }
                  />
                  <SecretInput
                    id="clave-sol"
                    label="Clave SOL"
                    configured={Boolean(sunatConfig?.claveSolConfigurada)}
                    value={sunatForm.claveSol}
                    placeholder="Nueva clave SOL"
                    disabled={isSunatSubmitting}
                    onChange={(value) =>
                      setSunatForm((current) => ({
                        ...current,
                        claveSol: value,
                      }))
                    }
                  />
                </div>

                <SectionTitle
                  icon={<IdentificationCardIcon size={16} weight="bold" />}
                  title="Guias de remision"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <SecretInput
                    id="client-id"
                    label="Client ID"
                    configured={Boolean(sunatConfig?.clientIdConfigurado)}
                    value={sunatForm.clientId}
                    placeholder="Ingresa Client ID"
                    disabled={isSunatSubmitting}
                    onChange={(value) =>
                      setSunatForm((current) => ({
                        ...current,
                        clientId: value,
                      }))
                    }
                  />
                  <SecretInput
                    id="client-secret"
                    label="Client Secret"
                    configured={Boolean(sunatConfig?.clientSecretConfigurado)}
                    value={sunatForm.clientSecret}
                    placeholder="Nuevo Client Secret"
                    disabled={isSunatSubmitting}
                    onChange={(value) =>
                      setSunatForm((current) => ({
                        ...current,
                        clientSecret: value,
                      }))
                    }
                  />
                </div>

                {sunatError && (
                  <p className="text-sm font-circular-regular text-[#d9480f]">
                    {sunatError}
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!hasSunatChanges || isSunatSubmitting}
                    className="h-11 rounded-[14px] bg-[var(--color-primary)] px-8 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSunatSubmitting ? "Guardando..." : "Guardar conexion"}
                  </button>
                </div>
              </div>

              <aside className="space-y-4 p-6">
                <div>
                  <h3 className="text-sm font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Certificado digital
                  </h3>
                  <p className="mt-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                    Archivo privado en R2. No se publica por URL.
                  </p>
                </div>

                <div className="rounded-[16px] bg-[var(--color-input-bg)] p-4">
                  {sunatConfig?.certificadoConfigurado &&
                  sunatConfig.certificado ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#10b981]">
                          <FileTextIcon size={20} weight="fill" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                            {sunatConfig.certificado.nombre ?? "Certificado"}
                          </p>
                          <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                            {formatFileSize(sunatConfig.certificado.sizeBytes)}
                          </p>
                          {sunatConfig.certificado.uploadedAt && (
                            <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                              Subido:{" "}
                              {new Date(
                                sunatConfig.certificado.uploadedAt,
                              ).toLocaleDateString("es-PE")}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteCertificate()}
                        disabled={isCertificateSubmitting}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#ef4444]/10 text-sm font-circular-bold text-[#dc2626] transition-colors hover:bg-[#ef4444]/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TrashIcon size={16} weight="bold" />
                        Eliminar certificado
                      </button>
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
                      <p className="mt-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                        Sube un archivo .pfx o .p12.
                      </p>
                    </div>
                  )}
                </div>

                <input
                  ref={certificateInputRef}
                  type="file"
                  accept=".pfx,.p12"
                  onChange={handleCertificateChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => certificateInputRef.current?.click()}
                  disabled={isCertificateSubmitting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CloudArrowUpIcon size={18} weight="bold" />
                  Seleccionar certificado
                </button>

                {certificateFile && (
                  <p className="truncate text-xs font-circular-bold text-[var(--color-primary)]">
                    {certificateFile.name} (
                    {formatFileSize(certificateFile.size)})
                  </p>
                )}

                <InputField
                  id="certificate-password"
                  label="Contrasena certificado"
                  value={certificatePassword}
                  placeholder="Contrasena .pfx/.p12"
                  maxLength={255}
                  type="password"
                  icon={<KeyIcon size={16} weight="bold" />}
                  disabled={isCertificateSubmitting}
                  onChange={setCertificatePassword}
                />

                <button
                  type="button"
                  onClick={() => void uploadCertificate()}
                  disabled={
                    !certificateFile ||
                    !certificatePassword.trim() ||
                    isCertificateSubmitting
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CloudArrowUpIcon size={18} weight="bold" />
                  {isCertificateSubmitting
                    ? "Guardando..."
                    : "Subir certificado"}
                </button>
              </aside>
            </section>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-circular-bold transition-colors",
        active
          ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"
          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusTile({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            ok
              ? "bg-[#10b981]/10 text-[#10b981]"
              : "bg-[#f59e0b]/10 text-[#d97706]",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]">
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

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-4">
      <span className="text-[var(--color-primary)]">{icon}</span>
      <h4 className="text-sm font-circular-bold text-[var(--color-text)]">
        {title}
      </h4>
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
  step,
  min,
  max,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  maxLength: number;
  icon: React.ReactNode;
  disabled: boolean;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">
          {icon}
        </span>
        <input
          id={id}
          type={type}
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
        <label
          htmlFor={id}
          className="block text-sm font-circular-regular text-[#4e5671]"
        >
          {label}
        </label>
        {configured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#10b981]/10 px-2 py-0.5 text-[11px] font-circular-bold text-[#047857]">
            <CheckCircleIcon size={12} weight="bold" />
            Configurado
          </span>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">
          <KeyIcon size={16} weight="bold" />
        </span>
        <input
          id={id}
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={configured ? "Dejar vacio para mantener" : placeholder}
          maxLength={255}
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
  options: { label: string; value: string }[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
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

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setSearch("");
      setIsOpen(true);
    }
  };

  const handleSelect = (item: PeruUbigeo) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <p className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        Ubigeo / distrito
      </p>
      <button
        type="button"
        onClick={handleToggle}
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
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]">
              <MapPinIcon size={14} weight="bold" />
            </span>
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
                  onClick={() => handleSelect(item)}
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
                      "shrink-0 text-xs font-black font-circular-regular text-[var(--color-primary)]",
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

function toSunatForm(config: SunatConfig): SunatForm {
  return {
    ambiente: config.ambiente,
    activo: config.activo,
    igvPorcentaje: config.igvPorcentaje || "18.00",
    usuarioSol: "",
    claveSol: "",
    clientId: "",
    clientSecret: "",
  };
}

function formatFileSize(size: number | null | undefined) {
  if (!size) {
    return "Tamano no disponible";
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

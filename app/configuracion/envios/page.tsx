"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CaretDownIcon,
  CheckCircleIcon,
  ClockIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  GearSixIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MotorcycleIcon,
  PowerIcon,
  StorefrontIcon,
  TruckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  enviosConfigApi,
  envioPreviewColors,
  type DespachoConfig,
  type EnvioMetodoConfig,
  type EnvioPreviewConfig,
} from "@/lib/api/envios-config";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

type EnvioStatusFilter = "todos" | "active" | "inactive";

const metodosCatalog: Record<
  string,
  { image?: string; descripcion: string }
> = {
  RECOJO: {
    descripcion: "Entrega directa en tienda",
  },
  MOTORIZADO: {
    descripcion: "Delivery motorizado a domicilio",
  },
  DOMICILIO: {
    descripcion: "Envío a la dirección del cliente",
  },
  SHALOM: {
    image: "/envios/shalom.svg",
    descripcion: "Entrega a agencias Shalom",
  },
  OLVA: {
    image: "/envios/olva.webp",
    descripcion: "Entrega a agencias Olva",
  },
};

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const statusOptions: { label: string; value: EnvioStatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "active" },
  { label: "Inactivo", value: "inactive" },
];

const dispatchWeekdays = [
  { value: 0, label: "D", full: "Domingo" },
  { value: 1, label: "L", full: "Lunes" },
  { value: 2, label: "M", full: "Martes" },
  { value: 3, label: "X", full: "Miércoles" },
  { value: 4, label: "J", full: "Jueves" },
  { value: 5, label: "V", full: "Viernes" },
  { value: 6, label: "S", full: "Sábado" },
];

const allWeekdays = dispatchWeekdays.map((day) => day.value);

export default function EnviosConfigPage() {
  const { showToast } = useSystemToast();
  const { companyInfo } = useAuth();
  const [configs, setConfigs] = useState<EnvioMetodoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<EnvioStatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [direccionDraft, setDireccionDraft] = useState<Record<string, string>>(
    {},
  );
  const [savingDireccion, setSavingDireccion] = useState<string | null>(null);
  const [direccionModal, setDireccionModal] = useState<{
    metodo: string;
    nombre: string;
  } | null>(null);
  const [despacho, setDespacho] = useState<DespachoConfig | null>(null);
  const [despachoModo, setDespachoModo] = useState<"todos" | "elegir">(
    "todos",
  );
  const [despachoDias, setDespachoDias] = useState<number[]>(allWeekdays);
  const [despachoHoraCorte, setDespachoHoraCorte] = useState("18:00");
  const [despachoAnticipacion, setDespachoAnticipacion] = useState("0");
  const [recojoUsaDespacho, setRecojoUsaDespacho] = useState(true);
  const [recojoModo, setRecojoModo] = useState<"todos" | "elegir">("todos");
  const [recojoDias, setRecojoDias] = useState<number[]>(allWeekdays);
  const [recojoHoraCorte, setRecojoHoraCorte] = useState("18:00");
  const [recojoAnticipacion, setRecojoAnticipacion] = useState("0");
  const [savingDespacho, setSavingDespacho] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isRecojoOpen, setIsRecojoOpen] = useState(false);
  const [savingRecojo, setSavingRecojo] = useState(false);
  const [preview, setPreview] = useState<EnvioPreviewConfig | null>(null);
  const [previewTitulo, setPreviewTitulo] = useState("");
  const [previewDescripcion, setPreviewDescripcion] = useState("");
  const [previewTextoCentral, setPreviewTextoCentral] = useState("");
  const [previewColor, setPreviewColor] = useState("#101D69");
  const [savingPreview, setSavingPreview] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await enviosConfigApi.findAll();
      setConfigs(data);
      setDireccionDraft(
        Object.fromEntries(
          data.map((config) => [config.metodo, config.direccion ?? ""]),
        ),
      );
    } catch (error: unknown) {
      showToast({
        title: "No se pudieron cargar los métodos de envío",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const loadDespacho = useCallback(async () => {
    try {
      const data = await enviosConfigApi.findDespacho();
      setDespacho(data);
      if (data.configurado) {
        setDespachoModo(data.diasSemana.length === 7 ? "todos" : "elegir");
        setDespachoDias(data.diasSemana);
        setDespachoHoraCorte(data.horaCorte);
        setDespachoAnticipacion(String(data.anticipacionDias ?? 0));
      }
    } catch {
      setDespacho({
        diasSemana: [],
        horaCorte: "",
        anticipacionDias: 0,
        configurado: false,
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDespacho();
  }, [loadDespacho]);

  const loadRecojo = useCallback(async () => {
    try {
      const data = await enviosConfigApi.findRecojo();
      setRecojoUsaDespacho(data.usaDespacho);
      if (!data.usaDespacho) {
        setRecojoModo(data.diasSemana.length === 7 ? "todos" : "elegir");
        setRecojoDias(data.diasSemana);
        setRecojoHoraCorte(data.horaCorte);
        setRecojoAnticipacion(String(data.anticipacionDias ?? 0));
      }
    } catch {
      setRecojoUsaDespacho(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRecojo();
  }, [loadRecojo]);

  const loadPreview = useCallback(async () => {
    try {
      const data = await enviosConfigApi.findPreview();
      setPreview(data);
      setPreviewTitulo(data.titulo ?? "");
      setPreviewDescripcion(data.descripcion ?? "");
      setPreviewTextoCentral(data.textoCentral ?? "");
      setPreviewColor(data.colorPrimario);
    } catch {
      setPreview(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPreview();
  }, [loadPreview]);

  const saveDespacho = async () => {
    if (savingDespacho) return;
    const dias = despachoModo === "todos" ? allWeekdays : despachoDias;
    if (dias.length === 0) {
      showToast({
        title: "Selecciona al menos un día de despacho",
        variant: "error",
      });
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(despachoHoraCorte)) {
      showToast({
        title: "Ingresa una hora de corte válida (HH:mm)",
        variant: "error",
      });
      return;
    }
    const anticipacion = Number(despachoAnticipacion);
    if (
      !Number.isInteger(anticipacion) ||
      anticipacion < 0 ||
      anticipacion > 30
    ) {
      showToast({
        title: "La anticipación debe ser un entero entre 0 y 30 días",
        variant: "error",
      });
      return;
    }
    setSavingDespacho(true);
    try {
      const updated = await enviosConfigApi.updateDespacho({
        diasSemana: dias,
        horaCorte: despachoHoraCorte,
        anticipacionDias: anticipacion,
      });
      setDespacho(updated);
      setIsConfigOpen(false);
      showToast({
        title: "Días de despacho guardados",
        description: "La fecha de envío ya estará disponible en tus enlaces.",
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo guardar la configuración",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSavingDespacho(false);
    }
  };

  const saveRecojo = async () => {
    if (savingRecojo) return;
    const dias = recojoModo === "todos" ? allWeekdays : recojoDias;
    if (!recojoUsaDespacho) {
      if (dias.length === 0) {
        showToast({
          title: "Selecciona al menos un día de recojo",
          variant: "error",
        });
        return;
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(recojoHoraCorte)) {
        showToast({
          title: "Ingresa una hora de corte de recojo válida (HH:mm)",
          variant: "error",
        });
        return;
      }
      const anticipacion = Number(recojoAnticipacion);
      if (
        !Number.isInteger(anticipacion) ||
        anticipacion < 0 ||
        anticipacion > 30
      ) {
        showToast({
          title: "La anticipación de recojo debe ser un entero entre 0 y 30",
          variant: "error",
        });
        return;
      }
    }
    setSavingRecojo(true);
    try {
      const updated = await enviosConfigApi.updateRecojo(
        recojoUsaDespacho
          ? { usarDespacho: true }
          : {
              usarDespacho: false,
              diasSemana: dias,
              horaCorte: recojoHoraCorte,
              anticipacionDias: Number(recojoAnticipacion),
            },
      );
      setRecojoUsaDespacho(updated.usaDespacho);
      setIsRecojoOpen(false);
      showToast({
        title: "Configuración de recojo guardada",
        description: "La fecha de recojo ya está actualizada.",
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo guardar la configuración de recojo",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSavingRecojo(false);
    }
  };

  const savePreview = async () => {
    if (savingPreview) return;
    setSavingPreview(true);
    try {
      const updated = await enviosConfigApi.updatePreview({
        titulo: previewTitulo.trim() || null,
        descripcion: previewDescripcion.trim() || null,
        colorPrimario: previewColor,
        textoCentral: previewTextoCentral.trim() || null,
      });
      setPreview(updated);
      setPreviewTitulo(updated.titulo ?? "");
      setPreviewDescripcion(updated.descripcion ?? "");
      setPreviewTextoCentral(updated.textoCentral ?? "");
      setPreviewColor(updated.colorPrimario);
      showToast({
        title: "Vista previa guardada",
        description: "Los nuevos enlaces usarán esta vista previa.",
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo guardar la vista previa",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSavingPreview(false);
    }
  };

  const withStatus = useMemo(
    () =>
      configs.map((config) => ({
        ...config,
        catalog: metodosCatalog[config.metodo],
      })),
    [configs],
  );

  const totals = useMemo(
    () => ({
      total: withStatus.length,
      activos: withStatus.filter((item) => item.activo).length,
      inactivos: withStatus.filter((item) => !item.activo).length,
    }),
    [withStatus],
  );

  const despachoDiasResumen = useMemo(() => {
    if (!despacho?.configurado) return "Sin configurar";
    const dias = [...despacho.diasSemana].sort((a, b) => a - b);
    if (dias.length === 7) return "Todos los días";
    if (dias.length === 0) return "Sin días";
    return dispatchWeekdays
      .filter((day) => dias.includes(day.value))
      .map((day) => day.full)
      .join(" · ");
  }, [despacho]);

  const direccionTienda = useMemo(
    () =>
      configs.find((config) => config.metodo === "RECOJO")?.direccion ||
      "Sin dirección",
    [configs],
  );

  const despachoHoraCorteResumen = despacho?.configurado
    ? despacho.horaCorte
    : "—";
  const despachoAnticipacionResumen = despacho?.configurado
    ? `${despacho.anticipacionDias} ${
        despacho.anticipacionDias === 1 ? "día" : "días"
      }`
    : "—";

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return withStatus.filter((item) => {
      const matchesSearch =
        !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.metodo.toLowerCase().includes(term);
      const matchesStatus =
        selectedStatus === "todos" ||
        (selectedStatus === "active" && item.activo) ||
        (selectedStatus === "inactive" && !item.activo);
      return matchesSearch && matchesStatus;
    });
  }, [withStatus, searchTerm, selectedStatus]);

  const toggle = async (metodo: string, activo: boolean) => {
    if (toggling) return;
    setOpenMenuId(null);
    setToggling(metodo);
    const previous = configs;
    setConfigs((current) =>
      current.map((config) =>
        config.metodo === metodo ? { ...config, activo } : config,
      ),
    );
    try {
      const updated = await enviosConfigApi.update(metodo, { activo });
      setConfigs((current) =>
        current.map((config) =>
          config.metodo === updated.metodo ? updated : config,
        ),
      );
      showToast({
        title: activo ? "Método activado" : "Método inactivado",
        description: updated.nombre,
        variant: "success",
      });
    } catch (error: unknown) {
      setConfigs(previous);
      showToast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setToggling(null);
    }
  };

  const saveDireccion = async (metodo: string, activo: boolean) => {
    if (savingDireccion) return;
    setSavingDireccion(metodo);
    try {
      const updated = await enviosConfigApi.update(metodo, {
        activo,
        direccion: direccionDraft[metodo] ?? "",
      });
      setConfigs((current) =>
        current.map((config) =>
          config.metodo === updated.metodo ? updated : config,
        ),
      );
      setDireccionDraft((current) => ({
        ...current,
        [metodo]: updated.direccion ?? "",
      }));
      showToast({
        title: "Dirección de recojo guardada",
        description: updated.nombre,
        variant: "success",
      });
      setDireccionModal(null);
    } catch (error: unknown) {
      showToast({
        title: "No se pudo guardar la dirección",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSavingDireccion(null);
    }
  };

  return (
    <DashboardShell headerTitle="Envíos">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f97316]/10 text-[#f97316]">
                <StorefrontIcon size={22} weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Dirección de tienda
                </p>
                <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                  {direccionTienda}
                </p>
              </div>
            </div>
          </div>
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Activos"
            value={totals.activos}
            tone="success"
          />
          <MetricCard
            icon={<WarningCircleIcon size={22} weight="fill" />}
            label="Inactivos"
            value={totals.inactivos}
            tone="warning"
          />
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            aria-label="Configurar despacho"
            className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 text-left shadow-sm transition-colors hover:bg-[var(--color-button-hover)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <GearSixIcon size={22} weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Despacho:{" "}
                  <span className="font-circular-bold text-[var(--color-text)]">
                    {despachoDiasResumen}
                  </span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-[var(--color-muted-foreground)]">
                  <span>Corte: {despachoHoraCorteResumen}</span>
                  <span>Anticipación: {despachoAnticipacionResumen}</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#25d366]">
                <EyeIcon size={22} weight="fill" />
              </span>
              <div>
                <p className="text-sm font-black text-[var(--color-text)]">
                  Vista previa del enlace
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Personaliza cómo se ve al compartir en WhatsApp
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void savePreview()}
              disabled={savingPreview}
              className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {savingPreview ? "Guardando..." : "Guardar vista previa"}
            </button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="preview-titulo"
                  className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-[var(--color-muted-foreground)]"
                >
                  <span>Título del enlace</span>
                  <span>{previewTitulo.length}/60</span>
                </label>
                <input
                  id="preview-titulo"
                  maxLength={60}
                  value={previewTitulo}
                  onChange={(event) => setPreviewTitulo(event.target.value)}
                  placeholder={`${companyInfo?.nombreComercial ?? "Nuvex"} — Datos de envío`}
                  className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <label
                  htmlFor="preview-descripcion"
                  className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-[var(--color-muted-foreground)]"
                >
                  <span>Descripción</span>
                  <span>{previewDescripcion.length}/120</span>
                </label>
                <textarea
                  id="preview-descripcion"
                  rows={2}
                  maxLength={120}
                  value={previewDescripcion}
                  onChange={(event) => setPreviewDescripcion(event.target.value)}
                  placeholder="Completa tus datos de envío para tu pedido."
                  className="min-h-[64px] w-full resize-none rounded-[14px] bg-[var(--color-input-bg)] px-4 py-2 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <label
                  htmlFor="preview-texto-central"
                  className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-[var(--color-muted-foreground)]"
                >
                  <span>Texto central de la imagen</span>
                  <span>{previewTextoCentral.length}/40</span>
                </label>
                <input
                  id="preview-texto-central"
                  maxLength={40}
                  value={previewTextoCentral}
                  onChange={(event) => setPreviewTextoCentral(event.target.value)}
                  placeholder="Registra tu envío"
                  className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-[var(--color-muted-foreground)]">
                  Color de fondo
                </p>
                <div className="flex flex-wrap gap-2">
                  {envioPreviewColors.map((color) => {
                    const selected = previewColor === color.value;
                    return (
                      <button
                        key={color.key}
                        type="button"
                        title={color.label}
                        aria-label={color.label}
                        aria-pressed={selected}
                        onClick={() => setPreviewColor(color.value)}
                        className={cn(
                          "grid size-9 place-items-center rounded-full transition-transform",
                          selected
                            ? "ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-sidebar-bg)]"
                            : "",
                        )}
                        style={{ backgroundColor: color.value }}
                      >
                        {selected ? (
                          <CheckCircleIcon
                            size={16}
                            weight="fill"
                            className="text-white"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0b141a] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-[#25d366] text-[10px] font-black text-white">
                  W
                </span>
                <p className="text-xs font-bold text-white/80">WhatsApp</p>
              </div>
              <div className="rounded-xl bg-[#e5ddd5] p-2">
                <div className="rounded-lg bg-white p-1 shadow">
                  <div
                    className="flex h-[150px] flex-col items-center justify-center overflow-hidden rounded-lg p-3 text-center"
                    style={{ background: previewGradient(previewColor) }}
                  >
                    {companyInfo?.logoUrl ? (
                      <Image
                        src={companyInfo.logoUrl}
                        alt={companyInfo.nombreComercial ?? "Logo"}
                        width={44}
                        height={44}
                        unoptimized
                        className="mb-2 h-11 w-11 rounded-xl bg-white object-contain p-1"
                      />
                    ) : null}
                    <span
                      className="text-lg font-black leading-tight"
                      style={{ color: previewTextColor(previewColor) }}
                    >
                      {previewTextoCentral || "Registra tu envío"}
                    </span>
                  </div>
                  <div className="px-1 pt-2">
                    <p className="text-[10px] text-[#7f8c8d]">nuvex.app</p>
                    <p className="truncate text-sm font-bold text-[#1f1f23]">
                      {previewTitulo ||
                        `${companyInfo?.nombreComercial ?? "Nuvex"} — Datos de envío`}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7f8c8d]">
                      {previewDescripcion ||
                        "Completa tus datos de envío para tu pedido."}
                    </p>
                  </div>
                </div>
                <div className="mt-1 flex justify-end pr-1 text-[10px] text-[#54656f]">
                  10:42
                </div>
              </div>
              {preview?.actualizadoAt ? (
                <p className="mt-2 text-[10px] text-white/50">
                  Última actualización:{" "}
                  {new Date(preview.actualizadoAt).toLocaleString("es-PE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:flex-row lg:items-center lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar método de envío..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <div className="flex items-center gap-2">
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
                setSelectedStatus(value as EnvioStatusFilter);
                setIsStatusOpen(false);
              }}
            />

            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              aria-label="Configuración de envíos"
              title="Configuración de envíos"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-input-bg)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <GearSixIcon size={20} weight="bold" />
              {!despacho?.configurado ? (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#f59e0b]" />
              ) : null}
            </button>
          </div>
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
        ) : filtered.length > 0 ? (
          <div className="grid gap-3 pb-2">
            {filtered.map((item) => {
              const status = item.activo
                ? statusConfig.activo
                : statusConfig.inactivo;
              const isToggling = toggling === item.metodo;

              return (
                <div
                  key={item.metodo}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(210px,1.2fr)_minmax(230px,1.25fr)_minmax(140px,0.75fr)_minmax(132px,0.7fr)] md:items-center md:gap-4 md:gap-y-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl",
                        item.catalog?.image
                          ? null
                          : item.metodo === "RECOJO"
                            ? "bg-[#f97316]"
                            : item.metodo === "MOTORIZADO"
                              ? "bg-[#3b82f6]"
                              : item.metodo === "DOMICILIO"
                                ? "bg-[#10b981]"
                                : "bg-[var(--color-primary)]",
                      )}
                    >
                      {item.catalog?.image ? (
                        <Image
                          src={item.catalog.image}
                          width={64}
                          height={44}
                          alt={item.nombre}
                          unoptimized
                          className="h-full w-full rounded-xl object-contain"
                        />
                      ) : item.metodo === "RECOJO" ? (
                        <StorefrontIcon
                          size={24}
                          weight="fill"
                          className="text-white"
                        />
                      ) : item.metodo === "MOTORIZADO" ? (
                        <MotorcycleIcon
                          size={24}
                          weight="fill"
                          className="text-white"
                        />
                      ) : item.metodo === "DOMICILIO" ? (
                        <HouseIcon
                          size={24}
                          weight="fill"
                          className="text-white"
                        />
                      ) : (
                        <TruckIcon
                          size={22}
                          weight="fill"
                          className="text-white"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {item.nombre}
                      </p>
                      <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                        {item.metodo}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-circular-regular text-[var(--color-text)]">
                      {item.catalog?.descripcion || "Método de envío"}
                    </p>
                    <p className="truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                      {item.tipo === "recojo" && item.direccion
                        ? item.direccion
                        : "Método de envío"}
                    </p>
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

                  <div className="col-span-2 flex items-center justify-end gap-2 md:col-span-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === item.metodo ? null : item.metodo,
                        )
                      }
                      disabled={isToggling}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:opacity-50"
                      aria-label="Más opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    <div className="relative">
                      {openMenuId === item.metodo && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                          {item.tipo === "recojo" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setIsRecojoOpen(true);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                              >
                                <StorefrontIcon size={16} weight="bold" />
                                Configurar recojo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setDireccionModal({
                                    metodo: item.metodo,
                                    nombre: item.nombre,
                                  });
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                              >
                                <MapPinIcon size={16} weight="bold" />
                                {item.direccion
                                  ? "Editar dirección"
                                  : "Agregar dirección"}
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              void toggle(item.metodo, !item.activo)
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <PowerIcon size={16} weight="bold" />
                            {item.activo ? "Inactivar" : "Activar"}
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
              <TruckIcon size={28} weight="fill" />
            </div>
            <h2 className="mt-4 text-lg font-black text-[var(--color-text)]">
              No hay métodos de envío para mostrar
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium text-[var(--color-muted-foreground)]">
              Cambia los filtros o actualiza la lista.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filtered.length} de {totals.total} métodos
          </p>
        </div>
      </div>

      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="Configuración de envíos"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold text-[var(--color-muted-foreground)]">
              ¿Qué días despachas?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDespachoModo("todos")}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-circular-bold transition-colors",
                  despachoModo === "todos"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                Todos los días
              </button>
              <button
                type="button"
                onClick={() => setDespachoModo("elegir")}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-circular-bold transition-colors",
                  despachoModo === "elegir"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                Elegir días
              </button>
            </div>
          </div>

          {despachoModo === "elegir" ? (
            <div>
              <p className="mb-2 text-xs font-bold text-[var(--color-muted-foreground)]">
                Días de despacho
              </p>
              <div className="flex flex-wrap gap-2">
                {dispatchWeekdays.map((day) => {
                  const selected = despachoDias.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      title={day.full}
                      onClick={() =>
                        setDespachoDias((current) =>
                          selected
                            ? current.filter((value) => value !== day.value)
                            : [...current, day.value].sort((a, b) => a - b),
                        )
                      }
                      className={cn(
                        "flex h-10 items-center justify-center rounded-full px-4 text-sm font-circular-bold transition-colors",
                        selected
                          ? "bg-[#fd741a] text-white"
                          : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                      )}
                    >
                      {day.full}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label
                htmlFor="despacho-hora-corte"
                className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]"
              >
                <ClockIcon size={16} className="text-[var(--color-primary)]" />
                Hora de corte
              </label>
              <input
                id="despacho-hora-corte"
                type="time"
                value={despachoHoraCorte}
                onChange={(event) => setDespachoHoraCorte(event.target.value)}
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                Los pedidos recibidos después de esta hora salen el siguiente
                día de despacho.
              </p>
            </div>

            <div className="flex-1">
              <label
                htmlFor="despacho-anticipacion"
                className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]"
              >
                <ClockIcon size={16} className="text-[var(--color-primary)]" />
                Anticipación (días)
              </label>
              <input
                id="despacho-anticipacion"
                type="number"
                min={0}
                max={30}
                step={1}
                value={despachoAnticipacion}
                onChange={(event) =>
                  setDespachoAnticipacion(event.target.value)
                }
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                Días mínimos necesarios para preparar el pedido.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveDespacho()}
              disabled={savingDespacho}
              className="h-11 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {savingDespacho ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRecojoOpen}
        onClose={() => setIsRecojoOpen(false)}
        title="Recojo en tienda"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3">
            <span className="text-sm font-circular-regular text-[var(--color-text)]">
              Usar la misma configuración de despacho
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={recojoUsaDespacho}
              onClick={() => {
                const checked = !recojoUsaDespacho;
                setRecojoUsaDespacho(checked);
                if (!checked && recojoUsaDespacho) {
                  setRecojoModo(despachoModo);
                  setRecojoDias(
                    despachoModo === "todos" ? allWeekdays : despachoDias,
                  );
                  setRecojoHoraCorte(despachoHoraCorte);
                  setRecojoAnticipacion(despachoAnticipacion);
                }
              }}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                recojoUsaDespacho ? "bg-[var(--color-primary)]" : "bg-[#9ca3af]",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1 h-4 w-4 rounded-full bg-white transition-transform",
                  recojoUsaDespacho ? "translate-x-5" : "translate-x-1",
                )}
              />
            </button>
          </div>

          {recojoUsaDespacho ? (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              El recojo usará los mismos días, hora de corte y anticipación que
              el despacho.
            </p>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-bold text-[var(--color-muted-foreground)]">
                  ¿Qué días hay recojo?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRecojoModo("todos")}
                    className={cn(
                      "flex-1 rounded-xl px-4 py-2.5 text-sm font-circular-bold transition-colors",
                      recojoModo === "todos"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    Todos los días
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecojoModo("elegir")}
                    className={cn(
                      "flex-1 rounded-xl px-4 py-2.5 text-sm font-circular-bold transition-colors",
                      recojoModo === "elegir"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    Elegir días
                  </button>
                </div>
              </div>

              {recojoModo === "elegir" ? (
                <div>
                  <p className="mb-2 text-xs font-bold text-[var(--color-muted-foreground)]">
                    Días de recojo
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dispatchWeekdays.map((day) => {
                      const selected = recojoDias.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          title={day.full}
                          onClick={() =>
                            setRecojoDias((current) =>
                              selected
                                ? current.filter(
                                    (value) => value !== day.value,
                                  )
                                : [...current, day.value].sort((a, b) => a - b),
                            )
                          }
                          className={cn(
                            "flex h-10 items-center justify-center rounded-full px-4 text-sm font-circular-bold transition-colors",
                            selected
                              ? "bg-[#fd741a] text-white"
                              : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                          )}
                        >
                          {day.full}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label
                    htmlFor="recojo-hora-corte"
                    className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]"
                  >
                    <ClockIcon
                      size={16}
                      className="text-[var(--color-primary)]"
                    />
                    Hora de corte
                  </label>
                  <input
                    id="recojo-hora-corte"
                    type="time"
                    value={recojoHoraCorte}
                    onChange={(event) =>
                      setRecojoHoraCorte(event.target.value)
                    }
                    className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="recojo-anticipacion"
                    className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]"
                  >
                    <ClockIcon
                      size={16}
                      className="text-[var(--color-primary)]"
                    />
                    Anticipación (días)
                  </label>
                  <input
                    id="recojo-anticipacion"
                    type="number"
                    min={0}
                    max={30}
                    step={1}
                    value={recojoAnticipacion}
                    onChange={(event) =>
                      setRecojoAnticipacion(event.target.value)
                    }
                    className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                    Días mínimos para preparar el pedido para recojo.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveRecojo()}
              disabled={savingRecojo}
              className="h-11 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {savingRecojo ? "Guardando..." : "Guardar recojo"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={direccionModal !== null}
        onClose={() => setDireccionModal(null)}
        title="Dirección de recojo"
        size="md"
      >
        {direccionModal ? (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={direccionDraft[direccionModal.metodo] ?? ""}
                onChange={(event) =>
                  setDireccionDraft((current) => ({
                    ...current,
                    [direccionModal.metodo]: event.target.value,
                  }))
                }
                placeholder="Ej. Av. Principal 123, Lima"
                maxLength={300}
                autoFocus
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                Esta dirección se mostrará a tus clientes cuando elijan
                &quot;Recojo en tienda&quot; en el enlace de envío.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDireccionModal(null)}
                disabled={savingDireccion !== null}
                className="h-11 flex-1 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const config = configs.find(
                    (item) => item.metodo === direccionModal.metodo,
                  );
                  void saveDireccion(
                    direccionModal.metodo,
                    config?.activo ?? true,
                  );
                }}
                disabled={savingDireccion !== null}
                className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {savingDireccion ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
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

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [16, 29, 105];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function shiftColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const shift = (channel: number) =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount)),
      ),
    );
  return `rgb(${shift(r)}, ${shift(g)}, ${shift(b)})`;
}

function previewGradient(color: string): string {
  return `linear-gradient(135deg, ${shiftColor(color, -0.28)} 0%, ${color} 55%, ${shiftColor(color, 0.22)} 100%)`;
}

function previewTextColor(color: string): string {
  const [r, g, b] = hexToRgb(color);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

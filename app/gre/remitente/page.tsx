"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CaretDownIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudArrowUpIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  FileCodeIcon,
  FilePdfIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PackageIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  PrinterIcon,
  TruckIcon,
  UserIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CalendarInput } from "@/components/ui/calendar-input";
import { branchesApi, type Branch } from "@/lib/api/branches";
import {
  guiaRemisionApi,
  guiaRemisionCatalogosApi,
  type CreateGuiaRemisionDetalle,
  type CreateGuiaRemisionPayload,
  type GuiaCatalogoParticipante,
  type GuiaCatalogoVehiculo,
  type GuiaRemisionEstado,
  type GuiaRemisionResponse,
  type GuiaRemisionSunatEstado,
} from "@/lib/api/guia-remision";
import { cn } from "@/lib/utils";
import { documentFileName } from "@/lib/document-file-name";

type EstadoFilter = GuiaRemisionEstado | "todos";
type SunatFilter = GuiaRemisionSunatEstado | "todos";

function getDefaultCreateForm() {
  return {
    sucursalId: "",
    sucursalPartidaId: "",
    sucursalLlegadaId: "",
    fechaInicioTraslado: new Date().toISOString().slice(0, 10),
    motivoTraslado: "04",
    pesoBrutoTotal: "1.000",
    numeroBultos: "1",
    destinatarioTipoDoc: "6",
    destinatarioNroDoc: "",
    destinatarioRazonSocial: "",
    conductorId: "",
    vehiculoId: "",
    documentoTipo: "",
    documentoSerie: "",
    documentoNumero: "",
    observaciones: "",
    emitirDirectamente: false,
  };
}

const defaultDetail: CreateGuiaRemisionDetalle = {
  descripcion: "",
  cantidad: "1",
  unidadMedida: "NIU",
  codigoProducto: "",
  pesoUnitario: "",
};
type DraftDetail = CreateGuiaRemisionDetalle & { uiId: string };

function createDraftDetail(): DraftDetail {
  return { ...defaultDetail, uiId: crypto.randomUUID() };
}

type CreateGuiaForm = ReturnType<typeof getDefaultCreateForm>;

const motivoOptions = [
  { label: "Traslado entre establecimientos", value: "04" },
  { label: "Venta", value: "01" },
  { label: "Compra", value: "02" },
  { label: "Venta con entrega a terceros", value: "03" },
  { label: "Consignacion", value: "05" },
  { label: "Devolucion", value: "06" },
  { label: "Otros", value: "13" },
];

const estadoOptions: { label: string; value: EstadoFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Borrador", value: "borrador" },
  { label: "Emitida", value: "emitida" },
  { label: "Aceptada", value: "aceptada" },
  { label: "Rechazada", value: "rechazada" },
  { label: "Anulada", value: "anulada" },
];

const sunatOptions: { label: string; value: SunatFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "No aplica", value: "no_aplica" },
  { label: "Por enviar", value: "pendiente_envio" },
  { label: "Enviando", value: "enviando" },
  { label: "Pendiente CDR", value: "pendiente_cdr" },
  { label: "Aceptado", value: "aceptado" },
  { label: "Observado", value: "observado" },
  { label: "Rechazado", value: "rechazado" },
  { label: "Error transitorio", value: "error_transitorio" },
  { label: "Error definitivo", value: "error_definitivo" },
];

const estadoGuiaConfig: Record<
  GuiaRemisionEstado,
  {
    label: string;
    bg: string;
    text: string;
    icon: typeof TruckIcon;
  }
> = {
  borrador: {
    label: "Borrador",
    bg: "bg-[var(--color-input-bg)]",
    text: "text-[var(--color-muted-foreground)]",
    icon: ClockIcon,
  },
  emitida: {
    label: "Emitida",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
    icon: CloudArrowUpIcon,
  },
  aceptada: {
    label: "Aceptada",
    bg: "bg-[#10b981]",
    text: "text-white",
    icon: CheckCircleIcon,
  },
  rechazada: {
    label: "Rechazada",
    bg: "bg-[#ef4444]",
    text: "text-white",
    icon: XCircleIcon,
  },
  anulada: {
    label: "Anulada",
    bg: "bg-[#6b7280]",
    text: "text-white",
    icon: XCircleIcon,
  },
};

const sunatStatusConfig: Record<
  GuiaRemisionSunatEstado,
  { label: string; dot: string }
> = {
  no_aplica: { label: "No aplica", dot: "bg-[var(--color-muted-foreground)]" },
  pendiente_envio: { label: "Por enviar", dot: "bg-[#3b82f6]" },
  enviando: { label: "Enviando", dot: "bg-[#3b82f6]" },
  pendiente_cdr: { label: "Pendiente CDR", dot: "bg-[#f59e0b]" },
  aceptado: { label: "Aceptado", dot: "bg-[#10b981]" },
  observado: { label: "Observado", dot: "bg-[#f59e0b]" },
  rechazado: { label: "Rechazado", dot: "bg-[#ef4444]" },
  error_transitorio: { label: "Error transitorio", dot: "bg-[#f59e0b]" },
  error_definitivo: { label: "Error definitivo", dot: "bg-[#ef4444]" },
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const hours = date.getHours();
  const displayHours = hours % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${displayHours}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
}

function formatWeight(guia: GuiaRemisionResponse) {
  const amount = Number(guia.pesoBrutoTotal);
  const value = Number.isFinite(amount) ? amount.toFixed(3) : "0.000";
  return `${value} ${guia.unidadPeso}`;
}

function getDocumentLabel(tipoDocumento: string) {
  if (tipoDocumento === "6") return "RUC";
  if (tipoDocumento === "1") return "DNI";
  return "Doc";
}

function getTransportLabel(guia: GuiaRemisionResponse) {
  const transportista = guia.participantes.find(
    (item) => item.tipo === "transportista",
  );
  if (transportista?.razonSocial) return transportista.razonSocial;

  const conductor = guia.participantes.find(
    (item) => item.tipo === "conductor",
  );
  const conductorName = [conductor?.nombres, conductor?.apellidos]
    .filter(Boolean)
    .join(" ");
  return conductorName || "Sin transporte";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intentalo nuevamente";
}

export default function GuiasRemisionPage() {
  const toast = useSystemToast();
  const estadoRef = useRef<HTMLDivElement>(null);
  const sunatRef = useRef<HTMLDivElement>(null);

  const [guias, setGuias] = useState<GuiaRemisionResponse[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedEstado, setSelectedEstado] = useState<EstadoFilter>("todos");
  const [selectedSunat, setSelectedSunat] = useState<SunatFilter>("todos");
  const [page, setPage] = useState(1);
  const [isEstadoOpen, setIsEstadoOpen] = useState(false);
  const [isSunatOpen, setIsSunatOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] =
    useState<CreateGuiaForm>(() => getDefaultCreateForm());
  const [details, setDetails] = useState<DraftDetail[]>([
    { ...defaultDetail, uiId: "initial" },
  ]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [conductores, setConductores] = useState<GuiaCatalogoParticipante[]>(
    [],
  );
  const [vehiculos, setVehiculos] = useState<GuiaCatalogoVehiculo[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadGuias = useCallback(() => {
    setIsLoading(true);

    guiaRemisionApi
      .findAll({
        page,
        limit: 10,
        q: debouncedSearchTerm || undefined,
        estado: selectedEstado === "todos" ? undefined : selectedEstado,
        sunatEstado: selectedSunat === "todos" ? undefined : selectedSunat,
      })
      .then((response) => {
        setGuias(response.data);
        setMeta(response.meta);
      })
      .catch((error: unknown) => {
        setGuias([]);
        setMeta({ page: 1, limit: 10, total: 0, totalPages: 1 });
        toast.showToast({
          title: "No se pudieron cargar las guias",
          description: getErrorMessage(error),
          variant: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [debouncedSearchTerm, page, selectedEstado, selectedSunat, toast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadGuias, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadGuias]);

  useEffect(() => {
    if (!isCreateOpen) return;

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsCatalogLoading(true);

      Promise.all([
        branchesApi.findAll({ limit: 100, estado: "activo" }),
        guiaRemisionCatalogosApi.findParticipantes({
          limit: 100,
          tipo: "conductor",
          activo: true,
        }),
        guiaRemisionCatalogosApi.findVehiculos({ limit: 100, activo: true }),
      ])
        .then(([branchesResponse, driversResponse, vehiclesResponse]) => {
          if (!isMounted) return;
          setBranches(branchesResponse.data);
          setConductores(driversResponse.data);
          setVehiculos(vehiclesResponse.data);
          const defaultBranch =
            branchesResponse.data.find((branch) => branch.esPrincipal) ??
            branchesResponse.data[0];
          setCreateForm((current) => ({
            ...current,
            sucursalId: current.sucursalId || defaultBranch?.id || "",
            sucursalPartidaId:
              current.sucursalPartidaId || defaultBranch?.id || "",
            sucursalLlegadaId:
              current.sucursalLlegadaId || defaultBranch?.id || "",
          }));
        })
        .catch((error: unknown) => {
          if (!isMounted) return;
          toast.showToast({
            title: "No se pudieron cargar datos",
            description: getErrorMessage(error),
            variant: "error",
          });
        })
        .finally(() => {
          if (isMounted) setIsCatalogLoading(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isCreateOpen, toast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        estadoRef.current &&
        !estadoRef.current.contains(event.target as Node)
      ) {
        setIsEstadoOpen(false);
      }

      if (
        sunatRef.current &&
        !sunatRef.current.contains(event.target as Node)
      ) {
        setIsSunatOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const summary = useMemo(() => {
    const aceptadas = guias.filter((item) => item.estado === "aceptada").length;
    const porEnviar = guias.filter(
      (item) =>
        item.sunat.estado === "pendiente_envio" ||
        item.sunat.estado === "enviando" ||
        item.sunat.estado === "pendiente_cdr",
    ).length;
    const alertas = guias.filter(
      (item) =>
        item.estado === "rechazada" ||
        item.sunat.estado === "rechazado" ||
        item.sunat.estado === "error_transitorio" ||
        item.sunat.estado === "error_definitivo",
    ).length;
    const totalItems = guias.reduce(
      (sum, item) => sum + item.detalles.length,
      0,
    );

    return { aceptadas, porEnviar, alertas, totalItems };
  }, [guias]);

  const handleEmitir = async (guia: GuiaRemisionResponse) => {
    if (workingId) return;

    setWorkingId(guia.publicId);
    const loadingId = toast.showToast({
      title: "Programando envio SUNAT...",
      description: guia.correlativo,
      variant: "loading",
    });

    try {
      await guiaRemisionApi.emitir(guia.publicId);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Envio programado",
        description: guia.correlativo,
        variant: "success",
      });
      loadGuias();
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo emitir la guia",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setWorkingId(null);
      setOpenMenuId(null);
    }
  };

  const handleConsultarCdr = async (guia: GuiaRemisionResponse) => {
    if (workingId) return;

    setWorkingId(guia.publicId);
    const loadingId = toast.showToast({
      title: "Consultando CDR...",
      description: guia.correlativo,
      variant: "loading",
    });

    try {
      await guiaRemisionApi.consultarCdr(guia.publicId);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Consulta programada",
        description: guia.correlativo,
        variant: "success",
      });
      loadGuias();
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo consultar el CDR",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setWorkingId(null);
      setOpenMenuId(null);
    }
  };

  const handleDownload = async (
    guia: GuiaRemisionResponse,
    artifact: "pdf" | "xml" | "cdr",
  ) => {
    if (downloadingId) return;

    const downloadKey = `${guia.publicId}-${artifact}`;
    setDownloadingId(downloadKey);
    const loadingId = toast.showToast({
      title: "Preparando descarga...",
      description: guia.correlativo,
      variant: "loading",
    });

    try {
      const blob =
        artifact === "pdf"
          ? await guiaRemisionApi.downloadPdf(guia.publicId)
          : artifact === "xml"
            ? await guiaRemisionApi.downloadSunatXml(guia.publicId)
            : await guiaRemisionApi.downloadSunatCdr(guia.publicId);
      const extension =
        artifact === "pdf" ? "pdf" : artifact === "xml" ? "xml" : "zip";
      const fileName = documentFileName(guia.correlativo, extension);

      downloadBlob(blob, fileName);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Archivo descargado",
        description: fileName,
        variant: "success",
      });
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo descargar el archivo",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setDownloadingId(null);
      setOpenMenuId(null);
    }
  };

  const closeCreateModal = () => {
    if (isSubmittingCreate) return;
    setIsCreateOpen(false);
    setCreateForm(getDefaultCreateForm());
    setDetails([{ ...defaultDetail, uiId: "initial" }]);
    setCreateError("");
  };

  const handleCreateGuia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");

    const cleanDetails = details.flatMap((detail) => {
      const cleanDetail = {
        descripcion: detail.descripcion.trim(),
        cantidad: detail.cantidad.trim(),
        unidadMedida: (detail.unidadMedida || "NIU").trim().toUpperCase(),
        codigoProducto: detail.codigoProducto?.trim() || undefined,
        pesoUnitario: detail.pesoUnitario?.trim() || undefined,
      };

      return cleanDetail.descripcion ? [cleanDetail] : [];
    });

    if (
      !createForm.sucursalId ||
      !createForm.sucursalPartidaId ||
      !createForm.sucursalLlegadaId
    ) {
      setCreateError("Selecciona sucursal de emision, partida y llegada.");
      return;
    }
    if (!createForm.destinatarioNroDoc || !createForm.destinatarioRazonSocial) {
      setCreateError("Completa documento y razon social del destinatario.");
      return;
    }
    if (!createForm.conductorId || !createForm.vehiculoId) {
      setCreateError("Selecciona conductor y placa.");
      return;
    }
    if (!cleanDetails.length) {
      setCreateError("Agrega al menos un detalle.");
      return;
    }

    const documentosRelacionados =
      createForm.documentoTipo &&
      createForm.documentoSerie.trim() &&
      createForm.documentoNumero.trim()
        ? [
            {
              tipoDocumento: createForm.documentoTipo,
              serie: createForm.documentoSerie.trim().toUpperCase(),
              numero: createForm.documentoNumero.trim(),
            },
          ]
        : undefined;

    const payload: CreateGuiaRemisionPayload = {
      sucursalId: createForm.sucursalId,
      fechaInicioTraslado: createForm.fechaInicioTraslado,
      motivoTraslado: createForm.motivoTraslado,
      modalidadTransporte: "02",
      pesoBrutoTotal: createForm.pesoBrutoTotal,
      unidadPeso: "KGM",
      numeroBultos: createForm.numeroBultos
        ? Number(createForm.numeroBultos)
        : undefined,
      observaciones: createForm.observaciones.trim() || undefined,
      sucursalPartidaId: createForm.sucursalPartidaId,
      sucursalLlegadaId: createForm.sucursalLlegadaId,
      destinatarioTipoDoc: createForm.destinatarioTipoDoc,
      destinatarioNroDoc: createForm.destinatarioNroDoc.trim(),
      destinatarioRazonSocial: createForm.destinatarioRazonSocial.trim(),
      detalles: cleanDetails,
      documentosRelacionados,
      catalogoParticipanteIds: [createForm.conductorId],
      catalogoVehiculoIds: [createForm.vehiculoId],
      emitirDirectamente: createForm.emitirDirectamente,
    };

    setIsSubmittingCreate(true);
    const loadingId = toast.showToast({
      title: "Creando guia...",
      description: "GRE Remitente",
      variant: "loading",
    });

    try {
      const created = await guiaRemisionApi.create(payload);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Guia creada",
        description: created.correlativo,
        variant: "success",
      });
      closeCreateModal();
      setPage(1);
      loadGuias();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.dismissToast(loadingId);
      setCreateError(message);
      toast.showToast({
        title: "No se pudo crear la guia",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  return (
    <DashboardShell headerTitle="Guias de Remision">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Aceptadas"
            value={summary.aceptadas}
            icon={CheckCircleIcon}
            color="text-[#10b981]"
            bg="bg-[#10b981]/10"
          />
          <SummaryCard
            label="Por enviar"
            value={summary.porEnviar}
            icon={CloudArrowUpIcon}
            color="text-[#3b82f6]"
            bg="bg-[#3b82f6]/10"
          />
          <SummaryCard
            label="Con alerta"
            value={summary.alertas}
            icon={WarningCircleIcon}
            color="text-[#ef4444]"
            bg="bg-[#ef4444]/10"
          />
          <SummaryCard
            label="Total items"
            value={summary.totalItems}
            icon={PackageIcon}
            color="text-[var(--color-primary)]"
            bg="bg-[#101d69]/10 dark:bg-[#fd741a]/10"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por guia, cliente, documento o destino..."
              aria-label="Buscar por guia, cliente, documento o destino..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-full sm:w-[180px]" ref={estadoRef}>
            <FilterDropdown
              label={
                selectedEstado === "todos"
                  ? "Estado guia"
                  : estadoGuiaConfig[selectedEstado].label
              }
              open={isEstadoOpen}
              onToggle={() => {
                setIsEstadoOpen(!isEstadoOpen);
                setIsSunatOpen(false);
              }}
              options={estadoOptions}
              selected={selectedEstado}
              onSelect={(value) => {
                setSelectedEstado(value as EstadoFilter);
                setPage(1);
                setIsEstadoOpen(false);
              }}
            />
          </div>

          <div className="relative w-full sm:w-[180px]" ref={sunatRef}>
            <FilterDropdown
              label={
                selectedSunat === "todos"
                  ? "Estado SUNAT"
                  : sunatStatusConfig[selectedSunat].label
              }
              open={isSunatOpen}
              onToggle={() => {
                setIsSunatOpen(!isSunatOpen);
                setIsEstadoOpen(false);
              }}
              options={sunatOptions}
              selected={selectedSunat}
              onSelect={(value) => {
                setSelectedSunat(value as SunatFilter);
                setPage(1);
                setIsSunatOpen(false);
              }}
            />
          </div>

          <Link
            href="/gre/remitente/crear"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon size={17} weight="bold" />
            Nueva Guia
          </Link>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[104px] animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))
          ) : guias.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <PackageIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron guias de remision
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            guias.map((guia) => {
              const estadoGuia = estadoGuiaConfig[guia.estado];
              const EstadoGuiaIcon = estadoGuia.icon;
              const sunatStatus = sunatStatusConfig[guia.sunat.estado];

              return (
                <div
                  key={guia.publicId}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[1.1fr_1fr_1fr_0.8fr_0.8fr_0.9fr_40px] md:items-center md:gap-3 xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <PackageIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {guia.correlativo}
                      </p>
                      <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        GRE Remitente
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
                      <UserIcon
                        size={28}
                        weight="fill"
                        className="text-white"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {guia.destinatario.razonSocial}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        {getDocumentLabel(guia.destinatario.tipoDocumento)}:{" "}
                        {guia.destinatario.numeroDocumento}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <MapPinIcon
                          size={14}
                          className="shrink-0 text-[var(--color-muted-foreground)]"
                        />
                        <span className="truncate text-xs text-[var(--color-text)] font-circular-regular">
                          {guia.llegada.direccion}
                        </span>
                      </div>
                      <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                        {getTransportLabel(guia)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] font-circular-regular">
                          {formatDate(guia.fechaInicioTraslado)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] font-circular-regular">
                          {formatTime(guia.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Items
                      </p>
                      <p className="text-sm font-circular-bold text-[var(--color-text)]">
                        {guia.detalles.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Peso
                      </p>
                      <p className="text-sm font-circular-bold text-[var(--color-text)]">
                        {formatWeight(guia)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-circular-bold",
                        estadoGuia.bg,
                        estadoGuia.text,
                      )}
                    >
                      <EstadoGuiaIcon size={14} weight="fill" />
                      {estadoGuia.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                      <span
                        className={cn("h-2 w-2 rounded-full", sunatStatus.dot)}
                      />
                      {sunatStatus.label}
                    </span>
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === guia.publicId ? null : guia.publicId,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === guia.publicId ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <EyeIcon size={16} weight="bold" />
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmitir(guia)}
                          disabled={
                            Boolean(workingId) ||
                            guia.sunat.estado === "aceptado" ||
                            guia.estado === "anulada"
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <PaperPlaneTiltIcon size={16} weight="bold" />
                          Enviar a SUNAT
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConsultarCdr(guia)}
                          disabled={Boolean(workingId) || !guia.sunat.ticket}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <CloudArrowUpIcon size={16} weight="bold" />
                          Consultar CDR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(guia, "pdf")}
                          disabled={Boolean(downloadingId)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <PrinterIcon size={16} weight="bold" />
                          Imprimir PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(guia, "xml")}
                          disabled={
                            Boolean(downloadingId) || !guia.sunat.xmlDisponible
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <FileCodeIcon size={16} weight="bold" />
                          Descargar XML
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(guia, "cdr")}
                          disabled={
                            Boolean(downloadingId) || !guia.sunat.cdrDisponible
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <FilePdfIcon size={16} weight="bold" />
                          Descargar CDR
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {guias.length} de {meta.total} guias de remision
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        title="Nueva guia de remision"
        size="lg"
      >
        <form onSubmit={handleCreateGuia} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Sucursal emision"
              value={createForm.sucursalId}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, sucursalId: value }))
              }
              options={branches.map((branch) => ({
                label: branch.esPrincipal
                  ? `${branch.nombre} · Principal`
                  : branch.nombre,
                value: branch.id,
              }))}
              placeholder={isCatalogLoading ? "Cargando..." : "Seleccionar"}
            />
            <CalendarInput
              label="Inicio traslado"
              value={createForm.fechaInicioTraslado}
              disabled={isSubmittingCreate}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  fechaInicioTraslado: value,
                }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Partida"
              value={createForm.sucursalPartidaId}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  sucursalPartidaId: value,
                }))
              }
              options={branches.map((branch) => ({
                label: `${branch.nombre} · ${branch.distrito}`,
                value: branch.id,
              }))}
              placeholder="Seleccionar"
            />
            <Select
              label="Llegada"
              value={createForm.sucursalLlegadaId}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  sucursalLlegadaId: value,
                }))
              }
              options={branches.map((branch) => ({
                label: `${branch.nombre} · ${branch.distrito}`,
                value: branch.id,
              }))}
              placeholder="Seleccionar"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Motivo"
              value={createForm.motivoTraslado}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  motivoTraslado: value,
                }))
              }
              options={motivoOptions}
            />
            <InputField
              id="gre-weight"
              label="Peso total KGM"
              value={createForm.pesoBrutoTotal}
              disabled={isSubmittingCreate}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  pesoBrutoTotal: value.replace(/[^\d.]/g, ""),
                }))
              }
            />
            <InputField
              id="gre-packages"
              label="Bultos"
              value={createForm.numeroBultos}
              disabled={isSubmittingCreate}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  numeroBultos: value.replace(/\D/g, ""),
                }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
            <Select
              label="Tipo doc."
              value={createForm.destinatarioTipoDoc}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  destinatarioTipoDoc: value,
                  destinatarioNroDoc: "",
                }))
              }
              options={[
                { label: "RUC", value: "6" },
                { label: "DNI", value: "1" },
              ]}
            />
            <InputField
              id="gre-recipient-doc"
              label="Numero documento"
              value={createForm.destinatarioNroDoc}
              maxLength={createForm.destinatarioTipoDoc === "6" ? 11 : 8}
              disabled={isSubmittingCreate}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  destinatarioNroDoc: value.replace(/\D/g, ""),
                }))
              }
            />
          </div>

          <InputField
            id="gre-recipient-name"
            label="Razon social / nombre"
            value={createForm.destinatarioRazonSocial}
            disabled={isSubmittingCreate}
            onChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                destinatarioRazonSocial: value,
              }))
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Conductor"
              value={createForm.conductorId}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, conductorId: value }))
              }
              options={conductores.map((driver) => ({
                label:
                  [driver.nombres, driver.apellidos]
                    .filter(Boolean)
                    .join(" ") || driver.numeroDocumento,
                value: driver.publicId,
              }))}
              placeholder={isCatalogLoading ? "Cargando..." : "Seleccionar"}
              searchable
            />
            <Select
              label="Placa"
              value={createForm.vehiculoId}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, vehiculoId: value }))
              }
              options={vehiculos.map((vehicle) => ({
                label: vehicle.placa,
                value: vehicle.publicId,
              }))}
              placeholder={isCatalogLoading ? "Cargando..." : "Seleccionar"}
              searchable
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-circular-bold text-[var(--color-text)]">
                Detalle
              </p>
              <button
                type="button"
                onClick={() =>
                  setDetails((current) => [...current, createDraftDetail()])
                }
                className="text-sm font-circular-bold text-[var(--color-primary)]"
              >
                Agregar item
              </button>
            </div>
            {details.map((detail, index) => (
              <div
                key={detail.uiId}
                className="grid gap-3 rounded-[14px] bg-[var(--color-input-bg)] p-3 sm:grid-cols-[1fr_90px_80px_32px]"
              >
                <input
                  value={detail.descripcion}
                  onChange={(event) =>
                    setDetails((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, descripcion: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Descripcion"
                  aria-label="Descripcion"
                  className="h-10 rounded-[12px] bg-[var(--color-card)] px-3 text-sm outline-none"
                />
                <input
                  value={detail.cantidad}
                  onChange={(event) =>
                    setDetails((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              cantidad: event.target.value.replace(
                                /[^\d.]/g,
                                "",
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder="Cant."
                  aria-label="Cant."
                  className="h-10 rounded-[12px] bg-[var(--color-card)] px-3 text-sm outline-none"
                />
                <input
                  value={detail.unidadMedida}
                  onChange={(event) =>
                    setDetails((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              unidadMedida: event.target.value
                                .toUpperCase()
                                .slice(0, 3),
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder="NIU"
                  aria-label="NIU"
                  className="h-10 rounded-[12px] bg-[var(--color-card)] px-3 text-sm outline-none"
                />
                <button
                  type="button"
                  aria-label="Eliminar detalle"
                  disabled={details.length === 1}
                  onClick={() =>
                    setDetails((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="h-10 rounded-[12px] text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Doc. relacionado"
              value={createForm.documentoTipo}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  documentoTipo: value,
                }))
              }
              options={[
                { label: "Sin documento", value: "" },
                { label: "Factura", value: "01" },
                { label: "Boleta", value: "03" },
                { label: "Nota venta", value: "04" },
              ]}
            />
            <InputField
              id="gre-doc-serie"
              label="Serie"
              value={createForm.documentoSerie}
              maxLength={4}
              disabled={isSubmittingCreate}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  documentoSerie: value.toUpperCase().slice(0, 4),
                }))
              }
            />
            <InputField
              id="gre-doc-number"
              label="Numero"
              value={createForm.documentoNumero}
              disabled={isSubmittingCreate}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  documentoNumero: value.replace(/\D/g, ""),
                }))
              }
            />
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Observaciones
            </span>
            <textarea
              value={createForm.observaciones}
              disabled={isSubmittingCreate}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  observaciones: event.target.value,
                }))
              }
              className="min-h-20 w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex items-center justify-between rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3">
            <span className="text-sm font-circular-regular text-[var(--color-text)]">
              Emitir directamente
            </span>
            <input
              type="checkbox"
              checked={createForm.emitirDirectamente}
              disabled={isSubmittingCreate}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  emitirDirectamente: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
          </label>

          {createError ? (
            <p className="rounded-[12px] bg-[#ef4444]/10 px-3 py-2 text-sm font-medium text-[#dc2626]">
              {createError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeCreateModal}
              disabled={isSubmittingCreate}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmittingCreate}>
              {isSubmittingCreate ? "Creando..." : "Crear guia"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}

function SummaryCard(props: {
  label: string;
  value: number;
  icon: typeof PackageIcon;
  color: string;
  bg: string;
}) {
  const Icon = props.icon;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            props.bg,
          )}
        >
          <Icon size={22} weight="fill" className={props.color} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {props.label}
          </p>
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
            {props.value}
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterDropdown(props: {
  label: string;
  open: boolean;
  selected: string;
  options: { label: string; value: string }[];
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={props.onToggle}
        className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
      >
        <span className="truncate">{props.label}</span>
        <CaretDownIcon
          size={16}
          className="shrink-0 text-[var(--color-muted-foreground)]"
        />
      </button>
      {props.open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {props.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => props.onSelect(option.value)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                props.selected === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function InputField(props: {
  id: string;
  label: string;
  value: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={props.id} className="block">
      <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {props.label}
      </span>
      <input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        maxLength={props.maxLength}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  PaperPlaneTiltIcon,
  ReceiptIcon,
  UserIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  salesApi,
  type ComprobanteSunatEstado,
  type ComprobantesResponse,
  type VentaResponse,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";
import { HistoryPeriodFilter } from "@/components/History/history-period-filter";
import { defaultHistoryPeriod } from "@/lib/history-period";
import { documentFileName } from "@/lib/document-file-name";

type ElectronicType = "factura" | "boleta";
type StatusFilter = ComprobanteSunatEstado | "todos";
type TypeFilter = ElectronicType | "todos";

const defaultSummary: ComprobantesResponse["summary"] = {
  aceptados: 0,
  porEnviar: 0,
  observados: 0,
  rechazados: 0,
  errores: 0,
  montoAceptado: "0",
};

const sunatStatusConfig: Record<
  VentaResponse["sunat"]["estado"],
  {
    label: string;
    bg: string;
    text: string;
    dot: string;
    icon: typeof CheckCircleIcon;
  }
> = {
  no_aplica: {
    label: "No aplica",
    bg: "bg-[var(--color-input-bg)]",
    text: "text-[var(--color-muted-foreground)]",
    dot: "bg-[var(--color-muted-foreground)]",
    icon: ReceiptIcon,
  },
  pendiente_envio: {
    label: "Por enviar",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
    dot: "bg-[#3b82f6]",
    icon: CloudArrowUpIcon,
  },
  enviando: {
    label: "Enviando",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
    dot: "bg-[#3b82f6]",
    icon: CloudArrowUpIcon,
  },
  pendiente_cdr: {
    label: "Pendiente CDR",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
    dot: "bg-[#f59e0b]",
    icon: WarningCircleIcon,
  },
  aceptado: {
    label: "Aceptado",
    bg: "bg-[#10b981]",
    text: "text-white",
    dot: "bg-[#10b981]",
    icon: CheckCircleIcon,
  },
  observado: {
    label: "Observado",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
    dot: "bg-[#f59e0b]",
    icon: WarningCircleIcon,
  },
  rechazado: {
    label: "Rechazado",
    bg: "bg-[#ef4444]",
    text: "text-white",
    dot: "bg-[#ef4444]",
    icon: XCircleIcon,
  },
  error_transitorio: {
    label: "Error transitorio",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
    dot: "bg-[#f59e0b]",
    icon: WarningCircleIcon,
  },
  error_definitivo: {
    label: "Error definitivo",
    bg: "bg-[#ef4444]",
    text: "text-white",
    dot: "bg-[#ef4444]",
    icon: XCircleIcon,
  },
};

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Aceptado", value: "aceptado" },
  { label: "Por enviar", value: "pendiente_envio" },
  { label: "Enviando", value: "enviando" },
  { label: "Observado", value: "observado" },
  { label: "Rechazado", value: "rechazado" },
  { label: "Error transitorio", value: "error_transitorio" },
  { label: "Error definitivo", value: "error_definitivo" },
];

const typeOptions: { label: string; value: TypeFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Factura", value: "factura" },
  { label: "Boleta", value: "boleta" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const hours = d.getHours();
  const displayHours = hours % 12 || 12;
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  return `${displayHours}:${minutes} ${period}`;
}

function formatPrice(amount: string) {
  const num = Number(amount);
  return `S/${Number.isFinite(num) ? num.toFixed(2) : "0.00"}`;
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

export default function ComprobantesPage() {
  const router = useRouter();
  const toast = useSystemToast();
  const statusRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  const [comprobantes, setComprobantes] = useState<VentaResponse[]>([]);
  const [summary, setSummary] =
    useState<ComprobantesResponse["summary"]>(defaultSummary);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState(defaultHistoryPeriod);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [selectedType, setSelectedType] = useState<TypeFilter>("todos");
  const [page, setPage] = useState(1);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadComprobantes = useCallback(() => {
    setIsLoading(true);

    salesApi
      .findComprobantes({
        page,
        limit: 10,
        ...historyPeriod,
        search: debouncedSearchTerm || undefined,
        tipoComprobante: selectedType === "todos" ? undefined : selectedType,
        sunatEstado: selectedStatus === "todos" ? undefined : selectedStatus,
      })
      .then((response) => {
        setComprobantes(response.data);
        setMeta(response.meta);
        setSummary(response.summary);
      })
      .catch((error: unknown) => {
        setComprobantes([]);
        setMeta({ page: 1, limit: 10, total: 0, totalPages: 1 });
        setSummary(defaultSummary);
        toast.showToast({
          title: "No se pudieron cargar los comprobantes",
          description: getErrorMessage(error),
          variant: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [
    debouncedSearchTerm,
    page,
    selectedStatus,
    selectedType,
    historyPeriod,
    toast,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadComprobantes, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadComprobantes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setIsStatusOpen(false);
      }

      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setIsTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRetrySunat = async (venta: VentaResponse) => {
    if (retryingId) return;

    setRetryingId(venta.publicId);
    const loadingId = toast.showToast({
      title: "Reintentando envio SUNAT...",
      description: venta.correlativo,
      variant: "loading",
    });

    try {
      await salesApi.retrySunat(venta.publicId);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Reintento programado",
        description: venta.correlativo,
        variant: "success",
      });
      loadComprobantes();
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo reintentar el envio",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDownload = async (
    venta: VentaResponse,
    artifact: "pdf" | "ticket" | "xml" | "cdr",
  ) => {
    if (downloadingId) return;

    const downloadKey = `${venta.publicId}-${artifact}`;
    setDownloadingId(downloadKey);
    const loadingId = toast.showToast({
      title: "Preparando descarga...",
      description: venta.correlativo,
      variant: "loading",
    });

    try {
      const blob =
        artifact === "pdf"
          ? await salesApi.downloadPdf(venta.publicId)
          : artifact === "ticket"
            ? await salesApi.downloadTicket(venta.publicId)
            : artifact === "xml"
              ? await salesApi.downloadSunatXml(venta.publicId)
              : await salesApi.downloadSunatCdr(venta.publicId);
      const extension =
        artifact === "pdf" || artifact === "ticket"
          ? "pdf"
          : artifact === "xml"
            ? "xml"
            : "zip";

      const fileName = documentFileName(
        venta.correlativo,
        extension,
        artifact === "ticket" ? "TICKET" : undefined,
      );
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
    }
  };

  return (
    <DashboardShell headerTitle="Comprobantes">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <CheckCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Aceptados SUNAT
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
                  {summary.aceptados}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <CloudArrowUpIcon
                  size={22}
                  weight="fill"
                  className="text-[#3b82f6]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Por enviar
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
                  {summary.porEnviar}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef4444]/10">
                <WarningCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#ef4444]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Con alerta
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
                  {summary.observados + summary.rechazados + summary.errores}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#101d69]/10 dark:bg-[#fd741a]/10">
                <ReceiptIcon
                  size={22}
                  weight="fill"
                  className="text-[var(--color-primary)]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Monto aceptado
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
                  {formatPrice(summary.montoAceptado)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por comprobante, cliente, documento o codigo SUNAT..."
              aria-label="Buscar por comprobante, cliente, documento o codigo SUNAT..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-full sm:w-[190px]" ref={statusRef}>
            <button
              type="button"
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsTypeOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedStatus === "todos"
                  ? "Estado SUNAT"
                  : sunatStatusConfig[selectedStatus].label}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isStatusOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setPage(1);
                      setIsStatusOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                      selectedStatus === option.value
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative w-full sm:w-[160px]" ref={typeRef}>
            <button
              type="button"
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsStatusOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedType === "todos"
                  ? "Tipo"
                  : selectedType === "boleta"
                    ? "Boleta"
                    : "Factura"}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isTypeOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedType(option.value);
                      setPage(1);
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                      selectedType === option.value
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <HistoryPeriodFilter
          value={historyPeriod}
          onChange={(value) => {
            setHistoryPeriod(value);
            setPage(1);
          }}
        />

        <div className="space-y-3 pr-1 pb-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[var(--color-input-bg)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-[var(--color-input-bg)]" />
                    <div className="h-3 w-52 rounded bg-[var(--color-input-bg)]" />
                  </div>
                  <div className="h-8 w-24 rounded-full bg-[var(--color-input-bg)]" />
                </div>
              </div>
            ))
          ) : comprobantes.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <ReceiptIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron comprobantes
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            comprobantes.map((venta) => {
              const status = sunatStatusConfig[venta.sunat.estado];
              const StatusIcon = status.icon;
              const clientName = venta.cliente?.nombre || "Cliente generico";
              const docLabel =
                venta.cliente?.tipoDocumento === "ruc"
                  ? "RUC"
                  : venta.cliente?.tipoDocumento === "dni"
                    ? "DNI"
                    : "Doc.";
              const docNumber = venta.cliente?.numeroDocumento || "-";
              const typeLabel =
                venta.tipoComprobante === "boleta" ? "BOLETA" : "FACTURA";
              const canRetry =
                venta.estado === "completada" &&
                venta.sunat.estado !== "aceptado" &&
                venta.sunat.estado !== "enviando";

              return (
                <div
                  key={venta.publicId}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(126px,0.9fr)_minmax(180px,1.45fr)_minmax(118px,0.9fr)_minmax(104px,0.75fr)_minmax(132px,0.9fr)_minmax(108px,0.85fr)_28px] md:items-center md:gap-3 xl:grid-cols-[155px_minmax(220px,1.35fr)_132px_112px_150px_136px_40px] xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <ReceiptIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {venta.correlativo}
                      </p>
                      <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        {typeLabel} / {venta.publicId}
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
                        {clientName}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        {docLabel}: {docNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center md:justify-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] font-circular-regular">
                          {formatDate(venta.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] font-circular-regular">
                          {formatTime(venta.createdAt)}
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
                        {venta.detalles.length}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Hash
                      </p>
                      <p className="max-w-[92px] truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {venta.sunat.hash || "Sin hash"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-circular-bold",
                        status.bg,
                        status.text,
                      )}
                    >
                      <StatusIcon size={14} weight="fill" />
                      {status.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                      <span
                        className={cn("h-2 w-2 rounded-full", status.dot)}
                      />
                      {venta.sunat.codigo || "Sin codigo"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Total
                      </p>
                      <p className="text-sm font-circular-bold text-[var(--color-text)]">
                        {formatPrice(venta.total)}
                      </p>
                      <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        {venta.sunat.respondidoAt
                          ? formatDate(venta.sunat.respondidoAt)
                          : "Sin respuesta"}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === venta.publicId ? null : venta.publicId,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === venta.publicId ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            router.push(`/historial/ventas/${venta.publicId}`);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <EyeIcon size={16} weight="bold" />
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleRetrySunat(venta);
                          }}
                          disabled={!canRetry || retryingId === venta.publicId}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <PaperPlaneTiltIcon size={16} weight="bold" />
                          Reintentar SUNAT
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleDownload(venta, "pdf");
                          }}
                          disabled={downloadingId === `${venta.publicId}-pdf`}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <FilePdfIcon size={16} weight="bold" />
                          Descargar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleDownload(venta, "ticket");
                          }}
                          disabled={
                            downloadingId === `${venta.publicId}-ticket`
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <ReceiptIcon size={16} weight="bold" />
                          Descargar ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleDownload(venta, "xml");
                          }}
                          disabled={
                            !venta.sunat.xmlDisponible ||
                            downloadingId === `${venta.publicId}-xml`
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <FileCodeIcon size={16} weight="bold" />
                          Descargar XML
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleDownload(venta, "cdr");
                          }}
                          disabled={
                            !venta.sunat.cdrDisponible ||
                            downloadingId === `${venta.publicId}-cdr`
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <FileCodeIcon size={16} weight="bold" />
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
            Mostrando {comprobantes.length} de {meta.total} comprobantes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={isLoading || page <= 1}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {page}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
              disabled={isLoading || page >= meta.totalPages}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

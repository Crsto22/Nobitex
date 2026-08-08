"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  CaretDownIcon,
  FileTextIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  PrinterIcon,
  DownloadSimpleIcon,
  DotsThreeVerticalIcon,
  ReceiptIcon,
  XIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ChargeModal } from "@/components/Ventas/charge-modal";
import {
  quotationsApi,
  type CotizacionEstado,
  type QuotationResponse,
} from "@/lib/api/quotations";
import type { CreateSalePayload, VentaTipoComprobante } from "@/lib/api/sales";
import type { Client } from "@/lib/api/clients";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { HistoryPeriodFilter } from "@/components/History/history-period-filter";
import { defaultHistoryPeriod } from "@/lib/history-period";
import { documentFileName } from "@/lib/document-file-name";

const emptyMeta = { page: 1, limit: 10, total: 0, totalPages: 1 };

const statusConfig: Record<
  CotizacionEstado,
  { label: string; bg: string; text: string }
> = {
  borrador: { label: "Borrador", bg: "bg-[#94a3b8]", text: "text-white" },
  enviada: { label: "Enviada", bg: "bg-[#3b82f6]", text: "text-white" },
  aceptada: { label: "Aceptada", bg: "bg-[#10b981]", text: "text-white" },
  rechazada: {
    label: "Rechazada",
    bg: "bg-[#ef4444]/10",
    text: "text-[#ef4444]",
  },
  vencida: { label: "Vencida", bg: "bg-[#ef4444]", text: "text-white" },
  convertida: { label: "Convertida", bg: "bg-[#10b981]", text: "text-white" },
  anulada: { label: "Anulada", bg: "bg-[#64748b]", text: "text-white" },
};

const statusOptions: Array<{
  label: string;
  value: CotizacionEstado | "todos";
}> = [
  { label: "Todos", value: "todos" },
  { label: "Borrador", value: "borrador" },
  { label: "Enviada", value: "enviada" },
  { label: "Aceptada", value: "aceptada" },
  { label: "Convertida", value: "convertida" },
  { label: "Vencida", value: "vencida" },
  { label: "Rechazada", value: "rechazada" },
  { label: "Anulada", value: "anulada" },
];

const typeOptions = [
  { label: "Todos", value: "todos" },
  { label: "Cotizacion", value: "cotizacion" },
  { label: "Borrador", value: "borrador" },
];

const editableStatusOptions: Array<{
  label: string;
  value: CotizacionEstado;
}> = [
  { label: "Borrador", value: "borrador" },
  { label: "Enviada", value: "enviada" },
  { label: "Aceptada", value: "aceptada" },
  { label: "Rechazada", value: "rechazada" },
  { label: "Vencida", value: "vencida" },
];

const comprobanteOptions: Array<{
  label: string;
  value: VentaTipoComprobante;
}> = [
  { label: "Nota de venta", value: "nota_venta" },
  { label: "Boleta", value: "boleta" },
  { label: "Factura", value: "factura" },
];

function formatDate(iso: string | null) {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const hours = date.getHours();
  const displayHours = hours % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  return `${displayHours}:${minutes} ${period}`;
}

function formatPrice(amount: string | number) {
  const value = typeof amount === "number" ? amount : Number(amount);
  return `S/${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

function getClientName(quote: QuotationResponse) {
  return quote.cliente?.nombre || "Cliente generico";
}

function getDocLabel(quote: QuotationResponse) {
  if (!quote.cliente) {
    return "Sin documento";
  }

  if (quote.cliente.tipoDocumento === "ruc") {
    return `RUC: ${quote.cliente.numeroDocumento || ""}`;
  }

  if (quote.cliente.tipoDocumento === "dni") {
    return `DNI: ${quote.cliente.numeroDocumento || ""}`;
  }

  return "Sin documento";
}

function emptyTaxSummary(total: number) {
  return {
    enabled: false,
    igvPercent: 18,
    opGravadas: 0,
    opExoneradas: 0,
    opInafectas: 0,
    igv: 0,
    total,
  };
}

function quoteToCartItems(quote: QuotationResponse) {
  return quote.detalles.map((detail) => ({
    id: detail.productoVariante.id,
    name: detail.productoVariante.producto.nombre,
    tipo: detail.productoVariante.producto.tipo,
    price: detail.precioUnitario,
    priceValue: Number(detail.precioUnitario),
    image:
      detail.productoVariante.imagen?.urlThumbnail ??
      detail.productoVariante.imagen?.urlWebp ??
      detail.productoVariante.imagen?.urlOriginal ??
      null,
    quantity: detail.cantidad,
    stock: detail.cantidad,
    colorHex: detail.productoVariante.color.hex,
    colorName: detail.productoVariante.color.nombre,
    size: detail.productoVariante.talla.nombre,
    sku: detail.productoVariante.sku ?? "",
    tipoAfectacionIgvCodigo: detail.tipoAfectacionIgvCodigo,
  }));
}

export default function HistorialCotizacionesPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationResponse[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState(defaultHistoryPeriod);
  const [selectedStatus, setSelectedStatus] = useState<
    CotizacionEstado | "todos"
  >("todos");
  const [selectedType, setSelectedType] = useState("todos");
  const [page, setPage] = useState(1);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    quote: QuotationResponse | null;
  }>({ open: false, quote: null });
  const [annulModal, setAnnulModal] = useState<{
    open: boolean;
    quote: QuotationResponse | null;
  }>({ open: false, quote: null });
  const [convertModal, setConvertModal] = useState<{
    open: boolean;
    quote: QuotationResponse | null;
  }>({ open: false, quote: null });
  const [statusDraft, setStatusDraft] = useState<CotizacionEstado>("enviada");
  const [annulReason, setAnnulReason] = useState("");
  const [convertComprobante, setConvertComprobante] =
    useState<VentaTipoComprobante>("nota_venta");
  const [convertClient, setConvertClient] = useState<Client | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const toast = useSystemToast();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadQuotations = useCallback(() => {
    const estado =
      selectedStatus !== "todos"
        ? selectedStatus
        : selectedType === "borrador"
          ? "borrador"
          : undefined;

    setIsLoading(true);

    quotationsApi
      .findAll({
        page,
        limit: 10,
        ...historyPeriod,
        search: debouncedSearchTerm || undefined,
        estado,
      })
      .then((response) => {
        setQuotations(
          selectedType === "cotizacion"
            ? response.data.filter((quote) => quote.estado !== "borrador")
            : response.data,
        );
        setMeta(response.meta);
      })
      .catch(() => {
        setQuotations([]);
        setMeta(emptyMeta);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [debouncedSearchTerm, page, selectedStatus, selectedType, historyPeriod]);

  useEffect(() => {
    // Data is intentionally synchronized with pagination and filter state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuotations();
  }, [loadQuotations]);

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

  const approvedCount = quotations.filter((quote) =>
    ["aceptada", "convertida"].includes(quote.estado),
  ).length;
  const pendingCount = quotations.filter((quote) =>
    ["borrador", "enviada"].includes(quote.estado),
  ).length;
  const totalQuoted = quotations
    .filter((quote) => !["anulada", "rechazada"].includes(quote.estado))
    .reduce((sum, quote) => sum + Number(quote.total), 0);

  const handleChangeStatus = async () => {
    if (!statusModal.quote || isActionSubmitting) {
      return;
    }

    setIsActionSubmitting(true);
    const loadingId = toast.showToast({
      title: "Actualizando estado...",
      variant: "loading",
    });

    try {
      await quotationsApi.update(statusModal.quote.publicId, {
        estado: statusDraft,
      });
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Estado actualizado",
        description: `${statusModal.quote.correlativo} ahora esta ${statusConfig[statusDraft].label.toLowerCase()}`,
        variant: "success",
      });
      setStatusModal({ open: false, quote: null });
      loadQuotations();
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente",
        variant: "error",
      });
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleAnnul = async () => {
    if (!annulModal.quote || !annulReason.trim() || isActionSubmitting) {
      return;
    }

    setIsActionSubmitting(true);
    const loadingId = toast.showToast({
      title: "Anulando cotizacion...",
      variant: "loading",
    });

    try {
      await quotationsApi.annul(annulModal.quote.publicId, annulReason.trim());
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Cotizacion anulada",
        description: annulModal.quote.correlativo,
        variant: "success",
      });
      setAnnulModal({ open: false, quote: null });
      setAnnulReason("");
      loadQuotations();
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo anular",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente",
        variant: "error",
      });
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleConvertSale = async (payload: CreateSalePayload) => {
    if (!convertModal.quote) {
      throw new Error("Selecciona una cotizacion.");
    }

    const result = await quotationsApi.convertToSale(
      convertModal.quote.publicId,
      {
        tipoComprobante: payload.tipoComprobante,
        clienteId: convertClient?.id ?? null,
        pagos: payload.pagos,
        observaciones: convertModal.quote.observaciones ?? undefined,
      },
    );
    setConvertModal({ open: false, quote: null });
    loadQuotations();
    return result.sale;
  };

  const handleDownloadPdf = async (quote: QuotationResponse) => {
    if (downloadingPdfId) {
      return;
    }

    setDownloadingPdfId(quote.publicId);
    const loadingId = toast.showToast({
      title: "Generando PDF...",
      description: quote.correlativo,
      variant: "loading",
    });

    try {
      const blob = await quotationsApi.downloadPdf(quote.publicId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = documentFileName(quote.correlativo);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "PDF descargado correctamente",
        description: fileName,
        variant: "success",
      });
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo descargar el PDF",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente",
        variant: "error",
      });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  return (
    <DashboardShell headerTitle="Historial Cotizaciones">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <FileTextIcon
                  size={22}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Cotizaciones Aprobadas
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {approvedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                <FileTextIcon
                  size={22}
                  weight="fill"
                  className="text-[#f59e0b]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Pendientes
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <ReceiptIcon
                  size={22}
                  weight="fill"
                  className="text-[#3b82f6]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Cotizado
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {formatPrice(totalQuoted)}
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
              placeholder="Buscar por correlativo, cliente o documento..."
              aria-label="Buscar por correlativo, cliente o documento..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1 sm:w-[160px] sm:flex-none" ref={statusRef}>
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
                  ? "Todos"
                  : statusConfig[selectedStatus].label}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isStatusOpen && (
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
            )}
          </div>

          <div className="relative flex-1 sm:w-[160px] sm:flex-none" ref={typeRef}>
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
                  : selectedType === "cotizacion"
                    ? "Cotizacion"
                    : "Borrador"}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isTypeOpen && (
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
            )}
          </div>
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
                    <div className="h-4 w-24 rounded bg-[var(--color-input-bg)]" />
                    <div className="h-3 w-40 rounded bg-[var(--color-input-bg)]" />
                  </div>
                  <div className="h-4 w-20 rounded bg-[var(--color-input-bg)]" />
                </div>
              </div>
            ))
          ) : quotations.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <FileTextIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron cotizaciones
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            quotations.map((quote) => {
              const status = statusConfig[quote.estado];
              const typeLabel =
                quote.estado === "borrador" ? "BORRADOR" : "COTIZACION";

              return (
                <div
                  key={quote.publicId}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(112px,0.8fr)_minmax(170px,1.45fr)_minmax(108px,0.9fr)_minmax(88px,0.75fr)_minmax(96px,0.85fr)_minmax(96px,0.85fr)_28px] md:items-center md:gap-3 md:gap-y-0 xl:grid-cols-[150px_minmax(220px,1.4fr)_140px_140px_130px_140px_40px] xl:gap-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <FileTextIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {quote.correlativo}
                      </p>
                      <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        {typeLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]">
                      <UserIcon
                        size={28}
                        weight="fill"
                        className="text-white"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {getClientName(quote)}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        {getDocLabel(quote)}
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
                          {formatDate(quote.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] font-circular-regular">
                          {formatTime(quote.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3 md:justify-center xl:gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Items
                      </p>
                      <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {quote.detalles.length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Validez
                      </p>
                      <p className="text-xs font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {formatDate(quote.validaHasta)}
                      </p>
                    </div>
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

                  <div className="flex items-center gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Total
                      </p>
                      <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {formatPrice(quote.total)}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-end md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === quote.publicId ? null : quote.publicId,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === quote.publicId && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            router.push(
                              `/historial/cotizaciones/${quote.publicId}`,
                            );
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <EyeIcon size={16} weight="bold" />
                          Ver detalle
                        </button>
                        {!["convertida", "anulada"].includes(quote.estado) && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setConvertClient(quote.cliente);
                              setConvertModal({ open: true, quote });
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                          >
                            <ReceiptIcon size={16} weight="bold" />
                            Convertir en venta
                          </button>
                        )}
                        {!["convertida", "anulada"].includes(quote.estado) && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setStatusDraft(quote.estado);
                              setStatusModal({ open: true, quote });
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                          >
                            <FileTextIcon size={16} weight="bold" />
                            Cambiar estado
                          </button>
                        )}
                        {!["convertida", "anulada"].includes(quote.estado) && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setAnnulReason("");
                              setAnnulModal({ open: true, quote });
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[#ef4444] transition-colors hover:bg-[#ef4444]/10"
                          >
                            <XIcon size={16} weight="bold" />
                            Anular
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <PrinterIcon size={16} weight="bold" />
                          Imprimir
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleDownloadPdf(quote);
                          }}
                          disabled={downloadingPdfId !== null}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          {downloadingPdfId === quote.publicId ? (
                            <SpinnerGapIcon
                              size={16}
                              weight="bold"
                              className="animate-spin"
                            />
                          ) : (
                            <DownloadSimpleIcon size={16} weight="bold" />
                          )}
                          Descargar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {quotations.length} de {meta.total} cotizaciones
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              disabled={isLoading || page <= 1}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white"
            >
              {page}
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(meta.totalPages, currentPage + 1),
                )
              }
              disabled={isLoading || page >= meta.totalPages}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {statusModal.open && statusModal.quote ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-4 py-6 animate-in fade-in duration-200">
          <div
            className="flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-[var(--color-card)] p-5 shadow-[0_22px_70px_rgba(15,23,42,0.28)] ring-1 ring-[var(--color-border)] animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[var(--color-text)]">
                  Cambiar estado
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {statusModal.quote.correlativo}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setStatusModal({ open: false, quote: null })}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {editableStatusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusDraft(option.value)}
                  className={cn(
                    "h-10 rounded-[12px] text-sm font-circular-bold transition-colors",
                    statusDraft === option.value
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleChangeStatus}
              disabled={isActionSubmitting}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ff7417] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isActionSubmitting ? (
                <SpinnerGapIcon
                  size={18}
                  weight="bold"
                  className="animate-spin"
                />
              ) : null}
              Guardar estado
            </button>
          </div>
        </div>
      ) : null}

      {annulModal.open && annulModal.quote ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-4 py-6 animate-in fade-in duration-200">
          <div
            className="flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-[var(--color-card)] p-5 shadow-[0_22px_70px_rgba(15,23,42,0.28)] ring-1 ring-[var(--color-border)] animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[var(--color-text)]">
                  Anular cotizacion
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {annulModal.quote.correlativo}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setAnnulModal({ open: false, quote: null })}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>
            <textarea
              value={annulReason}
              onChange={(event) => setAnnulReason(event.target.value)}
              placeholder="Motivo de anulacion..."
              aria-label="Motivo de anulacion..."
              className="mt-4 min-h-24 w-full resize-none rounded-[14px] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <button
              type="button"
              onClick={handleAnnul}
              disabled={isActionSubmitting || !annulReason.trim()}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#ef4444] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isActionSubmitting ? (
                <SpinnerGapIcon
                  size={18}
                  weight="bold"
                  className="animate-spin"
                />
              ) : null}
              Anular cotizacion
            </button>
          </div>
        </div>
      ) : null}

      {convertModal.quote ? (
        <ChargeModal
          isOpen={convertModal.open}
          title="Convertir a venta"
          wide
          onClose={() => {
            setConvertModal({ open: false, quote: null });
            setConvertClient(null);
          }}
          cartItems={quoteToCartItems(convertModal.quote)}
          subtotal={Number(convertModal.quote.subtotal)}
          discountType={
            convertModal.quote.descuentoTipo as "porcentaje" | "monto" | null
          }
          discountValue={convertModal.quote.descuentoValor ?? ""}
          discountAmount={Number(convertModal.quote.descuentoMonto)}
          taxSummary={emptyTaxSummary(Number(convertModal.quote.total))}
          total={Number(convertModal.quote.total)}
          note={convertModal.quote.observaciones ?? ""}
          selectedBranch={convertModal.quote.sucursal?.id ?? ""}
          selectedNoteType={convertComprobante}
          noteTypeOptions={comprobanteOptions}
          onSelectedNoteTypeChange={(value) =>
            setConvertComprobante(value as VentaTipoComprobante)
          }
          selectedClient={convertClient}
          onSelectedClientChange={setConvertClient}
          submitTitle="Convertir y crear venta"
          loadingTitle="Convirtiendo en venta..."
          onSubmitSale={handleConvertSale}
          onSaleSuccess={() => {}}
        />
      ) : null}
    </DashboardShell>
  );
}

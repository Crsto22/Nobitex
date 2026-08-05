"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  CaretDownIcon,
  ReceiptIcon,
  CalendarIcon,
  ClockIcon,
  DotsThreeVerticalIcon,
  WarningCircleIcon,
  EyeIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  GenericClientAvatar,
  UserAvatar,
} from "@/components/UserAvatar/user-avatar";
import {
  salesApi,
  type VentaResponse,
  type VentaEstado,
  type VentaTipoComprobante,
} from "@/lib/api/sales";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { AnnulSaleModal } from "@/components/Ventas/annul-sale-modal";
import { HistoryPeriodFilter } from "@/components/History/history-period-filter";
import { defaultHistoryPeriod } from "@/lib/history-period";
import { documentFileName } from "@/lib/document-file-name";

const statusConfig: Record<
  VentaEstado,
  { label: string; bg: string; text: string }
> = {
  completada: { label: "Completado", bg: "bg-[#10b981]", text: "text-white" },
  anulada: { label: "Anulado", bg: "bg-[#ef4444]", text: "text-white" },
  nc_emitida: {
    label: "N/C emitida",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
  },
  pendiente: {
    label: "Pendiente",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#f59e0b]",
  },
};

const typeLabels: Record<VentaTipoComprobante, string> = {
  nota_venta: "NOTA",
  boleta: "BOLETA",
  factura: "FACTURA",
  guia_remision: "GRE",
  nota_credito_factura: "N/C FACTURA",
  nota_credito_boleta: "N/C BOLETA",
};

const paymentConfig: Record<
  string,
  { src: string; label: string; bgColor: string }
> = {
  efectivo: {
    src: "/svg/metodo-pago/efectivo.png",
    label: "Efectivo",
    bgColor: "bg-[#10b981]",
  },
  yape: {
    src: "/svg/metodo-pago/Yape.svg",
    label: "Yape",
    bgColor: "bg-[#a221af]",
  },
  plin: {
    src: "/svg/metodo-pago/Plin.svg",
    label: "Plin",
    bgColor: "bg-[#00E2CE]",
  },
  transferencia: {
    src: "/svg/metodo-pago/transferencia.png",
    label: "Transferencia",
    bgColor: "bg-[#3b82f6]",
  },
  tarjeta: {
    src: "/svg/metodo-pago/transferencia.png",
    label: "Tarjeta",
    bgColor: "bg-[#6366f1]",
  },
};

function getPaymentMethodIconKey(
  method?: {
    codigo?: string | null;
    nombre?: string;
    nombreKey?: string;
  } | null,
) {
  return (
    method?.codigo?.trim().toLowerCase() ||
    method?.nombreKey?.trim().toLowerCase() ||
    method?.nombre?.trim().toLowerCase() ||
    ""
  );
}

function getSalePaymentIcons(venta: VentaResponse) {
  const usedMethods = new Set<string>();

  return venta.pagos.flatMap((pago) => {
    if (Number(pago.monto) <= 0) {
      return [];
    }

    const key = getPaymentMethodIconKey(pago.metodoPago);
    const config = paymentConfig[key];

    if (!config || usedMethods.has(key)) {
      return [];
    }

    usedMethods.add(key);

    return [
      {
        id: pago.metodoPago.id,
        amount: pago.monto,
        ...config,
      },
    ];
  });
}

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
  return `S/${num.toFixed(2)}`;
}

const statusOptions = [
  { label: "Todos", value: "todos" },
  { label: "Completado", value: "completada" },
  { label: "Anulado", value: "anulada" },
  { label: "Pendiente", value: "pendiente" },
];

const typeOptions = [
  { label: "Todos", value: "todos" },
  { label: "Boleta", value: "boleta" },
  { label: "Factura", value: "factura" },
  { label: "Nota", value: "nota_venta" },
];

const activeBajaStates = [
  "pendiente_envio",
  "enviando",
  "pendiente_cdr",
  "aceptado",
  "observado",
] as const;

const sunatBajaStatusConfig: Record<
  VentaResponse["sunatBaja"]["estado"],
  { label: string; bg: string; text: string }
> = {
  no_aplica: {
    label: "Sin baja",
    bg: "bg-[var(--color-input-bg)]",
    text: "text-[var(--color-muted-foreground)]",
  },
  pendiente_envio: {
    label: "Pendiente baja",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  enviando: {
    label: "Enviando baja",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
  },
  pendiente_cdr: {
    label: "Pendiente CDR",
    bg: "bg-[#8b5cf6]/10",
    text: "text-[#6d28d9]",
  },
  aceptado: {
    label: "Baja aceptada",
    bg: "bg-[#10b981]/10",
    text: "text-[#047857]",
  },
  observado: {
    label: "Baja observada",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  rechazado: {
    label: "Baja rechazada",
    bg: "bg-[#ef4444]/10",
    text: "text-[#dc2626]",
  },
  error_transitorio: {
    label: "Error baja",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  error_definitivo: {
    label: "Error baja",
    bg: "bg-[#ef4444]/10",
    text: "text-[#dc2626]",
  },
};

function isElectronicSale(venta: VentaResponse) {
  return (
    venta.tipoComprobante === "factura" || venta.tipoComprobante === "boleta"
  );
}

function hasSunatBaja(venta: VentaResponse) {
  return isElectronicSale(venta) && venta.sunatBaja.estado !== "no_aplica";
}

function canRequestSunatBaja(venta: VentaResponse) {
  return (
    isElectronicSale(venta) &&
    venta.estado === "completada" &&
    (venta.sunat.estado === "aceptado" || venta.sunat.estado === "observado") &&
    !activeBajaStates.includes(
      venta.sunatBaja.estado as (typeof activeBajaStates)[number],
    )
  );
}

function canAnnulLocally(venta: VentaResponse) {
  return (
    venta.tipoComprobante === "nota_venta" && venta.estado === "completada"
  );
}

export default function HistorialVentasPage() {
  const router = useRouter();
  const [ventas, setVentas] = useState<VentaResponse[]>([]);
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
  const [selectedStatus, setSelectedStatus] = useState<VentaEstado | "todos">(
    "todos",
  );
  const [selectedType, setSelectedType] = useState<
    VentaTipoComprobante | "todos"
  >("todos");
  const [page, setPage] = useState(1);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [annulModal, setAnnulModal] = useState<{
    open: boolean;
    venta: VentaResponse | null;
    mode: "annul" | "baja";
  }>({ open: false, venta: null, mode: "annul" });
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

  const loadVentas = useCallback(() => {
    setIsLoading(true);

    salesApi
      .findAll({
        page,
        limit: 10,
        ...historyPeriod,
        search: debouncedSearchTerm || undefined,
        estado: selectedStatus === "todos" ? undefined : selectedStatus,
        tipoComprobante: selectedType === "todos" ? undefined : selectedType,
      })
      .then((response) => {
        setVentas(response.data);
        setMeta(response.meta);
      })
      .catch(() => {
        setVentas([]);
        setMeta({ page: 1, limit: 10, total: 0, totalPages: 1 });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [page, debouncedSearchTerm, selectedStatus, selectedType, historyPeriod]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadVentas, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadVentas]);

  const handleAnnulSuccess = () => {
    loadVentas();
  };

  const handleDownloadPdf = async (venta: VentaResponse) => {
    if (downloadingPdfId) return;

    setDownloadingPdfId(venta.publicId);
    const loadingId = toast.showToast({
      title: "Generando PDF...",
      description: venta.correlativo,
      variant: "loading",
    });

    try {
      const blob = await salesApi.downloadPdf(venta.publicId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = documentFileName(venta.correlativo);
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

  const handleDownloadTicket = async (venta: VentaResponse) => {
    if (downloadingPdfId) return;

    const downloadKey = `${venta.publicId}-ticket`;
    setDownloadingPdfId(downloadKey);
    const loadingId = toast.showToast({
      title: "Generando ticket...",
      description: venta.correlativo,
      variant: "loading",
    });

    try {
      const blob = await salesApi.downloadTicket(venta.publicId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = documentFileName(venta.correlativo, "pdf", "TICKET");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Ticket descargado correctamente",
        description: `${venta.correlativo}-ticket.pdf`,
        variant: "success",
      });
    } catch (error: unknown) {
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "No se pudo descargar el ticket",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente",
        variant: "error",
      });
    } finally {
      setDownloadingPdfId(null);
    }
  };

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

  const completedCount = ventas.filter((v) => v.estado === "completada").length;
  const cancelledCount = ventas.filter((v) => v.estado === "anulada").length;
  const totalVendido = ventas
    .filter((v) => v.estado === "completada")
    .reduce((sum, v) => sum + Number(v.total), 0);

  return (
    <DashboardShell headerTitle="Historial de Ventas">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <ReceiptIcon
                  size={22}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Ventas Completadas
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {completedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef4444]/10">
                <ReceiptIcon
                  size={22}
                  weight="fill"
                  className="text-[#ef4444]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Ventas Anuladas
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {cancelledCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
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
                  Total Vendido
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {formatPrice(totalVendido.toFixed(2))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-[160px]" ref={statusRef}>
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
                  : statusConfig[selectedStatus as VentaEstado]?.label}
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
                      setSelectedStatus(option.value as VentaEstado | "todos");
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

          <div className="relative w-[160px]" ref={typeRef}>
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
                  : typeLabels[selectedType as VentaTipoComprobante]}
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
                      setSelectedType(
                        option.value as VentaTipoComprobante | "todos",
                      );
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

        <HistoryPeriodFilter
          value={historyPeriod}
          onChange={(value) => {
            setHistoryPeriod(value);
            setPage(1);
          }}
        />

        {/* Sales List */}
        <div className="space-y-3 pr-1 pb-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
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
          ) : ventas.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <ReceiptIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron ventas
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de búsqueda
                </p>
              </div>
            </div>
          ) : (
            ventas.map((venta) => {
              const status = statusConfig[venta.estado];
              const typeLabel = typeLabels[venta.tipoComprobante];
              const clientName = venta.cliente?.nombre || "Cliente genérico";
              const docLabel =
                venta.cliente?.tipoDocumento === "ruc"
                  ? "RUC"
                  : venta.cliente?.tipoDocumento === "dni"
                    ? "DNI"
                    : "";
              const docNumber = venta.cliente?.numeroDocumento || "";
              const totalItems = venta.detalles.length;
              const paymentIcons = getSalePaymentIcons(venta);
              const showAnnulAction = canAnnulLocally(venta);
              const showBajaAction = canRequestSunatBaja(venta);
              const bajaStatus = sunatBajaStatusConfig[venta.sunatBaja.estado];
              const showBajaBadge = hasSunatBaja(venta);

              return (
                <div
                  key={venta.publicId}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(112px,0.8fr)_minmax(170px,1.45fr)_minmax(108px,0.9fr)_minmax(88px,0.75fr)_minmax(96px,0.85fr)_minmax(96px,0.85fr)_28px] md:items-center md:gap-3 xl:grid-cols-[150px_minmax(220px,1.4fr)_140px_140px_130px_140px_40px] xl:gap-5"
                >
                  {/* ID + Type */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <ReceiptIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {venta.correlativo}
                      </p>
                      <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        {typeLabel}
                      </p>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="flex items-center gap-3 sm:w-56">
                    {venta.cliente ? (
                      <UserAvatar
                        seed={venta.cliente.id}
                        name={venta.cliente.nombre}
                        size={40}
                        className="size-10"
                      />
                    ) : (
                      <GenericClientAvatar size={40} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {clientName}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        {docLabel} {docNumber}
                      </p>
                    </div>
                  </div>

                  {/* Date + Time */}
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

                  {/* Items + Payment */}
                  <div className="flex items-center gap-4 sm:w-36">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Items
                      </p>
                      <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {totalItems}
                      </p>
                    </div>
                    {paymentIcons.length > 0 ? (
                      <div className="flex -space-x-2">
                        {paymentIcons.map((payment) => (
                          <div
                            key={payment.id}
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-[var(--color-card)]",
                              payment.bgColor,
                            )}
                            title={`${payment.label} ${formatPrice(payment.amount)}`}
                          >
                            <Image
                              src={payment.src}
                              width={32}
                              height={32}
                              alt={payment.label}
                              className="h-6 w-6 object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Status */}
                  <div className="flex flex-wrap gap-2 md:justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-circular-bold",
                        status.bg,
                        status.text,
                      )}
                    >
                      {status.label}
                    </span>
                    {showBajaBadge ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-circular-bold",
                          bajaStatus.bg,
                          bajaStatus.text,
                        )}
                      >
                        {bajaStatus.label}
                      </span>
                    ) : null}
                  </div>

                  {/* Total */}
                  <div className="flex items-center gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Total
                      </p>
                      <p className="font-circular-bold text-sm font-circular-bold text-[var(--color-text)]">
                        {formatPrice(venta.total)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === venta.publicId ? null : venta.publicId,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Más opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === venta.publicId && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
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
                        {(showAnnulAction || showBajaAction) && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setAnnulModal({
                                open: true,
                                venta,
                                mode: showBajaAction ? "baja" : "annul",
                              });
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[#ef4444] transition-colors hover:bg-[#ef4444]/10"
                          >
                            <WarningCircleIcon size={16} weight="bold" />
                            {showBajaAction ? "Dar de baja" : "Anular venta"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleDownloadPdf(venta);
                          }}
                          disabled={downloadingPdfId === venta.publicId}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <DownloadSimpleIcon size={16} weight="bold" />
                          Descargar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleDownloadTicket(venta);
                          }}
                          disabled={
                            downloadingPdfId === `${venta.publicId}-ticket`
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <ReceiptIcon size={16} weight="bold" />
                          Descargar ticket
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {ventas.length} de {meta.total} ventas
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={isLoading || page >= meta.totalPages}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <AnnulSaleModal
        isOpen={annulModal.open}
        onClose={() =>
          setAnnulModal({ open: false, venta: null, mode: "annul" })
        }
        correlativo={annulModal.venta?.correlativo || ""}
        publicId={annulModal.venta?.publicId || ""}
        mode={annulModal.mode}
        onAnnulSuccess={handleAnnulSuccess}
      />
    </DashboardShell>
  );
}

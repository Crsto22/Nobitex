"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  CaretDownIcon,
  CaretRightIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  DownloadSimpleIcon,
  FileCodeIcon,
  FilePdfIcon,
  PackageIcon,
  PaperPlaneTiltIcon,
  ReceiptIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  salesApi,
  type VentaResponse,
  type VentaEstado,
  type VentaSunatStatusResponse,
  type VentaTipoComprobante,
} from "@/lib/api/sales";
import { AnnulSaleModal } from "@/components/Ventas/annul-sale-modal";
import { ConvertSaleModal } from "@/components/Ventas/convert-sale-modal";
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

const sunatStatusConfig: Record<
  VentaResponse["sunat"]["estado"],
  { label: string; bg: string; text: string }
> = {
  no_aplica: {
    label: "No aplica",
    bg: "bg-[var(--color-input-bg)]",
    text: "text-[var(--color-muted-foreground)]",
  },
  pendiente_envio: {
    label: "Pendiente de envio",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  enviando: {
    label: "Enviando",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
  },
  pendiente_cdr: {
    label: "Pendiente CDR",
    bg: "bg-[#8b5cf6]/10",
    text: "text-[#6d28d9]",
  },
  aceptado: {
    label: "Aceptado SUNAT",
    bg: "bg-[#10b981]/10",
    text: "text-[#047857]",
  },
  observado: {
    label: "Observado",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  rechazado: {
    label: "Rechazado",
    bg: "bg-[#ef4444]/10",
    text: "text-[#dc2626]",
  },
  error_transitorio: {
    label: "Error transitorio",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  error_definitivo: {
    label: "Error definitivo",
    bg: "bg-[#ef4444]/10",
    text: "text-[#dc2626]",
  },
};

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

function formatDateTime(iso: string | null) {
  return iso ? `${formatDate(iso)} ${formatTime(iso)}` : "-";
}

function formatPrice(amount: string) {
  const num = Number(amount);
  return `S/${num.toFixed(2)}`;
}

function isElectronicSaleType(tipo: VentaTipoComprobante) {
  return tipo === "boleta" || tipo === "factura";
}

const activeBajaStates = [
  "pendiente_envio",
  "enviando",
  "pendiente_cdr",
  "aceptado",
  "observado",
] as const;

const consultableBajaStates = [
  "pendiente_envio",
  "enviando",
  "pendiente_cdr",
  "error_transitorio",
] as const;

function canRequestSunatBaja(venta: VentaResponse) {
  return (
    isElectronicSaleType(venta.tipoComprobante) &&
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

function canConvertSale(venta: VentaResponse) {
  return (
    venta.tipoComprobante === "nota_venta" && venta.estado === "completada"
  );
}

function hasSunatBaja(venta: VentaResponse) {
  return (
    isElectronicSaleType(venta.tipoComprobante) &&
    venta.sunatBaja.estado !== "no_aplica"
  );
}

function canConsultSunatBaja(venta: VentaResponse) {
  return consultableBajaStates.includes(
    venta.sunatBaja.estado as (typeof consultableBajaStates)[number],
  );
}

function mergeSunatStatus(
  venta: VentaResponse,
  status: VentaSunatStatusResponse,
): VentaResponse {
  return {
    ...venta,
    sunat: {
      estado: status.estado,
      codigo: status.codigo,
      mensaje: status.mensaje,
      hash: status.hash,
      xmlDisponible: Boolean(status.archivos.xml),
      cdrDisponible: Boolean(status.archivos.cdr),
      enviadoAt: status.enviadoAt,
      respondidoAt: status.respondidoAt,
    },
  };
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

function SunatInfoItem({
  label,
  value,
  wrap = false,
}: {
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-card)] px-4 py-3">
      <p className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-circular-bold text-[var(--color-text)]",
          wrap ? "break-all" : "truncate",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function VentaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;

  const [venta, setVenta] = useState<VentaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [annulModal, setAnnulModal] = useState(false);
  const [convertModalType, setConvertModalType] = useState<
    "boleta" | "factura" | null
  >(null);
  const [isSunatOpen, setIsSunatOpen] = useState(false);
  const [isSunatBajaOpen, setIsSunatBajaOpen] = useState(false);
  const [isRetryingSunat, setIsRetryingSunat] = useState(false);
  const [isConsultingSunatBaja, setIsConsultingSunatBaja] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);
  const [downloadingSunatFile, setDownloadingSunatFile] = useState<
    "xml" | "cdr" | null
  >(null);
  const [downloadingSunatBajaFile, setDownloadingSunatBajaFile] = useState<
    "xml" | "cdr" | null
  >(null);

  useEffect(() => {
    if (!publicId) return;

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (isMounted) setIsLoading(true);
    }, 0);

    salesApi
      .findOne(publicId)
      .then((data) => {
        if (isMounted) setVenta(data);
      })
      .catch(() => {
        if (isMounted) setVenta(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [publicId]);

  const handleAnnulSuccess = async () => {
    const updatedVenta = await salesApi.findOne(publicId);
    setVenta(updatedVenta);
    setAnnulModal(false);
  };

  const handleRetrySunat = async () => {
    if (!venta || isRetryingSunat) {
      return;
    }

    setIsRetryingSunat(true);
    try {
      const status = await salesApi.retrySunat(venta.publicId);
      setVenta((current) =>
        current ? mergeSunatStatus(current, status) : current,
      );
    } finally {
      setIsRetryingSunat(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!venta || isDownloadingPdf) {
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const blob = await salesApi.downloadPdf(venta.publicId);
      downloadBlob(blob, documentFileName(venta.correlativo));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!venta || isDownloadingTicket) {
      return;
    }

    setIsDownloadingTicket(true);
    try {
      const blob = await salesApi.downloadTicket(venta.publicId);
      downloadBlob(blob, documentFileName(venta.correlativo, "pdf", "TICKET"));
    } finally {
      setIsDownloadingTicket(false);
    }
  };

  const handleDownloadSunatFile = async (artifact: "xml" | "cdr") => {
    if (!venta || downloadingSunatFile) {
      return;
    }

    setDownloadingSunatFile(artifact);
    try {
      const blob =
        artifact === "xml"
          ? await salesApi.downloadSunatXml(venta.publicId)
          : await salesApi.downloadSunatCdr(venta.publicId);
      downloadBlob(
        blob,
        documentFileName(venta.correlativo, artifact === "xml" ? "xml" : "zip"),
      );
    } finally {
      setDownloadingSunatFile(null);
    }
  };

  const handleConsultSunatBaja = async () => {
    if (!venta || isConsultingSunatBaja) {
      return;
    }

    setIsConsultingSunatBaja(true);
    try {
      await salesApi.consultSunatBajaTicket(venta.publicId);
      const updatedVenta = await salesApi.findOne(venta.publicId);
      setVenta(updatedVenta);
    } finally {
      setIsConsultingSunatBaja(false);
    }
  };

  const handleDownloadSunatBajaFile = async (artifact: "xml" | "cdr") => {
    if (!venta || downloadingSunatBajaFile) {
      return;
    }

    setDownloadingSunatBajaFile(artifact);
    try {
      const blob =
        artifact === "xml"
          ? await salesApi.downloadSunatBajaXml(venta.publicId)
          : await salesApi.downloadSunatBajaCdr(venta.publicId);
      downloadBlob(
        blob,
        documentFileName(
          venta.correlativo,
          artifact === "xml" ? "xml" : "zip",
          "BAJA",
        ),
      );
    } finally {
      setDownloadingSunatBajaFile(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell headerTitle="Detalle de Venta">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <Image
            src="/svg/loader/Loader.svg"
            alt="Cargando detalle de venta"
            width={140}
            height={140}
            className="h-[140px] w-[140px]"
          />
        </div>
      </DashboardShell>
    );
  }

  if (!venta) {
    return (
      <DashboardShell headerTitle="Detalle de Venta">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <div className="text-center">
            <WarningCircleIcon
              size={48}
              weight="light"
              className="mx-auto text-[var(--color-muted-foreground)]"
            />
            <p className="mt-3 text-sm font-black text-[var(--color-text)]">
              Venta no encontrada
            </p>
            <button
              type="button"
              onClick={() => router.push("/historial/ventas")}
              className="mt-4 h-10 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white transition-colors hover:opacity-90"
            >
              Volver al historial
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const status = statusConfig[venta.estado];
  const electronicSale = isElectronicSaleType(venta.tipoComprobante);
  const sunatStatus = sunatStatusConfig[venta.sunat.estado];
  const sunatBajaStatus = sunatBajaStatusConfig[venta.sunatBaja.estado];
  const clientName = venta.cliente?.nombre || "Cliente genérico";
  const docLabel =
    venta.cliente?.tipoDocumento === "ruc"
      ? "RUC"
      : venta.cliente?.tipoDocumento === "dni"
        ? "DNI"
        : "";
  const docNumber = venta.cliente?.numeroDocumento || "";
  const creadoPor = venta.creadoPor
    ? `${venta.creadoPor.nombre} ${venta.creadoPor.apellido || ""}`.trim()
    : "Sistema";
  const showRetrySunat =
    electronicSale &&
    venta.estado === "completada" &&
    venta.sunat.estado !== "aceptado";
  const showBajaAction = canRequestSunatBaja(venta);
  const showAnnulAction = canAnnulLocally(venta);
  const showConvertAction = canConvertSale(venta);
  const annulMode = showBajaAction ? "baja" : "annul";
  const showSunatBaja = hasSunatBaja(venta);
  const showConsultSunatBaja = showSunatBaja && canConsultSunatBaja(venta);

  return (
    <DashboardShell
      headerTitle={
        <nav
          className="flex min-w-0 items-center gap-2"
          aria-label="Ruta actual"
        >
          <Link
            href="/historial/ventas"
            className="truncate text-sm font-circular-regular text-[var(--color-text)]/70 transition-colors hover:text-[var(--color-primary)]"
          >
            Historial de Ventas
          </Link>
          <CaretRightIcon
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-circular-bold text-[var(--color-text)]">
              {venta.correlativo}
            </span>
            <span className="block truncate text-[10px] font-circular-regular text-gray-400">
              {venta.codigoInterno}
            </span>
          </span>
        </nav>
      }
    >
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <FilePdfIcon size={15} weight="bold" />
              {isDownloadingPdf ? "Descargando..." : "PDF"}
            </button>
            <button
              type="button"
              onClick={handleDownloadTicket}
              disabled={isDownloadingTicket}
              className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ReceiptIcon size={15} weight="bold" />
              {isDownloadingTicket ? "Ticket..." : "Ticket"}
            </button>
            {electronicSale ? (
              <>
                <button
                  type="button"
                  onClick={() => handleDownloadSunatFile("xml")}
                  disabled={
                    !venta.sunat.xmlDisponible || downloadingSunatFile === "xml"
                  }
                  className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <FileCodeIcon size={15} weight="bold" />
                  {downloadingSunatFile === "xml" ? "XML..." : "XML"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSunatFile("cdr")}
                  disabled={
                    !venta.sunat.cdrDisponible || downloadingSunatFile === "cdr"
                  }
                  className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <DownloadSimpleIcon size={15} weight="bold" />
                  {downloadingSunatFile === "cdr" ? "CDR..." : "CDR"}
                </button>
                {showRetrySunat ? (
                  <button
                    type="button"
                    onClick={handleRetrySunat}
                    disabled={isRetryingSunat}
                    className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <PaperPlaneTiltIcon size={15} weight="bold" />
                    {isRetryingSunat ? "Reintentando..." : "Reenviar"}
                  </button>
                ) : null}
                {showSunatBaja ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadSunatBajaFile("xml")}
                      disabled={
                        !venta.sunatBaja.xmlDisponible ||
                        downloadingSunatBajaFile === "xml"
                      }
                      className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <FileCodeIcon size={15} weight="bold" />
                      {downloadingSunatBajaFile === "xml"
                        ? "XML baja..."
                        : "XML Baja"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSunatBajaFile("cdr")}
                      disabled={
                        !venta.sunatBaja.cdrDisponible ||
                        downloadingSunatBajaFile === "cdr"
                      }
                      className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <DownloadSimpleIcon size={15} weight="bold" />
                      {downloadingSunatBajaFile === "cdr"
                        ? "CDR baja..."
                        : "CDR Baja"}
                    </button>
                    {showConsultSunatBaja ? (
                      <button
                        type="button"
                        onClick={handleConsultSunatBaja}
                        disabled={isConsultingSunatBaja}
                        className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <PaperPlaneTiltIcon size={15} weight="bold" />
                        {isConsultingSunatBaja
                          ? "Consultando..."
                          : "Consultar baja"}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {showAnnulAction || showBajaAction ? (
              <button
                type="button"
                onClick={() => setAnnulModal(true)}
                className="flex h-9 items-center gap-2 rounded-[12px] bg-[#ef4444] px-3 text-xs font-circular-bold text-white transition-colors hover:bg-[#dc2626]"
              >
                <WarningCircleIcon size={15} weight="bold" />
                {showBajaAction ? "Dar de baja" : "Anular"}
              </button>
            ) : null}
            {showConvertAction ? (
              <>
                <button
                  type="button"
                  onClick={() => setConvertModalType("boleta")}
                  className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  <ArrowsClockwiseIcon size={15} weight="bold" />
                  A boleta
                </button>
                <button
                  type="button"
                  onClick={() => setConvertModalType("factura")}
                  className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  <ArrowsClockwiseIcon size={15} weight="bold" />
                  A factura
                </button>
              </>
            ) : null}
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-4 py-1.5 text-xs font-circular-bold",
              status.bg,
              status.text,
            )}
          >
            {status.label}
          </span>
        </div>

        {/* Date / Time / Sucursal */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} />
            <span className="font-circular-regular font-circular-regular">
              {formatDate(venta.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon size={14} />
            <span className="font-circular-regular font-circular-regular">
              {formatTime(venta.createdAt)}
            </span>
          </div>
          {venta.sucursal && (
            <div className="flex items-center gap-2">
              <PackageIcon size={14} />
              <span className="font-circular-regular">
                {venta.sucursal.nombre}
              </span>
            </div>
          )}
        </div>

        {/* Cliente */}
        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]">
              <UserIcon size={22} weight="fill" className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Cliente
              </p>
              <p className="text-base font-black text-[var(--color-text)]">
                {clientName}
              </p>
              {docLabel && (
                <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                  {docLabel}: {docNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SUNAT */}
        {electronicSale && (
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] shadow-sm">
            <button
              type="button"
              onClick={() => setIsSunatOpen((open) => !open)}
              className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              aria-expanded={isSunatOpen}
            >
              <div>
                <p className="text-sm font-black text-[var(--color-text)]">
                  Datos SUNAT
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Emision electronica del comprobante {venta.correlativo}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-circular-bold",
                    sunatStatus.bg,
                    sunatStatus.text,
                  )}
                >
                  {sunatStatus.label}
                </span>
                <CaretDownIcon
                  size={18}
                  weight="bold"
                  className={cn(
                    "text-[var(--color-muted-foreground)] transition-transform",
                    isSunatOpen ? "rotate-180" : "",
                  )}
                />
              </div>
            </button>

            {isSunatOpen ? (
              <div className="border-t border-[var(--color-border)] p-5 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SunatInfoItem
                    label="Codigo"
                    value={venta.sunat.codigo ?? "-"}
                  />
                  <SunatInfoItem
                    label="Enviado"
                    value={formatDateTime(venta.sunat.enviadoAt)}
                  />
                  <SunatInfoItem
                    label="Respondido"
                    value={formatDateTime(venta.sunat.respondidoAt)}
                  />
                  <SunatInfoItem
                    label="Hash"
                    value={venta.sunat.hash ?? "-"}
                    wrap
                  />
                </div>

                {venta.sunat.mensaje ? (
                  <div className="mt-4 rounded-xl bg-[var(--color-card)] px-4 py-3">
                    <p className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Mensaje SUNAT
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text)]">
                      {venta.sunat.mensaje}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {/* Baja SUNAT */}
        {showSunatBaja && (
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] shadow-sm">
            <button
              type="button"
              onClick={() => setIsSunatBajaOpen((open) => !open)}
              className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              aria-expanded={isSunatBajaOpen}
            >
              <div>
                <p className="text-sm font-black text-[var(--color-text)]">
                  Baja SUNAT
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Anulacion comunicada a SUNAT para {venta.correlativo}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-circular-bold",
                    sunatBajaStatus.bg,
                    sunatBajaStatus.text,
                  )}
                >
                  {sunatBajaStatus.label}
                </span>
                <CaretDownIcon
                  size={18}
                  weight="bold"
                  className={cn(
                    "text-[var(--color-muted-foreground)] transition-transform",
                    isSunatBajaOpen ? "rotate-180" : "",
                  )}
                />
              </div>
            </button>

            {isSunatBajaOpen ? (
              <div className="border-t border-[var(--color-border)] p-5 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SunatInfoItem
                    label="Tipo"
                    value={venta.sunatBaja.tipo ?? "-"}
                  />
                  <SunatInfoItem
                    label="Lote"
                    value={venta.sunatBaja.lote ?? "-"}
                  />
                  <SunatInfoItem
                    label="Ticket"
                    value={venta.sunatBaja.ticket ?? "-"}
                    wrap
                  />
                  <SunatInfoItem
                    label="Codigo"
                    value={venta.sunatBaja.codigo ?? "-"}
                  />
                  <SunatInfoItem
                    label="Solicitada"
                    value={formatDateTime(venta.sunatBaja.solicitadaAt)}
                  />
                  <SunatInfoItem
                    label="Respondida"
                    value={formatDateTime(venta.sunatBaja.respondidaAt)}
                  />
                </div>

                {venta.sunatBaja.mensaje ? (
                  <div className="mt-4 rounded-xl bg-[var(--color-card)] px-4 py-3">
                    <p className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Mensaje de baja SUNAT
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text)]">
                      {venta.sunatBaja.mensaje}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {/* Productos */}
        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <p className="mb-4 text-sm font-black text-[var(--color-text)]">
            Productos ({venta.detalles.length})
          </p>
          <div className="space-y-3">
            {venta.detalles.map((detalle) => {
              const pv = detalle.productoVariante;
              const image = pv.imagen;

              return (
                <div
                  key={detalle.id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] p-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--color-input-bg)] overflow-hidden">
                    {image?.urlThumbnail ? (
                      <Image
                        src={image.urlThumbnail}
                        alt={pv.producto.nombre}
                        width={56}
                        height={56}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PackageIcon
                        size={24}
                        weight="light"
                        className="text-[var(--color-muted-foreground)]"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                      {pv.producto.nombre}
                    </p>
                    {pv.producto.tipo === "variantes" ? (
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: pv.color.hex }}
                          />
                          {pv.color.nombre}
                        </span>
                        <span>Talla: {pv.talla.nombre}</span>
                      </div>
                    ) : null}
                    {electronicSale ? (
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                        <span>Base: {formatPrice(detalle.valorVenta)}</span>
                        <span>IGV: {formatPrice(detalle.igvMonto)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-circular-bold text-xs text-[var(--color-muted-foreground)]">
                      {detalle.cantidad} × {formatPrice(detalle.precioUnitario)}
                    </p>
                    <p className="font-circular-bold text-sm font-circular-bold text-[var(--color-text)]">
                      {formatPrice(detalle.total)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagos */}
        {venta.pagos.length > 0 && (
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <p className="mb-3 text-sm font-black text-[var(--color-text)]">
              Pagos
            </p>
            <div className="space-y-2">
              {venta.pagos.map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-start justify-between gap-4 rounded-xl bg-[var(--color-card)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-circular-bold text-[var(--color-text)]">
                      {pago.metodoPago.nombre}
                    </p>
                    {pago.referencia && (
                      <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        Ref: {pago.referencia}
                      </p>
                    )}
                    {(pago.montoRecibido || Number(pago.vuelto) > 0) && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-circular-bold">
                        {pago.montoRecibido ? (
                          <span className="rounded-full bg-[var(--color-input-bg)] px-2 py-1 text-[var(--color-muted-foreground)]">
                            Recibido: {formatPrice(pago.montoRecibido)}
                          </span>
                        ) : null}
                        {Number(pago.vuelto) > 0 ? (
                          <span className="rounded-full bg-[#10b981]/10 px-2 py-1 text-[#10b981]">
                            Vuelto: {formatPrice(pago.vuelto)}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Monto aplicado
                    </p>
                    <p className="font-circular-bold text-sm font-circular-bold text-[var(--color-text)]">
                      {formatPrice(pago.monto)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="space-y-2">
            {electronicSale ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-muted-foreground)]">
                    Op. gravadas
                  </span>
                  <span className="font-circular-bold text-[var(--color-text)]">
                    {formatPrice(venta.opGravadas)}
                  </span>
                </div>
                {Number(venta.opExoneradas) > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-muted-foreground)]">
                      Op. exoneradas
                    </span>
                    <span className="font-circular-bold text-[var(--color-text)]">
                      {formatPrice(venta.opExoneradas)}
                    </span>
                  </div>
                ) : null}
                {Number(venta.opInafectas) > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-muted-foreground)]">
                      Op. inafectas
                    </span>
                    <span className="font-circular-bold text-[var(--color-text)]">
                      {formatPrice(venta.opInafectas)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-muted-foreground)]">
                    IGV ({Number(venta.igvPorcentaje).toFixed(2)}%)
                  </span>
                  <span className="font-circular-bold text-[var(--color-text)]">
                    {formatPrice(venta.igvMonto)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">
                  Subtotal
                </span>
                <span className="font-circular-bold font-circular-bold text-[var(--color-text)]">
                  {formatPrice(venta.subtotal)}
                </span>
              </div>
            )}
            {Number(venta.descuentoMonto) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">
                  Descuento
                </span>
                <span className="font-circular-bold font-circular-bold text-[#ef4444]">
                  -{formatPrice(venta.descuentoMonto)}
                </span>
              </div>
            )}
            <div className="border-t border-[var(--color-border)] pt-2">
              <div className="flex items-center justify-between text-base">
                <span className="font-black text-[var(--color-text)]">
                  Total
                </span>
                <span className="font-circular-bold text-lg font-black text-[var(--color-text)] text-fixed-lg">
                  {formatPrice(venta.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {venta.observaciones && (
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <p className="mb-1 text-sm font-black text-[var(--color-text)]">
              Observaciones
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {venta.observaciones}
            </p>
          </div>
        )}

        {/* Anulada info */}
        {venta.estado === "anulada" && venta.anuladoAt && (
          <div className="rounded-2xl bg-[#ef4444]/5 p-5 shadow-sm ring-1 ring-[#ef4444]/20">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ef4444]/10">
                <WarningCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#ef4444]"
                />
              </div>
              <div>
                <p className="text-sm font-black text-[#ef4444]">
                  Venta anulada
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {venta.anuladoRazon}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                  {formatDate(venta.anuladoAt)} · {formatTime(venta.anuladoAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Creado por {creadoPor} · {formatDate(venta.createdAt)}
          </p>
        </div>
      </div>

      <AnnulSaleModal
        isOpen={annulModal}
        onClose={() => setAnnulModal(false)}
        correlativo={venta.correlativo}
        publicId={venta.publicId}
        mode={annulMode}
        onAnnulSuccess={handleAnnulSuccess}
      />
      <ConvertSaleModal
        key={`${venta.publicId}-${convertModalType ?? "boleta"}`}
        isOpen={convertModalType !== null}
        venta={venta}
        initialType={convertModalType ?? "boleta"}
        onClose={() => setConvertModalType(null)}
        onConverted={(converted) => {
          setVenta(converted);
          setConvertModalType(null);
        }}
      />
    </DashboardShell>
  );
}

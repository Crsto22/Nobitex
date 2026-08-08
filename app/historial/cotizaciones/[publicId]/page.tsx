"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  PackageIcon,
  ReceiptIcon,
  SpinnerGapIcon,
  UserIcon,
  WarningCircleIcon,
  XIcon,
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

function formatTime(iso: string | null) {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

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
    return "";
  }

  if (quote.cliente.tipoDocumento === "ruc") {
    return `RUC: ${quote.cliente.numeroDocumento || ""}`;
  }

  if (quote.cliente.tipoDocumento === "dni") {
    return `DNI: ${quote.cliente.numeroDocumento || ""}`;
  }

  return "";
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

export default function CotizacionDetallePage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;
  const [quotation, setQuotation] = useState<QuotationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [annulModalOpen, setAnnulModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<CotizacionEstado>("enviada");
  const [annulReason, setAnnulReason] = useState("");
  const [convertComprobante, setConvertComprobante] =
    useState<VentaTipoComprobante>("nota_venta");
  const [convertClient, setConvertClient] = useState<Client | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const toast = useSystemToast();

  useEffect(() => {
    if (!publicId) {
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (isMounted) setIsLoading(true);
    }, 0);

    quotationsApi
      .findOne(publicId)
      .then((data) => {
        if (isMounted) {
          setQuotation(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setQuotation(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [publicId]);

  const handleOpenStatusModal = () => {
    if (!quotation) {
      return;
    }

    setStatusDraft(quotation.estado);
    setStatusModalOpen(true);
  };

  const handleOpenConvertModal = () => {
    setConvertClient(quotation?.cliente ?? null);
    setConvertModalOpen(true);
  };

  const handleChangeStatus = async () => {
    if (!quotation || isActionSubmitting) {
      return;
    }

    setIsActionSubmitting(true);
    const loadingId = toast.showToast({
      title: "Actualizando estado...",
      variant: "loading",
    });

    try {
      const updated = await quotationsApi.update(quotation.publicId, {
        estado: statusDraft,
      });
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Estado actualizado",
        description: `${updated.correlativo} ahora esta ${statusConfig[updated.estado].label.toLowerCase()}`,
        variant: "success",
      });
      setQuotation(updated);
      setStatusModalOpen(false);
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
    if (!quotation || !annulReason.trim() || isActionSubmitting) {
      return;
    }

    setIsActionSubmitting(true);
    const loadingId = toast.showToast({
      title: "Anulando cotizacion...",
      variant: "loading",
    });

    try {
      const updated = await quotationsApi.annul(
        quotation.publicId,
        annulReason.trim(),
      );
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Cotizacion anulada",
        description: updated.correlativo,
        variant: "success",
      });
      setQuotation(updated);
      setAnnulReason("");
      setAnnulModalOpen(false);
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
    if (!quotation) {
      throw new Error("Selecciona una cotizacion.");
    }

    const result = await quotationsApi.convertToSale(quotation.publicId, {
      tipoComprobante: payload.tipoComprobante,
      clienteId: convertClient?.id ?? null,
      pagos: payload.pagos,
      observaciones: quotation.observaciones ?? undefined,
    });
    setQuotation(result.quotation);
    setConvertModalOpen(false);
    return result.sale;
  };

  if (isLoading) {
    return (
      <DashboardShell headerTitle="Detalle de Cotizacion">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <Image
            src="/svg/loader/Loader.svg"
            alt="Cargando detalle de cotizacion"
            width={140}
            height={140}
            className="h-[140px] w-[140px]"
          />
        </div>
      </DashboardShell>
    );
  }

  if (!quotation) {
    return (
      <DashboardShell headerTitle="Detalle de Cotizacion">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <div className="text-center">
            <WarningCircleIcon
              size={48}
              weight="light"
              className="mx-auto text-[var(--color-muted-foreground)]"
            />
            <p className="mt-3 text-sm font-black text-[var(--color-text)]">
              Cotizacion no encontrada
            </p>
            <button
              type="button"
              onClick={() => router.push("/historial/cotizaciones")}
              className="mt-4 h-10 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white transition-colors hover:opacity-90"
            >
              Volver al historial
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const status = statusConfig[quotation.estado];
  const creadoPor = quotation.creadoPor
    ? `${quotation.creadoPor.nombre} ${quotation.creadoPor.apellido || ""}`.trim()
    : "Sistema";
  const docLabel = getDocLabel(quotation);
  const canManageQuotation = !["convertida", "anulada"].includes(
    quotation.estado,
  );

  return (
    <DashboardShell
      headerTitle={
        <nav className="flex min-w-0 items-center gap-2" aria-label="Ruta actual">
          <Link
            href="/historial/cotizaciones"
            className="truncate text-sm font-circular-regular text-[var(--color-text)]/70 transition-colors hover:text-[var(--color-primary)]"
          >
            Historial de Cotizaciones
          </Link>
          <CaretRightIcon
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {quotation.correlativo}
          </span>
        </nav>
      }
    >
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6">
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canManageQuotation ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenConvertModal}
                  className="flex h-10 items-center gap-2 rounded-[14px] bg-[#10b981] px-4 text-sm font-circular-bold text-white shadow-[0_8px_18px_rgba(16,185,129,0.2)] transition-colors hover:bg-[#059669]"
                >
                  <ReceiptIcon size={16} weight="bold" />
                  Convertir venta
                </button>
                <button
                  type="button"
                  onClick={handleOpenStatusModal}
                  className="flex h-10 items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  <FileTextIcon size={16} weight="bold" />
                  Cambiar estado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnnulReason("");
                    setAnnulModalOpen(true);
                  }}
                  className="flex h-10 items-center gap-2 rounded-[14px] bg-[#ef4444] px-4 text-sm font-circular-bold text-white shadow-[0_8px_18px_rgba(239,68,68,0.2)] transition-colors hover:bg-[#dc2626]"
                >
                  <WarningCircleIcon size={16} weight="bold" />
                  Anular
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

        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} />
            <span className="font-circular-regular">
              {formatDate(quotation.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon size={14} />
            <span className="font-circular-regular">
              {formatTime(quotation.createdAt)}
            </span>
          </div>
          {quotation.sucursal ? (
            <div className="flex items-center gap-2">
              <PackageIcon size={14} />
              <span className="font-circular-regular">
                {quotation.sucursal.nombre}
              </span>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} />
            <span className="font-circular-regular">
              Valida hasta: {formatDate(quotation.validaHasta)}
            </span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
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
                  {getClientName(quotation)}
                </p>
                {docLabel ? (
                  <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                    {docLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <p className="text-sm font-black text-[var(--color-text)]">
              Documento
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Serie
                </p>
                <p className="font-circular-bold text-[var(--color-text)]">
                  {quotation.serie}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Numero
                </p>
                <p className="font-circular-bold text-[var(--color-text)]">
                  {quotation.numero}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <p className="mb-4 text-sm font-black text-[var(--color-text)]">
            Productos ({quotation.detalles.length})
          </p>
          <div className="space-y-3">
            {quotation.detalles.map((detalle) => {
              const pv = detalle.productoVariante;
              const image = pv.imagen;

              return (
                <div
                  key={detalle.id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] p-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-input-bg)]">
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
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                      {pv.producto.tipo === "variantes" ? <>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: pv.color.hex }}
                        />
                        {pv.color.nombre}
                      </span>
                      <span>Talla: {pv.talla.nombre}</span>
                      </> : null}
                      {pv.sku ? <span>SKU: {pv.sku}</span> : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                      {detalle.cantidad} x {formatPrice(detalle.precioUnitario)}
                    </p>
                    {Number(detalle.descuentoMonto) > 0 ? (
                      <p className="text-xs font-circular-bold text-[#ef4444]">
                        Desc. -{formatPrice(detalle.descuentoMonto)}
                      </p>
                    ) : null}
                    <p className="text-sm font-circular-bold text-[var(--color-text)]">
                      {formatPrice(detalle.total)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">
                Subtotal
              </span>
              <span className="font-circular-bold text-[var(--color-text)]">
                {formatPrice(quotation.subtotal)}
              </span>
            </div>
            {Number(quotation.descuentoMonto) > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">
                  Descuento
                  {quotation.descuentoTipo && quotation.descuentoValor
                    ? ` (${quotation.descuentoTipo === "porcentaje" ? `${quotation.descuentoValor}%` : formatPrice(quotation.descuentoValor)})`
                    : ""}
                </span>
                <span className="font-circular-bold text-[#ef4444]">
                  -{formatPrice(quotation.descuentoMonto)}
                </span>
              </div>
            ) : null}
            <div className="border-t border-[var(--color-border)] pt-2">
              <div className="flex items-center justify-between text-base">
                <span className="font-black text-[var(--color-text)]">
                  Total
                </span>
                <span className="text-lg font-black text-[var(--color-text)] text-fixed-lg">
                  {formatPrice(quotation.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {quotation.observaciones ? (
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <p className="mb-1 text-sm font-black text-[var(--color-text)]">
              Observaciones
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {quotation.observaciones}
            </p>
          </div>
        ) : null}

        {quotation.convertidaVenta ? (
          <div className="rounded-2xl bg-[#10b981]/5 p-5 shadow-sm ring-1 ring-[#10b981]/20">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10b981]/10">
                <CheckCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <div>
                <p className="text-sm font-black text-[#10b981]">
                  Cotizacion convertida en venta
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Venta: {quotation.convertidaVenta.correlativo}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {quotation.estado === "anulada" && quotation.anuladoAt ? (
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
                  Cotizacion anulada
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {quotation.anuladoRazon}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                  {formatDate(quotation.anuladoAt)} -{" "}
                  {formatTime(quotation.anuladoAt)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Creado por {creadoPor} - {formatDate(quotation.createdAt)}
          </p>
        </div>
      </div>

      {statusModalOpen && quotation ? (
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
                  {quotation.correlativo}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setStatusModalOpen(false)}
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

      {annulModalOpen && quotation ? (
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
                  {quotation.correlativo}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setAnnulModalOpen(false)}
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

      {quotation ? (
        <ChargeModal
          isOpen={convertModalOpen}
          title="Convertir a venta"
          wide
          onClose={() => {
            setConvertModalOpen(false);
            setConvertClient(null);
          }}
          cartItems={quoteToCartItems(quotation)}
          subtotal={Number(quotation.subtotal)}
          discountType={quotation.descuentoTipo as "porcentaje" | "monto" | null}
          discountValue={quotation.descuentoValor ?? ""}
          discountAmount={Number(quotation.descuentoMonto)}
          taxSummary={emptyTaxSummary(Number(quotation.total))}
          total={Number(quotation.total)}
          note={quotation.observaciones ?? ""}
          selectedBranch={quotation.sucursal?.id ?? ""}
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

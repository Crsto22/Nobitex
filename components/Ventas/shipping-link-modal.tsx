"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowClockwiseIcon,
  ClockIcon,
  CopyIcon,
  HouseIcon,
  LinkIcon,
  MotorcycleIcon,
  SpinnerGapIcon,
  StorefrontIcon,
  TruckIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  salesApi,
  type SaleShippingDetails,
  type VentaResponse,
} from "@/lib/api/sales";

type ShippingLinkModalProps = {
  isOpen: boolean;
  sale: VentaResponse | null;
  onClose: () => void;
  onUpdated: (shipping: SaleShippingDetails) => void;
};

export function ShippingLinkModal({
  isOpen,
  sale,
  onClose,
  onUpdated,
}: ShippingLinkModalProps) {
  const [shippingState, setShippingState] = useState<{
    saleId: string;
    data: SaleShippingDetails;
  } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const initializedSaleId = useRef<string | null>(null);
  const toast = useSystemToast();

  useEffect(() => {
    if (!isOpen || !sale) {
      initializedSaleId.current = null;
      return;
    }
    if (initializedSaleId.current === sale.publicId) return;
    initializedSaleId.current = sale.publicId;
    if (sale.envio) return;
    void salesApi
      .generateShippingLink(sale.publicId)
      .then((result) => {
        setShippingState({ saleId: sale.publicId, data: result });
        onUpdated(result);
      })
      .catch((error: unknown) => {
        initializedSaleId.current = null;
        toast.showToast({
          title: "No se pudo generar el enlace",
          description:
            error instanceof Error ? error.message : "Intenta nuevamente.",
          variant: "error",
        });
      });
  }, [isOpen, onUpdated, sale, toast]);

  const shipping =
    sale && shippingState?.saleId === sale.publicId
      ? shippingState.data
      : (sale?.envio ?? null);

  const link =
    shipping && typeof window !== "undefined"
      ? `${window.location.origin}/e/${shipping.codigo}`
      : "";

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.showToast({
      title: "Enlace copiado",
      description: "Ya puedes compartirlo con tu cliente.",
      variant: "success",
    });
  };

  const shareWhatsApp = () => {
    if (!sale || !link) return;
    const message = `Hola, completa tus datos de envío para la venta ${sale.correlativo}: ${link}`;
    const digits = sale.cliente?.telefono?.replace(/\D/g, "") ?? "";
    const phone = digits.length === 9 ? `51${digits}` : digits;
    const target = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const regenerate = async () => {
    if (!sale || isRegenerating) return;

    setIsRegenerating(true);
    try {
      const result = await salesApi.regenerateShippingLink(sale.publicId);
      setShippingState({ saleId: sale.publicId, data: result });
      onUpdated(result);
      toast.showToast({
        title: "Enlace regenerado",
        description: "El enlace anterior ya no está disponible.",
        variant: "success",
      });
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudo regenerar el enlace",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          shipping?.estado === "recibido" ? "Datos de envío" : "Enlace de envío"
        }
        description={sale ? `Venta ${sale.correlativo}` : undefined}
        size="md"
      >
      {!shipping ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <SpinnerGapIcon size={20} className="animate-spin" />
          Generando enlace seguro...
        </div>
      ) : shipping.estado === "recibido" ? (
        <div className="space-y-4">
          <div className="rounded-xl p-4">
            <div className="flex items-center gap-3">
              {shipping.agencia === "OLVA" ? (
                <Image
                  src="/envios/olva.webp"
                  alt="Olva"
                  width={48}
                  height={48}
                  unoptimized
                  className="h-12 w-12 shrink-0 object-contain"
                />
              ) : shipping.agencia === "SHALOM" ? (
                <Image
                  src="/envios/shalom.svg"
                  alt="Shalom"
                  width={48}
                  height={48}
                  unoptimized
                  className="h-12 w-12 shrink-0 object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-input-bg)]">
                  {shipping.metodoEnvio === "RECOJO" ? (
                    <StorefrontIcon
                      size={22}
                      weight="fill"
                      className="text-[var(--color-primary)]"
                    />
                  ) : shipping.metodoEnvio === "MOTORIZADO" ? (
                    <MotorcycleIcon
                      size={22}
                      weight="fill"
                      className="text-[var(--color-primary)]"
                    />
                  ) : shipping.metodoEnvio === "DOMICILIO" ? (
                    <HouseIcon
                      size={22}
                      weight="fill"
                      className="text-[var(--color-primary)]"
                    />
                  ) : (
                    <TruckIcon
                      size={22}
                      weight="fill"
                      className="text-[var(--color-primary)]"
                    />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[var(--color-text)]">
                  {shipping.nombreCompleto ?? "-"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                  <span>
                    {shipping.tipoDocumento ?? "DNI"} {shipping.dni ?? "-"}
                  </span>
                  <span>Cel {shipping.celular ?? "-"}</span>
                </div>
              </div>
              {shipping.agencia ? (
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black ${
                    shipping.agencia === "OLVA"
                      ? "bg-[#eab308] text-black"
                      : "bg-[#dc2626] text-white"
                  }`}
                >
                  {shipping.agencia === "OLVA" ? "OLVA" : "SHALOM"}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between pt-3">
              <span className="text-xs font-bold text-[var(--color-muted-foreground)]">
                Fecha de envío
              </span>
              <span className="text-sm font-black text-[var(--color-text)]">
                {formatFechaEnvio(shipping.fechaEnvio)}
              </span>
            </div>

            {shipping.agencia ? (
              <div className="mt-3 space-y-2 pt-3">
                <DataRow
                  label="Agencia"
                  value={shipping.agenciaNombre ?? shipping.agencia}
                />
                {shipping.agenciaDireccion ? (
                  <DataRow
                    label="Dirección"
                    value={[
                      shipping.agenciaDireccion,
                      shipping.agenciaDistrito,
                      shipping.agenciaProvincia,
                      shipping.agenciaDepartamento,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                ) : null}
              </div>
            ) : shipping.metodoEnvio === "RECOJO" ? (
              shipping.agenciaDireccion ? (
                <div className="mt-3 space-y-2 pt-3">
                  <DataRow label="Tienda" value={shipping.agenciaDireccion} />
                </div>
              ) : null
            ) : shipping.direccionEntrega ? (
              <div className="mt-3 space-y-2 pt-3">
                <DataRow label="Dirección" value={shipping.direccionEntrega} />
                {shipping.referenciaEntrega ? (
                  <DataRow
                    label="Referencia"
                    value={shipping.referenciaEntrega}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isRegenerating}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] text-xs font-circular-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)] disabled:opacity-50"
          >
            {isRegenerating ? (
              <SpinnerGapIcon size={16} className="animate-spin" />
            ) : (
              <ArrowClockwiseIcon size={16} weight="bold" />
            )}
            Regenerar enlace
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-input-bg)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Enlace corto
              </p>
              <p className="truncate text-sm font-circular-bold text-[var(--color-primary)]">
                {link}
              </p>
            </div>
            <LinkIcon size={22} className="shrink-0 text-[var(--color-primary)]" />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[#f59e0b]/10 px-4 py-3 text-sm font-circular-bold text-[#b45309]">
            <ClockIcon size={18} weight="fill" />
            Esperando datos del cliente
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              <CopyIcon size={18} weight="bold" />
              Copiar enlace
            </button>
            <button
              type="button"
              onClick={shareWhatsApp}
              className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#25D366] px-4 text-sm font-circular-bold text-white hover:opacity-90"
            >
              <WhatsappLogoIcon size={19} weight="fill" />
              Compartir
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isRegenerating}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] text-xs font-circular-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)] disabled:opacity-50"
          >
            {isRegenerating ? (
              <SpinnerGapIcon size={16} className="animate-spin" />
            ) : (
              <ArrowClockwiseIcon size={16} weight="bold" />
            )}
            Regenerar enlace
          </button>
        </div>
      )}
      </Modal>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={regenerate}
        title="Regenerar enlace"
        description="El enlace anterior dejará de funcionar y se borrarán los datos de envío recibidos. ¿Deseas continuar?"
        confirmLabel="Regenerar enlace"
      />
    </>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className="text-right text-sm font-circular-regular text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

function formatFechaEnvio(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

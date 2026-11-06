"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  CopyIcon,
  LinkIcon,
  SpinnerGapIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
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
    const confirmed = window.confirm(
      "El enlace anterior dejará de funcionar y se borrarán los datos de envío recibidos. ¿Deseas continuar?",
    );
    if (!confirmed) return;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enlace de envío"
      description={sale ? `Venta ${sale.correlativo}` : undefined}
      size="md"
    >
      {!shipping ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <SpinnerGapIcon size={20} className="animate-spin" />
          Generando enlace seguro...
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

          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-circular-bold ${
              shipping.estado === "recibido"
                ? "bg-[#10b981]/10 text-[#047857]"
                : "bg-[#f59e0b]/10 text-[#b45309]"
            }`}
          >
            <CheckCircleIcon size={18} weight="fill" />
            {shipping.estado === "recibido"
              ? "Datos recibidos"
              : "Esperando datos del cliente"}
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
            onClick={() => void regenerate()}
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
  );
}

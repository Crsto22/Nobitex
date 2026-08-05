"use client";

import { useState } from "react";
import { XIcon, WarningCircleIcon, SpinnerGapIcon } from "@phosphor-icons/react/ssr";

import { salesApi, type VentaAnnulResponse } from "@/lib/api/sales";
import { useSystemToast } from "@/components/SystemToast/system-toast";

type AnnulSaleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  correlativo: string;
  publicId: string;
  mode?: "annul" | "baja";
  onAnnulSuccess: (venta: VentaAnnulResponse) => void | Promise<void>;
};

export function AnnulSaleModal({
  isOpen,
  onClose,
  correlativo,
  publicId,
  mode = "annul",
  onAnnulSuccess,
}: AnnulSaleModalProps) {
  const [razon, setRazon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();
  const isBajaMode = mode === "baja";
  const copy = isBajaMode
    ? {
        title: "Dar de baja SUNAT",
        fieldLabel: "Motivo de baja",
        placeholder: "Ingrese el motivo de la baja SUNAT...",
        loadingTitle: "Registrando baja SUNAT...",
        loadingDescription: "Preparando solicitud de baja",
        successTitle: "Baja SUNAT registrada",
        successDescription: "Pendiente de respuesta SUNAT",
        errorTitle: "Error al registrar baja",
        fallbackError: "Error al registrar la baja SUNAT",
        submitIdle: "Dar de baja",
        submitLoading: "Registrando...",
      }
    : {
        title: "Anular venta",
        fieldLabel: "Razon de anulacion",
        placeholder: "Ingrese el motivo de la anulacion...",
        loadingTitle: "Anulando venta...",
        loadingDescription: "Restaurando stock",
        successTitle: "Venta anulada",
        successDescription: "Stock restaurado",
        errorTitle: "Error al anular",
        fallbackError: "Error al anular la venta",
        submitIdle: "Anular venta",
        submitLoading: "Anulando...",
      };

  const handleSubmit = async () => {
    if (!razon.trim()) return;

    setIsSubmitting(true);

    const loadingId = toast.showToast({
      title: copy.loadingTitle,
      description: copy.loadingDescription,
      variant: "loading",
    });

    try {
      const venta = await salesApi.annul(publicId, razon.trim());
      toast.dismissToast(loadingId);
      toast.showToast({
        title: copy.successTitle,
        description: `${venta.correlativo} - ${copy.successDescription}`,
        variant: "success",
        duration: 5000,
      });
      await onAnnulSuccess(venta);
      setRazon("");
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : copy.fallbackError;
      toast.dismissToast(loadingId);
      toast.showToast({
        title: copy.errorTitle,
        description: message,
        variant: "error",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setRazon("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-sm flex-col rounded-[24px] bg-[var(--color-card)] shadow-[0_22px_70px_rgba(15,23,42,0.28)] ring-1 ring-[var(--color-border)] animate-in zoom-in-95 duration-200">
        <div className="flex shrink-0 items-start justify-between gap-4 p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ef4444]/10">
              <WarningCircleIcon size={22} weight="fill" className="text-[#ef4444]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[var(--color-text)]">
                {copy.title}
              </h2>
              <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {correlativo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)] disabled:opacity-40"
            aria-label="Cerrar"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="mt-4 px-5 pb-5 pr-4">
          <label className="mb-2 block text-xs font-circular-bold text-[var(--color-muted-foreground)]">
            {copy.fieldLabel} <span className="text-[#ef4444]">*</span>
          </label>
          <textarea
            value={razon}
            onChange={(e) => setRazon(e.target.value)}
            placeholder={copy.placeholder}
            rows={3}
            disabled={isSubmitting}
            className="h-24 w-full resize-none rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[#ef4444]/20 disabled:opacity-50"
          />

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!razon.trim() || isSubmitting}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-[14px] bg-[#ef4444] text-sm font-black text-white shadow-[0_8px_18px_rgba(239,68,68,0.3)] transition-colors hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? (
                <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
              ) : (
                <WarningCircleIcon size={18} weight="bold" />
              )}
              {isSubmitting ? copy.submitLoading : copy.submitIdle}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  ArrowsClockwiseIcon,
  NotePencilIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/ssr";

import { ClientPickerModal } from "@/components/Clients/client-picker-modal";
import { Modal } from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";
import type { Client } from "@/lib/api/clients";
import {
  salesApi,
  type VentaResponse,
  type VentaTipoComprobante,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";
import { useSystemToast } from "@/components/SystemToast/system-toast";

type ConvertSaleModalProps = {
  isOpen: boolean;
  venta: VentaResponse | null;
  initialType?: Extract<VentaTipoComprobante, "boleta" | "factura">;
  onClose: () => void;
  onConverted: (venta: VentaResponse) => void;
};

const convertTypes = [
  { label: "Boleta", value: "boleta" },
  { label: "Factura", value: "factura" },
] as const;

function formatPrice(amount: number) {
  return `S/${amount.toFixed(2)}`;
}

export function ConvertSaleModal({
  isOpen,
  venta,
  initialType = "boleta",
  onClose,
  onConverted,
}: ConvertSaleModalProps) {
  const [targetType, setTargetType] = useState(initialType);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();

  const total = useMemo(() => Number(venta?.total ?? 0), [venta]);
  const requiredDocumentType =
    targetType === "factura"
      ? "ruc"
      : targetType === "boleta" && total > 700
        ? "dni"
        : undefined;
  const documentLabel = requiredDocumentType === "ruc" ? "RUC" : "DNI";
  const isClientInvalid =
    requiredDocumentType === "ruc"
      ? selectedClient?.tipoDocumento !== "ruc" ||
        selectedClient.numeroDocumento?.length !== 11 ||
        !selectedClient.razonSocial?.trim()
      : requiredDocumentType === "dni"
        ? selectedClient?.tipoDocumento !== "dni" ||
          selectedClient.numeroDocumento?.length !== 8
        : false;

  const handleSubmit = async () => {
    if (!venta || isClientInvalid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const converted = await salesApi.convert(venta.publicId, {
        tipoComprobante: targetType,
        clienteId: selectedClient?.id ?? null,
      });
      toast.showToast({
        title: "Nota convertida",
        description: `${converted.correlativo} · ${targetType === "factura" ? "Factura" : "Boleta"}`,
        variant: "success",
      });
      onConverted(converted);
      onClose();
    } catch (error) {
      toast.showToast({
        title: "No se pudo convertir",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!venta) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Convertir nota"
        description={`${venta.correlativo} · ${formatPrice(total)}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {convertTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setTargetType(type.value);
                  setSelectedClient(null);
                }}
                className={cn(
                  "h-11 rounded-[8px] text-sm font-circular-bold transition-colors",
                  targetType === type.value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="rounded-[8px] bg-[var(--color-input-bg)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Cliente
                </p>
                <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                  {selectedClient?.displayName ?? "Cliente generico"}
                </p>
                <p className="text-xs uppercase text-[var(--color-muted-foreground)]">
                  {selectedClient
                    ? `${selectedClient.tipoDocumento}: ${selectedClient.numeroDocumento ?? "Sin documento"}`
                    : "Sin documento"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClientPickerOpen(true)}
                className="h-9 gap-2"
              >
                <NotePencilIcon size={16} weight="bold" />
                Cambiar
              </Button>
            </div>
            {isClientInvalid ? (
              <p className="mt-3 rounded-[8px] bg-[#fff3e8] p-3 text-xs text-[#b45309]">
                Selecciona un cliente con {documentLabel} valido para convertir
                a {targetType === "factura" ? "factura" : "boleta"}.
              </p>
            ) : null}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="h-11 flex-1 gap-2 bg-[#ff7417] text-white hover:bg-[#f2670a]"
              disabled={isClientInvalid || isSubmitting}
            >
              {isSubmitting ? (
                <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />
              ) : (
                <ArrowsClockwiseIcon size={16} weight="bold" />
              )}
              Convertir
            </Button>
          </div>
        </div>
      </Modal>

      <ClientPickerModal
        isOpen={isClientPickerOpen}
        onClose={() => setIsClientPickerOpen(false)}
        selectedClient={selectedClient}
        requiredDocumentType={requiredDocumentType}
        onSelect={setSelectedClient}
      />
    </>
  );
}

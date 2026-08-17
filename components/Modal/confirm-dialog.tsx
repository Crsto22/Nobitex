"use client";

import { WarningIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";

import { Modal } from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  itemName?: string;
  confirmLabel?: string;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Eliminar elemento",
  description = "Esta accion no se puede deshacer.",
  itemName,
  confirmLabel,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-[16px] bg-[var(--color-input-bg)] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]">
            <WarningIcon size={20} weight="fill" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-circular-regular text-[var(--color-text)]">
              {description}
            </p>
            {itemName && (
              <p className="mt-1 truncate text-xs font-circular-bold text-[var(--color-muted-foreground)] font-circular-regular">
                {itemName}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-[14px] bg-[#ef4444] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSubmitting
              ? confirmLabel
                ? "Procesando..."
                : "Eliminando..."
              : (confirmLabel ?? "Eliminar")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { Modal } from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";

type QuickSizeModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  value: string;
  error: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function QuickSizeModal({
  isOpen,
  isSaving,
  value,
  error,
  onChange,
  onClose,
  onSubmit,
}: QuickSizeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSaving) {
          onClose();
        }
      }}
      title="Nueva talla"
      description="Crea una talla y agregala al producto actual."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label
            htmlFor="quick-size-name"
            className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
          >
            Nombre de la talla
          </label>
          <input
            id="quick-size-name"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="S, M, L, 38, 40"
            maxLength={80}
            required
            disabled={isSaving}
            className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
          />
        </div>
        {error ? <p className="text-sm font-circular-regular text-[#d9480f]">{error}</p> : null}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSaving ? "Guardando..." : "Crear talla"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

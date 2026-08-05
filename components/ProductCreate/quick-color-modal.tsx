"use client";

import { Modal } from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";
import { isValidHex, normalizeHex } from "./utils";

type QuickColorModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  name: string;
  hex: string;
  error: string;
  onNameChange: (value: string) => void;
  onHexChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function QuickColorModal({
  isOpen,
  isSaving,
  name,
  hex,
  error,
  onNameChange,
  onHexChange,
  onClose,
  onSubmit,
}: QuickColorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSaving) {
          onClose();
        }
      }}
      title="Nuevo color"
      description="Crea un color y agregalo al producto actual."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label
            htmlFor="quick-color-name"
            className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
          >
            Nombre del color
          </label>
          <input
            id="quick-color-name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Rojo, Negro, Azul"
            maxLength={80}
            required
            disabled={isSaving}
            className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
          />
        </div>

        <div>
          <label
            htmlFor="quick-color-hex"
            className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
          >
            Hexadecimal
          </label>
          <div className="flex gap-3">
            <input
              type="color"
              value={isValidHex(hex) ? normalizeHex(hex) : "#111827"}
              onChange={(event) => onHexChange(event.target.value.toUpperCase())}
              disabled={isSaving}
              className="h-11 w-14 shrink-0 cursor-pointer rounded-[14px] border-0 bg-[var(--color-input-bg)] p-1 disabled:opacity-70"
              aria-label="Seleccionar color"
            />
            <input
              id="quick-color-hex"
              type="text"
              value={hex}
              onChange={(event) => onHexChange(event.target.value.toUpperCase())}
              placeholder="#FF7417"
              maxLength={7}
              required
              disabled={isSaving}
              className="h-11 min-w-0 flex-1 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70 font-circular-regular"
            />
          </div>
        </div>

        <div className="rounded-[16px] bg-[var(--color-input-bg)] p-3">
          <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
            Vista previa
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full ring-1 ring-black/10"
              style={{
                backgroundColor: isValidHex(hex) ? normalizeHex(hex) : "#111827",
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[var(--color-text)]">
                {name.trim() || "Nombre del color"}
              </p>
              <p className="text-xs font-circular-bold text-[var(--color-muted-foreground)] font-circular-regular">
                {normalizeHex(hex)}
              </p>
            </div>
          </div>
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
            {isSaving ? "Guardando..." : "Crear color"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

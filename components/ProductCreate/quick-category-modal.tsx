"use client";

import { FolderSimpleIcon } from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickCategoryModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  name: string;
  description: string;
  active: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function QuickCategoryModal({
  isOpen,
  isSaving,
  name,
  description,
  active,
  error,
  onNameChange,
  onDescriptionChange,
  onActiveChange,
  onClose,
  onSubmit,
}: QuickCategoryModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title="Nueva categoria"
      description="Define como vas a agrupar los productos de tu catalogo."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label
            htmlFor="quick-category-name"
            className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
          >
            Nombre de la categoria
          </label>
          <input
            id="quick-category-name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Polos, Zapatillas, Accesorios"
            maxLength={120}
            required
            disabled={isSaving}
            className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
          />
        </div>

        <div>
          <label
            htmlFor="quick-category-description"
            className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
          >
            Descripcion
          </label>
          <textarea
            id="quick-category-description"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Productos principales de esta categoria"
            maxLength={500}
            disabled={isSaving}
            className="min-h-24 w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
          />
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-circular-bold transition-colors hover:bg-[var(--color-button-hover)]",
            active
              ? "text-[var(--color-text)]"
              : "text-[var(--color-muted-foreground)]",
          )}
        >
          <span>Categoria activa</span>
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => onActiveChange(event.target.checked)}
            disabled={isSaving}
            className="h-5 w-5 accent-[var(--color-primary)]"
          />
        </label>

        <div className="rounded-[16px] bg-[var(--color-input-bg)] p-3">
          <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
            Vista previa
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
              <FolderSimpleIcon size={22} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[var(--color-text)]">
                {name.trim() || "Nombre de la categoria"}
              </p>
              <p className="truncate text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                {description.trim() || "Sin descripcion"}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-sm font-circular-regular text-[#d9480f]">{error}</p>
        ) : null}

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
            {isSaving ? "Guardando..." : "Crear categoria"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

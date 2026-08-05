"use client";

import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import type { Size } from "@/lib/api/sizes";
import { cn } from "@/lib/utils";

type SizeFilterProps = {
  sizes: Size[];
  selectedSizeId: string;
  canLoadMore: boolean;
  isLoading: boolean;
  onSizeChange: (sizeId: string) => void;
  onLoadMore: () => void;
};

export function SizeFilter({
  sizes,
  selectedSizeId,
  canLoadMore,
  isLoading,
  onSizeChange,
  onLoadMore,
}: SizeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onSizeChange("todos")}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-circular-bold transition-colors",
          selectedSizeId === "todos"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
        )}
      >
        Todos
      </button>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            onClick={() => onSizeChange(size.id)}
            className={cn(
              "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[10px] font-circular-bold transition-colors",
              selectedSizeId === size.id
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
            )}
            title={size.nombre}
          >
            {size.nombre}
          </button>
        ))}
        {canLoadMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cargar mas tallas"
            title="Cargar mas tallas"
          >
            <CaretRightIcon size={13} weight="bold" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

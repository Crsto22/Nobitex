"use client";

import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import type { Color } from "@/lib/api/colors";
import { cn } from "@/lib/utils";

type ColorFilterProps = {
  colors: Color[];
  selectedColorId: string;
  canLoadMore: boolean;
  isLoading: boolean;
  onColorChange: (colorId: string) => void;
  onLoadMore: () => void;
};

export function ColorFilter({
  colors,
  selectedColorId,
  canLoadMore,
  isLoading,
  onColorChange,
  onLoadMore,
}: ColorFilterProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onColorChange("todos")}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-circular-bold transition-colors",
          selectedColorId === "todos"
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
        )}
      >
        Todos
      </button>
      <div className="flex min-w-0 flex-wrap gap-2">
        {colors.map((color) => {
          const isSelected = selectedColorId === color.id;

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onColorChange(color.id)}
              className={cn(
                "h-6 w-6 rounded-full ring-2 ring-offset-1 ring-offset-[var(--color-background)] transition-colors",
                isSelected ? "scale-105" : "ring-transparent hover:scale-105",
              )}
              style={{
                backgroundColor: color.hex,
                "--tw-ring-color": isSelected ? color.hex : "transparent",
              } as React.CSSProperties}
              aria-label={color.nombre}
              title={color.nombre}
            />
          );
        })}
        {canLoadMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cargar mas colores"
            title="Cargar mas colores"
          >
            <CaretRightIcon size={13} weight="bold" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

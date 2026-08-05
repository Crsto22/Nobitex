"use client";

import { cn } from "@/lib/utils";
import type { CatalogColor } from "./types";

type ColorButtonProps = {
  color: CatalogColor;
  selected?: boolean;
  onClick: () => void;
};

export function ColorButton({ color, selected, onClick }: ColorButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-8 w-8 cursor-pointer overflow-visible rounded-full transition-all duration-200 hover:z-[80] hover:scale-105 focus-visible:z-[80]",
        selected &&
          "ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]",
      )}
      style={{ backgroundColor: color.hex }}
      aria-label={color.label}
    >
      <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-full bg-[var(--color-text)] px-3 py-1.5 text-[11px] font-circular-bold leading-none text-white opacity-0 shadow-[0_8px_20px_rgba(17,37,58,0.14)] transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 dark:bg-[var(--color-input-text)] dark:text-[var(--color-background)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
        {color.label}
      </span>
    </button>
  );
}

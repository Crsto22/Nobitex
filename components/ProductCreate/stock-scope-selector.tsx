"use client";

import type { Icon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type StockScopeOption = {
  label: string;
  value: string;
  icon: Icon;
};

type StockScopeSelectorProps = {
  scopes: StockScopeOption[];
  selectedScope: string;
  isLoading: boolean;
  hasBranches: boolean;
  onScopeChange: (scope: string) => void;
};

export function StockScopeSelector({
  scopes,
  selectedScope,
  isLoading,
  hasBranches,
  onScopeChange,
}: StockScopeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
        APLICAR STOCK:
      </p>
      <div className="flex flex-wrap gap-2">
        {scopes.map((scope) => {
          const Icon = scope.icon;
          const isSelected = selectedScope === scope.value;

          return (
            <button
              key={scope.value}
              type="button"
              onClick={() => onScopeChange(scope.value)}
              className={cn(
                "flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-[16px] bg-[#F4F4F4] px-3 text-left text-xs font-circular-bold shadow-sm transition-colors dark:bg-[var(--color-input-bg)]",
                isSelected
                  ? "text-[var(--color-primary)] dark:text-[var(--color-input-text)]"
                  : "text-[var(--color-muted-foreground)] dark:text-[var(--color-input-text)]/70 hover:text-[var(--color-primary)] dark:hover:text-[var(--color-input-text)]",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                  isSelected
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-white text-[var(--color-muted-foreground)] dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]",
                )}
              >
                <Icon size={15} weight={isSelected ? "fill" : "bold"} />
              </span>
              <span className="truncate">{scope.label}</span>
            </button>
          );
        })}
      </div>
      {isLoading ? (
        <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
          Cargando sucursales disponibles...
        </p>
      ) : null}
      {!isLoading && !hasBranches ? (
        <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
          No tienes sucursales activas para aplicar stock.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { CaretDownIcon, StorefrontIcon } from "@phosphor-icons/react/ssr";

import type { Branch } from "@/lib/api/branches";
import { cn } from "@/lib/utils";

type BranchFilterProps = {
  branches: Branch[];
  selectedBranchId: string;
  isOpen: boolean;
  className?: string;
  onOpenChange: (isOpen: boolean) => void;
  onBranchChange: (branchId: string) => void;
};

export function BranchFilter({
  branches,
  selectedBranchId,
  isOpen,
  className,
  onOpenChange,
  onBranchChange,
}: BranchFilterProps) {
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const selectedLabel = selectedBranch?.nombre ?? "Sucursal";

  return (
    <div className={cn("relative w-full sm:w-[220px]", className)}>
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        disabled={branches.length === 0}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-medium text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <StorefrontIcon
            size={18}
            weight="fill"
            className="shrink-0 text-[var(--color-primary)]"
          />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <CaretDownIcon size={16} className="shrink-0" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-50 mt-2 max-h-72 w-full min-w-[220px] overflow-y-auto rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {branches.map((branch) => (
            <BranchOption
              key={branch.id}
              branch={branch}
              selected={selectedBranchId === branch.id}
              onClick={() => {
                onBranchChange(branch.id);
                onOpenChange(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BranchOption({
  branch,
  selected,
  onClick,
}: {
  branch: Branch;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        selected
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-circular-bold">{branch.nombre}</span>
        <span
          className={cn(
            "block truncate text-[11px] font-circular-regular",
            selected ? "text-white/75" : "text-[var(--color-muted-foreground)]",
          )}
        >
          {branch.tipo.toUpperCase()}
          {branch.esPrincipal ? " · PRINCIPAL" : ""}
        </span>
      </span>
      {selected ? <span className="h-2 w-2 shrink-0 rounded-full bg-white" /> : null}
    </button>
  );
}

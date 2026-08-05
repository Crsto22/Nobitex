"use client";

import { useState } from "react";
import {
  ArrowClockwiseIcon,
  BuildingsIcon,
  CaretDownIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import type { Branch } from "@/lib/api/branches";
import { DateFilter } from "./date-filter";

type FilterBarProps = {
  selectedDateFilter: string;
  onDateFilterChange: (value: string) => void;
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  allowAllBranches?: boolean;
  ownOperations?: boolean;
};

export function FilterBar({
  selectedDateFilter,
  onDateFilterChange,
  branches,
  selectedBranch,
  onBranchChange,
  onRefresh,
  isRefreshing = false,
  allowAllBranches = true,
  ownOperations = false,
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const branchOptions = [
    ...(allowAllBranches ? [{ label: "Todas", value: "all" }] : []),
    ...branches.map((branch) => ({ label: branch.nombre, value: branch.id })),
  ];
  const currentBranch = branchOptions.find((b) => b.value === selectedBranch);

  return (
    <div className="flex items-center justify-between gap-4">
      <DateFilter selected={selectedDateFilter} onChange={onDateFilterChange} />
      <div className="flex items-center gap-3">
        {ownOperations ? (
          <span className="hidden h-10 items-center rounded-xl bg-[var(--color-primary)]/10 px-3 text-xs font-circular-bold text-[var(--color-primary)] sm:flex">
            Mis operaciones
          </span>
        ) : null}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="font-circular-regular flex items-center gap-2 rounded-xl bg-[var(--color-sidebar-bg)] px-5 py-2.5 text-sm font-circular-bold text-[var(--color-text)] outline-none transition-colors hover:bg-[var(--color-button-hover)]"
          >
            <BuildingsIcon size={16} weight="bold" />
            {currentBranch?.label ?? "Cargando..."}
            <CaretDownIcon size={14} weight="bold" />
          </button>
          {isOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
              {branchOptions.map((branch) => (
                <button
                  key={branch.value}
                  type="button"
                  onClick={() => {
                    onBranchChange(branch.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "font-circular-regular flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-bold transition-colors",
                    selectedBranch === branch.value
                      ? "bg-[var(--color-sidebar-active)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                  )}
                >
                  <BuildingsIcon size={16} weight="bold" />
                  {branch.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "font-circular-regular flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-circular-bold text-white shadow-md transition-colors duration-200",
            "bg-[var(--color-sidebar-active)] dark:bg-[var(--color-secondary)]",
            isRefreshing && "cursor-not-allowed opacity-70",
          )}
        >
          <ArrowClockwiseIcon
            size={16}
            weight="bold"
            className={cn(isRefreshing && "animate-spin")}
          />
          Actualizar
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowClockwiseIcon, BuildingsIcon, CaretDownIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DateFilter } from "./date-filter";

type FilterBarProps = {
  selectedDateFilter: string;
  onDateFilterChange: (value: string) => void;
};

const branches = [
  { label: "Todas", value: "all" },
  { label: "Sucursal Centro", value: "centro" },
  { label: "Sucursal Norte", value: "norte" },
  { label: "Sucursal Sur", value: "sur" },
];

export function FilterBar({ selectedDateFilter, onDateFilterChange }: FilterBarProps) {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [isOpen, setIsOpen] = useState(false);

  const currentBranch = branches.find((b) => b.value === selectedBranch);

  return (
    <div className="flex items-center justify-between gap-4">
      <DateFilter selected={selectedDateFilter} onChange={onDateFilterChange} />
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-sidebar-bg)] px-5 py-2.5 text-sm font-bold text-[var(--color-text)] outline-none transition-colors hover:bg-[var(--color-button-hover)]"
            style={{ fontFamily: "var(--font-circular-x-sub)" }}
          >
            <BuildingsIcon size={16} weight="bold" />
            {currentBranch?.label}
            <CaretDownIcon size={14} weight="bold" />
          </button>
          {isOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
              {branches.map((branch) => (
                <button
                  key={branch.value}
                  type="button"
                  onClick={() => {
                    setSelectedBranch(branch.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors",
                    selectedBranch === branch.value
                      ? "bg-[var(--color-sidebar-active)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                  )}
                  style={{ fontFamily: "var(--font-circular-x-sub)" }}
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
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200",
            "bg-[var(--color-sidebar-active)] dark:bg-[var(--color-secondary)]",
          )}
          style={{ fontFamily: "var(--font-circular-x-sub)" }}
        >
          <ArrowClockwiseIcon size={16} weight="bold" />
          Actualizar
        </button>
      </div>
    </div>
  );
}

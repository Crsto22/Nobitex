"use client";

import { cn } from "@/lib/utils";

type DateFilterOption = {
  label: string;
  value: string;
};

const dateFilterOptions: DateFilterOption[] = [
  { label: "Hoy", value: "today" },
  { label: "Últimos 7 días", value: "7days" },
  { label: "Últimos 14 días", value: "14days" },
  { label: "Últimos 30 días", value: "30days" },
];

type DateFilterProps = {
  selected: string;
  onChange: (value: string) => void;
};

export function DateFilter({ selected, onChange }: DateFilterProps) {
  return (
    <div className="flex gap-2">
      {dateFilterOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200",
            "font-[var(--font-circular-x-sub)]",
            selected === option.value
              ? "bg-[var(--color-sidebar-active)] text-white shadow-md dark:bg-[var(--color-secondary)]"
              : "bg-[var(--color-sidebar-bg)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

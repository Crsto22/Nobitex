"use client";

import { cn } from "@/lib/utils";

type DateFilterOption = {
  label: string;
  value: string;
};

const dateFilterOptions: DateFilterOption[] = [
  { label: "Hoy", value: "today" },
  { label: "Ultimos 7 dias", value: "7days" },
  { label: "Ultimos 14 dias", value: "14days" },
  { label: "Ultimos 30 dias", value: "30days" },
];

type DateFilterProps = {
  selected: string;
  onChange: (value: string) => void;
};

export function DateFilter({ selected, onChange }: DateFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden sm:overflow-visible">
      {dateFilterOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl px-5 py-2.5 text-sm font-circular-bold transition-colors duration-200 shrink-0",
            "font-circular-regular",
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

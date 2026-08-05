"use client";

import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import type { Category } from "@/lib/api/categories";
import { cn } from "@/lib/utils";

type CategoryFilterProps = {
  categories: Category[];
  selectedCategoryId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCategoryChange: (categoryId: string) => void;
};

export function CategoryFilter({
  categories,
  selectedCategoryId,
  isOpen,
  onOpenChange,
  onCategoryChange,
}: CategoryFilterProps) {
  const selectedLabel =
    selectedCategoryId === "todos"
      ? "TODOS"
      : categories.find((category) => category.id === selectedCategoryId)?.nombre ??
        "TODOS";

  return (
    <div className="relative w-[180px]">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-medium text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)]"
      >
        <span className="truncate">{selectedLabel.toUpperCase()}</span>
        <CaretDownIcon size={16} className="shrink-0" />
      </button>
      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-2 max-h-72 w-full min-w-[190px] overflow-y-auto rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          <CategoryOption
            label="TODOS"
            selected={selectedCategoryId === "todos"}
            onClick={() => {
              onCategoryChange("todos");
              onOpenChange(false);
            }}
          />
          {categories.map((category) => (
            <CategoryOption
              key={category.id}
              label={category.nombre}
              selected={selectedCategoryId === category.id}
              onClick={() => {
                onCategoryChange(category.id);
                onOpenChange(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
        selected
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
      )}
    >
      <span className="truncate">{label.toUpperCase()}</span>
      {selected ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          viewBox="0 0 256 256"
          className="shrink-0"
        >
          <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,0-11.32,11.32l56,56a24,24,0,0,0,33.94,0l128-128a8,8,0,0,0-11.32-11.32Z" />
        </svg>
      ) : null}
    </button>
  );
}

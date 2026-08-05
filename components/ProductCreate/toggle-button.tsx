"use client";

import { cn } from "@/lib/utils";

type ToggleButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

export function ToggleButton({ active, onClick, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex h-11 min-w-0 items-center justify-between gap-3 overflow-hidden rounded-[16px] bg-[#F4F4F4] px-3 text-xs font-circular-bold shadow-sm transition-colors dark:bg-[var(--color-input-bg)]",
        active
          ? "text-[var(--color-primary)] dark:text-[var(--color-input-text)]"
          : "text-[var(--color-muted-foreground)] dark:text-[var(--color-input-text)]",
      )}
    >
      {children}
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 overflow-hidden rounded-full transition-colors",
          active ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            active ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

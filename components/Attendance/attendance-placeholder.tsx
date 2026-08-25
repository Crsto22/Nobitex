"use client";

import type { Icon } from "@phosphor-icons/react";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

type AttendancePlaceholderProps = {
  title: string;
  description: string;
  icon: Icon;
};

export function AttendancePlaceholder({
  title,
  description,
  icon: Icon,
}: AttendancePlaceholderProps) {
  return (
    <DashboardShell headerTitle={title}>
      <div className="flex flex-1 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:px-10 md:py-10">
        <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-input-bg)] text-[var(--color-primary)]">
              <Icon size={22} weight="fill" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-circular-bold text-[var(--color-text)]">
                {title}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {description}
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

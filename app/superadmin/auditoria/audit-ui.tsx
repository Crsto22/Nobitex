"use client";

import { NativeSelect } from "@/components/ui/select";

import type { ReactNode } from "react";
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/ssr";

import {
  type PlatformAuditCategory,
  type PlatformAuditSource,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";

export function AuditControls({
  search,
  source,
  category,
  isLoading,
  showCategory = false,
  onSearchChange,
  onSourceChange,
  onCategoryChange,
  onRefresh,
}: {
  search: string;
  source: PlatformAuditSource | "";
  category?: PlatformAuditCategory | "";
  isLoading: boolean;
  showCategory?: boolean;
  onSearchChange: (value: string) => void;
  onSourceChange: (value: PlatformAuditSource | "") => void;
  onCategoryChange?: (value: PlatformAuditCategory | "") => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1">
        <MagnifyingGlassIcon
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar empresa, documento o responsable..."
          className="h-11 w-full rounded-xl bg-[var(--color-sidebar-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:flex">
        {showCategory ? (
          <NativeSelect
            value={category}
            aria-label="Filtrar por tipo de actividad"
            onChange={(event) =>
              onCategoryChange?.(
                event.target.value as PlatformAuditCategory | "",
              )
            }
            className="h-11 min-w-[185px] rounded-xl bg-[var(--color-sidebar-bg)] px-4 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="">Toda la actividad</option>
            <option value="company">Empresas</option>
            <option value="plan">Planes</option>
            <option value="admin">AdministraciÃ³n</option>
            <option value="subscription">Suscripciones</option>
            <option value="billing">Facturacion</option>
            <option value="affiliate">Afiliados</option>
          </NativeSelect>
        ) : null}

        <NativeSelect
          value={source}
          aria-label="Filtrar por origen"
          onChange={(event) =>
            onSourceChange(event.target.value as PlatformAuditSource | "")
          }
          className="h-11 min-w-[175px] rounded-xl bg-[var(--color-sidebar-bg)] px-4 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        >
          <option value="">Todos los orígenes</option>
          <option value="registration">Registro</option>
          <option value="admin">Administración</option>
          <option value="cli">CLI</option>
          <option value="historical">Histórico</option>
        </NativeSelect>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          "flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-sidebar-active)] px-5 text-sm font-circular-bold text-white shadow-md dark:bg-[var(--color-secondary)]",
          isLoading && "cursor-not-allowed opacity-70",
        )}
      >
        <ArrowClockwiseIcon
          size={16}
          weight="bold"
          className={cn(isLoading && "animate-spin")}
        />
        Actualizar
      </button>
    </div>
  );
}

export function AuditMetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "dark" | "primary" | "info" | "warning";
}) {
  const active = tone === "dark" || tone === "primary";
  const colors = {
    dark: "bg-[var(--color-sidebar-active)] text-white",
    primary: "bg-[var(--color-primary)] text-white",
    info: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
    warning: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
  }[tone];
  const iconColors = {
    dark: "bg-white/20 text-white",
    primary: "bg-white/20 text-white",
    info: "bg-[#eff6ff] text-[#3b82f6]",
    warning: "bg-[#fff7ed] text-[#f59e0b]",
  }[tone];

  return (
    <article
      className={cn("flex flex-col gap-4 rounded-2xl p-5 shadow-sm", colors)}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          iconColors,
        )}
      >
        {icon}
      </span>
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            active ? "text-white/70" : "text-[var(--color-muted-foreground)]",
          )}
        >
          {label}
        </p>
        <p className="mt-1 text-2xl leading-none font-circular-bold">
          {value.toLocaleString("es-PE")}
        </p>
      </div>
    </article>
  );
}

export function AuditPagination({
  page,
  totalPages,
  total,
  visible,
  isLoading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  visible: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Mostrando {visible} de {total} registros
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] px-2 text-xs font-circular-bold text-white">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export function AuditSourceBadge({ source }: { source: PlatformAuditSource }) {
  const values: Record<PlatformAuditSource, [string, string]> = {
    registration: ["Registro", "bg-[#10b981]/10 text-[#059669]"],
    admin: ["Administración", "bg-[#8b5cf6]/10 text-[#7c3aed]"],
    cli: ["CLI", "bg-[#2563eb]/10 text-[#2563eb]"],
    historical: ["Histórico", "bg-[#6b7280]/10 text-[#6b7280]"],
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        values[source][1],
      )}
    >
      {values[source][0]}
    </span>
  );
}

export function AuditLoadingRows() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-[var(--color-input-bg)]"
        />
      ))}
    </div>
  );
}

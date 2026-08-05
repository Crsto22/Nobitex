"use client";

import { NativeSelect } from "@/components/ui/select";

import type { ReactNode } from "react";
import {
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/ssr";

import {
  type PlatformCompanyState,
  type PlatformPlanCode,
  type PlatformPlanStatus,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";

const plans: { value: PlatformPlanCode; label: string }[] = [
  { value: "prueba", label: "Prueba" },
  { value: "basico", label: "Básico" },
  { value: "emprendedor", label: "Emprende" },
  { value: "crecimiento", label: "Crece" },
  { value: "empresarial", label: "Escala" },
];

export function CompanyControls({
  search,
  plan,
  state,
  planStatus,
  isLoading,
  onSearchChange,
  onPlanChange,
  onStateChange,
  onPlanStatusChange,
  onRefresh,
}: {
  search: string;
  plan: PlatformPlanCode | "";
  state: PlatformCompanyState | "";
  planStatus: PlatformPlanStatus | "";
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onPlanChange: (value: PlatformPlanCode | "") => void;
  onStateChange: (value: PlatformCompanyState | "") => void;
  onPlanStatusChange: (value: PlatformPlanStatus | "") => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <label className="relative min-w-0 flex-1">
        <MagnifyingGlassIcon
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar empresa, documento o correo..."
          className="h-11 w-full rounded-xl bg-[var(--color-sidebar-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3 xl:flex">
        <FilterSelect
          value={plan}
          ariaLabel="Filtrar por plan"
          onChange={(value) => onPlanChange(value as PlatformPlanCode | "")}
        >
          <option value="">Todos los planes</option>
          {plans.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={state}
          ariaLabel="Filtrar por estado de empresa"
          onChange={(value) =>
            onStateChange(value as PlatformCompanyState | "")
          }
        >
          <option value="">Todos los estados</option>
          <option value="activa">Activa</option>
          <option value="inactiva">Inactiva</option>
          <option value="suspendida">Suspendida</option>
        </FilterSelect>
        <FilterSelect
          value={planStatus}
          ariaLabel="Filtrar por estado del plan"
          onChange={(value) =>
            onPlanStatusChange(value as PlatformPlanStatus | "")
          }
        >
          <option value="">Vigencia del plan</option>
          <option value="trial">Prueba activa</option>
          <option value="active">Plan activo</option>
          <option value="expired">Plan vencido</option>
        </FilterSelect>
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

function FilterSelect({
  value,
  ariaLabel,
  onChange,
  children,
}: {
  value: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <NativeSelect
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 min-w-[165px] rounded-xl bg-[var(--color-sidebar-bg)] px-4 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
    >
      {children}
    </NativeSelect>
  );
}

export function CompanyPagination({
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
        Mostrando {visible} de {total} empresas
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

export function PlanBadge({
  code,
  name,
}: {
  code: PlatformPlanCode;
  name: string;
}) {
  const colors: Record<PlatformPlanCode, string> = {
    prueba: "bg-[#2563eb]/10 text-[#2563eb]",
    basico: "bg-[#06b6d4]/10 text-[#0891b2]",
    emprendedor: "bg-[#10b981]/10 text-[#059669]",
    crecimiento: "bg-[#f59e0b]/10 text-[#d97706]",
    empresarial: "bg-[#8b5cf6]/10 text-[#7c3aed]",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        colors[code],
      )}
    >
      {name}
    </span>
  );
}

export function PlanStatusBadge({ status }: { status: PlatformPlanStatus }) {
  const values = {
    trial: ["Prueba", "bg-[#0ea5e9]/10 text-[#0284c7]"],
    active: ["Activo", "bg-[#10b981]/10 text-[#059669]"],
    expired: ["Vencido", "bg-[#ef4444]/10 text-[#dc2626]"],
  } as const;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        values[status][1],
      )}
    >
      {values[status][0]}
    </span>
  );
}

export function CompanyStateBadge({ state }: { state: PlatformCompanyState }) {
  const values = {
    activa: ["Activa", "bg-[#10b981] text-white"],
    inactiva: ["Inactiva", "bg-[#6b7280] text-white"],
    suspendida: ["Suspendida", "bg-[#ef4444] text-white"],
  } as const;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        values[state][1],
      )}
    >
      {values[state][0]}
    </span>
  );
}

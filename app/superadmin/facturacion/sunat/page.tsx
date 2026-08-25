"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowClockwiseIcon,
  BuildingsIcon,
  CheckCircleIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  platformAdminApi,
  type PlatformPaginationMeta,
  type PlatformSunatCompany,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";
import {
  CompanyPagination,
  CompanyStateBadge,
  PlanBadge,
} from "../../empresas/company-controls";

const defaultMeta: PlatformPaginationMeta = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};

export default function PlatformSunatCompaniesPage() {
  const [companies, setCompanies] = useState<PlatformSunatCompany[]>([]);
  const [meta, setMeta] = useState(defaultMeta);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await platformAdminApi.findSunatCompanies({
        page,
        limit: meta.limit,
        search,
      });
      setCompanies(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar las empresas.",
      );
    } finally {
      setLoading(false);
    }
  }, [meta.limit, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <DashboardShell headerTitle="SUNAT por empresa">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:gap-5 sm:p-4 lg:px-6 lg:py-5">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            icon={<BuildingsIcon size={20} weight="bold" />}
            label="Empresas encontradas"
            value={meta.total}
            tone="dark"
          />
          <MetricCard
            icon={<StorefrontIcon size={20} weight="bold" />}
            label="Mostrando"
            value={companies.length}
            tone="primary"
          />
          <MetricCard
            icon={<ShieldCheckIcon size={20} weight="bold" />}
            label="Modulo SUNAT"
            value={1}
            tone="info"
          />
          <MetricCard
            icon={<CheckCircleIcon size={20} weight="bold" />}
            label="Pagina actual"
            value={meta.page}
            tone="info"
          />
        </section>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Buscar empresa, documento o correo..."
              className="h-11 w-full rounded-xl bg-[var(--color-sidebar-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-sidebar-active)] px-5 text-sm font-circular-bold text-white shadow-md dark:bg-[var(--color-secondary)]",
              loading && "cursor-not-allowed opacity-70",
            )}
          >
            <ArrowClockwiseIcon
              size={16}
              weight="bold"
              className={cn(loading && "animate-spin")}
            />
            Actualizar
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 pb-2 pr-1">
          {loading && companies.length === 0 ? (
            <LoadingRows />
          ) : companies.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] px-6 text-center shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
              <BuildingsIcon
                size={48}
                weight="light"
                className="text-[var(--color-muted-foreground)]"
              />
              <p className="mt-3 font-circular-bold text-[var(--color-text)]">
                No se encontraron empresas
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Ajusta la busqueda.
              </p>
            </div>
          ) : (
            companies.map((company) => (
              <article
                key={company.id}
                className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(190px,1.45fr)_minmax(190px,1.2fr)_minmax(120px,0.8fr)_minmax(120px,0.75fr)_minmax(70px,0.35fr)] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white">
                    <StorefrontIcon size={21} weight="fill" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                      {company.name}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {company.document ?? "Sin documento"}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                    {company.legalName ?? "Sin razon social"}
                  </p>
                  <p className="truncate text-[var(--color-muted-foreground)]">
                    {company.email ?? "Sin email"}
                  </p>
                </div>
                <PlanBadge code={company.planCode} name={company.planName} />
                <CompanyStateBadge state={company.state} />
                <div className="flex justify-start md:justify-end">
                  <Link
                    href={`/superadmin/facturacion/sunat/${company.id}`}
                    aria-label={`Configurar SUNAT de ${company.name}`}
                    title="Configurar SUNAT"
                    className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm"
                  >
                    <GearSixIcon size={18} weight="bold" />
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>

        <CompanyPagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          visible={companies.length}
          isLoading={loading}
          onPageChange={setPage}
        />
      </div>
    </DashboardShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "dark" | "primary" | "info";
}) {
  const active = tone === "dark" || tone === "primary";
  const colors = {
    dark: "bg-[var(--color-sidebar-active)] text-white",
    primary: "bg-[var(--color-primary)] text-white",
    info: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
  }[tone];
  const iconColors = {
    dark: "bg-white/20 text-white",
    primary: "bg-white/20 text-white",
    info: "bg-[#eff6ff] text-[#3b82f6]",
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
        <p className="mt-1 text-2xl leading-none font-circular-bold">{value}</p>
      </div>
    </article>
  );
}

function LoadingRows() {
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

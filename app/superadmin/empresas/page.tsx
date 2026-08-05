"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BuildingsIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  StorefrontIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  platformAdminApi,
  type PlatformCompaniesResponse,
  type PlatformCompanyState,
  type PlatformPlanCode,
  type PlatformPlanStatus,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";
import {
  CompanyControls,
  CompanyPagination,
  CompanyStateBadge,
  PlanBadge,
  PlanStatusBadge,
} from "./company-controls";

const pageSize = 12;

const emptyResult: PlatformCompaniesResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
  summary: { total: 0, active: 0, inactive: 0, suspended: 0, trials: 0 },
};

export default function PlatformCompaniesPage() {
  const [result, setResult] = useState<PlatformCompaniesResponse>(emptyResult);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlatformPlanCode | "">("");
  const [state, setState] = useState<PlatformCompanyState | "">("");
  const [planStatus, setPlanStatus] = useState<PlatformPlanStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setResult(
        await platformAdminApi.findCompanies({
          page,
          limit: pageSize,
          search,
          plan: plan || undefined,
          state: state || undefined,
          planStatus: planStatus || undefined,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el directorio de empresas",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, plan, planStatus, search, state]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCompanies(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadCompanies]);

  const resetPage = () => setPage(1);

  return (
    <DashboardShell headerTitle="Directorio de empresas">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-5 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<BuildingsIcon size={20} weight="bold" />}
            label="Empresas encontradas"
            value={result.summary.total}
            tone="dark"
          />
          <MetricCard
            icon={<CheckCircleIcon size={20} weight="bold" />}
            label="Empresas activas"
            value={result.summary.active}
            tone="primary"
          />
          <MetricCard
            icon={<ClockCountdownIcon size={20} weight="bold" />}
            label="Pruebas activas"
            value={result.summary.trials}
            tone="info"
          />
          <MetricCard
            icon={<WarningCircleIcon size={20} weight="bold" />}
            label="Suspendidas"
            value={result.summary.suspended}
            tone="danger"
          />
        </section>

        <CompanyControls
          search={search}
          plan={plan}
          state={state}
          planStatus={planStatus}
          isLoading={isLoading}
          onSearchChange={(value) => {
            setSearch(value);
            resetPage();
          }}
          onPlanChange={(value) => {
            setPlan(value);
            resetPage();
          }}
          onStateChange={(value) => {
            setState(value);
            resetPage();
          }}
          onPlanStatusChange={(value) => {
            setPlanStatus(value);
            resetPage();
          }}
          onRefresh={loadCompanies}
        />

        {error ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 pb-2 pr-1">
          {isLoading && result.data.length === 0 ? (
            <LoadingRows />
          ) : result.data.length === 0 ? (
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
                Ajusta la búsqueda o los filtros.
              </p>
            </div>
          ) : (
            result.data.map((company) => (
              <article
                key={company.id}
                className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(180px,1.4fr)_minmax(170px,1.15fr)_minmax(120px,0.8fr)_minmax(125px,0.85fr)_minmax(120px,0.8fr)_minmax(110px,0.7fr)] md:items-center"
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
                    {company.owner?.name ?? "Sin propietario"}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {company.owner?.email ?? company.email ?? "-"}
                  </p>
                </div>
                <PlanBadge code={company.planCode} name={company.planName} />
                <div className="space-y-1">
                  <PlanStatusBadge status={company.planStatus} />
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDate(company.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-circular-bold text-[var(--color-text)]">
                    {company.users} usuarios
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {company.branches} sucursales
                  </p>
                </div>
                <CompanyStateBadge state={company.state} />
              </article>
            ))
          )}
        </section>

        <CompanyPagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          total={result.meta.total}
          visible={result.data.length}
          isLoading={isLoading}
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
  tone: "dark" | "primary" | "info" | "danger";
}) {
  const active = tone === "dark" || tone === "primary";
  const colors = {
    dark: "bg-[var(--color-sidebar-active)] text-white",
    primary: "bg-[var(--color-primary)] text-white",
    info: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
    danger: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
  }[tone];
  const iconColors = {
    dark: "bg-white/20 text-white",
    primary: "bg-white/20 text-white",
    info: "bg-[#eff6ff] text-[#3b82f6]",
    danger: "bg-[#fef2f2] text-[#ef4444]",
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

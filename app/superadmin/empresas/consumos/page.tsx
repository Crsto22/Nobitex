"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  BuildingsIcon,
  CubeIcon,
  DatabaseIcon,
  FileTextIcon,
  GaugeIcon,
  ImageIcon,
  StorefrontIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  platformAdminApi,
  type PlatformCompanyState,
  type PlatformCompanyUsageResponse,
  type PlatformPlanCode,
  type PlatformPlanLimits,
  type PlatformPlanStatus,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";
import {
  CompanyControls,
  CompanyPagination,
  CompanyStateBadge,
  PlanBadge,
  PlanStatusBadge,
} from "../company-controls";

const pageSize = 8;
const emptyResult: PlatformCompanyUsageResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
};

const resources: {
  key: keyof PlatformPlanLimits;
  label: string;
  icon: typeof UsersThreeIcon;
}[] = [
  { key: "users", label: "Usuarios", icon: UsersThreeIcon },
  { key: "branches", label: "Tiendas", icon: BuildingsIcon },
  { key: "warehouses", label: "Almacenes", icon: StorefrontIcon },
  { key: "products", label: "Productos", icon: CubeIcon },
  { key: "variants", label: "Variantes", icon: DatabaseIcon },
  { key: "documents", label: "Comprobantes", icon: FileTextIcon },
  { key: "documentQueries", label: "Consultas DNI/RUC", icon: FileTextIcon },
  { key: "storageBytes", label: "Imágenes", icon: ImageIcon },
];

export default function PlatformCompanyUsagePage() {
  const [result, setResult] =
    useState<PlatformCompanyUsageResponse>(emptyResult);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlatformPlanCode | "">("");
  const [state, setState] = useState<PlatformCompanyState | "">("");
  const [planStatus, setPlanStatus] = useState<PlatformPlanStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setResult(
        await platformAdminApi.findCompanyUsage({
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
          : "No se pudo cargar el consumo de las empresas",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, plan, planStatus, search, state]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUsage(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsage]);

  const pageSummary = useMemo(() => {
    const percentages = result.data.map((company) =>
      resources.map(({ key }) =>
        company.limits[key] === null
          ? 0
          : getPercentage(company.usage[key] ?? 0, company.limits[key] ?? 0),
      ),
    );

    return {
      warnings: percentages.filter((items) =>
        items.some((percent) => percent >= 80),
      ).length,
      reached: percentages.filter((items) =>
        items.some((percent) => percent >= 100),
      ).length,
    };
  }, [result.data]);

  const resetPage = () => setPage(1);

  return (
    <DashboardShell headerTitle="Consumo y límites">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-5 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<BuildingsIcon size={20} weight="bold" />}
            label="Empresas encontradas"
            value={result.meta.total}
            tone="dark"
          />
          <MetricCard
            icon={<GaugeIcon size={20} weight="bold" />}
            label="Empresas visibles"
            value={result.data.length}
            tone="primary"
          />
          <MetricCard
            icon={<WarningCircleIcon size={20} weight="bold" />}
            label="Alertas visibles"
            value={pageSummary.warnings}
            tone="warning"
          />
          <MetricCard
            icon={<DatabaseIcon size={20} weight="bold" />}
            label="Límites alcanzados"
            value={pageSummary.reached}
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
          onRefresh={loadUsage}
        />

        {error ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        ) : null}

        {isLoading && result.data.length === 0 ? (
          <LoadingCards />
        ) : result.data.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-[var(--color-sidebar-bg)] px-6 text-center shadow-sm">
            <GaugeIcon
              size={48}
              weight="light"
              className="text-[var(--color-muted-foreground)]"
            />
            <p className="mt-3 font-circular-bold text-[var(--color-text)]">
              No hay consumos para mostrar
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Ajusta la búsqueda o los filtros.
            </p>
          </div>
        ) : (
          <section className="grid gap-4 2xl:grid-cols-2">
            {result.data.map((company) => (
              <article
                key={company.id}
                className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <StorefrontIcon size={22} weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-circular-bold text-[var(--color-text)]">
                        {company.name}
                      </h2>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {company.document ?? "Sin documento"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PlanBadge
                      code={company.planCode}
                      name={company.planName}
                    />
                    <PlanStatusBadge status={company.planStatus} />
                    <CompanyStateBadge state={company.state} />
                    <Link href={`/superadmin/empresas/consumos/${company.id}`} className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold text-[var(--color-text)]">
                      <PencilSimpleIcon size={14} weight="bold" /> Personalizar
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                  {resources.map((resource) => (
                    <UsageItem
                      key={resource.key}
                      resource={resource}
                      used={company.usage[resource.key]}
                      limit={company.limits[resource.key]}
                      base={company.baseLimits[resource.key]}
                      additional={company.additionalLimits[resource.key]}
                    />
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

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

function UsageItem({
  resource,
  used,
  limit,
  base,
  additional,
}: {
  resource: (typeof resources)[number];
  used?: number | null;
  limit?: number | null;
  base?: number | null;
  additional?: number | null;
}) {
  const Icon = resource.icon;
  const unlimited = limit === null;
  const safeUsed = Number.isFinite(used) ? Number(used) : 0;
  const safeLimit = Number.isFinite(limit) ? Number(limit) : 0;
  const safeBase = Number.isFinite(base) ? Number(base) : 0;
  const safeAdditional = Number.isFinite(additional) ? Number(additional) : 0;
  const percent = getPercentage(safeUsed, safeLimit);
  const formatter =
    resource.key === "storageBytes"
      ? formatBytes
      : (value: number) => value.toLocaleString("es-PE");

  return (
    <div className="rounded-xl bg-[var(--color-background)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Icon
            size={16}
            weight="fill"
            className="shrink-0 text-[var(--color-primary)]"
          />
          <span className="truncate text-xs text-[var(--color-muted-foreground)]">
            {resource.label}
          </span>
        </span>
        <span className="text-xs font-circular-bold text-[var(--color-text)]">
          {unlimited ? "Ilimitado" : `${Math.round(percent)}%`}
        </span>
      </div>
      <p className="mt-2 text-sm font-circular-bold text-[var(--color-text)]">
        {formatter(safeUsed)}
        <span className="ml-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
          de {unlimited ? "Ilimitado" : formatter(safeLimit)}
        </span>
      </p>
      {!unlimited && safeAdditional > 0 ? <p className="mt-1 text-[11px] text-[#059669]">Base {formatter(safeBase)} + bonificación {formatter(safeAdditional)}</p> : null}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-input-bg)]">
        <div
          className={cn(
            "h-full rounded-full",
            percent >= 100
              ? "bg-[#ef4444]"
              : percent >= 80
                ? "bg-[#f59e0b]"
                : "bg-[var(--color-primary)]",
          )}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
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
  tone: "dark" | "primary" | "warning" | "danger";
}) {
  const active = tone === "dark" || tone === "primary";
  const colors = {
    dark: "bg-[var(--color-sidebar-active)] text-white",
    primary: "bg-[var(--color-primary)] text-white",
    warning: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
    danger: "bg-[var(--color-sidebar-bg)] text-[var(--color-text)]",
  }[tone];
  const iconColors = {
    dark: "bg-white/20 text-white",
    primary: "bg-white/20 text-white",
    warning: "bg-[#fff7ed] text-[#f59e0b]",
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
        <p className="mt-1 text-2xl leading-none font-circular-bold">
          {value.toLocaleString("es-PE")}
        </p>
      </div>
    </article>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 2xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[310px] animate-pulse rounded-2xl bg-[var(--color-sidebar-bg)] shadow-sm"
        />
      ))}
    </div>
  );
}

function getPercentage(used: number, limit: number) {
  return limit > 0 ? (used / limit) * 100 : 0;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

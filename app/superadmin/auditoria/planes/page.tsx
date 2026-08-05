"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowsLeftRightIcon,
  CalendarCheckIcon,
  ClockCountdownIcon,
  StorefrontIcon,
  TagIcon,
  TerminalWindowIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { formatCurrency, formatDateShort as formatDate, formatDateTime } from "@/lib/intl";
import {
  platformAdminApi,
  type PlatformAuditResponse,
  type PlatformAuditSource,
  type PlatformPlanCode,
} from "@/lib/api/platform-admin";
import { PlanBadge } from "../../empresas/company-controls";
import {
  AuditControls,
  AuditLoadingRows,
  AuditMetricCard,
  AuditPagination,
  AuditSourceBadge,
} from "../audit-ui";

const pageSize = 15;
const emptyResult: PlatformAuditResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
  summary: {
    total: 0,
    thisMonth: 0,
    companyEvents: 0,
    planEvents: 0,
    platformAdminEvents: 0,
    subscriptionEvents: 0,
    affiliateEvents: 0,
    registrationEvents: 0,
    historicalEvents: 0,
    cliEvents: 0,
    adminEvents: 0,
  },
};
const planNames: Record<PlatformPlanCode, string> = {
  prueba: "Prueba",
  basico: "Básico",
  emprendedor: "Emprende",
  crecimiento: "Crece",
  empresarial: "Escala",
};

export default function PlatformPlanAuditPage() {
  const [result, setResult] = useState<PlatformAuditResponse>(emptyResult);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<PlatformAuditSource | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChanges = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setResult(
        await platformAdminApi.findPlanChanges({
          page,
          limit: pageSize,
          search,
          source: source || undefined,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los cambios de planes",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, search, source]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadChanges(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadChanges]);

  return (
    <DashboardShell headerTitle="Cambios de planes">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-5 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AuditMetricCard
            icon={<ArrowsLeftRightIcon size={20} weight="bold" />}
            label="Cambios registrados"
            value={result.summary.total}
            tone="dark"
          />
          <AuditMetricCard
            icon={<CalendarCheckIcon size={20} weight="bold" />}
            label="Cambios este mes"
            value={result.summary.thisMonth}
            tone="primary"
          />
          <AuditMetricCard
            icon={<TerminalWindowIcon size={20} weight="bold" />}
            label="Cambios por CLI"
            value={result.summary.cliEvents}
            tone="info"
          />
          <AuditMetricCard
            icon={<UserCircleIcon size={20} weight="bold" />}
            label="Cambios administrativos"
            value={result.summary.adminEvents}
            tone="warning"
          />
        </section>

        <AuditControls
          search={search}
          source={source}
          isLoading={isLoading}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onSourceChange={(value) => {
            setSource(value);
            setPage(1);
          }}
          onRefresh={loadChanges}
        />

        {error ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 pb-2 pr-1">
          {isLoading && result.data.length === 0 ? (
            <AuditLoadingRows />
          ) : result.data.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] px-6 text-center shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
              <ArrowsLeftRightIcon
                size={48}
                weight="light"
                className="text-[var(--color-muted-foreground)]"
              />
              <p className="mt-3 font-circular-bold text-[var(--color-text)]">
                Aún no hay cambios de plan registrados
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Los próximos cambios aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.data.map((log) => {
                const isPricingUpdate = log.action === "plan_pricing_updated";
                const isPlanLimitsUpdate = log.action === "plan_limits_updated";
                const isOveragePricing =
                  log.action === "overage_pricing_updated";
                const isLimitsUpdate = log.action === "company_limits_updated";
                const isConfigurationUpdate =
                  isOveragePricing || isLimitsUpdate || isPlanLimitsUpdate;
                const fromPlan = readPlan(log.metadata, "fromPlan");
                const toPlan = readPlan(log.metadata, "toPlan");
                const pricingPlan = readPlan(log.metadata, "planCode");
                const startsAt = readString(log.metadata, "startsAt");
                const endsAt = readString(log.metadata, "endsAt");
                const previousMonthlyPrice = readString(
                  log.metadata,
                  "previousMonthlyPrice",
                );
                const monthlyPrice = readString(log.metadata, "monthlyPrice");
                const previousMonthlyDiscount = readString(
                  log.metadata,
                  "previousMonthlyDiscount",
                );
                const monthlyDiscount = readString(
                  log.metadata,
                  "monthlyDiscount",
                );
                const previousAnnualDiscount = readString(
                  log.metadata,
                  "previousAnnualDiscount",
                );
                const annualDiscount = readString(
                  log.metadata,
                  "annualDiscount",
                );

                return (
                  <article
                    key={log.id}
                    className="grid grid-cols-1 gap-4 rounded-[14px] bg-[var(--color-card)] p-4 text-sm shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(180px,1.25fr)_minmax(210px,1.35fr)_minmax(140px,0.8fr)_minmax(170px,1fr)_minmax(130px,0.75fr)] md:items-center"
                  >
                    <div>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                          {isPricingUpdate || isConfigurationUpdate ? (
                            <TagIcon size={20} weight="fill" />
                          ) : (
                            <StorefrontIcon size={20} weight="fill" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate font-circular-bold text-[var(--color-text)]">
                            {isPricingUpdate ||
                            isOveragePricing ||
                            isPlanLimitsUpdate
                              ? "Catálogo de planes"
                              : (log.company?.name ?? "Empresa eliminada")}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {(isPricingUpdate || isPlanLimitsUpdate) &&
                            pricingPlan
                              ? planNames[pricingPlan]
                              : (log.company?.document ?? "Sin documento")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      {isConfigurationUpdate ? (
                        <div>
                          <p className="font-circular-bold text-[var(--color-text)]">
                            {log.description}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            Configuración comercial
                          </p>
                        </div>
                      ) : isPricingUpdate ? (
                        <div>
                          <p className="font-circular-bold text-[var(--color-text)]">
                            {formatCurrency(previousMonthlyPrice)} →{" "}
                            {formatCurrency(monthlyPrice)}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            Oferta mensual{" "}
                            {formatPercent(previousMonthlyDiscount)} →{" "}
                            {formatPercent(monthlyDiscount)} · Oferta anual{" "}
                            {formatPercent(previousAnnualDiscount)} →{" "}
                            {formatPercent(annualDiscount)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {fromPlan ? (
                            <PlanBadge
                              code={fromPlan}
                              name={planNames[fromPlan]}
                            />
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              Sin dato
                            </span>
                          )}
                          <ArrowsLeftRightIcon
                            size={16}
                            className="shrink-0 text-[var(--color-muted-foreground)]"
                          />
                          {toPlan ? (
                            <PlanBadge code={toPlan} name={planNames[toPlan]} />
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              Sin dato
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {isPlanLimitsUpdate ? (
                        "Aplicación inmediata"
                      ) : isPricingUpdate || isConfigurationUpdate ? (
                        "Ventas futuras"
                      ) : (
                        <>
                          {startsAt ? formatDate(startsAt) : "-"}
                          <br />
                          {endsAt ? `hasta ${formatDate(endsAt)}` : "sin fin"}
                        </>
                      )}
                    </div>
                    <div>
                      <p className="max-w-[190px] truncate text-[var(--color-text)]">
                        {log.actor?.name ?? "Sistema"}
                      </p>
                      <p className="max-w-[190px] truncate text-xs text-[var(--color-muted-foreground)]">
                        {log.actor?.email ?? "Proceso administrativo"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                      <AuditSourceBadge source={log.source} />
                      <span className="inline-flex items-center gap-2">
                        <ClockCountdownIcon size={16} />
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <AuditPagination
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

function readString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function readPlan(
  metadata: Record<string, unknown> | null,
  key: string,
): PlatformPlanCode | null {
  const value = readString(metadata, key);
  return value && value in planNames ? (value as PlatformPlanCode) : null;
}

function formatPercent(value: string | null) {
  return `${Number(value ?? 0).toLocaleString("es-PE", {
    maximumFractionDigits: 2,
  })}%`;
}


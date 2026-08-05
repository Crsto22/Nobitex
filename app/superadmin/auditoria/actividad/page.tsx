"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowsLeftRightIcon,
  BuildingsIcon,
  CalendarCheckIcon,
  ClockCountdownIcon,
  CreditCardIcon,
  ListChecksIcon,
  TagIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import { formatDateTime } from "@/lib/intl";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  platformAdminApi,
  type PlatformAuditCategory,
  type PlatformAuditResponse,
  type PlatformAuditSource,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";
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

export default function PlatformActivityPage() {
  const [result, setResult] = useState<PlatformAuditResponse>(emptyResult);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PlatformAuditCategory | "">("");
  const [source, setSource] = useState<PlatformAuditSource | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setResult(
        await platformAdminApi.findActivity({
          page,
          limit: pageSize,
          search,
          category: category || undefined,
          source: source || undefined,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la actividad administrativa",
      );
    } finally {
      setIsLoading(false);
    }
  }, [category, page, search, source]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadActivity(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadActivity]);

  return (
    <DashboardShell headerTitle="Actividad administrativa">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-5 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AuditMetricCard
            icon={<ListChecksIcon size={20} weight="bold" />}
            label="Eventos registrados"
            value={result.summary.total}
            tone="dark"
          />
          <AuditMetricCard
            icon={<CalendarCheckIcon size={20} weight="bold" />}
            label="Actividad este mes"
            value={result.summary.thisMonth}
            tone="primary"
          />
          <AuditMetricCard
            icon={<BuildingsIcon size={20} weight="bold" />}
            label="Altas de empresas"
            value={result.summary.companyEvents}
            tone="info"
          />
          <AuditMetricCard
            icon={<ArrowsLeftRightIcon size={20} weight="bold" />}
            label="Cambios de planes"
            value={result.summary.planEvents}
            tone="warning"
          />
        </section>

        <AuditControls
          search={search}
          source={source}
          category={category}
          showCategory
          isLoading={isLoading}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onCategoryChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          onSourceChange={(value) => {
            setSource(value);
            setPage(1);
          }}
          onRefresh={loadActivity}
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
              <ListChecksIcon
                size={48}
                weight="light"
                className="text-[var(--color-muted-foreground)]"
              />
              <p className="mt-3 font-circular-bold text-[var(--color-text)]">
                No hay actividad para estos filtros
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Cambia los filtros para consultar otros registros.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.data.map((log) => {
                const isPlan = log.category === "plan";
                const isAdmin = log.category === "admin";
                const isSubscription = log.category === "subscription";
                const isPricingUpdate =
                  log.action === "plan_pricing_updated" ||
                  log.action === "plan_limits_updated";
                const Icon = isSubscription
                  ? CreditCardIcon
                  : isAdmin
                  ? UsersThreeIcon
                  : isPricingUpdate
                    ? TagIcon
                  : isPlan
                    ? ArrowsLeftRightIcon
                    : BuildingsIcon;

                return (
                  <article
                    key={log.id}
                    className="grid gap-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(0,1.5fr)_minmax(180px,0.75fr)_auto] md:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"
                      >
                        <Icon size={20} weight="bold" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-circular-bold text-[var(--color-text)]">
                            {getAuditTitle(log.action, log.category)}
                          </p>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
                              isSubscription
                                ? "bg-[#8b5cf6]/10 text-[#7c3aed]"
                                : isAdmin
                                ? "bg-[#10b981]/10 text-[#059669]"
                                : isPlan
                                ? "bg-[#f59e0b]/10 text-[#d97706]"
                                : "bg-[#3b82f6]/10 text-[#2563eb]",
                            )}
                          >
                            {isSubscription
                              ? "Suscripciones"
                              : isAdmin
                              ? "AdministraciÃ³n"
                              : isPlan
                                ? "Planes"
                                : "Empresas"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                          {log.description}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">
                          {log.company?.name ??
                            (isPricingUpdate || log.action === "overage_pricing_updated"
                              ? "Catálogo de planes"
                              : isAdmin || isSubscription
                                ? "Administración de plataforma"
                                : "Empresa eliminada")}
                          {log.company?.document
                            ? ` · ${log.company.document}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--color-text)]">
                        {log.actor?.name ?? "Sistema"}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {log.actor?.email ?? "Proceso administrativo"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                      <AuditSourceBadge source={log.source} />
                      <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-[var(--color-muted-foreground)]">
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

function getAuditTitle(action: string, category: string) {
  const labels: Record<string, string> = {
    subscription_sold: "Suscripción vendida",
    subscription_sale_cancelled: "Pago anulado",
    platform_billing_config_updated: "Configuracion fiscal actualizada",
    platform_receipt_issued: "Comprobante emitido",
    platform_receipt_retried: "Reintento SUNAT",
    platform_credit_note_requested: "Nota de credito solicitada",
    platform_extra_charge_created: "Cobro adicional registrado",
    overage_closed: "Excedente cerrado",
    overage_paid: "Excedente pagado",
    plan_pricing_updated: "Tarifa actualizada",
    plan_limits_updated: "Límites del plan actualizados",
    overage_pricing_updated: "Tarifa de excedente actualizada",
    company_limits_updated: "Límites personalizados",
    affiliate_created: "Afiliado creado",
    affiliate_updated: "Afiliado actualizado",
    company_affiliated: "Empresa afiliada",
    affiliate_interrupted: "Afiliación interrumpida",
    affiliate_settlement_closed: "Liquidación de afiliado cerrada",
    affiliate_settlement_paid: "Comisión de afiliado pagada",
  };
  return labels[action] ??
    (category === "admin"
      ? "Usuario administrador"
      : category === "plan"
        ? "Cambio de plan"
        : category === "affiliate"
          ? "Actividad de afiliados"
          : "Nueva empresa");
}



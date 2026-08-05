"use client";

import { NativeSelect } from "@/components/ui/select";
import { CalendarInput } from "@/components/ui/calendar-input";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockCountdownIcon,
  CreditCardIcon,
  CurrencyCircleDollarIcon,
  DotsThreeVerticalIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  StorefrontIcon,
  ClockIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformAdminDashboardResponse,
  type PlatformCompaniesResponse,
  type PlatformCompany,
  type PlatformCompanyState,
  type PlatformPlanCode,
  type PlatformPlanStatus,
  type PlatformSubscriptionPaymentMethod,
  type PlatformSubscriptionPaymentStatus,
  type PlatformSubscriptionSale,
  type PlatformSubscriptionSalesResponse,
  type PlatformOveragesResponse,
  type PlatformOverage,
  type PlatformOverageStatus,
} from "@/lib/api/platform-admin";
import { platformBillingApi } from "@/lib/api/platform-billing";
import { cn } from "@/lib/utils";
import {
  CompanyControls,
  CompanyPagination,
  CompanyStateBadge,
  PlanBadge,
  PlanStatusBadge,
} from "../empresas/company-controls";

const pageSize = 12;
const paidPlanCodes = [
  "basico",
  "emprendedor",
  "crecimiento",
  "empresarial",
] as const;
const paymentMethods: Array<{
  value: PlatformSubscriptionPaymentMethod;
  label: string;
}> = [
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito", label: "Depósito" },
  { value: "efectivo", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];
const emptyCompanies: PlatformCompaniesResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
  summary: { total: 0, active: 0, inactive: 0, suspended: 0, trials: 0 },
};
const emptySales: PlatformSubscriptionSalesResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
  summary: {
    paidThisMonth: 0,
    cancelledThisMonth: 0,
    collectedThisMonth: "0.00",
  },
};

export default function PlatformSubscriptionsPage() {
  const { showToast } = useSystemToast();
  const [activeTab, setActiveTab] = useState<
    "subscriptions" | "history" | "overages"
  >("subscriptions");
  const [companies, setCompanies] =
    useState<PlatformCompaniesResponse>(emptyCompanies);
  const [dashboard, setDashboard] =
    useState<PlatformAdminDashboardResponse | null>(null);
  const [sales, setSales] =
    useState<PlatformSubscriptionSalesResponse>(emptySales);

  const [companyPage, setCompanyPage] = useState(1);
  const [companySearch, setCompanySearch] = useState("");
  const [companyPlan, setCompanyPlan] = useState<PlatformPlanCode | "">("");
  const [companyState, setCompanyState] = useState<PlatformCompanyState | "">(
    "",
  );
  const [planStatus, setPlanStatus] = useState<PlatformPlanStatus | "">("");

  const [salesPage, setSalesPage] = useState(1);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesPlan, setSalesPlan] = useState<PlatformPlanCode | "">("");
  const [salesMethod, setSalesMethod] = useState<
    PlatformSubscriptionPaymentMethod | ""
  >("");
  const [salesStatus, setSalesStatus] = useState<
    PlatformSubscriptionPaymentStatus | ""
  >("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isCompaniesLoading, setIsCompaniesLoading] = useState(true);
  const [isSalesLoading, setIsSalesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [saleToCancel, setSaleToCancel] =
    useState<PlatformSubscriptionSale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCompanyMenuId, setOpenCompanyMenuId] = useState<string | null>(
    null,
  );
  const [openSaleMenuId, setOpenSaleMenuId] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setIsCompaniesLoading(true);
    setCompaniesError(null);
    try {
      const [companiesResponse, dashboardResponse] = await Promise.all([
        platformAdminApi.findCompanies({
          page: companyPage,
          limit: pageSize,
          search: companySearch,
          plan: companyPlan || undefined,
          state: companyState || undefined,
          planStatus: planStatus || undefined,
        }),
        platformAdminApi.getDashboard(),
      ]);
      setCompanies(companiesResponse);
      setDashboard(dashboardResponse);
    } catch (requestError) {
      setCompaniesError(getErrorMessage(requestError));
    } finally {
      setIsCompaniesLoading(false);
    }
  }, [companyPage, companyPlan, companySearch, companyState, planStatus]);

  const loadSales = useCallback(async () => {
    setIsSalesLoading(true);
    setSalesError(null);
    try {
      setSales(
        await platformAdminApi.findSubscriptionSales({
          page: salesPage,
          limit: pageSize,
          search: salesSearch,
          plan: salesPlan || undefined,
          method: salesMethod || undefined,
          status: salesStatus || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      );
    } catch (requestError) {
      setSalesError(getErrorMessage(requestError));
    } finally {
      setIsSalesLoading(false);
    }
  }, [
    dateFrom,
    dateTo,
    salesMethod,
    salesPage,
    salesPlan,
    salesSearch,
    salesStatus,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCompanies(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadCompanies]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadSales(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadSales]);

  const handleHistoricalReceipt = async (sale: PlatformSubscriptionSale) => {
    const selected = window.prompt(
      "Tipo de comprobante: nota_venta, boleta o factura",
      "nota_venta",
    );
    if (!selected || !["nota_venta", "boleta", "factura"].includes(selected))
      return;
    try {
      await platformBillingApi.issueHistorical({
        requestId: crypto.randomUUID(),
        sourceType: "subscription",
        sourceId: sale.id,
        receiptType: selected as "nota_venta" | "boleta" | "factura",
      });
      await loadSales();
    } catch (requestError) {
      showToast({
        title: "No se pudo emitir el comprobante",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    }
  };

  const handleCancelSale = async (reason: string) => {
    if (!saleToCancel) return;
    setIsSubmitting(true);
    try {
      const cancelled = await platformAdminApi.cancelSubscriptionSale(
        saleToCancel.id,
        reason,
      );
      showToast({
        title: "Pago anulado",
        description: `Se restauró el plan anterior de ${cancelled.company.name}.`,
        variant: "success",
      });
      setSaleToCancel(null);
      await Promise.all([loadCompanies(), loadSales()]);
    } catch (requestError) {
      showToast({
        title: "No se pudo anular",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = dashboard?.summary;
  return (
    <DashboardShell headerTitle="Suscripciones">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-5 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<ClockCountdownIcon size={20} weight="bold" />}
            label="Pruebas activas"
            value={formatNumber(summary?.activeTrials)}
            tone="dark"
          />
          <MetricCard
            icon={<CreditCardIcon size={20} weight="bold" />}
            label="Suscripciones activas"
            value={formatNumber(summary?.activeSubscriptions)}
            tone="primary"
          />
          <MetricCard
            icon={<WarningCircleIcon size={20} weight="bold" />}
            label="Planes vencidos"
            value={formatNumber(summary?.expiredCompanies)}
            tone="danger"
          />
          <MetricCard
            icon={<CurrencyCircleDollarIcon size={20} weight="bold" />}
            label="Cobrado este mes"
            value={formatCurrency(sales.summary.collectedThisMonth)}
            tone="warning"
          />
        </section>

        <div className="inline-flex w-fit rounded-xl bg-[var(--color-sidebar-bg)] p-1 shadow-sm">
          <TabButton
            active={activeTab === "subscriptions"}
            onClick={() => setActiveTab("subscriptions")}
          >
            Suscripciones
          </TabButton>
          <TabButton
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            Historial de ventas
          </TabButton>
          <TabButton
            active={activeTab === "overages"}
            onClick={() => setActiveTab("overages")}
          >
            Excedentes
          </TabButton>
        </div>

        {activeTab === "subscriptions" ? (
          <>
            <CompanyControls
              search={companySearch}
              plan={companyPlan}
              state={companyState}
              planStatus={planStatus}
              isLoading={isCompaniesLoading}
              onSearchChange={(value) => {
                setCompanySearch(value);
                setCompanyPage(1);
              }}
              onPlanChange={(value) => {
                setCompanyPlan(value);
                setCompanyPage(1);
              }}
              onStateChange={(value) => {
                setCompanyState(value);
                setCompanyPage(1);
              }}
              onPlanStatusChange={(value) => {
                setPlanStatus(value);
                setCompanyPage(1);
              }}
              onRefresh={loadCompanies}
            />

            {companiesError ? <ErrorBanner message={companiesError} /> : null}

            <section className="space-y-3 pb-2 pr-1">
              {isCompaniesLoading && companies.data.length === 0 ? (
                <LoadingRows />
              ) : companies.data.length === 0 ? (
                <EmptyState
                  icon={<CreditCardIcon size={48} weight="light" />}
                  title="No se encontraron suscripciones"
                  description="Ajusta la búsqueda o los filtros."
                />
              ) : (
                companies.data.map((company) => (
                  <SubscriptionCompanyRow
                    key={company.id}
                    company={company}
                    menuOpen={openCompanyMenuId === company.id}
                    onToggleMenu={() =>
                      setOpenCompanyMenuId(
                        openCompanyMenuId === company.id ? null : company.id,
                      )
                    }
                  />
                ))
              )}
            </section>
            <CompanyPagination
              page={companies.meta.page}
              totalPages={companies.meta.totalPages}
              total={companies.meta.total}
              visible={companies.data.length}
              isLoading={isCompaniesLoading}
              onPageChange={setCompanyPage}
            />
          </>
        ) : activeTab === "history" ? (
          <>
            <SalesControls
              search={salesSearch}
              plan={salesPlan}
              method={salesMethod}
              status={salesStatus}
              dateFrom={dateFrom}
              dateTo={dateTo}
              isLoading={isSalesLoading}
              onSearchChange={(value) => {
                setSalesSearch(value);
                setSalesPage(1);
              }}
              onPlanChange={(value) => {
                setSalesPlan(value);
                setSalesPage(1);
              }}
              onMethodChange={(value) => {
                setSalesMethod(value);
                setSalesPage(1);
              }}
              onStatusChange={(value) => {
                setSalesStatus(value);
                setSalesPage(1);
              }}
              onDateFromChange={(value) => {
                setDateFrom(value);
                setSalesPage(1);
              }}
              onDateToChange={(value) => {
                setDateTo(value);
                setSalesPage(1);
              }}
              onRefresh={loadSales}
            />

            {salesError ? <ErrorBanner message={salesError} /> : null}

            <section className="space-y-3 pb-2 pr-1">
              {isSalesLoading && sales.data.length === 0 ? (
                <LoadingRows />
              ) : sales.data.length === 0 ? (
                <EmptyState
                  icon={<CurrencyCircleDollarIcon size={48} weight="light" />}
                  title="Todavía no hay ventas registradas"
                  description="Las activaciones manuales aparecerán aquí."
                />
              ) : (
                sales.data.map((sale) => (
                  <SubscriptionSaleRow
                    key={sale.id}
                    sale={sale}
                    menuOpen={openSaleMenuId === sale.id}
                    onToggleMenu={() =>
                      setOpenSaleMenuId(
                        openSaleMenuId === sale.id ? null : sale.id,
                      )
                    }
                    onEmit={() => void handleHistoricalReceipt(sale)}
                    onCancel={() => setSaleToCancel(sale)}
                  />
                ))
              )}
            </section>
            <CompanyPagination
              page={sales.meta.page}
              totalPages={sales.meta.totalPages}
              total={sales.meta.total}
              visible={sales.data.length}
              isLoading={isSalesLoading}
              onPageChange={setSalesPage}
            />
          </>
        ) : (
          <OveragesPanel />
        )}
      </div>

      {saleToCancel ? (
        <CancelModal
          sale={saleToCancel}
          isSubmitting={isSubmitting}
          onClose={() => setSaleToCancel(null)}
          onSubmit={handleCancelSale}
        />
      ) : null}
    </DashboardShell>
  );
}

const emptyOverages: PlatformOveragesResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
  summary: { pendingAmount: "0.00", paidAmount: "0.00" },
};

function SubscriptionCompanyRow({
  company,
  menuOpen,
  onToggleMenu,
}: {
  company: PlatformCompany;
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <article className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(180px,1.4fr)_minmax(150px,1.1fr)_minmax(125px,0.9fr)_minmax(150px,1fr)_minmax(120px,0.8fr)_32px] md:items-center">
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
          {company.owner?.email ?? "-"}
        </p>
      </div>
      <PlanBadge code={company.planCode} name={company.planName} />
      <div className="space-y-1">
        <PlanStatusBadge status={company.planStatus} />
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {getRemainingLabel(company.endsAt, company.planStatus)}
        </p>
      </div>
      <div>
        <CompanyStateBadge state={company.state} />
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          {company.endsAt ? formatDate(company.endsAt) : "Sin vencimiento"}
        </p>
      </div>
      <div className="relative justify-self-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Acciones de suscripción"
          className="grid size-8 place-items-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-input-bg)]"
        >
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-9 z-20 w-44 rounded-xl bg-[var(--color-card)] p-1.5 shadow-xl ring-1 ring-[var(--color-border)]">
            {company.state === "activa" ? (
              <Link
                href={`/superadmin/suscripciones/${company.id}`}
                className="flex h-9 items-center rounded-lg px-3 text-xs font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-input-bg)]"
              >
                Activar/Renovar
              </Link>
            ) : (
              <span className="flex h-9 items-center px-3 text-xs text-[var(--color-muted-foreground)]">
                Empresa no disponible
              </span>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SubscriptionSaleRow({
  sale,
  menuOpen,
  onToggleMenu,
  onEmit,
  onCancel,
}: {
  sale: PlatformSubscriptionSale;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEmit: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(180px,1.3fr)_minmax(180px,1.3fr)_minmax(125px,0.9fr)_minmax(120px,0.8fr)_minmax(105px,0.75fr)_32px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white">
          <StorefrontIcon size={21} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {sale.company.name}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {sale.company.document ?? "Sin documento"}
          </p>
        </div>
      </div>
      <div className="space-y-1">
        <PlanBadge code={sale.planCode} name={sale.planName} />
        {sale.affiliateCode ? (
          <p className="text-xs font-circular-bold text-emerald-600">
            {sale.affiliateCode} · comisión{" "}
            {formatCurrency(sale.affiliateCommissionAmount)}
          </p>
        ) : null}
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {sale.months} meses · {formatDate(sale.coverageStartsAt)} -{" "}
          {formatDate(sale.coverageEndsAt)}
        </p>
      </div>
      <div>
        <p className="text-sm text-[var(--color-text)]">
          {getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodOther)}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {sale.registeredBy?.name ?? "Sistema"}
        </p>
      </div>
      <div className="space-y-1">
        <span className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <CalendarIcon size={14} />
          {formatDate(sale.createdAt)}
        </span>
        <span className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <ClockIcon size={14} />
          {formatDateTime(sale.createdAt).split(", ").at(-1)}
        </span>
      </div>
      <div className="md:text-right">
        <PaymentStatusBadge status={sale.status} />
        <p className="mt-1 text-sm font-circular-bold text-[var(--color-text)]">
          {formatCurrency(sale.totalAmount)}
        </p>
      </div>
      <div className="relative justify-self-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Acciones de venta"
          className="grid size-8 place-items-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-input-bg)]"
        >
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-9 z-20 w-48 rounded-xl bg-[var(--color-card)] p-1.5 shadow-xl ring-1 ring-[var(--color-border)]">
            {sale.receipt ? (
              <p className="px-3 py-2 text-xs font-circular-bold text-[var(--color-primary)]">
                {sale.receipt.correlativo}
              </p>
            ) : sale.status === "pagado" ? (
              <button
                type="button"
                onClick={onEmit}
                className="flex h-9 w-full items-center rounded-lg px-3 text-xs font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-input-bg)]"
              >
                Emitir comprobante
              </button>
            ) : null}
            <button
              type="button"
              disabled={sale.status === "anulado"}
              onClick={onCancel}
              className="flex h-9 w-full items-center rounded-lg px-3 text-xs font-circular-bold text-[#dc2626] hover:bg-[#ef4444]/10 disabled:opacity-40"
            >
              {sale.status === "anulado" ? "Anulado" : "Anular"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function OveragesPanel() {
  const { showToast } = useSystemToast();
  const [result, setResult] = useState(emptyOverages);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState<PlatformOverageStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toPay, setToPay] = useState<PlatformOverage | null>(null);
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(
        await platformAdminApi.findOverages({
          page,
          limit: pageSize,
          search,
          period,
          status: status || undefined,
        }),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [page, period, search, status]);
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(id);
  }, [load]);
  const close = async (row: PlatformOverage) => {
    setIsSubmitting(true);
    try {
      await platformAdminApi.closeOverage(row.company.id, row.period);
      await load();
      showToast({
        title: "Periodo cerrado",
        description: `La deuda de ${row.company.name} quedó pendiente de pago.`,
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudo cerrar",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const pay = async (
    method: PlatformSubscriptionPaymentMethod,
    receiptType: "nota_venta" | "boleta" | "factura",
    other?: string,
  ) => {
    if (!toPay?.liquidation?.id) return;
    setIsSubmitting(true);
    try {
      await platformAdminApi.payOverage(
        toPay.liquidation.id,
        method,
        receiptType,
        other,
      );
      setToPay(null);
      await load();
      showToast({
        title: "Pago registrado",
        description: `Se pagó el excedente de ${toPay.company.name}.`,
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudo registrar",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          icon={<WarningCircleIcon size={20} weight="bold" />}
          label="Pendiente de cobro"
          value={formatCurrency(result.summary.pendingAmount)}
          tone="warning"
        />
        <MetricCard
          icon={<CheckCircleIcon size={20} weight="bold" />}
          label="Excedentes cobrados"
          value={formatCurrency(result.summary.paidAmount)}
          tone="primary"
        />
      </section>
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_44px]">
        <label className="relative">
          <MagnifyingGlassIcon
            size={18}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar empresa..."
            className="h-11 w-full rounded-xl bg-[var(--color-sidebar-bg)] pr-4 pl-11 text-sm outline-none"
          />
        </label>
        <CalendarInput
          mode="month"
          value={period}
          onChange={(value) => {
            setPeriod(value);
            setPage(1);
          }}
          labelInline="Periodo"
        />
        <NativeSelect
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as PlatformOverageStatus | "");
            setPage(1);
          }}
          className={controlClassName}
        >
          <option value="">Todos los estados</option>
          <option value="open">Mes en curso</option>
          <option value="ready">Listo para cerrar</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
        </NativeSelect>
        <button
          type="button"
          onClick={load}
          aria-label="Actualizar"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-sidebar-active)] text-white"
        >
          <ArrowClockwiseIcon
            size={17}
            className={cn(isLoading && "animate-spin")}
          />
        </button>
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      <section className="space-y-3 pb-2 pr-1">
        {isLoading && result.data.length === 0 ? (
          <LoadingRows />
        ) : result.data.length === 0 ? (
          <EmptyState
            icon={<FileTextIcon size={48} weight="light" />}
            title="No hay comprobantes excedentes"
            description="Los consumos fuera de cuota aparecerán aquí."
          />
        ) : (
          result.data.map((row) => (
            <article
              key={`${row.company.id}-${row.period}`}
              className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] md:grid-cols-[minmax(190px,1.4fr)_120px_120px_120px_130px_140px] md:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white">
                  <StorefrontIcon size={21} weight="fill" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                    {row.company.name}
                  </p>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {row.company.document ?? "Sin documento"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  Periodo
                </p>
                <p className="text-sm font-circular-bold text-[var(--color-text)]">
                  {row.period}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  Comprobantes
                </p>
                <p className="text-sm font-circular-bold text-[var(--color-text)]">
                  {row.quantity.toLocaleString("es-PE")}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  Total
                </p>
                <p className="text-sm font-circular-bold text-[var(--color-text)]">
                  {formatCurrency(row.totalAmount)}
                </p>
              </div>
              <OverageStatusBadge status={row.status} />
              <div className="md:text-right">
                {row.status === "ready" ? (
                  <button
                    disabled={isSubmitting}
                    onClick={() => void close(row)}
                    className="h-9 rounded-lg bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white"
                  >
                    Cerrar mes
                  </button>
                ) : row.status === "pendiente" ? (
                  <button
                    onClick={() => setToPay(row)}
                    className="h-9 rounded-lg bg-[#10b981]/10 px-3 text-xs font-circular-bold text-[#059669]"
                  >
                    Registrar pago
                  </button>
                ) : (
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {row.status === "open" ? "En curso" : "Pagado"}
                  </span>
                )}
              </div>
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
      {toPay ? (
        <PayOverageModal
          row={toPay}
          isSubmitting={isSubmitting}
          onClose={() => setToPay(null)}
          onSubmit={pay}
        />
      ) : null}
    </>
  );
}

function OverageStatusBadge({ status }: { status: PlatformOverageStatus }) {
  const labels = {
    open: "En curso",
    ready: "Listo para cerrar",
    pendiente: "Pendiente",
    pagado: "Pagado",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        status === "pagado"
          ? "bg-[#10b981]/10 text-[#059669]"
          : status === "pendiente"
            ? "bg-[#f59e0b]/10 text-[#d97706]"
            : "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
      )}
    >
      {labels[status]}
    </span>
  );
}

function PayOverageModal({
  row,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  row: PlatformOverage;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    method: PlatformSubscriptionPaymentMethod,
    receiptType: "nota_venta" | "boleta" | "factura",
    other?: string,
  ) => Promise<void>;
}) {
  const [method, setMethod] =
    useState<PlatformSubscriptionPaymentMethod>("yape");
  const [other, setOther] = useState("");
  const [receiptType, setReceiptType] = useState<
    "nota_venta" | "boleta" | "factura"
  >("nota_venta");
  return (
    <ModalShell
      title="Registrar pago de excedente"
      description={`${row.company.name} · ${row.period} · ${formatCurrency(row.totalAmount)}`}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(
            method,
            receiptType,
            method === "otro" ? other : undefined,
          );
        }}
        className="grid gap-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Método de pago"
            value={method}
            onChange={(value) =>
              setMethod(value as PlatformSubscriptionPaymentMethod)
            }
          >
            {paymentMethods.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Comprobante"
            value={receiptType}
            onChange={(value) => setReceiptType(value as typeof receiptType)}
          >
            <option value="nota_venta">Nota de venta</option>
            <option value="boleta">Boleta</option>
            <option value="factura">Factura</option>
          </SelectField>
        </div>
        {method === "otro" ? (
          <label className="grid gap-1.5 text-sm">
            <span className="font-circular-bold">Describe el método</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={other}
              onChange={(event) => setOther(event.target.value)}
              className={inputClassName}
            />
          </label>
        ) : null}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
          >
            {isSubmitting ? "Registrando..." : "Confirmar pago"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CancelModal({
  sale,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  sale: PlatformSubscriptionSale;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(reason);
  };

  return (
    <ModalShell
      title="Anular pago"
      description={`${sale.company.name} · ${sale.planName} · ${formatCurrency(sale.totalAmount)}`}
      onClose={onClose}
      closeDisabled={isSubmitting}
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="rounded-xl bg-[#f59e0b]/10 p-4 text-sm text-[#a16207] dark:text-[#fbbf24]">
          Se restaurará el plan {getPlanLabel(sale.previousPlanCode)} con su
          vigencia anterior. La operación permanecerá en el historial.
        </div>
        <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
          <span className="font-circular-bold">Motivo de anulación</span>
          <textarea
            required
            minLength={5}
            maxLength={300}
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={isSubmitting || reason.trim().length < 5}
            className="h-10 rounded-xl bg-[#dc2626] px-5 text-sm font-circular-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Anulando..." : "Anular y restaurar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function SalesControls({
  search,
  plan,
  method,
  status,
  dateFrom,
  dateTo,
  isLoading,
  onSearchChange,
  onPlanChange,
  onMethodChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onRefresh,
}: {
  search: string;
  plan: PlatformPlanCode | "";
  method: PlatformSubscriptionPaymentMethod | "";
  status: PlatformSubscriptionPaymentStatus | "";
  dateFrom: string;
  dateTo: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onPlanChange: (value: PlatformPlanCode | "") => void;
  onMethodChange: (value: PlatformSubscriptionPaymentMethod | "") => void;
  onStatusChange: (value: PlatformSubscriptionPaymentStatus | "") => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_repeat(5,minmax(135px,auto))_44px]">
      <label className="relative">
        <MagnifyingGlassIcon
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar empresa o administrador..."
          className="h-11 w-full rounded-xl bg-[var(--color-sidebar-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none"
        />
      </label>
      <NativeSelect
        value={plan}
        aria-label="Filtrar por plan"
        onChange={(event) =>
          onPlanChange(event.target.value as PlatformPlanCode | "")
        }
        className={controlClassName}
      >
        <option value="">Todos los planes</option>
        {paidPlanCodes.map((code) => (
          <option key={code} value={code}>
            {getPlanLabel(code)}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={method}
        aria-label="Filtrar por método"
        onChange={(event) =>
          onMethodChange(
            event.target.value as PlatformSubscriptionPaymentMethod | "",
          )
        }
        className={controlClassName}
      >
        <option value="">Todos los métodos</option>
        {paymentMethods.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={status}
        aria-label="Filtrar por estado del pago"
        onChange={(event) =>
          onStatusChange(
            event.target.value as PlatformSubscriptionPaymentStatus | "",
          )
        }
        className={controlClassName}
      >
        <option value="">Todos los estados</option>
        <option value="pagado">Pagados</option>
        <option value="anulado">Anulados</option>
      </NativeSelect>
      <CalendarInput
        value={dateFrom}
        onChange={onDateFromChange}
        labelInline="Desde"
        clearable
      />
      <CalendarInput
        value={dateTo}
        onChange={onDateToChange}
        labelInline="Hasta"
        clearable
      />
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        aria-label="Actualizar historial"
        title="Actualizar"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-sidebar-active)] text-white disabled:opacity-60 dark:bg-[var(--color-secondary)]"
      >
        <ArrowClockwiseIcon
          size={17}
          weight="bold"
          className={cn(isLoading && "animate-spin")}
        />
      </button>
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  closeDisabled,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  closeDisabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-4 py-6 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-modal-title"
        className="w-full max-w-2xl rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="subscription-modal-title"
              className="text-lg font-circular-bold text-[var(--color-text)]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Cerrar"
            title="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] disabled:opacity-50"
          >
            <XIcon size={17} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
      <span className="font-circular-bold">{label}</span>
      <NativeSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        {children}
      </NativeSelect>
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg px-4 text-sm font-circular-bold transition-colors",
        active
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-muted-foreground)]",
      )}
    >
      {children}
    </button>
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
  value: string;
  tone: "dark" | "primary" | "danger" | "warning";
}) {
  const iconColors = {
    dark: "bg-[#334155]/10 text-[#334155] dark:text-[#94a3b8]",
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    danger: "bg-[#fef2f2] text-[#ef4444]",
    warning: "bg-[#fff7ed] text-[#f59e0b]",
  }[tone];

  return (
    <article className="flex items-center gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          iconColors,
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          {label}
        </p>
        <p className="mt-1 text-xl leading-none font-circular-bold text-[var(--color-text)]">
          {value}
        </p>
      </div>
    </article>
  );
}

function PaymentStatusBadge({
  status,
}: {
  status: PlatformSubscriptionPaymentStatus;
}) {
  const values = {
    pagado: {
      label: "Pagado",
      className: "bg-[#10b981]/10 text-[#059669]",
      icon: CheckCircleIcon,
    },
    anulado: {
      label: "Anulado",
      className: "bg-[#ef4444]/10 text-[#dc2626]",
      icon: ProhibitIcon,
    },
  };
  const value = values[status];
  const Icon = value.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-circular-bold",
        value.className,
      )}
    >
      <Icon size={13} weight="bold" />
      {value.label}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <span className="text-[var(--color-muted-foreground)]">{icon}</span>
      <p className="mt-3 font-circular-bold text-[var(--color-text)]">
        {title}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
      {message}
    </div>
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

function getRemainingLabel(endsAt: string | null, status: PlatformPlanStatus) {
  if (status === "expired") return "Periodo terminado";
  if (!endsAt) return "Sin vencimiento";
  const days = Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000),
  );
  return `${days} días restantes`;
}

function getPaymentMethodLabel(
  method: PlatformSubscriptionPaymentMethod,
  other: string | null,
) {
  if (method === "otro") return other || "Otro";
  return paymentMethods.find((item) => item.value === method)?.label ?? method;
}

function getPlanLabel(code: PlatformPlanCode) {
  return {
    prueba: "Prueba",
    basico: "Básico",
    emprendedor: "Emprende",
    crecimiento: "Crece",
    empresarial: "Escala",
  }[code];
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString("es-PE");
}

function formatCurrency(value: string | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación";
}

const controlClassName =
  "h-11 rounded-xl bg-[var(--color-sidebar-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const inputClassName =
  "h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

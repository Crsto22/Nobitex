"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CurrencyCircleDollarIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StorefrontIcon,
  TagIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Select } from "@/components/ui/select";
import { CalendarInput } from "@/components/ui/calendar-input";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformAffiliate,
  type PlatformAffiliateCommission,
  type PlatformAffiliateCompany,
  type PlatformAffiliateSettlement,
  type PlatformPaginationMeta,
  type PlatformSubscriptionPaymentMethod,
} from "@/lib/api/platform-admin";
import { downloadBlob } from "@/lib/api/platform-billing";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

type Tab = "codes" | "companies" | "commissions";
const emptyMeta: PlatformPaginationMeta = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};
const methods = [
  "yape",
  "plin",
  "transferencia",
  "deposito",
  "efectivo",
  "otro",
] as const;

export default function AffiliatesPage() {
  const { showToast } = useSystemToast();
  const [tab, setTab] = useState<Tab>("codes");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [affiliates, setAffiliates] = useState<PlatformAffiliate[]>([]);
  const [companies, setCompanies] = useState<PlatformAffiliateCompany[]>([]);
  const [commissions, setCommissions] = useState<PlatformAffiliateCommission[]>(
    [],
  );
  const [settlements, setSettlements] = useState<PlatformAffiliateSettlement[]>(
    [],
  );
  const [meta, setMeta] = useState(emptyMeta);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    pendingCommission: "0.00",
  });
  const [affiliateId, setAffiliateId] = useState("");
  const [period, setPeriod] = useState(() => previousLimaPeriod());
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PlatformSubscriptionPaymentMethod>("yape");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "codes") {
        const result = await platformAdminApi.findAffiliates({
          page,
          limit: 12,
          search,
        });
        setAffiliates(result.data);
        setMeta(result.meta);
        setSummary(result.summary);
      } else if (tab === "companies") {
        const result = await platformAdminApi.findAffiliateCompanies({
          page,
          limit: 12,
          search,
          affiliateId: affiliateId || undefined,
        });
        setCompanies(result.data);
        setMeta(result.meta);
      } else {
        const [movements, liquidationRows] = await Promise.all([
          platformAdminApi.findAffiliateCommissions({
            page,
            limit: 12,
            search,
            affiliateId: affiliateId || undefined,
            period: period || undefined,
          }),
          platformAdminApi.findAffiliateSettlements({
            page: 1,
            limit: 100,
            affiliateId: affiliateId || undefined,
            period: period || undefined,
          }),
        ]);
        setCommissions(movements.data);
        setSettlements(liquidationRows.data);
        setMeta(movements.meta);
        setSummary((current) => ({
          ...current,
          pendingCommission: movements.summary.pending,
        }));
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar afiliados",
      );
    } finally {
      setLoading(false);
    }
  }, [affiliateId, page, period, search, tab]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    void platformAdminApi
      .findAffiliates({ page: 1, limit: 100 })
      .then((result) => {
        if (tab !== "codes") setAffiliates(result.data);
        setSummary(result.summary);
      })
      .catch(() => undefined);
  }, [tab]);

  const changeTab = (value: Tab) => {
    setTab(value);
    setPage(1);
    setSearch("");
  };

  const closeSettlement = async () => {
    if (!affiliateId || !period) return;
    setSaving(true);
    try {
      await platformAdminApi.closeAffiliateSettlement(affiliateId, period);
      showToast({
        title: "Liquidación cerrada",
        description: `Periodo ${period} preparado para pago.`,
        variant: "success",
      });
      await load();
    } catch (requestError) {
      showToast({
        title: "No se pudo cerrar",
        description:
          requestError instanceof Error
            ? requestError.message
            : "Revisa el periodo.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const paySettlement = async () => {
    if (!payingId || reference.trim().length < 2) return;
    setSaving(true);
    try {
      await platformAdminApi.payAffiliateSettlement(
        payingId,
        paymentMethod,
        reference.trim(),
      );
      setPayingId(null);
      setReference("");
      showToast({
        title: "Comisión pagada",
        description: "El pago quedó registrado.",
        variant: "success",
      });
      await load();
    } catch (requestError) {
      showToast({
        title: "No se pudo registrar",
        description:
          requestError instanceof Error
            ? requestError.message
            : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const affiliateOptions = [
    { value: "", label: "Todos los afiliados" },
    ...affiliates.map((item) => ({
      value: item.id,
      label: `${item.code} · ${item.name}`,
    })),
  ];

  const downloadSettlement = async (item: PlatformAffiliateSettlement) => {
    setDownloadingId(item.id);
    try {
      const blob = await platformAdminApi.downloadAffiliateSettlement(item.id);
      downloadBlob(blob, `guia-pago-${item.affiliate.code}-${item.period}.pdf`);
    } catch (requestError) {
      showToast({
        title: "No se pudo descargar",
        description:
          requestError instanceof Error
            ? requestError.message
            : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardShell headerTitle="Afiliados">
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        <section className="grid gap-4 sm:grid-cols-3">
          <Metric
            icon={<TagIcon size={20} weight="fill" />}
            label="Códigos"
            value={summary.total}
            tone="dark"
          />
          <Metric
            icon={<UsersThreeIcon size={20} weight="fill" />}
            label="Afiliados activos"
            value={summary.active}
            tone="primary"
          />
          <Metric
            icon={<CurrencyCircleDollarIcon size={20} weight="fill" />}
            label="Comisión pendiente"
            value={currency(summary.pendingCommission)}
            tone="success"
          />
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-[var(--color-sidebar-bg)] p-1 shadow-sm">
            <TabButton
              active={tab === "codes"}
              onClick={() => changeTab("codes")}
            >
              Códigos
            </TabButton>
            <TabButton
              active={tab === "companies"}
              onClick={() => changeTab("companies")}
            >
              Empresas afiliadas
            </TabButton>
            <TabButton
              active={tab === "commissions"}
              onClick={() => changeTab("commissions")}
            >
              Comisiones
            </TabButton>
          </div>
          {tab === "codes" ? (
            <Link
              href="/superadmin/afiliados/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white"
            >
              <PlusIcon size={16} /> Nuevo afiliado
            </Link>
          ) : null}
        </div>

        <section className="mt-4 flex flex-wrap items-center gap-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
          <label className="relative min-w-[220px] flex-1">
            <MagnifyingGlassIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar código, afiliado o empresa"
              className="h-10 w-full rounded-xl bg-[var(--color-input-bg)] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>
          {tab !== "codes" ? (
            <Select
              className="w-full sm:w-64"
              options={affiliateOptions}
              value={affiliateId}
              onChange={(value) => {
                setAffiliateId(value);
                setPage(1);
              }}
            />
          ) : null}
          {tab === "commissions" ? (
            <CalendarInput
              mode="month"
              value={period}
              onChange={(value) => {
                setPeriod(value);
                setPage(1);
              }}
              labelInline="Periodo"
              className="w-full sm:w-56"
            />
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="grid size-10 place-items-center rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text)]"
            aria-label="Actualizar"
          >
            <ArrowClockwiseIcon size={17} />
          </button>
        </section>

        {tab === "commissions" ? (
          <section className="mt-4 flex flex-wrap items-end gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
            <div className="min-w-[240px] flex-1">
              <p className="mb-1.5 text-xs text-[var(--color-muted-foreground)]">
                Afiliado
              </p>
              <Select
                options={affiliateOptions}
                value={affiliateId}
                onChange={setAffiliateId}
              />
            </div>
            <div className="min-w-[220px]">
              <CalendarInput
                mode="month"
                label="Periodo"
                value={period}
                onChange={setPeriod}
              />
            </div>
            <button
              disabled={saving || !affiliateId || !period}
              onClick={() => void closeSettlement()}
              className="h-11 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white disabled:opacity-50"
            >
              Cerrar liquidación
            </button>
          </section>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        <section className="mt-4 space-y-3">
          {loading ? (
            <LoadingRows />
          ) : tab === "codes" ? (
            affiliates.map((item) => (
              <AffiliateRow key={item.id} affiliate={item} />
            ))
          ) : tab === "companies" ? (
            companies.map((item) => (
              <CompanyRow key={item.company.id} item={item} />
            ))
          ) : (
            commissions.map((item) => (
              <CommissionRow key={item.id} item={item} />
            ))
          )}
          {!loading &&
          ((tab === "codes" && !affiliates.length) ||
            (tab === "companies" && !companies.length) ||
            (tab === "commissions" && !commissions.length)) ? (
            <div className="rounded-[14px] bg-[var(--color-card)] py-16 text-center text-sm text-[var(--color-muted-foreground)]">
              Sin resultados
            </div>
          ) : null}
        </section>
        <Pagination meta={meta} onPage={setPage} />

        {tab === "commissions" && settlements.length ? (
          <section className="mt-6 space-y-3 pb-4">
            <p className="text-sm font-circular-bold text-[var(--color-text)]">
              Liquidaciones
            </p>
            {settlements.map((item) => (
              <article
                key={item.id}
                className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-circular-bold">
                      {item.affiliate.code} · {item.period}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {item.count} movimientos · {currency(item.totalAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Status value={item.status} />
                    <button
                      type="button"
                      disabled={downloadingId === item.id}
                      onClick={() => void downloadSettlement(item)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold disabled:opacity-50"
                    >
                      <DownloadSimpleIcon size={15} /> PDF
                    </button>
                    {item.status === "pendiente" ? (
                      <button
                        onClick={() => setPayingId(item.id)}
                        className="h-9 rounded-lg bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white"
                      >
                        Registrar pago
                      </button>
                    ) : null}
                  </div>
                </div>
                {payingId === item.id ? (
                  <div className="mt-3 grid gap-2 border-t border-[var(--color-border)] pt-3 sm:grid-cols-[180px_minmax(180px,1fr)_auto]">
                    <Select
                      options={methods.map((value) => ({
                        value,
                        label: paymentLabel(value),
                      }))}
                      value={paymentMethod}
                      onChange={(value) =>
                        setPaymentMethod(
                          value as PlatformSubscriptionPaymentMethod,
                        )
                      }
                    />
                    <input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Referencia del pago"
                      aria-label="Referencia del pago"
                      className="h-11 rounded-xl bg-[var(--color-input-bg)] px-3 text-sm outline-none"
                    />
                    <button
                      disabled={saving || reference.trim().length < 2}
                      onClick={() => void paySettlement()}
                      className="h-11 rounded-xl bg-emerald-600 px-4 text-xs font-circular-bold text-white disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </DashboardShell>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "dark" | "primary" | "success";
}) {
  const styles =
    tone === "dark"
      ? "bg-[#10283e] text-white"
      : tone === "primary"
        ? "bg-[var(--color-primary)] text-white"
        : "bg-[var(--color-card)] text-[var(--color-text)]";
  return (
    <article
      className={cn(
        "rounded-[14px] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.1)]",
        styles,
      )}
    >
      <span className="mb-6 grid size-9 place-items-center rounded-xl bg-white/15">
        {icon}
      </span>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-1 text-xl font-circular-bold">{value}</p>
    </article>
  );
}
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg px-3 text-xs font-circular-bold",
        active
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}
function AffiliateRow({ affiliate }: { affiliate: PlatformAffiliate }) {
  return (
    <article className="grid gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)] md:grid-cols-[1.3fr_1fr_1fr_1fr_auto] md:items-center">
      <Identity
        icon={<TagIcon size={19} weight="fill" />}
        title={affiliate.code}
        subtitle={affiliate.name}
      />
      <Cell label="Descuento inicial" value={`${affiliate.discountPercent}%`} />
      <Cell label="Comisión" value={`${affiliate.commissionPercent}%`} />
      <Cell label="Empresas" value={String(affiliate.companies ?? 0)} />
      <div className="flex items-center gap-2">
        <Status value={affiliate.status} />
        <Link
          href={`/superadmin/afiliados/${affiliate.id}`}
          className="h-9 rounded-lg bg-[var(--color-input-bg)] px-3 py-2 text-xs font-circular-bold"
        >
          Editar
        </Link>
      </div>
    </article>
  );
}
function CompanyRow({ item }: { item: PlatformAffiliateCompany }) {
  return (
    <article className="grid gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)] md:grid-cols-[1.4fr_1fr_1fr_1fr] md:items-center">
      <Identity
        icon={<StorefrontIcon size={19} weight="fill" />}
        title={item.company.name}
        subtitle={item.affiliate.code}
      />
      <Cell label="Plan" value={item.planCode} />
      <Cell
        label="Vencimiento"
        value={item.planEndsAt ? date(item.planEndsAt) : "Sin fecha"}
      />
      <Status value={item.status} />
    </article>
  );
}
function CommissionRow({ item }: { item: PlatformAffiliateCommission }) {
  return (
    <article className="grid gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)] md:grid-cols-[1.3fr_1.2fr_0.8fr_0.8fr_0.8fr] md:items-center">
      <Identity
        icon={<CurrencyCircleDollarIcon size={19} weight="fill" />}
        title={item.affiliate.code}
        subtitle={item.company.name}
      />
      <Cell label="Base neta" value={currency(item.baseAmount)} />
      <Cell label="Comisión" value={`${item.percent}%`} />
      <Cell label="Importe" value={currency(item.amount)} />
      <Status value={item.status} />
    </article>
  );
}
function Identity({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-circular-bold">{title}</p>
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-circular-bold capitalize">{value}</p>
    </div>
  );
}
function Status({ value }: { value: string }) {
  const good = ["activo", "activa", "pagada", "liquidada"].includes(value);
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-circular-bold capitalize",
        good
          ? "bg-emerald-500/10 text-emerald-600"
          : value === "pendiente"
            ? "bg-amber-500/10 text-amber-700"
            : "bg-red-500/10 text-red-600",
      )}
    >
      {value}
    </span>
  );
}
function Pagination({
  meta,
  onPage,
}: {
  meta: PlatformPaginationMeta;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-[var(--color-muted-foreground)]">
        {meta.total} registros
      </p>
      <div className="flex gap-2">
        <button
          aria-label="Pagina anterior"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
          className="grid size-9 place-items-center rounded-lg bg-[var(--color-card)] disabled:opacity-40"
        >
          <CaretLeftIcon size={15} />
        </button>
        <span className="grid min-w-9 place-items-center text-xs font-circular-bold">
          {meta.page}/{meta.totalPages}
        </span>
        <button
          aria-label="Pagina siguiente"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          className="grid size-9 place-items-center rounded-lg bg-[var(--color-card)] disabled:opacity-40"
        >
          <CaretRightIcon size={15} />
        </button>
      </div>
    </div>
  );
}
function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-[14px] bg-[var(--color-card)]"
        />
      ))}
    </>
  );
}
function currency(value: string | number) {
  return currencyFormatter.format(Number(value) || 0);
}
function date(value: string) {
  return new Date(value).toLocaleDateString("es-PE");
}
function paymentLabel(value: string) {
  return (
    (
      {
        yape: "Yape",
        plin: "Plin",
        transferencia: "Transferencia",
        deposito: "Depósito",
        efectivo: "Efectivo",
        otro: "Otro",
      } as Record<string, string>
    )[value] ?? value
  );
}
function previousLimaPeriod() {
  const value = new Date(Date.now() - 5 * 60 * 60 * 1000);
  value.setUTCMonth(value.getUTCMonth() - 1);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

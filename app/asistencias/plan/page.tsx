"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowClockwiseIcon,
  CalendarBlankIcon,
  DatabaseIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  MinusIcon,
  PlusIcon,
  QrCodeIcon,
  ReceiptIcon,
  TagIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { AffiliateCodeInput } from "@/components/AffiliateCode/affiliate-code-input";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  downloadBlob,
  platformBillingApi,
  type PlatformReceipt,
  type PlatformReceiptStatus,
} from "@/lib/api/platform-billing";
import { plansApi, type PlanDefinition } from "@/lib/api/plans";
import { useAuth } from "@/lib/auth/auth-provider";
import { getUserDisplayName } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/intl";
import { getProductModeFromModuleKeys } from "@/lib/navigation/product-mode";
import { cn } from "@/lib/utils";

type Tab = "plans" | "usage" | "receipts";

const receiptPageSize = 10;
const supportWhatsAppPhone = "51923328058";

const tabs: { key: Tab; label: string; icon: typeof TagIcon }[] = [
  { key: "plans", label: "Planes", icon: TagIcon },
  { key: "usage", label: "Consumo", icon: DatabaseIcon },
  { key: "receipts", label: "Mis comprobantes", icon: ReceiptIcon },
];

const receiptStatus: Record<
  PlatformReceiptStatus,
  { label: string; className: string }
> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  aceptado: { label: "Aceptado", className: "bg-[#10b981]/10 text-[#059669]" },
  rechazado: {
    label: "Rechazado",
    className: "bg-[#ef4444]/10 text-[#dc2626]",
  },
  error: { label: "Con error", className: "bg-[#ef4444]/10 text-[#dc2626]" },
  anulacion_pendiente: {
    label: "Anulacion pendiente",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  anulado: {
    label: "Anulado",
    className:
      "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
  },
};

export default function AsistenciasPlanPage() {
  const { user, companyInfo, currentPlan, refreshPlan } = useAuth();
  const { showToast } = useSystemToast();
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [workers, setWorkers] = useState("0");
  const [qrPoints, setQrPoints] = useState("0");
  const [posPlans, setPosPlans] = useState<PlanDefinition[]>([]);
  const [receipts, setReceipts] = useState<PlatformReceipt[]>([]);
  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptMeta, setReceiptMeta] = useState({ total: 0, totalPages: 1 });
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isLoading, setIsLoading] = useState(!currentPlan);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshPlan();
      const catalog = await plansApi.findAll();
      setPosPlans(catalog.filter(isPosPlan));
    } catch (error) {
      showToast({
        title: "No se pudo cargar el plan",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshPlan, showToast]);

  const loadReceipts = useCallback(async () => {
    setIsLoadingReceipts(true);
    try {
      const response = await platformBillingApi.findReceipts(
        { page: receiptPage, limit: receiptPageSize },
        true,
      );
      setReceipts(response.data);
      setReceiptMeta({
        total: response.meta.total,
        totalPages: Math.max(1, response.meta.totalPages),
      });
    } catch (error) {
      showToast({
        title: "No se pudo cargar comprobantes",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoadingReceipts(false);
    }
  }, [receiptPage, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPlan(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPlan]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReceipts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReceipts]);

  const attendance = currentPlan?.attendance;
  const pricing = currentPlan?.attendancePricing;
  const attendanceMonthlyPayment = attendance?.trial
    ? 0
    : Number(attendance?.monthlyPrice ?? 0);
  const workerUnitPrice = Number(pricing?.employeeUnitPrice ?? 0);
  const qrUnitPrice = Number(pricing?.qrPointUnitPrice ?? 0);
  const workerCount = Math.max(0, Math.trunc(Number(workers) || 0));
  const qrCount = Math.max(0, Math.trunc(Number(qrPoints) || 0));
  const monthlyTotal = workerCount * workerUnitPrice + qrCount * qrUnitPrice;
  const newMonthlyTotal = attendanceMonthlyPayment + monthlyTotal;
  const includedDocumentQueries = getIncludedDocumentQueries(monthlyTotal);
  const hasPrices = workerUnitPrice > 0 || qrUnitPrice > 0;
  const companyName =
    companyInfo?.nombreComercial ??
    user?.empresaNombreComercial ??
    "Mi empresa";
  const customerName = getUserDisplayName(user);
  const { attendanceOnly } = getProductModeFromModuleKeys([
    ...(user?.moduleKeys ?? []),
    ...(currentPlan?.effectiveModuleKeys ?? []),
  ]);
  const showAffiliateCode =
    currentPlan?.status === "trial" && currentPlan.monthlyDiscountEligible;
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadPlan(), loadReceipts()]);
    setIsRefreshing(false);
  };
  const downloadReceipt = async (
    receipt: PlatformReceipt,
    kind: "pdf" | "xml" | "cdr",
  ) => {
    try {
      const blob = await platformBillingApi.download(receipt.id, kind, true);
      downloadBlob(blob, `${receipt.correlativo}.${kind}`);
    } catch (error) {
      showToast({
        title: "No se pudo descargar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    }
  };

  return (
    <DashboardShell headerTitle="Plan y facturacion">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6 lg:py-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-circular-bold text-[var(--color-text)]">
              Plan de asistencias
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="grid size-11 place-items-center rounded-[16px] bg-[var(--color-input-bg)] text-[var(--color-text)] disabled:opacity-50"
            aria-label="Actualizar plan"
          >
            <ArrowClockwiseIcon
              size={18}
              weight="bold"
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            label="Estado"
            value={
              attendance?.trial
                ? "Prueba"
                : attendance?.effectiveActive
                  ? "Activo"
                  : "Sin contratar"
            }
            icon={<CalendarBlankIcon size={20} weight="fill" />}
            color={attendance?.effectiveActive ? "#10b981" : "#f59e0b"}
          />
          <MetricCard
            label="Vencimiento"
            value={
              attendance?.endsAt ? formatDate(attendance.endsAt) : "Sin fecha"
            }
            icon={<CalendarBlankIcon size={20} weight="fill" />}
            color="#2563eb"
          />
          <MetricCard
            label="Pago mensual"
            value={formatCurrency(attendanceMonthlyPayment)}
            icon={<ReceiptIcon size={20} weight="fill" />}
            color="#14b8a6"
          />
          <MetricCard
            label="Consultas DNI"
            value={`${currentPlan?.usage.documentQueries ?? 0} / ${currentPlan?.effectiveLimits.documentQueries ?? 0}`}
            icon={<FileTextIcon size={20} weight="fill" />}
            color="#f59e0b"
          />
        </section>

        <nav
          className="grid grid-cols-3 gap-1.5 rounded-[14px] bg-[var(--color-input-bg)] p-1.5"
          aria-label="Secciones del plan de asistencias"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex h-10 min-w-0 items-center justify-center gap-2 rounded-[11px] px-2 text-xs font-circular-bold transition-colors sm:px-4 sm:text-sm",
                  activeTab === tab.key
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]",
                )}
              >
                <Icon
                  size={17}
                  weight={activeTab === tab.key ? "fill" : "regular"}
                />
                {tab.label}
                {tab.key === "receipts" && receiptMeta.total > 0 ? (
                  <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] text-[var(--color-primary)]">
                    {receiptMeta.total}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {activeTab === "plans" ? (
          <section className="space-y-4">
            {showAffiliateCode ? (
              <AffiliateCodeInput
                value={affiliateCode}
                onChange={setAffiliateCode}
              />
            ) : null}
            <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
              <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                Solicitar adicionales
              </h2>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {hasPrices
                  ? `${formatCurrency(String(workerUnitPrice))} por trabajador y ${formatCurrency(String(qrUnitPrice))} por punto QR.`
                  : "Precio segun cotizacion."}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Agregar trabajadores"
                  value={workers}
                  onChange={setWorkers}
                />
                <NumberField
                  label="Agregar puntos QR"
                  value={qrPoints}
                  onChange={setQrPoints}
                />
              </div>

              <div className="mt-4 rounded-[12px] bg-[var(--color-input-bg)] p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Pago mensual actual
                    </p>
                    <p className="mt-1 text-2xl font-circular-bold text-[var(--color-text)]">
                      {formatCurrency(attendanceMonthlyPayment)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Adicionales solicitados
                    </p>
                    <p className="mt-1 text-2xl font-circular-bold text-[var(--color-text)]">
                      {hasPrices
                        ? formatCurrency(String(monthlyTotal))
                        : "A cotizar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Consultas DNI/RUC incluidas
                    </p>
                    <p className="mt-1 text-2xl font-circular-bold text-[#059669]">
                      {includedDocumentQueries.toLocaleString("es-PE")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {qrCount.toLocaleString("es-PE")} sedes incluidas por QR
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-[10px] bg-[var(--color-card)] px-4 py-3">
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Nuevo total mensual
                  </p>
                  <p className="mt-1 text-2xl font-circular-bold text-[var(--color-primary)]">
                    {hasPrices
                      ? formatCurrency(String(newMonthlyTotal))
                      : "A cotizar"}
                  </p>
                </div>
                <a
                  href={buildWhatsAppUrl({
                    companyName,
                    customerName,
                    customerEmail: user?.email,
                    workers: workerCount,
                    qrPoints: qrCount,
                    documentQueries: includedDocumentQueries,
                    currentMonthlyPayment: attendanceMonthlyPayment,
                    monthlyTotal,
                    newMonthlyTotal,
                    hasPrices,
                    affiliateCode,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#25d366] px-4 text-sm font-circular-bold text-white transition-opacity hover:opacity-90"
                >
                  <Image
                    src="/svg/redes-sociales/whatsapp.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Solicitar
                </a>
              </div>
            </article>
            {attendanceOnly ? (
              <PosPlansSection
                plans={posPlans}
                companyName={companyName}
                customerName={customerName}
                customerEmail={user?.email}
                affiliateCode={affiliateCode}
                loading={isLoading}
              />
            ) : null}
          </section>
        ) : null}

        {activeTab === "usage" ? (
          <UsageTab currentPlan={currentPlan} loading={isLoading} />
        ) : null}

        {activeTab === "receipts" ? (
          <ReceiptsTab
            rows={receipts}
            page={receiptPage}
            total={receiptMeta.total}
            totalPages={receiptMeta.totalPages}
            loading={isLoadingReceipts}
            onPageChange={setReceiptPage}
            onDownload={downloadReceipt}
          />
        ) : null}
      </div>
    </DashboardShell>
  );
}

function UsageTab({
  currentPlan,
  loading,
}: {
  currentPlan: ReturnType<typeof useAuth>["currentPlan"];
  loading: boolean;
}) {
  if (loading && !currentPlan) {
    return (
      <div className="h-72 animate-pulse rounded-[14px] bg-[var(--color-card)]" />
    );
  }
  if (!currentPlan) {
    return <EmptyState title="No se pudo cargar el consumo" />;
  }

  const attendance = currentPlan.attendance;
  const items = [
    {
      label: "Trabajadores",
      used: currentPlan.usage.attendanceEmployees,
      limit: attendance?.effectiveEmployeesLimit ?? 0,
      icon: UsersThreeIcon,
      color: "#14b8a6",
    },
    {
      label: "Puntos QR",
      used: currentPlan.usage.attendanceQrPoints,
      limit: attendance?.effectiveQrPointsLimit ?? 0,
      icon: QrCodeIcon,
      color: "#22c55e",
    },
    {
      label: "Consultas DNI/RUC",
      used: currentPlan.usage.documentQueries,
      limit: currentPlan.effectiveLimits.documentQueries,
      icon: FileTextIcon,
      color: "#f59e0b",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 pb-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <UsageCard key={item.label} {...item} />
      ))}
    </section>
  );
}

function PosPlansSection({
  plans,
  companyName,
  customerName,
  customerEmail,
  affiliateCode,
  loading,
}: {
  plans: PlanDefinition[];
  companyName: string;
  customerName: string;
  customerEmail?: string;
  affiliateCode?: string;
  loading: boolean;
}) {
  return (
    <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <h2 className="text-base font-circular-bold text-[var(--color-text)]">
        Planes POS disponibles
      </h2>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        Agrega ventas, caja, productos y stock a tu cuenta.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading && plans.length === 0
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-[12px] bg-[var(--color-input-bg)]"
              />
            ))
          : plans.map((plan) => (
              <article
                key={plan.code}
                className="rounded-[12px] border border-[var(--color-border)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <TagIcon
                    size={20}
                    weight="fill"
                    className="text-[var(--color-primary)]"
                  />
                  <span className="rounded-full bg-[#10b981]/10 px-2.5 py-1 text-[10px] font-circular-bold text-[#059669]">
                    POS
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-circular-bold text-[var(--color-text)]">
                  {plan.name}
                </h3>
                <p className="mt-1 text-xl font-circular-bold text-[var(--color-text)]">
                  {formatCurrency(plan.priceMonthly)}
                  <span className="ml-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                    / mes
                  </span>
                </p>
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  {plan.limits.users.toLocaleString("es-PE")} usuarios ·{" "}
                  {plan.limits.branches.toLocaleString("es-PE")} tiendas ·{" "}
                  {plan.limits.documents.toLocaleString("es-PE")} comprobantes
                </p>
                <a
                  href={buildPosPlanWhatsAppUrl({
                    plan,
                    companyName,
                    customerName,
                    customerEmail,
                    affiliateCode,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[#25d366] px-3 text-xs font-circular-bold text-white"
                >
                  <Image
                    src="/svg/redes-sociales/whatsapp.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                  Solicitar POS
                </a>
              </article>
            ))}
      </div>
    </section>
  );
}

function UsageCard({
  label,
  used,
  limit,
  icon: Icon,
  color,
}: {
  label: string;
  used: number;
  limit: number;
  icon: typeof UsersThreeIcon;
  color: string;
}) {
  const percent =
    limit > 0 ? Math.min(100, (used / limit) * 100) : used > 0 ? 100 : 0;
  return (
    <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-xl font-circular-bold text-[var(--color-text)]">
            {used.toLocaleString("es-PE")}{" "}
            <span className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              de {limit.toLocaleString("es-PE")}
            </span>
          </p>
        </div>
        <span
          className="grid size-10 place-items-center rounded-[11px]"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon size={19} weight="fill" />
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-input-bg)]">
        <div
          className={cn(
            "h-full rounded-full",
            percent >= 90 ? "bg-[#ef4444]" : "bg-[var(--color-primary)]",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-[11px] text-[var(--color-muted-foreground)]">
        {Math.round(percent)}% utilizado
      </p>
    </article>
  );
}

function ReceiptsTab({
  rows,
  page,
  total,
  totalPages,
  loading,
  onPageChange,
  onDownload,
}: {
  rows: PlatformReceipt[];
  page: number;
  total: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onDownload: (
    receipt: PlatformReceipt,
    kind: "pdf" | "xml" | "cdr",
  ) => Promise<void>;
}) {
  return (
    <section className="space-y-3 pb-5">
      <div className="overflow-hidden rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[var(--color-input-bg)] text-xs text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-circular-bold">Comprobante</th>
                <th className="px-4 py-3 font-circular-bold">Tipo</th>
                <th className="px-4 py-3 font-circular-bold">Fecha</th>
                <th className="px-4 py-3 font-circular-bold">Total</th>
                <th className="px-4 py-3 font-circular-bold">Estado</th>
                <th className="px-4 py-3 text-right font-circular-bold">
                  Archivos
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr
                    key={index}
                    className="border-t border-[var(--color-border)]"
                  >
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-9 animate-pulse rounded-lg bg-[var(--color-input-bg)]" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14">
                    <EmptyState title="Aun no tienes comprobantes emitidos" />
                  </td>
                </tr>
              ) : (
                rows.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="border-t border-[var(--color-border)] text-[var(--color-text)]"
                  >
                    <td className="px-4 py-3 font-circular-bold">
                      {receipt.correlativo}
                    </td>
                    <td className="px-4 py-3">
                      {formatReceiptType(receipt.type)}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {formatDate(receipt.issuedAt)}
                    </td>
                    <td className="px-4 py-3 font-circular-bold">
                      {formatCurrency(receipt.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={receipt.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {(["pdf", "xml", "cdr"] as const).map((kind) =>
                          receipt.downloads[kind] ? (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => void onDownload(receipt, kind)}
                              className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold"
                            >
                              <DownloadSimpleIcon size={14} />
                              {kind.toUpperCase()}
                            </button>
                          ) : null,
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Mostrando {rows.length} de {total} comprobantes
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={loading || page <= 1}
            className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="grid size-8 place-items-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
            {page}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={loading || page >= totalPages}
            className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  );
}

function StatusBadge({ status }: { status: PlatformReceiptStatus }) {
  const config = receiptStatus[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="text-center text-[var(--color-muted-foreground)]">
      <ReceiptIcon size={42} weight="light" className="mx-auto" />
      <p className="mt-2 text-sm font-circular-bold text-[var(--color-text)]">
        {title}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <span
        className="grid size-10 place-items-center rounded-[11px]"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {icon}
      </span>
      <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-circular-bold text-[var(--color-text)]">
        {value}
      </p>
    </article>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const numericValue = Math.max(0, Math.trunc(Number(value) || 0));
  const updateValue = (next: number) => onChange(String(Math.max(0, next)));

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-circular-bold text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <div className="grid grid-cols-[44px_1fr_44px] overflow-hidden rounded-[12px] bg-[var(--color-input-bg)]">
        <button
          type="button"
          onClick={() => updateValue(numericValue - 1)}
          className="grid h-11 place-items-center text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:opacity-40"
          disabled={numericValue <= 0}
          aria-label={`Restar ${label.toLowerCase()}`}
        >
          <MinusIcon size={16} weight="bold" />
        </button>
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full bg-transparent px-3 text-center text-sm font-circular-bold text-[var(--color-text)] outline-none"
        />
        <button
          type="button"
          onClick={() => updateValue(numericValue + 1)}
          className="grid h-11 place-items-center text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label={`Sumar ${label.toLowerCase()}`}
        >
          <PlusIcon size={16} weight="bold" />
        </button>
      </div>
    </label>
  );
}

function buildWhatsAppUrl({
  companyName,
  customerName,
  customerEmail,
  workers,
  qrPoints,
  documentQueries,
  currentMonthlyPayment,
  monthlyTotal,
  newMonthlyTotal,
  hasPrices,
  affiliateCode,
}: {
  companyName: string;
  customerName: string;
  customerEmail?: string;
  workers: number;
  qrPoints: number;
  documentQueries: number;
  currentMonthlyPayment: number;
  monthlyTotal: number;
  newMonthlyTotal: number;
  hasPrices: boolean;
  affiliateCode?: string;
}) {
  const message = [
    "Hola, deseo solicitar adicionales para el plan de asistencias de Nuvex.",
    `Empresa: ${companyName}`,
    `Cliente: ${customerName}`,
    customerEmail ? `Correo: ${customerEmail}` : "",
    `Agregar trabajadores: ${workers.toLocaleString("es-PE")}`,
    `Agregar puntos QR: ${qrPoints.toLocaleString("es-PE")}`,
    `Sedes incluidas por puntos QR: ${qrPoints.toLocaleString("es-PE")}`,
    `Consultas DNI/RUC incluidas: ${documentQueries.toLocaleString("es-PE")}`,
    affiliateCode ? `Codigo de afiliado: ${affiliateCode}` : "",
    hasPrices
      ? `Pago mensual actual: ${formatCurrency(String(currentMonthlyPayment))}`
      : "",
    hasPrices
      ? `Adicionales solicitados: ${formatCurrency(String(monthlyTotal))}`
      : "",
    hasPrices
      ? `Nuevo total mensual: ${formatCurrency(String(newMonthlyTotal))}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const phone = (
    process.env.NEXT_PUBLIC_NUVEX_WHATSAPP || supportWhatsAppPhone
  ).replace(
    /\D/g,
    "",
  );
  const text = encodeURIComponent(message);
  return phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

function getIncludedDocumentQueries(monthlyTotal: number) {
  if (monthlyTotal >= 100) return 800;
  if (monthlyTotal >= 60) return 300;
  if (monthlyTotal >= 30) return 100;
  return 20;
}

function isPosPlan(plan: PlanDefinition) {
  return (
    plan.code !== "prueba" &&
    !plan.code.startsWith("asistencias_") &&
    !plan.code.startsWith("completo_")
  );
}

function buildPosPlanWhatsAppUrl({
  plan,
  companyName,
  customerName,
  customerEmail,
  affiliateCode,
}: {
  plan: PlanDefinition;
  companyName: string;
  customerName: string;
  customerEmail?: string;
  affiliateCode?: string;
}) {
  const message = [
    "Hola, deseo agregar un plan POS a mi cuenta de Nuvex.",
    `Empresa: ${companyName}`,
    `Cliente: ${customerName}`,
    customerEmail ? `Correo: ${customerEmail}` : "",
    `Plan POS: ${plan.name}`,
    `Pago mensual: ${formatCurrency(plan.priceMonthly)}`,
    affiliateCode ? `Codigo de afiliado: ${affiliateCode}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const phone = (
    process.env.NEXT_PUBLIC_NUVEX_WHATSAPP || supportWhatsAppPhone
  ).replace(
    /\D/g,
    "",
  );
  const text = encodeURIComponent(message);
  return phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

function formatReceiptType(type: PlatformReceipt["type"]) {
  return {
    nota_venta: "Nota de venta",
    boleta: "Boleta",
    factura: "Factura",
    nota_credito: "Nota de crédito",
  }[type];
}

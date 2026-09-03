"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowClockwiseIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  CubeIcon,
  DatabaseIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  ReceiptIcon,
  StorefrontIcon,
  TagIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  XCircleIcon,
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
import {
  plansApi,
  type PlanDefinition,
  type PlanLimits,
} from "@/lib/api/plans";
import { useAuth } from "@/lib/auth/auth-provider";
import { getUserDisplayName } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/intl";
import { getProductModeFromModuleKeys } from "@/lib/navigation/product-mode";
import { cn } from "@/lib/utils";

type Tab = "plans" | "usage" | "receipts";
type BillingPeriod = "monthly" | "annual";

const receiptPageSize = 10;
const supportWhatsAppPhone = "51923328058";

const tabs: { key: Tab; label: string; icon: typeof TagIcon }[] = [
  { key: "plans", label: "Planes", icon: TagIcon },
  { key: "usage", label: "Consumo", icon: DatabaseIcon },
  { key: "receipts", label: "Mis comprobantes", icon: ReceiptIcon },
];

type UsageItem = {
  key: keyof PlanLimits;
  label: string;
  icon: typeof UsersThreeIcon;
  color: string;
};

const usageItems: UsageItem[] = [
  { key: "users", label: "Usuarios", icon: UsersThreeIcon, color: "#2563eb" },
  {
    key: "branches",
    label: "Tiendas",
    icon: BuildingsIcon,
    color: "#06b6d4",
  },
  {
    key: "warehouses",
    label: "Almacenes",
    icon: StorefrontIcon,
    color: "#64748b",
  },
  { key: "products", label: "Productos", icon: CubeIcon, color: "#10b981" },
  { key: "variants", label: "Variantes", icon: DatabaseIcon, color: "#8b5cf6" },
  {
    key: "documents",
    label: "Comprobantes",
    icon: FileTextIcon,
    color: "#f59e0b",
  },
  {
    key: "documentQueries",
    label: "Consultas DNI/RUC",
    icon: FileTextIcon,
    color: "#0ea5e9",
  },
  {
    key: "storageBytes",
    label: "Imágenes",
    icon: DatabaseIcon,
    color: "#ec4899",
  },
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
    label: "Anulación pendiente",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  anulado: {
    label: "Anulado",
    className:
      "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
  },
};

export default function PlanPage() {
  const { user, companyInfo, currentPlan, refreshPlan } = useAuth();
  const { showToast } = useSystemToast();
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [receipts, setReceipts] = useState<PlatformReceipt[]>([]);
  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptMeta, setReceiptMeta] = useState({ total: 0, totalPages: 1 });
  const [affiliateCode, setAffiliateCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setError("");
    try {
      const [catalog] = await Promise.all([plansApi.findAll(), refreshPlan()]);
      setPlans(catalog);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [refreshPlan]);

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
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoadingReceipts(false);
    }
  }, [receiptPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOverview(), 0);
    return () => window.clearTimeout(timer);
  }, [loadOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("tab") === "usage") {
        setActiveTab("usage");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReceipts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReceipts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadOverview(), loadReceipts()]);
    setIsRefreshing(false);
  };

  const downloadReceipt = async (
    receipt: PlatformReceipt,
    kind: "pdf" | "xml" | "cdr",
  ) => {
    try {
      const blob = await platformBillingApi.download(receipt.id, kind, true);
      downloadBlob(blob, `${receipt.correlativo}.${kind}`);
    } catch (downloadError) {
      showToast({
        title: "No se pudo descargar",
        description: getErrorMessage(downloadError),
        variant: "error",
      });
    }
  };
  const companyName =
    companyInfo?.nombreComercial ??
    user?.empresaNombreComercial ??
    "Mi empresa";
  const customerName = getUserDisplayName(user);
  const { posOnly } = getProductModeFromModuleKeys([
    ...(user?.moduleKeys ?? []),
    ...(currentPlan?.effectiveModuleKeys ?? []),
  ]);
  const showAffiliateCode =
    currentPlan?.status === "trial" && currentPlan.monthlyDiscountEligible;

  return (
    <DashboardShell headerTitle="Plan y facturación">
      <div className="plan-page-sora content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:gap-5 sm:p-4 lg:px-6 lg:py-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-circular-bold text-[var(--color-text)]">
              Plan y facturación
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
            title="Actualizar"
            aria-label="Actualizar plan y comprobantes"
          >
            <ArrowClockwiseIcon
              size={18}
              weight="bold"
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>
        </header>

        {error ? (
          <div className="rounded-[12px] bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            label="Plan actual"
            value={currentPlan?.plan.name ?? (isLoading ? "Cargando..." : "-")}
            icon={<TagIcon size={20} weight="fill" />}
            featured
          />
          <MetricCard
            label="Estado"
            value={getStatusLabel(currentPlan?.status)}
            icon={<CheckCircleIcon size={20} weight="fill" />}
            color={currentPlan?.status === "expired" ? "#ef4444" : "#10b981"}
          />
          <MetricCard
            label="Vencimiento"
            value={formatRemaining(
              currentPlan?.daysRemaining,
              currentPlan?.endsAt,
            )}
            icon={<CalendarBlankIcon size={20} weight="fill" />}
            color="#2563eb"
          />
          <MetricCard
            label="Pago mensual"
            value={formatCurrency(currentPlan?.plan.priceMonthly ?? "0")}
            icon={<ReceiptIcon size={20} weight="fill" />}
            color="#14b8a6"
          />
        </section>

        <nav
          className="grid grid-cols-3 gap-1.5 rounded-[14px] bg-[var(--color-input-bg)] p-1.5"
          aria-label="Secciones del plan"
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
          <PlansTab
            plans={plans}
            currentCode={currentPlan?.plan.code}
            monthlyDiscountEligible={
              currentPlan?.monthlyDiscountEligible ?? false
            }
            period={billingPeriod}
            onPeriodChange={setBillingPeriod}
            companyName={companyName}
            customerName={customerName}
            customerEmail={user?.email}
            loading={isLoading}
            showAttendanceRequest={posOnly}
            showAffiliateCode={showAffiliateCode}
            affiliateCode={affiliateCode}
            onAffiliateCodeChange={setAffiliateCode}
          />
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

function PlansTab({
  plans,
  currentCode,
  monthlyDiscountEligible,
  period,
  onPeriodChange,
  companyName,
  customerName,
  customerEmail,
  loading,
  showAttendanceRequest,
  showAffiliateCode,
  affiliateCode,
  onAffiliateCodeChange,
}: {
  plans: PlanDefinition[];
  currentCode?: string;
  monthlyDiscountEligible: boolean;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
  companyName: string;
  customerName: string;
  customerEmail?: string;
  loading: boolean;
  showAttendanceRequest: boolean;
  showAffiliateCode: boolean;
  affiliateCode: string;
  onAffiliateCodeChange: (code: string) => void;
}) {
  return (
    <section className="space-y-5 pb-5">
      {showAffiliateCode ? (
        <AffiliateCodeInput
          value={affiliateCode}
          onChange={onAffiliateCodeChange}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[var(--color-text)]">
          Planes disponibles
        </h2>
        <div className="grid h-10 grid-cols-2 rounded-[12px] bg-[var(--color-input-bg)] p-1">
          {(["monthly", "annual"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPeriodChange(item)}
              className={cn(
                "min-w-24 rounded-[9px] px-3 text-sm font-semibold",
                period === item
                  ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-muted-foreground)]",
              )}
            >
              {item === "monthly" ? "Mensual" : "Anual"}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-3 px-3 sm:mx-0 sm:px-0 md:contents">
        <div className="flex gap-4 overflow-x-auto scrollbar-hidden pb-2 sm:gap-5 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-5">
          {loading && plans.length === 0
            ? Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[340px] w-[280px] shrink-0 animate-pulse rounded-[14px] bg-[var(--color-card)] sm:w-[300px] md:w-auto"
                />
              ))
            : plans.map((plan, index) => (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  current={plan.code === currentCode}
                  monthlyDiscountEligible={monthlyDiscountEligible}
                  period={period}
                  color={
                    ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6"][
                      index
                    ]
                  }
                  whatsappUrl={buildWhatsAppUrl({
                    plan,
                    period,
                    companyName,
                    customerName,
                    customerEmail,
                    monthlyDiscountEligible,
                    affiliateCode,
                  })}
                />
              ))}
        </div>
      </div>
      {showAttendanceRequest ? (
        <AttendanceRequestCard
          companyName={companyName}
          customerName={customerName}
          customerEmail={customerEmail}
          affiliateCode={affiliateCode}
        />
      ) : null}
    </section>
  );
}

function AttendanceRequestCard({
  companyName,
  customerName,
  customerEmail,
  affiliateCode,
}: {
  companyName: string;
  customerName: string;
  customerEmail?: string;
  affiliateCode?: string;
}) {
  const message = [
    "Hola, deseo agregar el servicio de asistencias a mi cuenta de Nuvex.",
    `Empresa: ${companyName}`,
    `Cliente: ${customerName}`,
    customerEmail ? `Correo: ${customerEmail}` : "",
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
  const href = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  return (
    <article className="flex flex-col gap-4 rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-base font-bold text-[var(--color-text)]">
          Solicitar plan de asistencia
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Agrega control de trabajadores, marcajes y puntos QR a tu empresa.
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#25d366] px-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        <Image
          src="/svg/redes-sociales/whatsapp.svg"
          alt=""
          width={18}
          height={18}
        />
        Solicitar por WhatsApp
      </a>
    </article>
  );
}

function PlanCard({
  plan,
  current,
  monthlyDiscountEligible,
  period,
  color,
  whatsappUrl,
}: {
  plan: PlanDefinition;
  current: boolean;
  monthlyDiscountEligible: boolean;
  period: BillingPeriod;
  color: string;
  whatsappUrl: string;
}) {
  const annual = period === "annual" && plan.code !== "prueba";
  const amount = annual
    ? plan.annualPrice
    : monthlyDiscountEligible
      ? plan.monthlyOfferPrice
      : plan.priceMonthly;
  const savings = annual
    ? Number(plan.priceMonthly) * 12 - Number(plan.annualPrice)
    : monthlyDiscountEligible
      ? Number(plan.priceMonthly) - Number(plan.monthlyOfferPrice)
      : 0;
  const discountPercent = annual
    ? plan.annualDiscountPercent
    : monthlyDiscountEligible
      ? plan.monthlyDiscountPercent
      : "0";
  const popular = plan.code === "emprendedor";
  const capabilities = [
    ["Tiendas", formatPlanLimit(plan.limits.branches), BuildingsIcon],
    ["Almacenes", formatPlanLimit(plan.limits.warehouses), StorefrontIcon],
    ["Usuarios", formatPlanLimit(plan.limits.users), UsersThreeIcon],
    ["Productos", formatPlanLimit(plan.limits.products), CubeIcon],
    ["Variantes", formatPlanLimit(plan.limits.variants), DatabaseIcon],
    [
      "Comprobantes",
      `${formatPlanLimit(plan.limits.documents)}${plan.code === "prueba" ? " / prueba" : " / mes"}`,
      FileTextIcon,
    ],
    [
      "Consultas DNI/RUC",
      `${formatPlanLimit(plan.limits.documentQueries)}${plan.code === "prueba" ? " / prueba" : " / mes"}`,
      ReceiptIcon,
    ],
    [
      "Imágenes de productos",
      formatBytes(plan.limits.storageBytes),
      DatabaseIcon,
    ],
  ] as const;
  const features = [
    ["Facturación electrónica", "comprobantes"],
    ["Ventas POS", "ventas-pos"],
    ["Caja", "caja"],
    ["Cotizaciones y clientes", "cotizaciones"],
    ["Catálogo, stock y Kardex", "stock-kardex"],
    ["Administración de usuarios", "usuarios"],
    ["Reportes de ventas y productos", "reportes-ventas"],
    ["Reporte de clientes", "reportes-clientes"],
    ["Reporte de usuarios", "reportes-usuarios"],
    ["GRE y conductores", "gre-remitente"],
  ] as const;

  return (
    <article
      className={cn(
        "relative flex shrink-0 w-[280px] flex-col rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)] ring-1 ring-[var(--color-border)] sm:w-[300px] md:w-auto md:min-h-[700px]",
        popular && "ring-2 ring-[var(--color-primary)]",
      )}
    >
      {popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-1 text-[10px] font-bold whitespace-nowrap text-white shadow-sm">
          Más popular
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-11 place-items-center rounded-[12px]"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <TagIcon size={20} weight="fill" />
        </span>
        {current ? (
          <span className="rounded-full bg-[#10b981]/10 px-3 py-1 text-[10px] font-bold text-[#059669]">
            Plan actual
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-lg font-bold text-[var(--color-text)]">
        {plan.name}
      </h3>
      <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--color-muted-foreground)]">
        {getPlanDescription(plan.code)}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-[var(--color-text)] text-fixed-2xl">
        {formatCurrency(amount)}
        <span className="ml-1 text-xs font-normal text-[var(--color-muted-foreground)]">
          {annual ? "/ año" : plan.code === "prueba" ? "" : "/ mes"}
        </span>
      </p>
      {annual ? (
        <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
          Equivale a {formatCurrency(String(Number(amount) / 12))} al mes
        </p>
      ) : null}

      {plan.code !== "prueba" && Number(discountPercent) > 0 ? (
        <div className="mt-3 rounded-[10px] bg-[#10b981]/10 px-3 py-2 text-xs text-[#059669]">
          <span className="font-bold">
            {formatPercent(discountPercent)} de oferta
          </span>
          {savings > 0 ? ` · Ahorras ${formatCurrency(String(savings))}` : ""}
        </div>
      ) : null}

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="mb-3 text-[10px] font-bold text-[var(--color-muted-foreground)]">
          CAPACIDAD INCLUIDA
        </p>
        <div className="space-y-2">
          {capabilities.map(([label, value, Icon]) => (
            <div key={label} className="flex items-center gap-2 text-[11px]">
              <Icon
                size={14}
                weight="fill"
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
              <span className="min-w-0 flex-1 text-[var(--color-muted-foreground)]">
                {label}
              </span>
              <span className="font-bold whitespace-nowrap text-[var(--color-text)]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="mb-3 text-[10px] font-bold text-[var(--color-muted-foreground)]">
          FUNCIONALIDADES
        </p>
        <div className="space-y-2">
          {features.map(([label, moduleKey]) => {
            const included = plan.moduleKeys.includes(moduleKey);
            const Icon = included ? CheckCircleIcon : XCircleIcon;
            return (
              <div
                key={label}
                className={cn(
                  "flex items-start gap-2 text-[11px] leading-4",
                  included
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-muted-foreground)]/55",
                )}
              >
                <Icon
                  size={14}
                  weight="fill"
                  className={cn(
                    "mt-px shrink-0",
                    included ? "text-[#10b981]" : "text-[#cbd5e1]",
                  )}
                />
                <span>{label}</span>
              </div>
            );
          })}
          <div className="flex items-start gap-2 text-[11px] leading-4 text-[var(--color-text)]">
            <CheckCircleIcon
              size={14}
              weight="fill"
              className="mt-px shrink-0 text-[#10b981]"
            />
            <span>
              {plan.code === "empresarial"
                ? "Soporte prioritario"
                : "Soporte estándar"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        {plan.code === "prueba" ? (
          <div className="flex h-11 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] text-sm font-bold text-[var(--color-muted-foreground)]">
            7 días de prueba
          </div>
        ) : (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-bold text-white transition-opacity hover:opacity-90",
              popular ? "bg-[var(--color-primary)]" : "bg-[#25d366]",
            )}
          >
            <Image
              src="/svg/redes-sociales/whatsapp.svg"
              alt=""
              width={18}
              height={18}
            />
            {current ? "Renovar por WhatsApp" : "Solicitar por WhatsApp"}
          </a>
        )}
      </div>
    </article>
  );
}

function formatPlanLimit(value: number | null) {
  return value === null ? "Ilimitado" : value.toLocaleString("es-PE");
}

function getPlanDescription(code: PlanDefinition["code"]) {
  return {
    prueba: "Conoce todas las funciones de Nuvex durante 7 días.",
    basico: "Para una tienda que empieza a ordenar sus ventas e inventario.",
    emprendedor: "Para negocios en crecimiento con equipo y más capacidad.",
    crecimiento: "Para operaciones consolidadas que necesitan control total.",
    empresarial: "Para empresas con alto volumen y múltiples tiendas.",
    pos_basico: "Para vender con POS e inventario.",
    asistencias_basico: "Plan anterior de asistencias.",
    asistencias_pro: "Plan anterior de asistencias.",
    completo_emprende: "Plan anterior combinado.",
    completo_empresa: "Plan anterior combinado.",
  }[code];
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
    return (
      <EmptyState
        icon={<DatabaseIcon size={42} weight="light" />}
        title="No se pudo cargar el consumo"
      />
    );
  }

  return (
    <section className="space-y-4 pb-5">
      {currentPlan.documentOverage.count > 0 ? (
        <div className="flex flex-col gap-3 rounded-[14px] bg-[#f59e0b]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[10px] bg-[#f59e0b]/15 text-[#d97706]">
              <WarningCircleIcon size={20} weight="fill" />
            </span>
            <div>
              <p className="text-sm font-circular-bold text-[var(--color-text)]">
                Comprobantes adicionales
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {currentPlan.documentOverage.count.toLocaleString("es-PE")}{" "}
                emitidos fuera de la cuota.
              </p>
            </div>
          </div>
          <p className="text-xl font-circular-bold text-[#d97706]">
            {formatCurrency(currentPlan.documentOverage.estimatedAmount)}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {usageItems.map((item) => (
          <UsageCard
            key={item.key}
            item={item}
            used={currentPlan.usage[item.key]}
            limit={currentPlan.effectiveLimits[item.key]}
            base={currentPlan.baseLimits[item.key]}
            additional={currentPlan.additionalLimits[item.key]}
          />
        ))}
      </div>
    </section>
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
                    <EmptyState
                      icon={<ReceiptIcon size={42} weight="light" />}
                      title="Aún no tienes comprobantes emitidos"
                    />
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
                              title={`Descargar ${kind.toUpperCase()}`}
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

function MetricCard({
  label,
  value,
  icon,
  color = "#ffffff",
  featured = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color?: string;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-[14px] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]",
        featured
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[var(--color-card)] text-[var(--color-text)]",
      )}
    >
      <span
        className="grid size-10 place-items-center rounded-[11px]"
        style={{
          backgroundColor: featured ? "rgba(255,255,255,.18)" : `${color}18`,
          color,
        }}
      >
        {icon}
      </span>
      <p
        className={cn(
          "mt-4 text-xs",
          featured ? "text-white/75" : "text-[var(--color-muted-foreground)]",
        )}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-circular-bold">{value}</p>
    </article>
  );
}

function UsageCard({
  item,
  used,
  limit,
  base,
  additional,
}: {
  item: UsageItem;
  used?: number | null;
  limit?: number | null;
  base?: number | null;
  additional?: number | null;
}) {
  const Icon = item.icon;
  const unlimited = limit === null;
  const safeUsed = Number.isFinite(used) ? Number(used) : 0;
  const safeLimit = Number.isFinite(limit) ? Number(limit) : 0;
  const safeBase = Number.isFinite(base) ? Number(base) : 0;
  const safeAdditional = Number.isFinite(additional) ? Number(additional) : 0;
  const percent =
    safeLimit > 0
      ? Math.min(100, (safeUsed / safeLimit) * 100)
      : safeUsed > 0
        ? 100
        : 0;
  const formatter =
    item.key === "storageBytes"
      ? formatBytes
      : (value: number) => value.toLocaleString("es-PE");
  return (
    <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-circular-bold text-[var(--color-text)]">
            {formatter(safeUsed)}{" "}
            <span className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              de {unlimited ? "Ilimitado" : formatter(safeLimit)}
            </span>
          </p>
        </div>
        <span
          className="grid size-10 place-items-center rounded-[11px]"
          style={{ backgroundColor: `${item.color}18`, color: item.color }}
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
      <div className="mt-3 flex justify-between text-[11px] text-[var(--color-muted-foreground)]">
        <span>{Math.round(percent)}% utilizado</span>
        {unlimited ? (
          <span>Sin limite</span>
        ) : safeAdditional > 0 ? (
          <span className="text-[#059669]">
            Base {formatter(safeBase)} + {formatter(safeAdditional)}
          </span>
        ) : null}
      </div>
    </article>
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

function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="text-center text-[var(--color-muted-foreground)]">
      <div className="mx-auto w-fit">{icon}</div>
      <p className="mt-2 text-sm font-circular-bold text-[var(--color-text)]">
        {title}
      </p>
    </div>
  );
}

function buildWhatsAppUrl({
  plan,
  period,
  companyName,
  customerName,
  customerEmail,
  monthlyDiscountEligible,
  affiliateCode,
}: {
  plan: PlanDefinition;
  period: BillingPeriod;
  companyName: string;
  customerName: string;
  customerEmail?: string;
  monthlyDiscountEligible: boolean;
  affiliateCode?: string;
}) {
  const annual = period === "annual";
  const total = annual
    ? plan.annualPrice
    : monthlyDiscountEligible
      ? plan.monthlyOfferPrice
      : plan.priceMonthly;
  const message = [
    "Hola, deseo solicitar un plan de Nuvex.",
    `Empresa: ${companyName}`,
    `Cliente: ${customerName}`,
    customerEmail ? `Correo: ${customerEmail}` : "",
    `Plan: ${plan.name}`,
    `Periodo: ${annual ? "Anual (12 meses)" : "Mensual (1 mes)"}`,
    `Total: ${formatCurrency(total)}`,
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

function getStatusLabel(status?: "trial" | "active" | "expired") {
  return status === "trial"
    ? "Prueba activa"
    : status === "active"
      ? "Activo"
      : status === "expired"
        ? "Vencido"
        : "Consultando";
}

function formatRemaining(days?: number | null, endsAt?: string | null) {
  if (days === null && !endsAt) return "Sin vencimiento";
  if (days === 0) return "Vencido";
  return `${days ?? 0} días`;
}

function formatReceiptType(type: PlatformReceipt["type"]) {
  return {
    nota_venta: "Nota de venta",
    boleta: "Boleta",
    factura: "Factura",
    nota_credito: "Nota de crédito",
  }[type];
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatPercent(value: string) {
  return `${Number(value).toLocaleString("es-PE", { maximumFractionDigits: 2 })}%`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo cargar la información.";
}

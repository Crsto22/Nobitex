"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  BuildingsIcon,
  CheckCircleIcon,
  CurrencyCircleDollarIcon,
  FileTextIcon,
  PencilSimpleIcon,
  StackIcon,
  StorefrontIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformAdminDashboardResponse,
  type PlatformPlanCode,
  type PlatformPlanPricing,
  type PlatformOveragePricing,
  type UpdatePlatformPlanPricingPayload,
  type UpdatePlatformPlanLimitsPayload,
} from "@/lib/api/platform-admin";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const planColors: Record<
  PlatformPlanCode,
  { text: string; soft: string; solid: string }
> = {
  prueba: {
    text: "text-[#2563eb]",
    soft: "bg-[#2563eb]/10",
    solid: "bg-[#2563eb]",
  },
  basico: {
    text: "text-[#0891b2]",
    soft: "bg-[#06b6d4]/10",
    solid: "bg-[#06b6d4]",
  },
  emprendedor: {
    text: "text-[#059669]",
    soft: "bg-[#10b981]/10",
    solid: "bg-[#10b981]",
  },
  crecimiento: {
    text: "text-[#d97706]",
    soft: "bg-[#f59e0b]/10",
    solid: "bg-[#f59e0b]",
  },
  empresarial: {
    text: "text-[#7c3aed]",
    soft: "bg-[#8b5cf6]/10",
    solid: "bg-[#8b5cf6]",
  },
};

export default function PlatformPlansPage() {
  const { showToast } = useSystemToast();
  const [plans, setPlans] = useState<PlatformPlanPricing[]>([]);
  const [dashboard, setDashboard] =
    useState<PlatformAdminDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlatformPlanPricing | null>(
    null,
  );
  const [editingLimits, setEditingLimits] =
    useState<PlatformPlanPricing | null>(null);
  const [overagePricing, setOveragePricing] =
    useState<PlatformOveragePricing | null>(null);
  const [editingOverage, setEditingOverage] = useState(false);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [catalog, dashboardResponse, overageResponse] = await Promise.all([
        platformAdminApi.findPlanPricing(),
        platformAdminApi.getDashboard(),
        platformAdminApi.getOveragePricing(),
      ]);
      setPlans(catalog);
      setDashboard(dashboardResponse);
      setOveragePricing(overageResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el catálogo de planes",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePricingUpdate = async (
    plan: PlatformPlanPricing,
    payload: UpdatePlatformPlanPricingPayload,
  ) => {
    setIsSaving(true);
    try {
      await platformAdminApi.updatePlanPricing(
        plan.code as Exclude<PlatformPlanCode, "prueba">,
        payload,
      );
      setEditingPlan(null);
      await loadPlans();
      showToast({
        title: "Tarifa actualizada",
        description: `Los nuevos precios de ${plan.name} ya están disponibles.`,
        variant: "success",
      });
    } catch (requestError) {
      const pricingChanged =
        requestError instanceof ApiError &&
        requestError.status === 409 &&
        (requestError.body as { code?: string } | null)?.code ===
          "PLAN_PRICING_CHANGED";
      if (pricingChanged) {
        setEditingPlan(null);
        await loadPlans();
      }
      showToast({
        title: pricingChanged
          ? "La tarifa cambió"
          : "No se pudo actualizar la tarifa",
        description: pricingChanged
          ? "Se recargaron los valores. Revisa y confirma nuevamente."
          : requestError instanceof Error
            ? requestError.message
            : "No se pudo completar la solicitud.",
        variant: pricingChanged ? "warning" : "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLimitsUpdate = async (
    plan: PlatformPlanPricing,
    payload: UpdatePlatformPlanLimitsPayload,
  ) => {
    setIsSaving(true);
    try {
      await platformAdminApi.updatePlanLimits(plan.code, payload);
      setEditingLimits(null);
      await loadPlans();
      showToast({
        title: "Límites actualizados",
        description: `Los nuevos límites de ${plan.name} ya están vigentes.`,
        variant: "success",
      });
    } catch (requestError) {
      const limitsChanged =
        requestError instanceof ApiError &&
        requestError.status === 409 &&
        (requestError.body as { code?: string } | null)?.code ===
          "PLAN_LIMITS_CHANGED";
      if (limitsChanged) {
        setEditingLimits(null);
        await loadPlans();
      }
      showToast({
        title: limitsChanged
          ? "Los límites cambiaron"
          : "No se pudieron actualizar los límites",
        description: limitsChanged
          ? "Se recargaron los valores. Revisa y confirma nuevamente."
          : requestError instanceof Error
            ? requestError.message
            : "No se pudo completar la solicitud.",
        variant: limitsChanged ? "warning" : "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadPlans(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadPlans]);

  const planCounts = useMemo(
    () =>
      new Map(
        (dashboard?.planDistribution ?? []).map((item) => [
          item.code,
          item.count,
        ]),
      ),
    [dashboard],
  );
  const activeCompanies = Array.from(planCounts.values()).reduce(
    (total, count) => total + count,
    0,
  );
  const mostUsedPlan = (dashboard?.planDistribution ?? []).reduce<
    PlatformAdminDashboardResponse["planDistribution"][number] | null
  >(
    (current, item) =>
      !current || item.count > current.count ? item : current,
    null,
  );

  return (
    <DashboardShell headerTitle="Catálogo de planes">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-5 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={loadPlans}
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<StackIcon size={20} weight="bold" />}
            label="Planes disponibles"
            value={plans.length.toLocaleString("es-PE")}
            tone="dark"
          />
          <MetricCard
            icon={<BuildingsIcon size={20} weight="bold" />}
            label="Empresas activas"
            value={activeCompanies.toLocaleString("es-PE")}
            tone="primary"
          />
          <MetricCard
            icon={<CurrencyCircleDollarIcon size={20} weight="bold" />}
            label="Cobrado este mes"
            value={formatCurrency(dashboard?.summary.totalCollected ?? "0")}
            tone="warning"
          />
          <MetricCard
            icon={<StorefrontIcon size={20} weight="bold" />}
            label="Plan con más empresas"
            value={mostUsedPlan?.name ?? "Sin datos"}
            tone="info"
          />
        </section>

        {overagePricing ? (
          <section className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/10 text-[#d97706]">
                <FileTextIcon size={21} weight="fill" />
              </span>
              <div>
                <p className="font-circular-bold text-[var(--color-text)]">
                  Comprobante adicional
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Tarifa global: {formatCurrency(overagePricing.unitPrice)} por
                  unidad · IGV incluido
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingOverage(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]"
            >
              <PencilSimpleIcon size={16} weight="bold" /> Editar tarifa
            </button>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        ) : null}

        {isLoading && plans.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-sm"
              />
            ))}
          </div>
        ) : (
          <section className="space-y-3 pb-2 pr-1">
            {plans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                companyCount={planCounts.get(plan.code) ?? 0}
                totalCompanies={activeCompanies}
              />
            ))}
          </section>
        )}

        {editingPlan ? (
          <PricingModal
            plan={editingPlan}
            isSaving={isSaving}
            onClose={() => setEditingPlan(null)}
            onSubmit={(payload) => handlePricingUpdate(editingPlan, payload)}
          />
        ) : null}
        {editingLimits ? (
          <LimitsModal
            plan={editingLimits}
            isSaving={isSaving}
            onClose={() => setEditingLimits(null)}
            onSubmit={(payload) => handleLimitsUpdate(editingLimits, payload)}
          />
        ) : null}
        {editingOverage && overagePricing ? (
          <OveragePricingModal
            pricing={overagePricing}
            isSaving={isSaving}
            onClose={() => setEditingOverage(false)}
            onSubmit={async (unitPrice) => {
              setIsSaving(true);
              try {
                await platformAdminApi.updateOveragePricing({
                  unitPrice,
                  expectedUpdatedAt: overagePricing.updatedAt,
                });
                setEditingOverage(false);
                await loadPlans();
                showToast({
                  title: "Tarifa actualizada",
                  description:
                    "El nuevo precio se aplicará solo a comprobantes futuros.",
                  variant: "success",
                });
              } catch (requestError) {
                showToast({
                  title: "No se pudo actualizar",
                  description:
                    requestError instanceof Error
                      ? requestError.message
                      : "Revisa los datos.",
                  variant: "error",
                });
              } finally {
                setIsSaving(false);
              }
            }}
          />
        ) : null}
      </div>
    </DashboardShell>
  );
}

function OveragePricingModal({
  pricing,
  isSaving,
  onClose,
  onSubmit,
}: {
  pricing: PlatformOveragePricing;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (unitPrice: string) => Promise<void>;
}) {
  const [value, setValue] = useState(pricing.unitPrice);
  const valid =
    Number.isFinite(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= 999999.99;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 animate-in fade-in duration-200 sm:items-center sm:p-4"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void onSubmit(Number(value).toFixed(2));
        }}
        className="w-full max-w-md rounded-t-2xl bg-[var(--color-card)] p-5 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-circular-bold text-[var(--color-text)]">
              Tarifa por excedente
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Afectará únicamente comprobantes adicionales futuros.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-input-bg)]"
          >
            <XIcon size={16} />
          </button>
        </div>
        <label className="mt-5 grid gap-1.5 text-sm text-[var(--color-text)]">
          <span className="font-circular-bold">
            Precio por comprobante (S/)
          </span>
          <input
            type="number"
            min="0"
            max="999999.99"
            step="0.01"
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          PEN · IGV incluido
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!valid || isSaving}
            className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PlanCard({
  plan,
  companyCount,
  totalCompanies,
}: {
  plan: PlatformPlanPricing;
  companyCount: number;
  totalCompanies: number;
}) {
  const colors = planColors[plan.code];
  const share = totalCompanies > 0 ? (companyCount / totalCompanies) * 100 : 0;
  const limits = [
    `${plan.limits.users.toLocaleString("es-PE")} usuarios`,
    `${plan.limits.branches.toLocaleString("es-PE")} sucursales`,
    `${plan.limits.products.toLocaleString("es-PE")} productos`,
    `${plan.limits.variants.toLocaleString("es-PE")} variantes`,
    `${plan.limits.documents.toLocaleString("es-PE")} comprobantes`,
    `${plan.limits.documentQueries.toLocaleString("es-PE")} consultas DNI/RUC`,
    `${formatBytes(plan.limits.storageBytes)} imágenes`,
  ];

  return (
    <article className="grid grid-cols-1 gap-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(190px,1.35fr)_minmax(130px,0.8fr)_minmax(170px,1fr)_minmax(170px,1.2fr)_minmax(135px,0.85fr)_120px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            colors.soft,
            colors.text,
          )}
        >
          <CheckCircleIcon size={23} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-circular-bold text-[var(--color-text)]">
            {plan.name}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {plan.trialDays
              ? `${plan.trialDays} días de prueba`
              : `${plan.moduleKeys.length} módulos incluidos`}
          </p>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Precio mensual
        </p>
        <p className="text-lg font-circular-bold text-[var(--color-text)]">
          {formatCurrency(plan.monthlyOfferPrice)}
        </p>
        {Number(plan.monthlyDiscountPercent) > 0 ? (
          <p className="text-xs text-[#059669]">
            Lista {formatCurrency(plan.priceMonthly)} · -
            {formatPercent(plan.monthlyDiscountPercent)}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Oferta anual
        </p>
        {plan.code === "prueba" ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No aplica
          </p>
        ) : (
          <>
            <p className="text-sm font-circular-bold text-[var(--color-text)]">
              {formatCurrency(plan.annualPrice)}
            </p>
            <p className="text-xs text-[#059669]">
              {Number(plan.annualDiscountPercent) > 0
                ? `Ahorro ${formatPercent(plan.annualDiscountPercent)}`
                : "Sin descuento"}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {limits.map((limit) => (
          <span
            key={limit}
            className="rounded-lg bg-[var(--color-input-bg)] px-2 py-1 text-[10px] text-[var(--color-muted-foreground)]"
          >
            {limit}
          </span>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Empresas activas
          </p>
          <p className="text-sm font-circular-bold text-[var(--color-text)]">
            {companyCount}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-input-bg)]">
          <div
            className={cn("h-full rounded-full", colors.solid)}
            style={{ width: `${Math.min(100, share)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
          {formatPricingUpdate(plan)}
        </p>
      </div>

      <div className="grid gap-2">
        <Link
          href={`/superadmin/planes/${plan.code}`}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white"
        >
          <PencilSimpleIcon size={15} weight="bold" /> Editar plan
        </Link>
      </div>
    </article>
  );
}

function LimitsModal({
  plan,
  isSaving,
  onClose,
  onSubmit,
}: {
  plan: PlatformPlanPricing;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdatePlatformPlanLimitsPayload) => Promise<void>;
}) {
  const [values, setValues] = useState({
    users: String(plan.limits.users),
    branches: String(plan.limits.branches),
    warehouses: String(plan.limits.warehouses ?? 5),
    products: String(plan.limits.products),
    variants: String(plan.limits.variants),
    documents: String(plan.limits.documents),
    documentQueries: String(plan.limits.documentQueries),
    storageMb: String(plan.limits.storageBytes / (1024 * 1024)),
  });
  const [warehousesUnlimited, setWarehousesUnlimited] = useState(
    plan.limits.warehouses === null,
  );
  const fields = [
    ["users", "Usuarios", 1, 1_000_000],
    ["branches", "Sucursales", 1, 1_000_000],
    ["warehouses", "Almacenes", 0, 1_000_000],
    ["products", "Productos", 0, 1_000_000_000],
    ["variants", "Variantes", 0, 1_000_000_000],
    ["documents", "Comprobantes", 0, 1_000_000_000],
    ["documentQueries", "Consultas DNI/RUC", 0, 1_000_000_000],
    ["storageMb", "Almacenamiento (MB)", 0, 953_674_316],
  ] as const;
  const parsed = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, Number(value)]),
  ) as Record<keyof typeof values, number>;
  const isValid = fields.every(
    ([key, , min, max]) =>
      (key === "warehouses" && warehousesUnlimited) ||
      (Number.isInteger(parsed[key]) && parsed[key] >= min && parsed[key] <= max),
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    void onSubmit({
      users: parsed.users,
      branches: parsed.branches,
      warehouses: warehousesUnlimited ? null : parsed.warehouses,
      products: parsed.products,
      variants: parsed.variants,
      documents: parsed.documents,
      documentQueries: parsed.documentQueries,
      storageBytes: parsed.storageMb * 1024 * 1024,
      expectedUpdatedAt: plan.limitsUpdatedAt,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="limits-modal-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 animate-in fade-in duration-200 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-t-2xl bg-[var(--color-card)] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2
              id="limits-modal-title"
              className="text-lg font-circular-bold text-[var(--color-text)]"
            >
              Editar límites de {plan.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Capacidad base incluida en este plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-input-bg)]"
          >
            <XIcon size={17} weight="bold" />
          </button>
        </div>
        <form onSubmit={submit} className="grid gap-5 p-5">
          <div className="flex gap-3 rounded-xl bg-[#f59e0b]/10 p-3 text-sm text-[var(--color-text)]">
            <WarningCircleIcon
              size={20}
              weight="fill"
              className="mt-0.5 shrink-0 text-[#d97706]"
            />
            <p>
              El cambio se aplicará inmediatamente a todas las empresas actuales
              y futuras de este plan.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([key, label, min, max]) => {
              const disabled = key === "warehouses" && warehousesUnlimited;
              return (
              <label
                key={key}
                className="grid gap-1.5 text-sm text-[var(--color-text)]"
              >
                <span className="font-circular-bold">{label}</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  step="1"
                  required={!disabled}
                  disabled={disabled}
                  value={disabled ? "" : values[key]}
                  placeholder={disabled ? "Ilimitado" : undefined}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 outline-none focus:border-[var(--color-primary)]"
                />
              </label>
              );
            })}
          </div>
          <label className="flex items-center justify-between rounded-xl bg-[var(--color-input-bg)] p-3 text-sm font-circular-bold text-[var(--color-text)]">
            Almacenes ilimitados
            <input
              type="checkbox"
              checked={warehousesUnlimited}
              onChange={(event) => setWarehousesUnlimited(event.target.checked)}
              className="size-4 accent-[var(--color-primary)]"
            />
          </label>
          {!isValid ? (
            <p className="text-sm text-[#dc2626]">
              Todos los límites deben ser números enteros dentro del rango
              permitido.
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !isValid}
              className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar límites"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function PricingModal({
  plan,
  isSaving,
  onClose,
  onSubmit,
}: {
  plan: PlatformPlanPricing;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdatePlatformPlanPricingPayload) => Promise<void>;
}) {
  const [monthlyPrice, setMonthlyPrice] = useState(plan.priceMonthly);
  const [monthlyDiscount, setMonthlyDiscount] = useState(
    plan.monthlyDiscountPercent,
  );
  const [annualDiscount, setAnnualDiscount] = useState(
    plan.annualDiscountPercent,
  );
  const monthly = Number(monthlyPrice);
  const monthlyDiscountValue = Number(monthlyDiscount);
  const annualDiscountValue = Number(annualDiscount);
  const monthlySavings = (monthly * monthlyDiscountValue) / 100;
  const monthlyTotal = monthly - monthlySavings;
  const listAmount = monthly * 12;
  const annualSavings = (listAmount * annualDiscountValue) / 100;
  const annualTotal = listAmount - annualSavings;
  const isValid =
    Number.isFinite(monthly) &&
    monthly >= 1 &&
    monthly <= 999_999.99 &&
    Number.isFinite(monthlyDiscountValue) &&
    monthlyDiscountValue >= 0 &&
    monthlyDiscountValue <= 50 &&
    Number.isFinite(annualDiscountValue) &&
    annualDiscountValue >= 0 &&
    annualDiscountValue <= 50;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    void onSubmit({
      priceMonthly: monthly.toFixed(2),
      monthlyDiscountPercent: monthlyDiscountValue.toFixed(2),
      annualDiscountPercent: annualDiscountValue.toFixed(2),
      expectedUpdatedAt: plan.pricingUpdatedAt,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 animate-in fade-in duration-200 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-t-2xl bg-[var(--color-card)] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2
              id="pricing-modal-title"
              className="text-lg font-circular-bold text-[var(--color-text)]"
            >
              Editar tarifa de {plan.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Los cambios se aplicarán únicamente a ventas futuras.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cerrar"
            title="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-text)]"
          >
            <XIcon size={17} weight="bold" />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-5 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
              <span className="font-circular-bold">Precio mensual</span>
              <div className="flex h-11 items-center rounded-xl bg-[var(--color-input-bg)] px-3 focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
                <span className="mr-2 text-[var(--color-muted-foreground)]">
                  S/
                </span>
                <input
                  required
                  inputMode="decimal"
                  value={monthlyPrice}
                  onChange={(event) => setMonthlyPrice(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Entre S/1.00 y S/999,999.99
              </span>
            </label>

            <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
              <span className="font-circular-bold">Descuento por 1 mes</span>
              <div className="flex h-11 items-center rounded-xl bg-[var(--color-input-bg)] px-3 focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
                <input
                  required
                  inputMode="decimal"
                  value={monthlyDiscount}
                  onChange={(event) => setMonthlyDiscount(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
                <span className="ml-2 text-[var(--color-muted-foreground)]">
                  %
                </span>
              </div>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Entre 0% y 50%
              </span>
            </label>

            <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
              <span className="font-circular-bold">Descuento anual</span>
              <div className="flex h-11 items-center rounded-xl bg-[var(--color-input-bg)] px-3 focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
                <input
                  required
                  inputMode="decimal"
                  value={annualDiscount}
                  onChange={(event) => setAnnualDiscount(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
                <span className="ml-2 text-[var(--color-muted-foreground)]">
                  %
                </span>
              </div>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Entre 0% y 50%
              </span>
            </label>
          </div>

          <div className="grid gap-3 rounded-xl bg-[var(--color-input-bg)] p-4 sm:grid-cols-3">
            <PricingPreview
              label="Total por 1 mes"
              value={monthlyTotal}
              strong
            />
            <PricingPreview
              label="Ahorro mensual"
              value={monthlySavings}
              tone="success"
            />
            <PricingPreview label="Precio normal anual" value={listAmount} />
            <PricingPreview
              label="Ahorro anual"
              value={annualSavings}
              tone="success"
            />
            <PricingPreview label="Total anual" value={annualTotal} strong />
            <PricingPreview
              label="Equivalente mensual"
              value={annualTotal / 12}
              strong
            />
          </div>

          {!isValid ? (
            <p className="text-sm text-[#dc2626]">
              Revisa que el precio y el descuento estén dentro de los límites.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !isValid}
              className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar tarifa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PricingPreview({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number;
  tone?: "success";
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm text-[var(--color-text)]",
          strong && "font-circular-bold",
          tone === "success" && "font-circular-bold text-[#059669]",
        )}
      >
        {formatCurrency(String(Number.isFinite(value) ? value : 0))}
      </p>
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
  value: string;
  tone: "dark" | "primary" | "warning" | "info";
}) {
  const iconColors = {
    dark: "bg-[#334155]/10 text-[#334155] dark:text-[#94a3b8]",
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    warning: "bg-[#fff7ed] text-[#f59e0b]",
    info: "bg-[#eff6ff] text-[#3b82f6]",
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
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
          {label}
        </p>
        <p className="mt-1 truncate text-xl leading-none font-circular-bold text-[var(--color-text)]">
          {value}
        </p>
      </div>
    </article>
  );
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function formatPercent(value: string) {
  return `${Number(value).toLocaleString("es-PE", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatPricingUpdate(plan: PlatformPlanPricing) {
  if (!plan.updatedBy) return "Tarifa inicial";
  return `${plan.updatedBy.name} · ${new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(plan.pricingUpdatedAt))}`;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(0)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(0)} GB`;
}

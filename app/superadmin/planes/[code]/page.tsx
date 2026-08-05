"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircleIcon,
  CurrencyCircleDollarIcon,
  GaugeIcon,
  MinusIcon,
  PlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformPlanCode,
  type PlatformPlanPricing,
  type UpdatePlatformPlanLimitsPayload,
  type UpdatePlatformPlanPricingPayload,
} from "@/lib/api/platform-admin";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const planCodes: PlatformPlanCode[] = [
  "prueba",
  "basico",
  "emprendedor",
  "crecimiento",
  "empresarial",
];

const planColors: Record<PlatformPlanCode, string> = {
  prueba: "bg-[#2563eb]/10 text-[#2563eb]",
  basico: "bg-[#06b6d4]/10 text-[#0891b2]",
  emprendedor: "bg-[#10b981]/10 text-[#059669]",
  crecimiento: "bg-[#f59e0b]/10 text-[#d97706]",
  empresarial: "bg-[#8b5cf6]/10 text-[#7c3aed]",
};

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

export default function EditPlanPage() {
  const params = useParams<{ code: string }>();
  const { showToast } = useSystemToast();
  const code = params.code as PlatformPlanCode;
  const [plan, setPlan] = useState<PlatformPlanPricing | null>(null);
  const [tab, setTab] = useState<"pricing" | "limits">("pricing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!planCodes.includes(code)) throw new Error("Plan no encontrado");
      const catalog = await platformAdminApi.findPlanPricing();
      const selected = catalog.find((item) => item.code === code);
      if (!selected) throw new Error("Plan no encontrado");
      setPlan(selected);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el plan",
      );
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updatePricing = async (payload: UpdatePlatformPlanPricingPayload) => {
    if (!plan || plan.code === "prueba") return;
    setSaving(true);
    try {
      await platformAdminApi.updatePlanPricing(plan.code, payload);
      await load();
      showToast({
        title: "Tarifa actualizada",
        description: `La tarifa de ${plan.name} ya está disponible.`,
        variant: "success",
      });
    } catch (requestError) {
      const changed = isConflict(requestError, "PLAN_PRICING_CHANGED");
      if (changed) await load();
      showToast({
        title: changed ? "La tarifa cambió" : "No se pudo actualizar",
        description: changed
          ? "Se recargaron los valores. Revisa y confirma nuevamente."
          : getErrorMessage(requestError),
        variant: changed ? "warning" : "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateLimits = async (payload: UpdatePlatformPlanLimitsPayload) => {
    if (!plan) return;
    setSaving(true);
    try {
      await platformAdminApi.updatePlanLimits(plan.code, payload);
      await load();
      showToast({
        title: "Límites actualizados",
        description: `La capacidad de ${plan.name} ya está vigente.`,
        variant: "success",
      });
    } catch (requestError) {
      const changed = isConflict(requestError, "PLAN_LIMITS_CHANGED");
      if (changed) await load();
      showToast({
        title: changed ? "Los límites cambiaron" : "No se pudo actualizar",
        description: changed
          ? "Se recargaron los valores. Revisa y confirma nuevamente."
          : getErrorMessage(requestError),
        variant: changed ? "warning" : "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      headerTitle="Editar plan"
      headerParent={{
        label: "Catálogo de planes",
        href: "/superadmin/planes",
      }}
    >
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        {error ? (
          <div className="rounded-[14px] bg-[#ef4444]/10 p-4 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : loading || !plan ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-[14px] bg-[var(--color-card)]" />
            <div className="h-96 animate-pulse rounded-[14px] bg-[var(--color-card)]" />
          </div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-4">
            <section className="flex flex-col gap-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl",
                    planColors[plan.code],
                  )}
                >
                  <CheckCircleIcon size={23} weight="fill" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-circular-bold text-[var(--color-text)]">
                    {plan.name}
                  </h1>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {plan.code === "prueba"
                      ? `${plan.trialDays} días de prueba`
                      : `${plan.moduleKeys.length} módulos incluidos`}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-[var(--color-input-bg)] px-4 py-2 sm:text-right">
                <p className="text-[10px] text-[var(--color-muted-foreground)]">
                  Precio mensual
                </p>
                <p className="text-lg font-circular-bold text-[var(--color-text)]">
                  {formatCurrency(plan.priceMonthly)}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-2 rounded-[14px] bg-[var(--color-card)] p-1.5 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
              <TabButton
                active={tab === "pricing"}
                icon={<CurrencyCircleDollarIcon size={17} />}
                label="Tarifa"
                onClick={() => setTab("pricing")}
              />
              <TabButton
                active={tab === "limits"}
                icon={<GaugeIcon size={17} />}
                label="Límites"
                onClick={() => setTab("limits")}
              />
            </div>

            {tab === "pricing" ? (
              <PricingForm
                key={plan.pricingUpdatedAt}
                plan={plan}
                saving={saving}
                onSubmit={updatePricing}
              />
            ) : (
              <LimitsForm
                key={plan.limitsUpdatedAt}
                plan={plan}
                saving={saving}
                onSubmit={updateLimits}
              />
            )}
          </div>
        )}
      </main>
    </DashboardShell>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-circular-bold transition-colors",
        active
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-muted-foreground)]",
      )}
    >
      {icon} {label}
    </button>
  );
}

function PricingForm({
  plan,
  saving,
  onSubmit,
}: {
  plan: PlatformPlanPricing;
  saving: boolean;
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
  const annualList = monthly * 12;
  const annualSavings = (annualList * annualDiscountValue) / 100;
  const annualTotal = annualList - annualSavings;
  const valid =
    Number.isFinite(monthly) &&
    monthly >= 1 &&
    monthly <= 999_999.99 &&
    Number.isFinite(monthlyDiscountValue) &&
    monthlyDiscountValue >= 0 &&
    monthlyDiscountValue <= 50 &&
    Number.isFinite(annualDiscountValue) &&
    annualDiscountValue >= 0 &&
    annualDiscountValue <= 50;

  if (plan.code === "prueba") {
    return (
      <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#3b82f6]/10 text-[#2563eb]">
            <CurrencyCircleDollarIcon size={21} weight="fill" />
          </span>
          <div>
            <p className="font-circular-bold text-[var(--color-text)]">
              Tarifa fija
            </p>
            <p className="text-xl font-circular-bold text-[var(--color-primary)]">
              S/ 0.00
            </p>
          </div>
        </div>
      </section>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    void onSubmit({
      priceMonthly: monthly.toFixed(2),
      monthlyDiscountPercent: monthlyDiscountValue.toFixed(2),
      annualDiscountPercent: annualDiscountValue.toFixed(2),
      expectedUpdatedAt: plan.pricingUpdatedAt,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
          <span className="font-circular-bold">Precio mensual (S/)</span>
          <input
            required
            inputMode="decimal"
            value={monthlyPrice}
            onChange={(event) => setMonthlyPrice(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
          <span className="font-circular-bold">Descuento 1 mes (%)</span>
          <input
            required
            inputMode="decimal"
            value={monthlyDiscount}
            onChange={(event) => setMonthlyDiscount(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
          <span className="font-circular-bold">Descuento anual (%)</span>
          <input
            required
            inputMode="decimal"
            value={annualDiscount}
            onChange={(event) => setAnnualDiscount(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl bg-[var(--color-input-bg)] p-4 sm:grid-cols-3">
        <Amount label="Total por 1 mes" value={monthlyTotal} strong />
        <Amount label="Ahorro mensual" value={monthlySavings} success />
        <Amount label="Precio anual" value={annualList} />
        <Amount label="Ahorro anual" value={annualSavings} success />
        <Amount label="Total anual" value={annualTotal} strong />
        <Amount label="Equivalente mensual" value={annualTotal / 12} strong />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving || !valid}
          className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar tarifa"}
        </button>
      </div>
    </form>
  );
}

function LimitsForm({
  plan,
  saving,
  onSubmit,
}: {
  plan: PlatformPlanPricing;
  saving: boolean;
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
    ["users", "Usuarios", 1, 1_000_000, 1],
    ["branches", "Sucursales", 1, 1_000_000, 1],
    ["warehouses", "Almacenes", 0, 1_000_000, 1],
    ["products", "Productos", 0, 1_000_000_000, 50],
    ["variants", "Variantes", 0, 1_000_000_000, 100],
    ["documents", "Comprobantes", 0, 1_000_000_000, 50],
    ["documentQueries", "Consultas DNI/RUC", 0, 1_000_000_000, 50],
    ["storageMb", "Almacenamiento (MB)", 0, 953_674_316, 100],
  ] as const;
  const parsed = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, Number(value)]),
  ) as Record<keyof typeof values, number>;
  const valid = fields.every(
    ([key, , min, max]) =>
      (key === "warehouses" && warehousesUnlimited) ||
      Number.isInteger(parsed[key]) && parsed[key] >= min && parsed[key] <= max,
  );

  const setFieldValue = (
    key: keyof typeof values,
    value: number,
    min: number,
    max: number,
  ) => {
    setValues((current) => ({
      ...current,
      [key]: String(Math.min(max, Math.max(min, Math.round(value)))),
    }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
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
    <form
      onSubmit={submit}
      className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
    >
      <div className="mb-5 flex gap-3 rounded-xl bg-[#f59e0b]/10 p-3 text-sm text-[var(--color-text)]">
        <WarningCircleIcon
          size={20}
          weight="fill"
          className="shrink-0 text-[#d97706]"
        />
        Los cambios se aplican inmediatamente a todas las empresas del plan.
      </div>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[var(--color-input-bg)] p-3">
        <span className="text-sm font-circular-bold text-[var(--color-text)]">
          Capacidad de almacenes
        </span>
        <div className="flex rounded-xl bg-[var(--color-card)] p-1">
          {[
            { label: "Limitado", value: false },
            { label: "Ilimitado", value: true },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setWarehousesUnlimited(option.value)}
              className={cn(
                "h-8 rounded-lg px-3 text-xs font-circular-bold",
                warehousesUnlimited === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-muted-foreground)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([key, label, min, max, step]) => {
          const current = Number.isFinite(parsed[key]) ? parsed[key] : min;
          const disabled = key === "warehouses" && warehousesUnlimited;
          return (
            <article
              key={key}
              className="rounded-xl bg-[var(--color-input-bg)] p-3"
            >
              <label
                htmlFor={`limit-${key}`}
                className="text-sm font-circular-bold text-[var(--color-text)]"
              >
                {label}
              </label>
              <div className="mt-3 grid grid-cols-[40px_minmax(0,1fr)_40px] gap-2">
                <button
                  type="button"
                  title={`Reducir ${label}`}
                  aria-label={`Reducir ${label}`}
                  disabled={disabled || current <= min}
                  onClick={() => setFieldValue(key, current - step, min, max)}
                  className="grid h-10 place-items-center rounded-xl bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm disabled:opacity-40"
                >
                  <MinusIcon size={17} weight="bold" />
                </button>
                <input
                  id={`limit-${key}`}
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  required={!disabled}
                  disabled={disabled}
                  value={disabled ? "" : values[key]}
                  placeholder={disabled ? "Ilimitado" : undefined}
                  onChange={(event) =>
                    setValues((state) => ({
                      ...state,
                      [key]: event.target.value,
                    }))
                  }
                  className="h-10 min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-center text-sm font-circular-bold text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  title={`Aumentar ${label}`}
                  aria-label={`Aumentar ${label}`}
                  disabled={disabled || current >= max}
                  onClick={() => setFieldValue(key, current + step, min, max)}
                  className="grid h-10 place-items-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm disabled:opacity-40"
                >
                  <PlusIcon size={17} weight="bold" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving || !valid}
          className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar límites"}
        </button>
      </div>
    </form>
  );
}

function Amount({
  label,
  value,
  strong,
  success,
}: {
  label: string;
  value: number;
  strong?: boolean;
  success?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm text-[var(--color-text)]",
          strong && "font-circular-bold",
          success && "font-circular-bold text-[#059669]",
        )}
      >
        {formatCurrency(String(Number.isFinite(value) ? value : 0))}
      </p>
    </div>
  );
}

function isConflict(error: unknown, code: string) {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    (error.body as { code?: string } | null)?.code === code
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la solicitud.";
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

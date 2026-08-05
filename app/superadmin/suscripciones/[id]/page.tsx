"use client";

import { NativeSelect } from "@/components/ui/select";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  CreditCardIcon,
  FileTextIcon,
  StorefrontIcon,
  WarningCircleIcon,
  TagIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformCompany,
  type PlatformPlanCode,
  type PlatformSubscriptionPaymentMethod,
} from "@/lib/api/platform-admin";
import { plansApi, type PlanDefinition } from "@/lib/api/plans";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const durations = [1, 3, 6, 12] as const;
const methods: Array<{
  value: PlatformSubscriptionPaymentMethod;
  label: string;
}> = [
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito", label: "Deposito" },
  { value: "efectivo", label: "Efectivo" },
  { value: "otro", label: "Otro" },
];
const inputClass =
  "h-11 w-full rounded-xl bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";

export default function RenewSubscriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [company, setCompany] = useState<PlatformCompany | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [planCode, setPlanCode] =
    useState<Exclude<PlatformPlanCode, "prueba">>("basico");
  const [months, setMonths] = useState<(typeof durations)[number]>(1);
  const [paymentMethod, setPaymentMethod] =
    useState<PlatformSubscriptionPaymentMethod>("yape");
  const [paymentMethodOther, setPaymentMethodOther] = useState("");
  const [receiptType, setReceiptType] = useState<
    "nota_venta" | "boleta" | "factura"
  >("nota_venta");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [affiliateInfo, setAffiliateInfo] = useState<null | {
    code: string;
    discountPercent: string;
    commissionPercent: string;
    appliesDiscount: boolean;
  }>(null);
  const [affiliateError, setAffiliateError] = useState<string | null>(null);
  const [validatingAffiliate, setValidatingAffiliate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyResult, catalog] = await Promise.all([
        platformAdminApi.getCompany(params.id),
        plansApi.findAll(),
      ]);
      const paid = catalog.filter((plan) => plan.code !== "prueba");
      setCompany(companyResult);
      setAffiliateCode(
        companyResult.affiliate?.status === "activa"
          ? companyResult.affiliate.code
          : "",
      );
      setAffiliateInfo(
        companyResult.affiliate?.status === "activa"
          ? {
              code: companyResult.affiliate.code,
              discountPercent: "0.00",
              commissionPercent: companyResult.affiliate.commissionPercent,
              appliesDiscount: false,
            }
          : null,
      );
      setPlans(paid);
      setPlanCode(
        companyResult.planCode === "prueba"
          ? ((paid[0]?.code as Exclude<PlatformPlanCode, "prueba">) ?? "basico")
          : (companyResult.planCode as Exclude<PlatformPlanCode, "prueba">),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar la empresa",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedPlan = plans.find((plan) => plan.code === planCode);
  const pricing = useMemo(() => {
    const list = Number(selectedPlan?.priceMonthly ?? 0) * months;
    const percent =
      months === 1
        ? company?.monthlyDiscountEligible
          ? Number(selectedPlan?.monthlyDiscountPercent ?? 0)
          : 0
        : months === 12
          ? Number(selectedPlan?.annualDiscountPercent ?? 0)
          : 0;
    const discount = Math.round(list * (percent / 100) * 100) / 100;
    const subtotal = list - discount;
    const affiliatePercent = affiliateInfo?.appliesDiscount
      ? Number(affiliateInfo.discountPercent)
      : 0;
    const affiliateDiscount =
      Math.round(subtotal * (affiliatePercent / 100) * 100) / 100;
    const total = subtotal - affiliateDiscount;
    const commission =
      Math.round(
        total * (Number(affiliateInfo?.commissionPercent ?? 0) / 100) * 100,
      ) / 100;
    return {
      list,
      percent,
      discount,
      affiliatePercent,
      affiliateDiscount,
      total,
      commission,
    };
  }, [affiliateInfo, company?.monthlyDiscountEligible, months, selectedPlan]);
  const preview = company ? buildPreview(company, planCode, months) : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company || !selectedPlan) return;
    setSaving(true);
    try {
      await platformAdminApi.createSubscriptionSale({
        requestId: crypto.randomUUID(),
        empresaId: company.id,
        planCode,
        months,
        pricingUpdatedAt: selectedPlan.pricingUpdatedAt,
        paymentMethod,
        paymentMethodOther:
          paymentMethod === "otro" ? paymentMethodOther : undefined,
        receiptType,
        affiliateCode: affiliateInfo?.appliesDiscount
          ? affiliateInfo.code
          : undefined,
      });
      showToast({
        title: "Plan activado",
        description: `${company.name} tiene ${selectedPlan.name} hasta ${formatDate(preview!.resultingEndsAt)}.`,
        variant: "success",
      });
      router.push("/superadmin/suscripciones");
    } catch (requestError) {
      const changed =
        requestError instanceof ApiError &&
        requestError.status === 409 &&
        (requestError.body as { code?: string } | null)?.code ===
          "PLAN_PRICING_CHANGED";
      if (changed) await load();
      showToast({
        title: changed ? "La tarifa cambio" : "No se pudo activar el plan",
        description: changed
          ? "Se recargaron los precios. Revisa y confirma nuevamente."
          : requestError instanceof Error
            ? requestError.message
            : "No se pudo completar la solicitud.",
        variant: changed ? "warning" : "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const validateAffiliate = async () => {
    if (!company || !affiliateCode.trim()) return;
    setValidatingAffiliate(true);
    setAffiliateError(null);
    try {
      const result = await platformAdminApi.validateAffiliateCode(
        company.id,
        affiliateCode.trim(),
      );
      setAffiliateCode(result.code);
      setAffiliateInfo(result);
    } catch (requestError) {
      setAffiliateInfo(null);
      setAffiliateError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo validar el código",
      );
    } finally {
      setValidatingAffiliate(false);
    }
  };

  return (
    <DashboardShell
      headerTitle="Activar o renovar plan"
      headerParent={{
        label: "Suscripciones",
        href: "/superadmin/suscripciones",
      }}
    >
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        {error ? (
          <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : loading || !company ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-96 animate-pulse rounded-[14px] bg-[var(--color-card)]" />
            <div className="h-72 animate-pulse rounded-[14px] bg-[var(--color-card)]" />
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
          >
            <div className="space-y-4">
              <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white">
                    <StorefrontIcon size={20} weight="fill" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                      {company.name}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {company.document ?? "Sin documento"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Plan actual
                    </p>
                    <p className="text-sm font-circular-bold text-[var(--color-primary)]">
                      {company.planName}
                    </p>
                  </div>
                </div>
                {company.state !== "activa" ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-600">
                    <WarningCircleIcon size={17} /> La empresa no está activa.
                  </div>
                ) : null}
              </section>

              <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
                <p className="mb-3 text-sm font-circular-bold text-[var(--color-text)]">
                  Afiliación
                </p>
                {company.affiliate?.status === "interrumpida" ? (
                  <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700">
                    Afiliación finalizada. La empresa no puede aplicar otro
                    código.
                  </div>
                ) : company.affiliate?.status === "activa" ? (
                  <div className="flex items-center justify-between rounded-xl bg-[var(--color-input-bg)] p-3">
                    <div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Código vigente
                      </p>
                      <p className="font-circular-bold text-[var(--color-primary)]">
                        {company.affiliate.code}
                      </p>
                    </div>
                    <span className="text-xs font-circular-bold text-emerald-600">
                      {company.affiliate.commissionPercent}% comisión
                    </span>
                  </div>
                ) : company.affiliateEligible ? (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={affiliateCode}
                        onChange={(event) => {
                          setAffiliateCode(event.target.value.toUpperCase());
                          setAffiliateInfo(null);
                          setAffiliateError(null);
                        }}
                        className={inputClass}
                        maxLength={30}
                        placeholder="Código de afiliado"
                      />
                      <button
                        type="button"
                        disabled={validatingAffiliate || !affiliateCode.trim()}
                        onClick={() => void validateAffiliate()}
                        className="h-11 shrink-0 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white disabled:opacity-50"
                      >
                        {validatingAffiliate ? "Validando..." : "Validar"}
                      </button>
                    </div>
                    {affiliateInfo ? (
                      <div className="mt-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-700">
                        Código válido · {affiliateInfo.discountPercent}% de
                        descuento inicial · {affiliateInfo.commissionPercent}%
                        de comisión
                      </div>
                    ) : null}
                    {affiliateError ? (
                      <p className="mt-2 text-xs text-red-600">
                        {affiliateError}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Esta empresa ya realizó su primera compra sin código.
                  </p>
                )}
              </section>

              <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
                <p className="mb-3 text-sm font-circular-bold text-[var(--color-text)]">
                  Plan y duración
                </p>
                <label className="grid gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  Plan
                  <NativeSelect
                    className={inputClass}
                    value={planCode}
                    onChange={(event) =>
                      setPlanCode(event.target.value as typeof planCode)
                    }
                  >
                    {plans.map((plan) => (
                      <option key={plan.code} value={plan.code}>
                        {plan.name} · S/ {plan.priceMonthly}/mes
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {durations.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setMonths(duration)}
                      className={cn(
                        "h-10 rounded-xl text-xs font-circular-bold",
                        months === duration
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-input-bg)] text-[var(--color-text)]",
                      )}
                    >
                      {duration} {duration === 1 ? "mes" : "meses"}
                    </button>
                  ))}
                </div>
                {pricing.percent > 0 ? (
                  <div className="mt-3 rounded-xl bg-[#10b981]/10 px-3 py-2 text-xs font-circular-bold text-[#059669]">
                    {pricing.percent}% de descuento{" "}
                    {months === 1 ? "mensual" : "anual"} · ahorro S/{" "}
                    {pricing.discount.toFixed(2)}
                  </div>
                ) : null}
              </section>

              <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
                <p className="mb-3 text-sm font-circular-bold text-[var(--color-text)]">
                  Pago y comprobante
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                    Método de pago
                    <NativeSelect
                      className={inputClass}
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target
                            .value as PlatformSubscriptionPaymentMethod,
                        )
                      }
                    >
                      {methods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                  <label className="grid gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                    Comprobante
                    <NativeSelect
                      className={inputClass}
                      value={receiptType}
                      onChange={(event) =>
                        setReceiptType(event.target.value as typeof receiptType)
                      }
                    >
                      <option value="nota_venta">Nota de venta</option>
                      <option value="boleta">Boleta</option>
                      <option value="factura">Factura</option>
                    </NativeSelect>
                  </label>
                </div>
                {paymentMethod === "otro" ? (
                  <label className="mt-3 grid gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                    Descripción
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      className={inputClass}
                      value={paymentMethodOther}
                      onChange={(event) =>
                        setPaymentMethodOther(event.target.value)
                      }
                    />
                  </label>
                ) : null}
              </section>
            </div>

            <aside className="h-fit rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] xl:sticky xl:top-0">
              <p className="text-sm font-circular-bold text-[var(--color-text)]">
                Resumen
              </p>
              <div className="mt-4 space-y-3">
                <Summary
                  icon={<CreditCardIcon size={17} />}
                  label="Plan"
                  value={selectedPlan?.name ?? "-"}
                />
                <Summary
                  icon={<CalendarBlankIcon size={17} />}
                  label="Cobertura"
                  value={
                    preview
                      ? `${formatDate(preview.coverageStartsAt)} - ${formatDate(preview.coverageEndsAt)}`
                      : "-"
                  }
                />
                <Summary
                  icon={<FileTextIcon size={17} />}
                  label="Comprobante"
                  value={
                    receiptType === "nota_venta"
                      ? "Nota de venta"
                      : receiptType === "boleta"
                        ? "Boleta"
                        : "Factura"
                  }
                />
              </div>
              {affiliateInfo ? (
                <div className="mt-3">
                  <Summary
                    icon={<TagIcon size={17} />}
                    label="Afiliado"
                    value={`${affiliateInfo.code} · ${affiliateInfo.commissionPercent}%`}
                  />
                </div>
              ) : null}
              <div className="my-4 rounded-xl bg-[var(--color-input-bg)] p-3 text-sm">
                <p className="flex justify-between text-[var(--color-muted-foreground)]">
                  <span>Precio</span>
                  <span>S/ {pricing.list.toFixed(2)}</span>
                </p>
                {pricing.discount > 0 ? (
                  <p className="mt-2 flex justify-between text-[#059669]">
                    <span>Descuento</span>
                    <span>- S/ {pricing.discount.toFixed(2)}</span>
                  </p>
                ) : null}
                {pricing.affiliateDiscount > 0 ? (
                  <p className="mt-2 flex justify-between text-[#059669]">
                    <span>Descuento afiliado</span>
                    <span>- S/ {pricing.affiliateDiscount.toFixed(2)}</span>
                  </p>
                ) : null}
                <p className="mt-3 flex justify-between font-circular-bold text-[var(--color-text)]">
                  <span>Total con IGV</span>
                  <span>S/ {pricing.total.toFixed(2)}</span>
                </p>
                {affiliateInfo ? (
                  <p className="mt-2 flex justify-between text-xs text-[var(--color-muted-foreground)]">
                    <span>Comisión generada</span>
                    <span>S/ {pricing.commission.toFixed(2)}</span>
                  </p>
                ) : null}
              </div>
              <button
                disabled={
                  saving ||
                  company.state !== "activa" ||
                  !selectedPlan ||
                  Boolean(
                    affiliateCode.trim() &&
                    company.affiliateEligible &&
                    !affiliateInfo,
                  )
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-sm font-circular-bold text-white disabled:opacity-50"
              >
                <CheckCircleIcon size={18} />{" "}
                {saving ? "Procesando..." : "Confirmar"}
              </button>
            </aside>
          </form>
        )}
      </main>
    </DashboardShell>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[var(--color-primary)]">{icon}</span>
      <div>
        <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
        <p className="font-circular-bold">{value}</p>
      </div>
    </div>
  );
}

function buildPreview(
  company: PlatformCompany,
  planCode: Exclude<PlatformPlanCode, "prueba">,
  months: number,
) {
  const now = new Date();
  const currentEnd = company.endsAt ? new Date(company.endsAt) : null;
  const extendsCurrent =
    company.planCode === planCode && currentEnd && currentEnd > now;
  const coverageStartsAt = extendsCurrent ? currentEnd : now;
  return {
    coverageStartsAt,
    coverageEndsAt: addMonthsClamped(coverageStartsAt, months),
    resultingEndsAt: addMonthsClamped(coverageStartsAt, months),
  };
}

function addMonthsClamped(value: Date, months: number) {
  const result = new Date(value);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

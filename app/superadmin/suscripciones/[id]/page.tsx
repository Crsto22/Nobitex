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
  CheckCircleIcon,
  CreditCardIcon,
  FileTextIcon,
  MinusIcon,
  PlusIcon,
  QrCodeIcon,
  StorefrontIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  TagIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformCompany,
  type PlatformPlanCode,
  type PlatformAttendancePricing,
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
  const [attendancePricing, setAttendancePricing] =
    useState<PlatformAttendancePricing | null>(null);
  const [enablePos, setEnablePos] = useState(true);
  const [enableAttendance, setEnableAttendance] = useState(false);
  const [planCode, setPlanCode] =
    useState<Exclude<PlatformPlanCode, "prueba">>("basico");
  const [months, setMonths] = useState<(typeof durations)[number]>(1);
  const [attendanceEmployees, setAttendanceEmployees] = useState(3);
  const [attendanceQrPoints, setAttendanceQrPoints] = useState(1);
  const [attendanceMonths, setAttendanceMonths] =
    useState<(typeof durations)[number]>(1);
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
      const [companyResult, catalog, attendancePricingResult] =
        await Promise.all([
          platformAdminApi.getCompany(params.id),
          plansApi.findAll(),
          platformAdminApi.getAttendancePricing(),
        ]);
      const paid = catalog.filter((plan) => plan.code !== "prueba");
      setCompany(companyResult);
      setAttendancePricing(attendancePricingResult);
      setAttendanceEmployees(
        Math.max(3, companyResult.attendance?.effectiveEmployeesLimit ?? 3),
      );
      setAttendanceQrPoints(
        Math.max(1, companyResult.attendance?.effectiveQrPointsLimit ?? 1),
      );
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
    if (!enablePos) {
      return {
        list: 0,
        percent: 0,
        discount: 0,
        affiliatePercent: 0,
        affiliateDiscount: 0,
        total: 0,
        commission: 0,
      };
    }
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
    const total = list - discount;
    return {
      list,
      percent,
      discount,
      affiliatePercent: 0,
      affiliateDiscount: 0,
      total,
      commission: 0,
    };
  }, [company?.monthlyDiscountEligible, enablePos, months, selectedPlan]);
  const attendancePricingPreview = useMemo(() => {
    const monthly =
      attendanceEmployees * Number(attendancePricing?.employeeUnitPrice ?? 0) +
      attendanceQrPoints * Number(attendancePricing?.qrPointUnitPrice ?? 0);
    return {
      monthly,
      total: monthly * attendanceMonths,
      startsAt: new Date(),
      endsAt: addMonthsClamped(new Date(), attendanceMonths),
    };
  }, [
    attendanceEmployees,
    attendanceMonths,
    attendancePricing?.employeeUnitPrice,
    attendancePricing?.qrPointUnitPrice,
    attendanceQrPoints,
  ]);
  const preview =
    company && enablePos ? buildPreview(company, planCode, months) : null;
  const attendanceTotal = enableAttendance ? attendancePricingPreview.total : 0;
  const checkoutSubtotal = pricing.total + attendanceTotal;
  const checkoutAffiliatePercent = affiliateInfo?.appliesDiscount
    ? Number(affiliateInfo.discountPercent)
    : 0;
  const checkoutAffiliateDiscount =
    Math.round(checkoutSubtotal * (checkoutAffiliatePercent / 100) * 100) / 100;
  const checkoutTotal = checkoutSubtotal - checkoutAffiliateDiscount;
  const checkoutCommission =
    Math.round(
      checkoutTotal * (Number(affiliateInfo?.commissionPercent ?? 0) / 100) * 100,
    ) / 100;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company || (!enablePos && !enableAttendance)) return;
    if (enablePos && !selectedPlan) return;
    setSaving(true);
    try {
      await platformAdminApi.createSubscriptionCheckout({
        requestId: crypto.randomUUID(),
        empresaId: company.id,
        paymentMethod,
        paymentMethodOther:
          paymentMethod === "otro" ? paymentMethodOther : undefined,
        receiptType,
        affiliateCode: affiliateInfo?.code,
        pos: enablePos
          ? {
              planCode,
              months,
              pricingUpdatedAt: selectedPlan!.pricingUpdatedAt,
            }
          : undefined,
        attendance: enableAttendance
          ? {
              employeesLimit: attendanceEmployees,
              qrPointsLimit: attendanceQrPoints,
              period: attendanceMonths === 12 ? "anual" : "mensual",
              months: attendanceMonths,
            }
          : undefined,
      });
      showToast({
        title: "Suscripción activada",
        description: `${company.name} tiene la suscripción registrada.`,
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
        title: changed ? "La tarifa cambio" : "No se pudo activar",
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
      headerTitle="Activar suscripción"
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
                  Productos
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleCard
                    icon={<CreditCardIcon size={18} />}
                    title="POS"
                    description="Plan de ventas, inventario y facturación."
                    checked={enablePos}
                    onChange={setEnablePos}
                  />
                  <ToggleCard
                    icon={<UsersThreeIcon size={18} />}
                    title="Asistencias"
                    description="Trabajadores, marcaciones y puntos QR."
                    checked={enableAttendance}
                    onChange={setEnableAttendance}
                  />
                </div>
                {!enablePos && !enableAttendance ? (
                  <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-600">
                    Selecciona POS, Asistencias o ambos para continuar.
                  </p>
                ) : null}
              </section>

              {enablePos || enableAttendance ? (
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
                        aria-label="Código de afiliado"
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
              ) : null}

              {enablePos ? (
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
              ) : null}

              {enableAttendance ? (
                <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
                  <p className="mb-3 text-sm font-circular-bold text-[var(--color-text)]">
                    Asistencias
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StepperField
                      label="Trabajadores"
                      value={attendanceEmployees}
                      min={1}
                      onChange={setAttendanceEmployees}
                    />
                    <StepperField
                      label="Puntos QR"
                      value={attendanceQrPoints}
                      min={1}
                      onChange={setAttendanceQrPoints}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {durations.map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => setAttendanceMonths(duration)}
                        className={cn(
                          "h-10 rounded-xl text-xs font-circular-bold",
                          attendanceMonths === duration
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--color-input-bg)] text-[var(--color-text)]",
                        )}
                      >
                        {duration} {duration === 1 ? "mes" : "meses"}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl bg-[var(--color-input-bg)] p-3 text-xs text-[var(--color-muted-foreground)]">
                    S/ {attendancePricing?.employeeUnitPrice ?? "0.00"} por
                    trabajador · S/ {attendancePricing?.qrPointUnitPrice ?? "0.00"}{" "}
                    por punto QR · vence {formatDate(attendancePricingPreview.endsAt)}
                  </div>
                </section>
              ) : null}

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
                {enablePos ? (
                  <Summary
                    icon={<CreditCardIcon size={17} />}
                    label="POS"
                    value={`${selectedPlan?.name ?? "-"} · S/ ${pricing.total.toFixed(2)}`}
                  />
                ) : null}
                {enableAttendance ? (
                  <Summary
                    icon={<QrCodeIcon size={17} />}
                    label="Asistencias"
                    value={`${attendanceEmployees} trabajadores · ${attendanceQrPoints} QR · S/ ${attendancePricingPreview.total.toFixed(2)}`}
                  />
                ) : null}
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
              <div className="mt-4 space-y-2 rounded-xl bg-[var(--color-input-bg)] p-3 text-xs">
                {enablePos ? (
                  <CoverageRow
                    label="Cobertura POS"
                    value={
                      preview
                        ? `${formatDate(preview.coverageStartsAt)} - ${formatDate(preview.coverageEndsAt)}`
                        : "-"
                    }
                  />
                ) : null}
                {enableAttendance ? (
                  <CoverageRow
                    label="Cobertura Asistencias"
                    value={`${formatDate(attendancePricingPreview.startsAt)} - ${formatDate(attendancePricingPreview.endsAt)}`}
                  />
                ) : null}
              </div>
              <div className="my-4 space-y-2 rounded-xl bg-[var(--color-input-bg)] p-3 text-sm">
                <p className="flex justify-between text-[var(--color-muted-foreground)]">
                  <span>Subtotal POS</span>
                  <span>S/ {pricing.total.toFixed(2)}</span>
                </p>
                {pricing.discount > 0 ? (
                  <p className="flex justify-between text-[#059669]">
                    <span>Descuento POS</span>
                    <span>- S/ {pricing.discount.toFixed(2)}</span>
                  </p>
                ) : null}
                {checkoutAffiliateDiscount > 0 ? (
                  <p className="flex justify-between text-[#059669]">
                    <span>Descuento afiliado</span>
                    <span>- S/ {checkoutAffiliateDiscount.toFixed(2)}</span>
                  </p>
                ) : null}
                <p className="flex justify-between text-[var(--color-muted-foreground)]">
                  <span>Subtotal Asistencias</span>
                  <span>S/ {attendanceTotal.toFixed(2)}</span>
                </p>
                <p className="mt-3 flex justify-between border-t border-[var(--color-border)] pt-3 font-circular-bold text-[var(--color-text)]">
                  <span>Total con IGV</span>
                  <span>S/ {checkoutTotal.toFixed(2)}</span>
                </p>
                {affiliateInfo ? (
                  <p className="mt-2 flex justify-between text-xs text-[var(--color-muted-foreground)]">
                    <span>Comisión generada</span>
                    <span>S/ {checkoutCommission.toFixed(2)}</span>
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={
                  saving ||
                  company.state !== "activa" ||
                  (!enablePos && !enableAttendance) ||
                  (enablePos && !selectedPlan) ||
                  Boolean(
                    enablePos &&
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

function CoverageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-right font-circular-bold text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

function StepperField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  const setSafeValue = (next: number) =>
    onChange(Math.max(min, Math.trunc(next || min)));

  return (
    <label className="grid gap-1.5 text-xs text-[var(--color-muted-foreground)]">
      {label}
      <div className="flex h-11 overflow-hidden rounded-xl bg-[var(--color-input-bg)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20">
        <button
          type="button"
          onClick={() => setSafeValue(value - 1)}
          disabled={value <= min}
          className="grid w-11 shrink-0 place-items-center text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-sidebar-hover)] disabled:opacity-40"
          aria-label={`Reducir ${label.toLowerCase()}`}
        >
          <MinusIcon size={16} />
        </button>
        <input
          type="number"
          min={min}
          step="1"
          value={value}
          onChange={(event) => setSafeValue(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent px-2 text-center text-sm font-circular-bold text-[var(--color-text)] outline-none"
        />
        <button
          type="button"
          onClick={() => setSafeValue(value + 1)}
          className="grid w-11 shrink-0 place-items-center text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-sidebar-hover)]"
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          <PlusIcon size={16} />
        </button>
      </div>
    </label>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        checked
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
          : "border-[var(--color-border)] bg-[var(--color-input-bg)]",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          checked
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-card)] text-[var(--color-muted-foreground)]",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-circular-bold text-[var(--color-text)]">
          {title}
        </span>
        <span className="mt-1 block text-xs text-[var(--color-muted-foreground)]">
          {description}
        </span>
      </span>
    </button>
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowSquareOutIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  CreditCardIcon,
  SpinnerGapIcon,
  TrashIcon,
  UserIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  accountsReceivableApi,
  type Receivable,
} from "@/lib/api/accounts-receivable";
import { branchesApi, type Branch } from "@/lib/api/branches";
import {
  paymentMethodsApi,
  type PaymentMethod,
} from "@/lib/api/payment-methods";
import { cn } from "@/lib/utils";

type Props = {
  publicId: string | null;
  onClose: () => void;
  onChanged: (account: Receivable) => void;
  variant?: "drawer" | "page";
};

const statusLabels = {
  pendiente: "Pendiente",
  parcial: "Pago parcial",
  pagada: "Pagada",
  anulacion_pendiente: "Anulación pendiente",
  anulada: "Anulada",
};

const paymentMethodAvatarConfig: Record<
  string,
  { src: string; label: string; bgColor: string }
> = {
  efectivo: {
    src: "/svg/metodo-pago/efectivo.png",
    label: "Efectivo",
    bgColor: "bg-[#10b981]",
  },
  yape: {
    src: "/svg/metodo-pago/Yape.svg",
    label: "Yape",
    bgColor: "bg-[#a221af]",
  },
  plin: {
    src: "/svg/metodo-pago/Plin.svg",
    label: "Plin",
    bgColor: "bg-[#00E2CE]",
  },
  transferencia: {
    src: "/svg/metodo-pago/transferencia.png",
    label: "Transferencia",
    bgColor: "bg-[#3b82f6]",
  },
};

function getPaymentMethodAvatar(
  payment: Receivable["pagos"][number],
  methods: PaymentMethod[],
) {
  const method = methods.find((item) => item.id === payment.metodoPago.id);
  const code = (
    payment.metodoPago.codigo ??
    method?.codigo ??
    ""
  )
    .trim()
    .toLowerCase();
  if (code && paymentMethodAvatarConfig[code]) {
    return paymentMethodAvatarConfig[code];
  }

  const normalizedName = payment.metodoPago.nombre.trim().toLowerCase();
  return paymentMethodAvatarConfig[normalizedName] ?? null;
}

function money(value: string | number) {
  return `S/ ${Number(value).toFixed(2)}`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReceivableDrawer({
  publicId,
  onClose,
  onChanged,
  variant = "drawer",
}: Props) {
  const { showToast } = useSystemToast();
  const [account, setAccount] = useState<Receivable | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [methodId, setMethodId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [annulPaymentId, setAnnulPaymentId] = useState<string | null>(null);
  const [annulReason, setAnnulReason] = useState("");
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicId) return;
    let active = true;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      Promise.all([
        accountsReceivableApi.findOne(publicId),
        paymentMethodsApi.findAll({ status: "active", limit: 100 }),
        branchesApi.findAll({ estado: "activo", tipo: "tienda", limit: 100 }),
      ])
        .then(([detail, paymentMethods, branchResponse]) => {
          if (!active) return;
          setAccount(detail);
          setMethods(paymentMethods.data);
          setBranches(branchResponse.data);
          setMethodId((current) => current || paymentMethods.data[0]?.id || "");
          setBranchId(detail.sucursal?.id ?? "");
          setAmount(detail.saldoPendiente);
        })
        .catch((error: unknown) => {
          if (!active) return;
          showToast({
            title: "No se pudo cargar la cuenta",
            description:
              error instanceof Error ? error.message : "Intenta nuevamente.",
            variant: "error",
          });
        })
        .finally(() => active && setLoading(false));
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [publicId, showToast]);

  if (!publicId) return null;

  const isPage = variant === "page";

  const amountValue = Number(amount);
  const paymentInvalid =
    !account ||
    !methodId ||
    !Number.isFinite(amountValue) ||
    amountValue <= 0 ||
    amountValue > Number(account.saldoPendiente);
  const canCollect =
    account &&
    ["pendiente", "parcial"].includes(account.estado) &&
    Number(account.saldoPendiente) > 0;

  const registerPayment = async () => {
    if (!account || paymentInvalid) return;
    requestIdRef.current ??= crypto.randomUUID();
    setSubmitting(true);
    try {
      const updated = await accountsReceivableApi.registerPayment(
        account.publicId,
        {
          requestId: requestIdRef.current,
          sucursalId: branchId || undefined,
          metodoPagoId: methodId,
          monto: amountValue.toFixed(2),
          referencia: reference.trim() || undefined,
        },
      );
      requestIdRef.current = null;
      setAccount(updated);
      setAmount(updated.saldoPendiente);
      setReference("");
      setShowPayment(false);
      onChanged(updated);
      showToast({
        title: "Abono registrado",
        description: `Nuevo saldo pendiente: ${money(updated.saldoPendiente)}.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo registrar el abono",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const annulPayment = async () => {
    if (!annulPaymentId || !annulReason.trim()) return;
    setSubmitting(true);
    try {
      const updated = await accountsReceivableApi.annulPayment(
        annulPaymentId,
        annulReason.trim(),
      );
      setAccount(updated);
      setAnnulPaymentId(null);
      setAnnulReason("");
      onChanged(updated);
      showToast({
        title: "Cobranza anulada",
        description: `El saldo volvió a ${money(updated.saldoPendiente)}.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo anular la cobranza",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        isPage ? "flex w-full flex-1 flex-col" : "fixed inset-0 z-50 bg-black/35",
      )}
      onMouseDown={isPage ? undefined : onClose}
    >
      <aside
        className={cn(
          "flex w-full flex-col",
          isPage
            ? "flex-1 bg-transparent"
            : "ml-auto h-full max-w-2xl bg-[var(--color-card)] shadow-2xl animate-in slide-in-from-right duration-200",
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {account ? (
          <header
            className={cn(
              "flex flex-wrap items-center justify-between gap-3",
              isPage
                ? "rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm"
                : "border-b border-[var(--color-border)] p-5",
            )}
          >
            <div>
              <p className="text-xs font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Cuenta por cobrar
              </p>
              <h2 className="mt-1 text-xl font-black text-[var(--color-text)]">
                {account.venta.correlativo}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/historial/ventas/${account.venta.publicId}`}
                className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-white px-4 text-xs font-circular-bold text-[#101d69] shadow-sm transition-colors hover:bg-[#f1f5f9] dark:bg-[var(--color-input-bg)] dark:text-[var(--color-text)] dark:hover:bg-[var(--color-button-hover)]"
              >
                <ArrowSquareOutIcon size={16} /> Ver venta
              </Link>
              {canCollect ? (
                <button
                  type="button"
                  onClick={() => setShowPayment((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#10b981] px-4 text-xs font-circular-bold text-white transition-colors hover:bg-[#059669]"
                >
                  <CreditCardIcon size={16} /> Registrar abono
                </button>
              ) : null}
              {!isPage ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-input-bg)]"
                  aria-label="Cerrar detalle"
                >
                  <XIcon size={18} weight="bold" />
                </button>
              ) : null}
            </div>
          </header>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1",
            isPage
              ? account
                ? "overflow-visible pt-4"
                : "overflow-visible"
              : "overflow-y-auto p-5",
          )}
        >
          {loading || !account ? (
            <div className="flex h-full items-center justify-center">
              <Image
                src="/svg/loader/Loader.svg"
                alt="Cargando cuenta por cobrar"
                width={140}
                height={140}
                className="h-[140px] w-[140px]"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-primary)] text-white">
                      <UserIcon size={22} weight="fill" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                        Cliente
                      </p>
                      <p className="text-lg font-black text-[var(--color-text)]">
                        {account.cliente.razonSocial ||
                          account.cliente.nombre ||
                          "Cliente"}
                      </p>
                      <p className="text-xs uppercase text-[var(--color-muted-foreground)]">
                        {account.cliente.tipoDocumento}:{" "}
                        {account.cliente.numeroDocumento}
                        {account.sucursal ? ` · ${account.sucursal.nombre}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-circular-bold",
                      account.estado === "pagada"
                        ? "bg-[#10b981]/10 text-[#047857]"
                        : account.estado === "anulada"
                          ? "bg-[#ef4444]/10 text-[#dc2626]"
                          : "bg-[#f59e0b]/10 text-[#b45309]",
                    )}
                  >
                    {account.vencida && account.estado !== "pagada"
                      ? "Vencida"
                      : statusLabels[account.estado]}
                  </span>
                </div>

                {account.venta.sunatEstado === "rechazado" ? (
                  <div className="mt-4 flex gap-3 rounded-[14px] bg-[#ef4444]/10 p-4 text-sm text-[#b91c1c]">
                    <WarningCircleIcon
                      size={20}
                      weight="fill"
                      className="shrink-0"
                    />
                    SUNAT rechazó el comprobante. La deuda comercial continúa
                    vigente.
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Total", account.totalVenta],
                    ["Adelanto", account.adelanto],
                    ["Pendiente", account.saldoPendiente],
                    ["Saldo a favor", account.saldoFavor],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[14px] bg-white p-3 shadow-sm dark:bg-[var(--color-input-bg)] dark:shadow-none"
                    >
                      <p className="text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-black text-[var(--color-text)]">
                        {money(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <Modal
                isOpen={Boolean(showPayment && canCollect)}
                onClose={() => setShowPayment(false)}
                title="Registrar abono"
                description={`Registra un pago para ${account.venta.correlativo}.`}
                size="lg"
              >
                <div className="space-y-4">
                  <div className="rounded-[16px] bg-[var(--color-input-bg)] p-4">
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Saldo pendiente
                    </p>
                    <p className="mt-1 text-xl font-black text-[var(--color-text)]">
                      {money(account.saldoPendiente)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Método de pago"
                      value={methodId}
                      onChange={setMethodId}
                      options={methods.map((method) => ({
                        label: method.nombre,
                        value: method.id,
                      }))}
                    />
                    <Select
                      label="Sucursal"
                      value={branchId}
                      onChange={setBranchId}
                      options={branches.map((branch) => ({
                        label: branch.nombre,
                        value: branch.id,
                      }))}
                    />
                    <label>
                      <span className="mb-2 block text-sm text-[var(--color-muted-foreground)]">
                        Monto a abonar
                      </span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-circular-bold text-[var(--color-muted-foreground)]">
                          S/
                        </span>
                        <input
                          type="number"
                          min="0.01"
                          max={account.saldoPendiente}
                          step="0.01"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pl-10 pr-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                        />
                      </div>
                    </label>
                  </div>

                  <label>
                    <span className="mb-2 block text-sm text-[var(--color-muted-foreground)]">
                      Referencia (opcional)
                    </span>
                    <input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Número de operación o nota"
                      className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                  </label>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPayment(false)}
                      disabled={submitting}
                      className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={paymentInvalid || submitting}
                      onClick={registerPayment}
                      className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
                    >
                      {submitting ? (
                        <SpinnerGapIcon size={17} className="animate-spin" />
                      ) : (
                        <CheckCircleIcon size={17} weight="bold" />
                      )}
                      Confirmar abono
                    </Button>
                  </div>
                </div>
              </Modal>

              <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-sm font-black text-[var(--color-text)]">
                  Cronograma
                </h3>
                <div className="space-y-2">
                  {account.cuotas.map((installment) => (
                    <div
                      key={installment.numero}
                      className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-[14px] bg-[var(--color-input-bg)] p-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black">
                        {installment.numero}
                      </span>
                      <div>
                        <p className="flex items-center gap-1 text-xs font-circular-bold text-[var(--color-text)]">
                          <CalendarBlankIcon size={14} />{" "}
                          {date(installment.fechaVencimiento)}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[11px]",
                            installment.vencida
                              ? "text-[#dc2626]"
                              : "text-[var(--color-muted-foreground)]",
                          )}
                        >
                          {installment.vencida
                            ? "Vencida"
                            : statusLabels[installment.estado]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">
                          {money(installment.saldo)}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted-foreground)]">
                          de {money(installment.montoOriginal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-sm font-black text-[var(--color-text)]">
                  Historial de pagos
                </h3>
                <div className="space-y-2">
                  {account.pagos.length === 0 ? (
                    <p className="rounded-[14px] bg-[var(--color-input-bg)] p-4 text-sm text-[var(--color-muted-foreground)]">
                      Todavía no hay pagos registrados.
                    </p>
                  ) : (
                    account.pagos.map((payment) => (
                      <div
                        key={payment.publicId}
                        className={cn(
                          "rounded-[14px] bg-[var(--color-input-bg)] p-4",
                          payment.estado === "anulado" && "opacity-55",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            {(() => {
                              const config = getPaymentMethodAvatar(
                                payment,
                                methods,
                              );
                              return config ? (
                                <span
                                  className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                                    config.bgColor,
                                  )}
                                >
                                  <Image
                                    src={config.src}
                                    width={36}
                                    height={36}
                                    alt={config.label}
                                    className="h-5 w-5 object-contain"
                                  />
                                </span>
                              ) : (
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary)]/10">
                                  <CreditCardIcon
                                    size={16}
                                    weight="bold"
                                    className="text-[var(--color-primary)]"
                                  />
                                </span>
                              );
                            })()}
                            <div className="min-w-0">
                              <p className="text-sm font-black text-[var(--color-text)]">
                                {payment.origen === "venta"
                                  ? "Adelanto"
                                  : "Cobranza"}{" "}
                                · {payment.metodoPago.nombre}
                              </p>
                              <p className="text-xs text-[var(--color-muted-foreground)]">
                                {dateTime(payment.createdAt)}
                                {payment.creadoPor
                                  ? ` · ${payment.creadoPor.nombre}`
                                  : ""}
                              </p>
                              {payment.cuotas.length ? (
                                <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                                  {payment.cuotas
                                    .map(
                                      (item) =>
                                        `Cuota ${item.numero}: ${money(item.monto)}`,
                                    )
                                    .join(" · ")}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black">
                              {money(payment.monto)}
                            </p>
                            {payment.origen === "cobranza" &&
                            payment.estado === "activo" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setAnnulPaymentId(payment.publicId)
                                }
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-circular-bold text-[#dc2626]"
                              >
                                <TrashIcon size={13} /> Anular
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>

      <Modal
        isOpen={Boolean(annulPaymentId)}
        onClose={() => {
          setAnnulPaymentId(null);
          setAnnulReason("");
        }}
        title="Anular cobranza"
        description="La operación devolverá el importe a las cuotas. No se podrá realizar si la caja original está cerrada."
        size="md"
      >
        <textarea
          value={annulReason}
          onChange={(event) => setAnnulReason(event.target.value)}
          placeholder="Motivo de la anulación"
          rows={3}
          className="w-full rounded-[12px] bg-[var(--color-input-bg)] p-3 text-sm outline-none"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setAnnulPaymentId(null);
              setAnnulReason("");
            }}
            className="h-11 flex-1 rounded-[12px] bg-[var(--color-input-bg)] text-sm font-circular-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!annulReason.trim() || submitting}
            onClick={annulPayment}
            className="h-11 flex-1 rounded-[12px] bg-[#ef4444] text-sm font-black text-white disabled:opacity-50"
          >
            Anular cobranza
          </button>
        </div>
      </Modal>
    </div>
  );
}

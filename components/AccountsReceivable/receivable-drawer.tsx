"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowSquareOutIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  CreditCardIcon,
  SpinnerGapIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { useSystemToast } from "@/components/SystemToast/system-toast";
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
  const [received, setReceived] = useState("");
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
          setReceived(
            paymentMethods.data[0]?.permiteVuelto ? detail.saldoPendiente : "",
          );
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

  const selectedMethod = methods.find((item) => item.id === methodId);
  const amountValue = Number(amount);
  const receivedValue = Number(received || amount);
  const paymentInvalid =
    !account ||
    !methodId ||
    !Number.isFinite(amountValue) ||
    amountValue <= 0 ||
    amountValue > Number(account.saldoPendiente) ||
    Boolean(selectedMethod?.permiteVuelto && receivedValue < amountValue);
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
          montoRecibido:
            selectedMethod?.permiteVuelto && received
              ? receivedValue.toFixed(2)
              : undefined,
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
      className={cn(isPage ? "w-full" : "fixed inset-0 z-50 bg-black/35")}
      onMouseDown={isPage ? undefined : onClose}
    >
      <aside
        className={cn(
          "flex w-full flex-col bg-[var(--color-card)]",
          isPage
            ? "mx-auto max-w-6xl rounded-[18px] shadow-sm"
            : "ml-auto h-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-200",
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
          <div>
            <p className="text-xs font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Cuenta por cobrar
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-text)]">
              {account?.venta.correlativo ?? "Cargando..."}
            </h2>
          </div>
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
        </header>

        <div
          className={cn(
            "min-h-0 flex-1 p-5",
            isPage ? "overflow-visible" : "overflow-y-auto",
          )}
        >
          {loading || !account ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerGapIcon
                size={30}
                className="animate-spin text-[var(--color-primary)]"
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
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
                <div className="flex gap-3 rounded-[14px] bg-[#ef4444]/10 p-4 text-sm text-[#b91c1c]">
                  <WarningCircleIcon
                    size={20}
                    weight="fill"
                    className="shrink-0"
                  />
                  SUNAT rechazó el comprobante. La deuda comercial continúa
                  vigente.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Total", account.totalVenta],
                  ["Adelanto", account.adelanto],
                  ["Pendiente", account.saldoPendiente],
                  ["Saldo a favor", account.saldoFavor],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[14px] bg-[var(--color-input-bg)] p-3"
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

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/historial/ventas/${account.venta.publicId}`}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[var(--color-input-bg)] px-4 text-xs font-circular-bold text-[var(--color-text)]"
                >
                  <ArrowSquareOutIcon size={16} /> Ver venta
                </Link>
                {canCollect ? (
                  <button
                    type="button"
                    onClick={() => setShowPayment((current) => !current)}
                    className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white"
                  >
                    <CreditCardIcon size={16} /> Registrar abono
                  </button>
                ) : null}
              </div>

              {showPayment && canCollect ? (
                <div
                  className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-black/45 p-0 animate-in fade-in duration-200 sm:items-center sm:p-4"
                  onMouseDown={() => setShowPayment(false)}
                >
                  <section
                    className="w-full max-w-2xl space-y-3 rounded-t-[22px] bg-[var(--color-card)] p-5 shadow-2xl sm:rounded-[20px]"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-[var(--color-text)]">
                          Registrar abono
                        </h3>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          Saldo pendiente: {money(account.saldoPendiente)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPayment(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-input-bg)]"
                        aria-label="Cerrar registro de abono"
                      >
                        <XIcon size={17} weight="bold" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        label="Método de pago"
                        value={methodId}
                        onChange={(value) => {
                          setMethodId(value);
                          setReceived(
                            methods.find((method) => method.id === value)
                              ?.permiteVuelto
                              ? amount
                              : "",
                          );
                        }}
                        options={methods.map((method) => ({
                          label: method.nombre,
                          value: method.id,
                        }))}
                        fixedMenu
                      />
                      <Select
                        label="Sucursal"
                        value={branchId}
                        onChange={setBranchId}
                        options={branches.map((branch) => ({
                          label: branch.nombre,
                          value: branch.id,
                        }))}
                        fixedMenu
                      />
                      <label>
                        <span className="mb-2 block text-sm text-[#4e5671]">
                          Monto aplicado
                        </span>
                        <input
                          type="number"
                          min="0.01"
                          max={account.saldoPendiente}
                          step="0.01"
                          value={amount}
                          onChange={(event) => {
                            setAmount(event.target.value);
                            if (selectedMethod?.permiteVuelto) {
                              setReceived(event.target.value);
                            }
                          }}
                          className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm outline-none"
                        />
                      </label>
                      {selectedMethod?.permiteVuelto ? (
                        <label>
                          <span className="mb-2 block text-sm text-[#4e5671]">
                            Monto recibido
                          </span>
                          <input
                            type="number"
                            min={amount || "0"}
                            step="0.01"
                            value={received}
                            onChange={(event) =>
                              setReceived(event.target.value)
                            }
                            className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm outline-none"
                          />
                        </label>
                      ) : null}
                    </div>
                    <input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Referencia (opcional)"
                      className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm outline-none"
                    />
                    {selectedMethod?.permiteVuelto &&
                    receivedValue >= amountValue ? (
                      <p className="text-xs font-circular-bold text-[#047857]">
                        Vuelto: {money(receivedValue - amountValue)}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={paymentInvalid || submitting}
                      onClick={registerPayment}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#10b981] text-sm font-black text-white disabled:opacity-50"
                    >
                      {submitting ? (
                        <SpinnerGapIcon size={17} className="animate-spin" />
                      ) : (
                        <CheckCircleIcon size={17} />
                      )}
                      Confirmar abono
                    </button>
                  </section>
                </div>
              ) : null}

              <section>
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

              <section>
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
                          <div>
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
                          <div className="text-right">
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

      {annulPaymentId ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-[20px] bg-[var(--color-card)] p-5 shadow-2xl">
            <h3 className="text-lg font-black">Anular cobranza</h3>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              La operación devolverá el importe a las cuotas. No se podrá
              realizar si la caja original está cerrada.
            </p>
            <textarea
              value={annulReason}
              onChange={(event) => setAnnulReason(event.target.value)}
              placeholder="Motivo de la anulación"
              rows={3}
              className="mt-4 w-full rounded-[12px] bg-[var(--color-input-bg)] p-3 text-sm outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAnnulPaymentId(null)}
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
          </div>
        </div>
      ) : null}
    </div>
  );
}

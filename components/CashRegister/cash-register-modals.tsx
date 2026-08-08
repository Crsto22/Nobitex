"use client";

import { NativeSelect } from "@/components/ui/select";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalculatorIcon,
  CreditCardIcon,
  LockKeyIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import {
  cashRegisterApi,
  type CashRegisterSession,
} from "@/lib/api/cash-register";
import {
  paymentMethodsApi,
  type PaymentMethod,
} from "@/lib/api/payment-methods";
import { cn } from "@/lib/utils";

type PaymentAmount = {
  metodoPagoId: string;
  monto: string;
};

type CashRegisterBranchOption = {
  id: string;
  nombre: string;
};

type BaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sucursalId: string;
  sucursalNombre?: string;
  onSuccess: (session: CashRegisterSession) => void;
};

const paymentMethodIconConfig: Record<
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

function getPaymentMethodIcon(method: PaymentMethod) {
  const code = method.codigo?.trim().toLowerCase();
  if (code && paymentMethodIconConfig[code]) {
    return paymentMethodIconConfig[code];
  }

  const normalizedName = method.nombre.trim().toLowerCase();
  return paymentMethodIconConfig[normalizedName] ?? null;
}

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `S/${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

function parseAmount(value: string) {
  const amount = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeAmounts(methods: PaymentMethod[], values: PaymentAmount[]) {
  const byMethod = new Map(values.map((item) => [item.metodoPagoId, item.monto]));

  return methods.flatMap((method) => {
    const amount = parseAmount(byMethod.get(method.id) ?? "");

    return amount > 0
      ? [{ metodoPagoId: method.id, monto: amount.toFixed(2) }]
      : [];
  });
}

function usePaymentMethods(isOpen: boolean) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      paymentMethodsApi
        .findAll({ status: "active", limit: 100 })
        .then((response) => {
          if (isMounted) setMethods(response.data);
        })
        .catch(() => {
          if (isMounted) setMethods([]);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  return { methods, isLoading };
}

function MethodAmountInputs({
  methods,
  values,
  disabled,
  onChange,
}: {
  methods: PaymentMethod[];
  values: PaymentAmount[];
  disabled: boolean;
  onChange: (values: PaymentAmount[]) => void;
}) {
  const amountMap = new Map(values.map((item) => [item.metodoPagoId, item.monto]));

  const updateAmount = (metodoPagoId: string, monto: string) => {
    const nextMap = new Map(amountMap);
    nextMap.set(metodoPagoId, monto);
    onChange(
      methods.map((method) => ({
        metodoPagoId: method.id,
        monto: nextMap.get(method.id) ?? "",
      })),
    );
  };

  return (
    <div className="space-y-2.5">
      {methods.map((method) => {
        const icon = getPaymentMethodIcon(method);

        return (
          <label
            key={method.id}
            className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-3 rounded-[18px] bg-[var(--color-input-bg)] p-3 sm:grid-cols-[minmax(0,1fr)_156px]"
          >
            <span className="flex min-w-0 items-center gap-3">
              {icon ? (
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] shadow-[0_8px_18px_rgba(15,23,42,0.12)]",
                    icon.bgColor,
                  )}
                >
                  <Image
                    src={icon.src}
                    width={40}
                    height={40}
                    alt={icon.label}
                    className="h-8 w-8 object-contain"
                  />
                </span>
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <CreditCardIcon size={20} weight="bold" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-black leading-tight text-[var(--color-text)]">
                  {method.nombre}
                </span>
                <span className="mt-1 block truncate text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Saldo declarado
                </span>
              </span>
            </span>

            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-circular-bold text-[var(--color-muted-foreground)]">
                S/
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amountMap.get(method.id) ?? ""}
                disabled={disabled}
                onChange={(event) => updateAmount(method.id, event.target.value)}
                placeholder="0.00"
                className="h-11 w-full rounded-[12px] bg-[var(--color-background)] pl-9 pr-3 text-right text-sm font-circular-bold text-[var(--color-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
              />
            </span>
          </label>
        );
      })}
    </div>
  );
}

function OpeningCashAmountInput({
  methods,
  values,
  disabled,
  onChange,
}: {
  methods: PaymentMethod[];
  values: PaymentAmount[];
  disabled: boolean;
  onChange: (values: PaymentAmount[]) => void;
}) {
  const amountMap = new Map(values.map((item) => [item.metodoPagoId, item.monto]));

  const updateAmount = (metodoPagoId: string, monto: string) => {
    onChange(
      methods.map((method) => ({
        metodoPagoId: method.id,
        monto: method.id === metodoPagoId ? monto : amountMap.get(method.id) ?? "",
      })),
    );
  };

  return (
    <div className="grid gap-3">
      {methods.map((method) => (
        <label
          key={method.id}
          className="flex flex-col items-center rounded-[18px] bg-[var(--color-input-bg)] p-4 text-center sm:flex-row sm:text-left"
        >
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#10b981] shadow-[0_10px_24px_rgba(16,185,129,0.24)]">
            <Image
              src="/svg/metodo-pago/efectivo.png"
              width={48}
              height={48}
              alt="Efectivo"
              className="h-10 w-10 object-contain"
            />
          </span>
          <span className="mt-3 min-w-0 flex-1 sm:ml-4 sm:mt-0">
            <span className="block text-sm font-black text-[var(--color-text)]">
              {method.nombre}
            </span>
            <span className="mt-1 block text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              Dinero físico disponible al iniciar la caja
            </span>
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountMap.get(method.id) ?? ""}
            disabled={disabled}
            onChange={(event) => updateAmount(method.id, event.target.value)}
            placeholder="0.00"
            className="mt-4 h-11 w-full rounded-[12px] bg-[var(--color-background)] px-3 text-center text-base font-circular-bold text-[var(--color-text)] text-fixed-base outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60 sm:ml-4 sm:mt-0 sm:w-36"
          />
        </label>
      ))}
    </div>
  );
}

export function OpenCashRegisterModal({
  isOpen,
  onClose,
  sucursalId,
  sucursalNombre,
  onSuccess,
  branchOptions,
}: BaseModalProps & { branchOptions?: CashRegisterBranchOption[] }) {
  const { showToast } = useSystemToast();
  const { methods, isLoading } = usePaymentMethods(isOpen);
  const openingMethods = useMemo(
    () =>
      methods.filter(
        (method) => method.permiteVuelto || method.codigo === "efectivo",
      ),
    [methods],
  );
  const [amounts, setAmounts] = useState<PaymentAmount[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [selectedSucursalId, setSelectedSucursalId] = useState(sucursalId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSelectBranch = !!branchOptions?.length;
  const effectiveSucursalId = canSelectBranch ? selectedSucursalId : sucursalId;
  const effectiveSucursalNombre =
    branchOptions?.find((branch) => branch.id === effectiveSucursalId)?.nombre ??
    sucursalNombre;
  const total = useMemo(
    () =>
      normalizeAmounts(openingMethods, amounts).reduce(
        (sum, item) => sum + parseAmount(item.monto),
        0,
      ),
    [amounts, openingMethods],
  );

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setSelectedSucursalId((current) => {
        if (current && branchOptions?.some((branch) => branch.id === current)) {
          return current;
        }

        return sucursalId || branchOptions?.[0]?.id || "";
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [branchOptions, isOpen, sucursalId]);

  useEffect(() => {
    if (!isOpen) {
      const timeoutId = window.setTimeout(() => {
        setAmounts([]);
        setObservaciones("");
        setSelectedSucursalId(sucursalId);
        setIsSubmitting(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [isOpen, sucursalId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!effectiveSucursalId) {
      showToast({
        title: "Selecciona una sucursal",
        description: "Elige la sucursal donde abriras caja.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await cashRegisterApi.open({
        sucursalId: effectiveSucursalId,
        saldosIniciales: normalizeAmounts(openingMethods, amounts),
        observaciones: observaciones.trim() || undefined,
      });
      showToast({
        title: "Caja abierta",
        description: effectiveSucursalNombre || session.sucursal.nombre,
        variant: "success",
      });
      onSuccess(session);
      onClose();
    } catch (error) {
      showToast({
        title: "No se pudo abrir caja",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Abrir caja"
      description={
        !canSelectBranch && sucursalNombre
          ? `Sucursal: ${sucursalNombre}`
          : undefined
      }
      size="lg"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {canSelectBranch ? (
          <label className="block">
            <span className="mb-2 block text-sm font-circular-bold text-[var(--color-text)]">
              Sucursal
            </span>
            <NativeSelect
              value={selectedSucursalId}
              onChange={(event) => setSelectedSucursalId(event.target.value)}
              disabled={isSubmitting}
              className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
            >
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.nombre}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}

        <div className="rounded-[14px] bg-[var(--color-primary)]/10 p-4 text-sm text-[var(--color-text)]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-circular-bold">Monto inicial en efectivo</span>
            <span className="font-circular-bold text-[var(--color-primary)]">
              {formatMoney(total)}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <SpinnerGapIcon
              size={24}
              weight="bold"
              className="animate-spin text-[var(--color-muted-foreground)]"
            />
          </div>
        ) : (
          <>
            {openingMethods.length > 0 ? (
              <OpeningCashAmountInput
                methods={openingMethods}
                values={amounts}
                disabled={isSubmitting}
                onChange={setAmounts}
              />
            ) : (
              <div className="rounded-[14px] bg-[var(--color-input-bg)] p-4 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
                No hay un método de efectivo activo para declarar monto inicial.
              </div>
            )}
          </>
        )}

        <textarea
          value={observaciones}
          onChange={(event) => setObservaciones(event.target.value)}
          disabled={isSubmitting}
          maxLength={500}
          placeholder="Observacion de apertura"
          aria-label="Observacion de apertura"
          className="min-h-20 w-full resize-none rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSubmitting ? "Abriendo..." : "Abrir caja"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CloseCashRegisterModal({
  isOpen,
  onClose,
  sucursalId,
  sucursalNombre,
  session,
  onSuccess,
}: BaseModalProps & { session: CashRegisterSession | null }) {
  const { showToast } = useSystemToast();
  const { methods, isLoading } = usePaymentMethods(isOpen);
  const [amounts, setAmounts] = useState<PaymentAmount[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const declaredTotal = useMemo(
    () => amounts.reduce((sum, item) => sum + parseAmount(item.monto), 0),
    [amounts],
  );
  const expectedTotal = Number(session?.montoEsperadoActual ?? session?.montoEsperado ?? 0);
  const difference = declaredTotal - expectedTotal;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
    if (isOpen && session?.totalesPorMetodoPago) {
      setAmounts(
        session.totalesPorMetodoPago.flatMap((item) =>
          item.metodoPago
            ? [
                {
                  metodoPagoId: item.metodoPago.id,
                  monto: Number(item.monto).toFixed(2),
                },
              ]
            : [],
        ),
      );
    }
    if (!isOpen) {
      setAmounts([]);
      setObservaciones("");
      setIsSubmitting(false);
    }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sucursalId) return;

    setIsSubmitting(true);
    try {
      const closedSession = await cashRegisterApi.close({
        sucursalId,
        saldosDeclarados: normalizeAmounts(methods, amounts),
        observaciones: observaciones.trim() || undefined,
      });
      showToast({
        title: "Caja cerrada",
        description: `Diferencia ${formatMoney(closedSession.diferencia)}`,
        variant: "success",
      });
      onSuccess(closedSession);
      onClose();
    } catch (error) {
      showToast({
        title: "No se pudo cerrar caja",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Cerrar caja"
      description={sucursalNombre ? `Sucursal: ${sucursalNombre}` : undefined}
      size="lg"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryPill label="Esperado" value={formatMoney(expectedTotal)} />
          <SummaryPill label="Declarado" value={formatMoney(declaredTotal)} />
          <SummaryPill
            label="Diferencia"
            value={formatMoney(difference)}
            tone={Math.abs(difference) < 0.005 ? "success" : "warning"}
          />
        </div>

        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <SpinnerGapIcon
              size={24}
              weight="bold"
              className="animate-spin text-[var(--color-muted-foreground)]"
            />
          </div>
        ) : (
          <MethodAmountInputs
            methods={methods}
            values={amounts}
            disabled={isSubmitting}
            onChange={setAmounts}
          />
        )}

        <textarea
          value={observaciones}
          onChange={(event) => setObservaciones(event.target.value)}
          disabled={isSubmitting}
          maxLength={500}
          placeholder="Observacion de cierre"
          aria-label="Observacion de cierre"
          className="min-h-20 w-full resize-none rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="h-11 flex-1 rounded-[14px] bg-[#ff7417] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSubmitting ? "Cerrando..." : "Cerrar caja"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CashMovementModal({
  isOpen,
  onClose,
  sucursalId,
  sucursalNombre,
  onSuccess,
}: BaseModalProps) {
  const { showToast } = useSystemToast();
  const { methods, isLoading } = usePaymentMethods(isOpen);
  const [tipo, setTipo] = useState<"ingreso" | "retiro">("ingreso");
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
    if (isOpen && methods.length > 0 && !metodoPagoId) {
      setMetodoPagoId(methods[0].id);
    }
    if (!isOpen) {
      setTipo("ingreso");
      setMetodoPagoId("");
      setMonto("");
      setMotivo("");
      setReferencia("");
      setIsSubmitting(false);
    }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, methods, metodoPagoId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sucursalId || !metodoPagoId || parseAmount(monto) <= 0 || !motivo.trim()) {
      showToast({
        title: "Completa el movimiento",
        description: "Metodo, monto y motivo son obligatorios.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await cashRegisterApi.createMovement({
        sucursalId,
        tipo,
        metodoPagoId,
        monto: parseAmount(monto).toFixed(2),
        motivo: motivo.trim(),
        referencia: referencia.trim() || undefined,
      });
      const session = await cashRegisterApi.current(sucursalId);
      if (session) onSuccess(session);
      showToast({
        title: tipo === "ingreso" ? "Ingreso registrado" : "Retiro registrado",
        description: formatMoney(monto),
        variant: "success",
      });
      onClose();
    } catch (error) {
      showToast({
        title: "No se pudo registrar",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="Movimiento de caja"
      description={sucursalNombre ? `Sucursal: ${sucursalNombre}` : undefined}
      size="md"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[var(--color-input-bg)] p-1">
          {[
            { value: "ingreso", label: "Ingreso", icon: ArrowUpIcon },
            { value: "retiro", label: "Retiro", icon: ArrowDownIcon },
          ].map((option) => {
            const Icon = option.icon;
            const selected = tipo === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTipo(option.value as "ingreso" | "retiro")}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-[11px] text-sm font-circular-bold transition-colors",
                  selected
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                <Icon size={16} weight="bold" />
                {option.label}
              </button>
            );
          })}
        </div>

        <NativeSelect
          aria-label="Metodo de pago"
          value={metodoPagoId}
          onChange={(event) => setMetodoPagoId(event.target.value)}
          disabled={isLoading || isSubmitting}
          className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        >
          {methods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.nombre}
            </option>
          ))}
        </NativeSelect>

        <input
          type="number"
          min="0"
          step="0.01"
          value={monto}
          onChange={(event) => setMonto(event.target.value)}
          disabled={isSubmitting}
          placeholder="Monto"
          aria-label="Monto"
          className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />

        <input
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          disabled={isSubmitting}
          maxLength={500}
          placeholder="Motivo"
          aria-label="Motivo"
          className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />

        <input
          value={referencia}
          onChange={(event) => setReferencia(event.target.value)}
          disabled={isSubmitting}
          maxLength={200}
          placeholder="Referencia opcional"
          aria-label="Referencia opcional"
          className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />

        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="h-11 w-full rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
        >
          {isSubmitting ? "Guardando..." : "Guardar movimiento"}
        </Button>
      </form>
    </Modal>
  );
}

function SummaryPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = {
    default: "text-[var(--color-text)]",
    success: "text-[#10b981]",
    warning: "text-[#f59e0b]",
  }[tone];

  return (
    <div className="rounded-[14px] bg-[var(--color-input-bg)] p-3">
      <div className="flex items-center gap-2 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
        {tone === "warning" ? (
          <CalculatorIcon size={14} weight="bold" />
        ) : (
          <LockKeyIcon size={14} weight="bold" />
        )}
        {label}
      </div>
      <p className={cn("mt-1 text-sm font-circular-bold", toneClass)}>{value}</p>
    </div>
  );
}

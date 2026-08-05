"use client";

import { NativeSelect } from "@/components/ui/select";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CreditCardIcon,
  XIcon,
  ReceiptIcon,
  ArrowLeftIcon,
  SpinnerGapIcon,
  PlusIcon,
  TrashIcon,
  NotePencilIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import {
  salesApi,
  type CreateSalePayload,
  type VentaDescuentoTipo,
  type VentaResponse,
  type VentaTipoComprobante,
} from "@/lib/api/sales";
import {
  paymentMethodsApi,
  type PaymentMethod,
} from "@/lib/api/payment-methods";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { ClientPickerModal } from "@/components/Clients/client-picker-modal";
import type { Client } from "@/lib/api/clients";
import {
  GenericClientAvatar,
  UserAvatar,
} from "@/components/UserAvatar/user-avatar";

type CartItem = {
  id: string;
  name: string;
  tipo: "normal" | "variantes";
  price: string;
  priceValue: number;
  image: string | null;
  quantity: number;
  stock: number;
  colorHex: string;
  colorName: string;
  size: string;
  sku: string;
  tipoAfectacionIgvCodigo: string;
};

type PaymentEntry = {
  uid: string;
  method: PaymentMethod;
  amount: string;
  receivedAmount: string;
  reference: string;
};

type ChargeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  wide?: boolean;
  cartItems: CartItem[];
  subtotal: number;
  discountType: VentaDescuentoTipo | null;
  discountValue: string;
  discountAmount: number;
  taxSummary: TaxSummary;
  total: number;
  note: string;
  selectedBranch: string;
  selectedNoteType: string;
  selectedClient: Client | null;
  onSelectedClientChange?: (client: Client | null) => void;
  noteTypeOptions?: Array<{ label: string; value: string }>;
  onSelectedNoteTypeChange?: (value: string) => void;
  submitTitle?: string;
  loadingTitle?: string;
  onSubmitSale?: (payload: CreateSalePayload) => Promise<VentaResponse>;
  onSaleSuccess: (venta: VentaResponse) => void;
};

type TaxSummary = {
  enabled: boolean;
  igvPercent: number;
  opGravadas: number;
  opExoneradas: number;
  opInafectas: number;
  igv: number;
  total: number;
};

function formatPrice(amount: number) {
  return `S/${amount.toFixed(2)}`;
}

function parseAmount(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

const noteTypeLabels: Record<string, string> = {
  nota: "Nota de Venta",
  nota_venta: "Nota de Venta",
  boleta: "Boleta",
  factura: "Factura",
};

const noteTypeMap: Record<string, VentaTipoComprobante> = {
  nota: "nota_venta",
  nota_venta: "nota_venta",
  boleta: "boleta",
  factura: "factura",
};

const paymentMethodConfig: Record<
  string,
  { src: string; label: string; bgColor: string }
> = {
  Efectivo: {
    src: "/svg/metodo-pago/efectivo.png",
    label: "Efectivo",
    bgColor: "bg-[#10b981]",
  },
  Yape: {
    src: "/svg/metodo-pago/Yape.svg",
    label: "Yape",
    bgColor: "bg-[#a221af]",
  },
  Plin: {
    src: "/svg/metodo-pago/Plin.svg",
    label: "Plin",
    bgColor: "bg-[#00E2CE]",
  },
  Transferencia: {
    src: "/svg/metodo-pago/transferencia.png",
    label: "Transferencia",
    bgColor: "bg-[#3b82f6]",
  },
};

const getPaymentMethodConfig = (name: string) => {
  const normalized = name.trim().toLowerCase();
  for (const [key, config] of Object.entries(paymentMethodConfig)) {
    if (key.toLowerCase() === normalized) return config;
  }
  return null;
};

export function ChargeModal({
  isOpen,
  onClose,
  title = "Cobrar",
  wide = false,
  cartItems,
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  taxSummary,
  total,
  note,
  selectedBranch,
  selectedNoteType,
  selectedClient,
  onSelectedClientChange,
  noteTypeOptions,
  onSelectedNoteTypeChange,
  submitTitle,
  loadingTitle = "Procesando venta...",
  onSubmitSale,
  onSaleSuccess,
}: ChargeModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [selectedReceivedAmount, setSelectedReceivedAmount] = useState("");
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [expandedReferenceUid, setExpandedReferenceUid] = useState<
    string | null
  >(null);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const methodsLoadedRef = useRef(false);
  const toast = useSystemToast();

  const loadPaymentMethods = useCallback(async () => {
    if (methodsLoadedRef.current) return;
    setIsLoadingMethods(true);
    try {
      const response = await paymentMethodsApi.findAll({
        status: "active",
        limit: 100,
      });
      setPaymentMethods(response.data);
      methodsLoadedRef.current = true;
    } catch {
    } finally {
      setIsLoadingMethods(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      methodsLoadedRef.current = false;
      void loadPaymentMethods();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPaymentMethods]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (selectedMethod?.permiteVuelto) {
        setSelectedReceivedAmount(total.toFixed(2));
        return;
      }

      setSelectedReceivedAmount("");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedMethod, total]);

  const paidAmount = paymentEntries.reduce(
    (sum, e) => sum + parseAmount(e.amount),
    0,
  );
  const remaining = total - paidAmount;
  const hasEntries = paymentEntries.length > 1;
  const selectedReceivedValue = parseAmount(selectedReceivedAmount);
  const selectedChange = selectedMethod?.permiteVuelto
    ? Math.max(0, selectedReceivedValue - total)
    : 0;
  const hasInvalidEntryChange = paymentEntries.some((entry) => {
    if (hasEntries) return false;
    if (!entry.method.permiteVuelto) return false;
    return (
      parseAmount(entry.receivedAmount || entry.amount) + 0.005 <
      parseAmount(entry.amount)
    );
  });
  const hasInvalidSelectedChange =
    !!selectedMethod?.permiteVuelto && selectedReceivedValue + 0.005 < total;
  const isInvoiceClientInvalid =
    selectedNoteType === "factura" &&
    (selectedClient?.tipoDocumento !== "ruc" ||
      selectedClient.numeroDocumento?.length !== 11 ||
      !selectedClient.razonSocial?.trim());
  const canConfirm =
    ((hasEntries && Math.abs(remaining) < 0.005) ||
      (!hasEntries && !!selectedMethod)) &&
    !hasInvalidEntryChange &&
    !hasInvalidSelectedChange &&
    !isInvoiceClientInvalid;
  const isOverpaying = remaining < -0.005;

  const addPayment = (method: PaymentMethod) => {
    const currentPaid = paymentEntries.reduce(
      (s, e) => s + parseFloat(e.amount || "0"),
      0,
    );
    const rem = total - currentPaid;
    setPaymentEntries((prev) => [
      ...prev,
      {
        uid: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        method,
        amount: rem > 0 ? rem.toFixed(2) : "0.00",
        receivedAmount: method.permiteVuelto && rem > 0 ? rem.toFixed(2) : "",
        reference: "",
      },
    ]);
  };

  const startSplitPayment = (method: PaymentMethod) => {
    const nextMethod =
      paymentMethods.find((item) => item.id !== method.id) ?? method;

    setExpandedReferenceUid(null);
    setPaymentEntries([
      {
        uid: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        method,
        amount: total.toFixed(2),
        receivedAmount: method.permiteVuelto
          ? selectedReceivedAmount || total.toFixed(2)
          : "",
        reference: "",
      },
      {
        uid: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        method: nextMethod,
        amount: "0.00",
        receivedAmount: nextMethod.permiteVuelto ? "0.00" : "",
        reference: "",
      },
    ]);
  };

  const updateEntryAmount = (uid: string, value: string) => {
    setPaymentEntries((prev) =>
      prev.map((e) => {
        if (e.uid !== uid) return e;

        return {
          ...e,
          amount: value,
          receivedAmount: e.method.permiteVuelto
            ? e.receivedAmount || value
            : "",
        };
      }),
    );
  };

  const updateEntryMethod = (uid: string, methodId: string) => {
    const method = paymentMethods.find((item) => item.id === methodId);
    if (!method) return;

    setPaymentEntries((prev) =>
      prev.map((entry) => {
        if (entry.uid !== uid) return entry;

        return {
          ...entry,
          method,
          receivedAmount: method.permiteVuelto
            ? entry.receivedAmount || entry.amount
            : "",
        };
      }),
    );
  };

  const updateEntryReceivedAmount = (uid: string, value: string) => {
    setPaymentEntries((prev) =>
      prev.map((e) => (e.uid === uid ? { ...e, receivedAmount: value } : e)),
    );
  };

  const updateEntryReference = (uid: string, value: string) => {
    setPaymentEntries((prev) =>
      prev.map((e) => (e.uid === uid ? { ...e, reference: value } : e)),
    );
  };

  const removeEntry = (uid: string) => {
    const next = paymentEntries.filter((entry) => entry.uid !== uid);

    if (expandedReferenceUid === uid) {
      setExpandedReferenceUid(null);
    }
    if (next.length <= 1) {
      const remainingEntry = next[0];
      if (remainingEntry) {
        setSelectedMethod(remainingEntry.method);
        setSelectedReceivedAmount(
          remainingEntry.method.permiteVuelto
            ? remainingEntry.receivedAmount || remainingEntry.amount
            : "",
        );
      }
      setPaymentEntries([]);
      return;
    }

    setPaymentEntries(next);
  };

  const handleSubmit = async () => {
    if (!canConfirm) return;

    if (
      selectedNoteType === "factura" &&
      isInvoiceClientInvalid
    ) {
      toast.showToast({
        title: "Cliente requerido",
        description:
          "Para factura selecciona un cliente con RUC de 11 digitos y razon social.",
        variant: "error",
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);

    const loadingId = toast.showToast({
      title: loadingTitle,
      description: "No cierres esta ventana",
      variant: "loading",
    });

    const pagos = hasEntries
      ? paymentEntries.map((e) => ({
          metodoPagoId: e.method.id,
          monto: parseAmount(e.amount).toFixed(2),
          montoRecibido: undefined,
          referencia: e.reference.trim() || undefined,
        }))
      : selectedMethod
        ? [
            {
              metodoPagoId: selectedMethod.id,
              monto: total.toFixed(2),
              montoRecibido:
                selectedMethod.permiteVuelto && selectedReceivedAmount.trim()
                  ? selectedReceivedValue.toFixed(2)
                  : undefined,
              referencia: undefined,
            },
          ]
        : [];

    const payload: CreateSalePayload = {
      tipoComprobante: noteTypeMap[selectedNoteType] ?? "nota_venta",
      sucursalId: selectedBranch || undefined,
      clienteId: selectedClient?.id || undefined,
      descuentoTipo: discountType ?? undefined,
      descuentoValor:
        discountType && discountValue.trim()
          ? Number.parseFloat(discountValue).toFixed(2)
          : undefined,
      detalles: cartItems.map((item) => ({
        productoVarianteId: item.id,
        cantidad: item.quantity,
        precioUnitario: item.priceValue.toFixed(2),
      })),
      pagos,
      observaciones: note.trim() || undefined,
    };

    try {
      const venta = onSubmitSale
        ? await onSubmitSale(payload)
        : await salesApi.create(payload);
      const electronic =
        venta.tipoComprobante === "boleta" ||
        venta.tipoComprobante === "factura";
      const sunatMessage = electronic
        ? `SUNAT: ${venta.sunat?.estado?.replaceAll("_", " ") ?? "pendiente de envio"}`
        : "Comprobante interno";
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Venta registrada",
        description: `Correlativo: ${venta.correlativo} — Total: ${formatPrice(Number(venta.total))} — ${sunatMessage}`,
        variant: "success",
        duration: 5000,
      });
      onSaleSuccess(venta);
      onClose();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al procesar la venta";
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Error en la venta",
        description: message,
        variant: "error",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-6 animate-in fade-in duration-200">
      <div
        className={cn(
          "flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-[24px] bg-[var(--color-card)] shadow-[0_22px_70px_rgba(15,23,42,0.28)] ring-1 ring-[var(--color-border)] animate-in zoom-in-95 duration-200",
          wide ? "max-w-4xl" : "max-w-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 p-5 pb-0">
          <div>
            <h2 className="text-lg font-black text-[var(--color-text)]">
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--color-muted-foreground)]">
              Total:{" "}
              <span className="font-circular-bold">{formatPrice(total)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
            aria-label="Cerrar"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-5 pr-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <div className="rounded-[14px] bg-[var(--color-input-bg)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ReceiptIcon
                    size={18}
                    weight="bold"
                    className="text-[var(--color-muted-foreground)]"
                  />
                  <span className="text-xs font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Resumen
                  </span>
                </div>
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[var(--color-text)]">
                          <span className="font-circular-bold">
                            {item.name.toUpperCase()}
                          </span>
                          <span className="text-[var(--color-muted-foreground)]">
                            {item.tipo === "variantes"
                              ? ` · ${item.size} · ${item.colorName}`
                              : ""}{" "}
                            · x{item.quantity}
                          </span>
                        </p>
                        {false ? (
                          <>
                            <span>
                              {item.name}
                              <span className="text-[var(--color-muted-foreground)]">
                                ×{item.quantity}
                              </span>
                            </span>
                            <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                              <span className="truncate font-circular-bold">
                                TALLA: {item.size}
                              </span>
                              <span className="flex items-center gap-1 truncate font-circular-bold">
                                <span>COLOR:</span>
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: item.colorHex }}
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {item.colorName}
                                </span>
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                      <span className="font-circular-bold shrink-0 text-[var(--color-text)]">
                        {formatPrice(item.priceValue * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                    {!taxSummary.enabled ? (
                      <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                        <span>Subtotal</span>
                        <span className="font-circular-bold text-[var(--color-text)]">
                          {formatPrice(subtotal)}
                        </span>
                      </div>
                    ) : null}
                    {discountAmount > 0 ? (
                      <div className="mt-1 flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                        <span>
                          Descuento
                          {discountType === "porcentaje" && discountValue.trim()
                            ? ` (${discountValue.trim()}%)`
                            : ""}
                        </span>
                        <span className="font-circular-bold text-[#ef4444]">
                          -{formatPrice(discountAmount)}
                        </span>
                      </div>
                    ) : null}
                    {taxSummary.enabled ? (
                      <>
                        <div className="font-sora-extrabold mt-1 flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                          <span>Op. gravadas</span>
                          <span className="text-[var(--color-text)]">
                            {formatPrice(taxSummary.opGravadas)}
                          </span>
                        </div>
                        {taxSummary.opExoneradas > 0 ? (
                          <div className="font-sora-extrabold mt-1 flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                            <span>Op. exoneradas</span>
                            <span className="text-[var(--color-text)]">
                              {formatPrice(taxSummary.opExoneradas)}
                            </span>
                          </div>
                        ) : null}
                        {taxSummary.opInafectas > 0 ? (
                          <div className="font-sora-extrabold mt-1 flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                            <span>Op. inafectas</span>
                            <span className="text-[var(--color-text)]">
                              {formatPrice(taxSummary.opInafectas)}
                            </span>
                          </div>
                        ) : null}
                        <div className="font-sora-extrabold mt-1 flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
                          <span>IGV ({taxSummary.igvPercent.toFixed(2)}%)</span>
                          <span className="text-[var(--color-text)]">
                            {formatPrice(taxSummary.igv)}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                    <div className="flex items-center justify-between text-sm font-black text-[var(--color-text)]">
                      <span>Total</span>
                      <span className="font-circular-bold">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                  <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-circular-bold text-white">
                    {noteTypeLabels[selectedNoteType] ?? selectedNoteType}
                  </span>
                  {selectedClient && (
                    <span className="truncate">
                      Cliente: {selectedClient.displayName}
                    </span>
                  )}
                </div>
                {note.trim() ? (
                  <div className="mt-2 rounded-[12px] bg-[var(--color-background)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                    {note.trim()}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {noteTypeOptions?.length ? (
                <label>
                  <span className="mb-2 block text-sm font-black text-[var(--color-text)]">
                    Comprobante
                  </span>
                  <NativeSelect
                    value={selectedNoteType}
                    onChange={(event) =>
                      onSelectedNoteTypeChange?.(event.target.value)
                    }
                    className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    {noteTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              ) : null}

              {onSelectedClientChange ? (
                <div className="rounded-[8px] bg-[var(--color-input-bg)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    {selectedClient ? (
                      <UserAvatar
                        seed={selectedClient.id}
                        name={selectedClient.displayName}
                        size={40}
                      />
                    ) : (
                      <GenericClientAvatar size={40} />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-[var(--color-muted-foreground)]">Cliente</span>
                      <span className="block truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {selectedClient?.displayName ?? "Cliente generico"}
                      </span>
                      <span className="block text-xs uppercase text-[var(--color-muted-foreground)]">
                        {selectedClient
                          ? `${selectedClient.tipoDocumento}: ${selectedClient.numeroDocumento ?? "Sin documento"}`
                          : "Sin documento"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsClientPickerOpen(true)}
                      className="flex h-9 shrink-0 items-center gap-2 rounded-[8px] bg-white px-3 text-xs font-circular-bold text-[var(--color-primary)]"
                    >
                      <NotePencilIcon size={16} weight="bold" />
                      Cambiar o actualizar
                    </button>
                  </div>
                  {isInvoiceClientInvalid ? (
                    <div className="mt-3 rounded-[8px] bg-[#fff3e8] p-3 text-xs text-[#b45309]">
                      Para emitir factura selecciona un cliente con RUC de 11 digitos y razon social.
                      <button
                        type="button"
                        onClick={() => setIsClientPickerOpen(true)}
                        className="mt-2 block font-circular-bold text-[var(--color-primary)]"
                      >
                        Seleccionar cliente con RUC
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <CreditCardIcon
                    size={18}
                    weight="bold"
                    className="text-[var(--color-muted-foreground)]"
                  />
                  <span className="text-sm font-black text-[var(--color-text)]">
                    Metodo de pago
                  </span>
                </div>

                {!hasEntries &&
                  (isLoadingMethods ? (
                    <div className="flex items-center justify-center py-6">
                      <SpinnerGapIcon
                        size={24}
                        weight="bold"
                        className="animate-spin text-[var(--color-muted-foreground)]"
                      />
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="rounded-[14px] bg-[var(--color-input-bg)] p-4 text-center">
                      <p className="text-sm font-circular-regular text-[var(--color-muted-foreground)]">
                        No hay metodos de pago disponibles
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map((method) => {
                        const config = getPaymentMethodConfig(method.nombre);
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedMethod(method)}
                            className={cn(
                              "flex h-16 items-center gap-2 rounded-[14px] px-3 text-sm font-circular-bold transition-colors duration-150",
                              selectedMethod?.id === method.id
                                ? "bg-[var(--color-primary)] text-white shadow-md scale-[0.98]"
                                : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                            )}
                          >
                            {config ? (
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                  config.bgColor,
                                )}
                              >
                                <Image
                                  src={config.src}
                                  width={32}
                                  height={32}
                                  alt={config.label}
                                  className="h-5 w-5 object-contain"
                                />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                                <CreditCardIcon
                                  size={16}
                                  weight="bold"
                                  className={cn(
                                    selectedMethod?.id === method.id
                                      ? "text-white"
                                      : "text-[var(--color-primary)]",
                                  )}
                                />
                              </div>
                            )}
                            <span className="truncate">{method.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}

                {selectedMethod && !hasEntries && (
                  <div className="mt-3 space-y-3">
                    {!hasEntries && selectedMethod.permiteVuelto ? (
                      <div className="rounded-[14px] bg-[var(--color-input-bg)] p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                              Monto aplicado
                            </p>
                            <p className="mt-1 text-sm font-black text-[var(--color-text)]">
                              {formatPrice(total)}
                            </p>
                          </div>
                          <label>
                            <span className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                              Recibido
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={selectedReceivedAmount}
                              onChange={(e) =>
                                setSelectedReceivedAmount(e.target.value)
                              }
                              className="mt-1 h-9 w-full rounded-[10px] bg-[var(--color-background)] px-3 text-sm font-circular-bold text-[var(--color-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                            />
                          </label>
                        </div>
                        <div
                          className={cn(
                            "mt-2 rounded-[10px] px-3 py-2 text-xs font-circular-bold",
                            hasInvalidSelectedChange
                              ? "bg-[#ef4444]/10 text-[#ef4444]"
                              : "bg-[#10b981]/10 text-[#10b981]",
                          )}
                        >
                          {hasInvalidSelectedChange
                            ? "El recibido no puede ser menor al monto aplicado"
                            : `Vuelto ${formatPrice(selectedChange)}`}
                        </div>
                      </div>
                    ) : null}

                    {!hasEntries &&
                    selectedMethod &&
                    !selectedMethod.permiteVuelto ? (
                      <p className="rounded-[12px] bg-[var(--color-input-bg)] px-3 py-2 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                        Este método no permite vuelto
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => startSplitPayment(selectedMethod)}
                      className="inline-flex items-center gap-1 text-sm font-circular-bold text-[var(--color-primary)] hover:underline"
                    >
                      <PlusIcon size={14} weight="bold" />
                      Agregar pago
                    </button>
                  </div>
                )}
              </div>

              {hasEntries && (
                <div className="rounded-[14px] bg-[var(--color-input-bg)] p-2">
                  <div className="mb-2 flex items-center justify-between px-1 text-sm font-circular-bold text-[var(--color-text)]">
                    <span>Total</span>
                    <span>{paidAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {paymentEntries.map((entry) => {
                      const config = getPaymentMethodConfig(
                        entry.method.nombre,
                      );

                      return (
                        <div
                          key={entry.uid}
                          className="rounded-[12px] bg-[var(--color-background)]"
                        >
                          <div className="grid grid-cols-[minmax(104px,1fr)_30px_minmax(74px,96px)_26px_26px] items-center gap-1 overflow-hidden rounded-[12px]">
                            <div className="flex min-w-0 items-center gap-1.5 border-l border-[var(--color-border)]/60 px-2">
                              {config ? (
                                <Image
                                  src={config.src}
                                  width={20}
                                  height={20}
                                  alt={config.label}
                                  className="h-4 w-4 shrink-0 object-contain"
                                />
                              ) : (
                                <CreditCardIcon
                                  size={15}
                                  weight="bold"
                                  className="shrink-0 text-[var(--color-muted-foreground)]"
                                />
                              )}
                              <NativeSelect
                                aria-label="Metodo de pago"
                                value={entry.method.id}
                                onChange={(event) =>
                                  updateEntryMethod(
                                    entry.uid,
                                    event.target.value,
                                  )
                                }
                                className="h-8 min-w-0 flex-1 bg-transparent text-xs font-circular-bold text-[var(--color-text)] outline-none"
                              >
                                {paymentMethods.map((method) => (
                                  <option key={method.id} value={method.id}>
                                    {method.nombre}
                                  </option>
                                ))}
                              </NativeSelect>
                            </div>
                            <div className="flex h-8 items-center justify-center border-l border-[var(--color-border)]/60 text-xs font-circular-bold text-[var(--color-text)]">
                              S/
                            </div>
                            <input
                              aria-label="Monto aplicado"
                              type="number"
                              step="0.01"
                              min="0"
                              value={entry.amount}
                              onChange={(event) =>
                                updateEntryAmount(entry.uid, event.target.value)
                              }
                              className="h-8 min-w-0 border-l border-[var(--color-border)]/60 bg-transparent px-2 text-right text-xs font-circular-bold text-[var(--color-text)] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReferenceUid((current) =>
                                  current === entry.uid ? null : entry.uid,
                                )
                              }
                              title="Agregar referencia"
                              className={cn(
                                "flex h-8 w-6 items-center justify-center border-l border-[var(--color-border)]/60 transition-colors",
                                expandedReferenceUid === entry.uid
                                  ? "text-[var(--color-primary)]"
                                  : "text-[var(--color-text)] hover:text-[var(--color-primary)]",
                              )}
                            >
                              <NotePencilIcon size={14} weight="bold" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEntry(entry.uid)}
                              title="Eliminar pago"
                              className="flex h-8 w-6 items-center justify-center text-[var(--color-muted-foreground)] transition-colors hover:text-[#ef4444]"
                            >
                              <TrashIcon size={13} weight="bold" />
                            </button>
                          </div>

                          <div
                            className={cn(
                              "grid transition-colors duration-200 ease-out",
                              expandedReferenceUid === entry.uid
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0",
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="border-t border-[var(--color-border)]/60 px-2 py-2">
                                <input
                                  type="text"
                                  value={entry.reference}
                                  onChange={(event) =>
                                    updateEntryReference(
                                      entry.uid,
                                      event.target.value,
                                    )
                                  }
                          placeholder="Referencia (opcional)"
                                  aria-label="Referencia (opcional)"
                                  className="h-8 w-full rounded-[9px] bg-[var(--color-input-bg)] px-2 text-xs text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const fallbackMethod =
                        selectedMethod ?? paymentMethods[0] ?? null;
                      if (fallbackMethod) addPayment(fallbackMethod);
                    }}
                    className="mt-2 inline-flex text-xs font-circular-bold text-[var(--color-primary)] hover:underline"
                  >
                    + Pago
                  </button>
                </div>
              )}

              {false && hasEntries && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Pagos agregados
                  </p>
                  {paymentEntries.map((entry, index) => {
                    const sameMethodCount = paymentEntries.filter(
                      (e) => e.method.id === entry.method.id,
                    ).length;
                    const amountValue = parseAmount(entry.amount);
                    const receivedValue = parseAmount(
                      entry.receivedAmount || entry.amount,
                    );
                    const entryChange = Math.max(
                      0,
                      receivedValue - amountValue,
                    );
                    const entryHasInvalidChange =
                      entry.method.permiteVuelto &&
                      receivedValue + 0.005 < amountValue;
                    return (
                      <div
                        key={entry.uid}
                        className="rounded-[14px] bg-[var(--color-input-bg)] p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const config = getPaymentMethodConfig(
                                entry.method.nombre,
                              );
                              return config ? (
                                <div
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                    config.bgColor,
                                  )}
                                >
                                  <Image
                                    src={config.src}
                                    width={28}
                                    height={28}
                                    alt={config.label}
                                    className="h-4 w-4 object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10">
                                  <CreditCardIcon
                                    size={14}
                                    weight="bold"
                                    className="text-[var(--color-primary)]"
                                  />
                                </div>
                              );
                            })()}
                            <span className="text-sm font-circular-bold text-[var(--color-text)]">
                              {entry.method.nombre}
                              {sameMethodCount > 1 && ` #${index + 1}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-label="Eliminar pago"
                            onClick={() => removeEntry(entry.uid)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] transition-colors hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                          >
                            <TrashIcon size={14} weight="bold" />
                          </button>
                        </div>
                        <label>
                          <span className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                            Monto aplicado
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.amount}
                            onChange={(e) =>
                              updateEntryAmount(entry.uid, e.target.value)
                            }
                            placeholder="Monto aplicado"
                            className="mt-1 h-10 w-full rounded-[10px] bg-[var(--color-background)] px-3 text-sm font-circular-bold text-[var(--color-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                          />
                        </label>
                        {entry.method.permiteVuelto ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                                Recibido
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={entry.receivedAmount}
                                onChange={(e) =>
                                  updateEntryReceivedAmount(
                                    entry.uid,
                                    e.target.value,
                                  )
                                }
                                placeholder="Recibido"
                                className="mt-1 h-9 w-full rounded-[10px] bg-[var(--color-background)] px-3 text-sm font-circular-bold text-[var(--color-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                              />
                            </label>
                            <div>
                              <span className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                                Vuelto
                              </span>
                              <div
                                className={cn(
                                  "mt-1 flex h-9 items-center rounded-[10px] px-3 text-sm font-circular-bold",
                                  entryHasInvalidChange
                                    ? "bg-[#ef4444]/10 text-[#ef4444]"
                                    : "bg-[#10b981]/10 text-[#10b981]",
                                )}
                              >
                                {entryHasInvalidChange
                                  ? "Revisar"
                                  : formatPrice(entryChange)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="rounded-[10px] bg-[var(--color-background)] px-3 py-2 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
                            Este método no permite vuelto
                          </p>
                        )}
                        <input
                          type="text"
                          value={entry.reference}
                          onChange={(e) =>
                            updateEntryReference(entry.uid, e.target.value)
                          }
                          placeholder="Referencia (opcional)"
                          aria-label="Referencia (opcional)"
                          className="h-9 w-full rounded-[10px] bg-[var(--color-background)] px-3 text-xs text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {hasEntries && (
                <div
                  className={cn(
                    "font-circular-bold rounded-[12px] p-3 text-center text-sm font-black",
                    Math.abs(remaining) < 0.005
                      ? "bg-[#10b981]/10 text-[#10b981]"
                      : isOverpaying
                        ? "bg-[#ef4444]/10 text-[#ef4444]"
                        : "bg-[#f59e0b]/10 text-[#f59e0b]",
                  )}
                >
                  {Math.abs(remaining) < 0.005
                    ? "Pago completo"
                    : isOverpaying
                      ? `Excedido por ${formatPrice(Math.abs(remaining))}`
                      : `Falta ${formatPrice(remaining)}`}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeftIcon size={16} />
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canConfirm || isSubmitting}
                  className="font-circular-bold flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#ff7417] text-sm font-black text-white shadow-[0_8px_18px_rgba(255,116,23,0.3)] transition-colors hover:bg-[#f2670a] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <SpinnerGapIcon
                      size={18}
                      weight="bold"
                      className="animate-spin"
                    />
                  ) : (
                    <CreditCardIcon size={18} weight="bold" />
                  )}
                  {isSubmitting
                    ? "Procesando..."
                    : (submitTitle ??
                      (hasEntries
                        ? "Confirmar venta"
                        : `Cobrar ${formatPrice(total)}`))}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {onSelectedClientChange ? (
        <ClientPickerModal
          isOpen={isClientPickerOpen}
          onClose={() => setIsClientPickerOpen(false)}
          selectedClient={selectedClient}
          requireRuc={selectedNoteType === "factura"}
          onSelect={onSelectedClientChange}
        />
      ) : null}
    </div>
  );
}

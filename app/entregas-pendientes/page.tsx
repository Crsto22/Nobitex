"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PackageIcon,
  ReceiptIcon,
  SpinnerGapIcon,
  TruckIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  GenericClientAvatar,
  UserAvatar,
} from "@/components/UserAvatar/user-avatar";
import { cn } from "@/lib/utils";
import {
  salesApi,
  type DeliveryStatusQuery,
  type VentaResponse,
} from "@/lib/api/sales";

const tabConfig: Array<{ label: string; value: DeliveryStatusQuery }> = [
  { label: "Ventas pendientes", value: "pendiente" },
  { label: "Ventas entregadas", value: "entregada" },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  const hours = date.getHours();
  const displayHours = hours % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  return `${displayHours}:${minutes} ${period}`;
}

function pendingQuantity(sale: VentaResponse) {
  return sale.detalles.reduce(
    (sum, detail) =>
      sum + Math.max(0, detail.cantidad - detail.cantidadEntregada),
    0,
  );
}

function deliveredQuantity(sale: VentaResponse) {
  return sale.detalles.reduce((sum, detail) => sum + detail.cantidadEntregada, 0);
}

function customerName(sale: VentaResponse) {
  return sale.cliente?.nombre || "Cliente generico";
}

export default function PendingDeliveriesPage() {
  const [activeTab, setActiveTab] = useState<DeliveryStatusQuery>("pendiente");
  const [sales, setSales] = useState<VentaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<VentaResponse | null>(null);
  const toast = useSystemToast();

  const totalProducts = sales.reduce(
    (sum, sale) =>
      sum +
      (activeTab === "pendiente"
        ? pendingQuantity(sale)
        : deliveredQuantity(sale)),
    0,
  );

  const loadDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await salesApi.findDeliveries(activeTab);
      setSales(response.data);
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudieron cargar entregas",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDeliveries();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDeliveries]);

  return (
    <DashboardShell headerTitle="Entregas pendientes">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                <PackageIcon size={22} weight="fill" className="text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {activeTab === "pendiente" ? "Por entregar" : "Entregadas"}
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {sales.length}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <TruckIcon size={22} weight="fill" className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Productos
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {totalProducts}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <CheckCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Estado
                </p>
                <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
                  {activeTab === "pendiente" ? "Activo" : "OK"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="flex w-full rounded-[16px] bg-[var(--color-input-bg)] p-1 sm:max-w-md">
            {tabConfig.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "h-10 flex-1 rounded-[14px] px-3 text-sm font-circular-bold transition-colors",
                  activeTab === tab.value
                    ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadDeliveries()}
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-5 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          >
            <SpinnerGapIcon
              size={16}
              weight="bold"
              className={cn(isLoading && "animate-spin")}
            />
            Actualizar
          </button>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[var(--color-input-bg)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-[var(--color-input-bg)]" />
                    <div className="h-3 w-40 rounded bg-[var(--color-input-bg)]" />
                  </div>
                  <div className="h-4 w-20 rounded bg-[var(--color-input-bg)]" />
                </div>
              </div>
            ))
          ) : sales.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <PackageIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No hay ventas en este estado
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Cambia de pestaña o actualiza la lista
                </p>
              </div>
            </div>
          ) : (
            sales.map((sale) => {
              const clientName = customerName(sale);
              const docLabel =
                sale.cliente?.tipoDocumento === "ruc"
                  ? "RUC"
                  : sale.cliente?.tipoDocumento === "dni"
                    ? "DNI"
                    : "";
              const docNumber = sale.cliente?.numeroDocumento || "";
              const productQuantity =
                activeTab === "pendiente"
                  ? pendingQuantity(sale)
                  : deliveredQuantity(sale);

              return (
                <div
                  key={sale.publicId}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(112px,0.8fr)_minmax(170px,1.45fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_minmax(104px,0.85fr)_112px] md:items-center md:gap-3 md:gap-y-0 xl:grid-cols-[150px_minmax(220px,1.4fr)_140px_160px_130px_120px] xl:gap-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <ReceiptIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {sale.correlativo}
                      </p>
                      <p className="truncate text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        {sale.codigoInterno}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3 sm:w-56">
                    {sale.cliente ? (
                      <UserAvatar
                        seed={sale.cliente.id}
                        name={sale.cliente.nombre}
                        size={40}
                        className="size-10"
                      />
                    ) : (
                      <GenericClientAvatar size={40} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {clientName}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                        {docLabel ? `${docLabel} ${docNumber}` : "Sin documento"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center md:justify-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] font-circular-regular">
                          {formatDate(sale.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] font-circular-regular">
                          {formatTime(sale.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        {activeTab === "pendiente"
                          ? "Recojo hasta"
                          : "Fecha entregada"}
                      </p>
                      <p className="text-xs text-[var(--color-text)] font-circular-regular">
                        {formatDate(
                          activeTab === "pendiente"
                            ? sale.recojoHasta
                            : sale.fechaEntrega,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        {activeTab === "pendiente" ? "Pendientes" : "Entregados"}
                      </p>
                      <p className="text-sm font-circular-bold text-[var(--color-text)] font-circular-regular">
                        {productQuantity}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-end md:col-span-1">
                    {activeTab === "pendiente" ? (
                      <button
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-opacity hover:opacity-90"
                      >
                        <TruckIcon size={16} weight="bold" />
                        Entregar
                      </button>
                    ) : (
                      <div className="flex h-9 items-center justify-center gap-2 rounded-[14px] bg-[#10b981]/10 px-4 text-xs font-circular-bold text-[#047857]">
                        <CheckCircleIcon size={16} weight="bold" />
                        Entregado
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedSale ? (
        <DeliverModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onDelivered={() => {
            setSelectedSale(null);
            void loadDeliveries();
          }}
        />
      ) : null}
    </DashboardShell>
  );
}

function DeliverModal({
  sale,
  onClose,
  onDelivered,
}: {
  sale: VentaResponse;
  onClose: () => void;
  onDelivered: () => void;
}) {
  const initialQuantities = useMemo(
    () =>
      Object.fromEntries(
        sale.detalles.map((detail) => [
          detail.id,
          Math.max(0, detail.cantidad - detail.cantidadEntregada),
        ]),
      ),
    [sale.detalles],
  );
  const [quantities, setQuantities] =
    useState<Record<string, number>>(initialQuantities);
  const [retiranteDni, setRetiranteDni] = useState("");
  const [retiranteNombre, setRetiranteNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();

  const detalles = sale.detalles.map((detail) => {
    const pendiente = Math.max(0, detail.cantidad - detail.cantidadEntregada);
    return {
      detail,
      pendiente,
      cantidad: Math.min(quantities[detail.id] ?? 0, pendiente),
    };
  });
  const totalToDeliver = detalles.reduce((sum, item) => sum + item.cantidad, 0);

  const setAll = () => {
    setQuantities(initialQuantities);
  };

  const submit = async () => {
    if (totalToDeliver <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await salesApi.deliver(sale.publicId, {
        detalles: detalles
          .filter((item) => item.cantidad > 0)
          .map((item) => ({
            ventaDetalleId: item.detail.id,
            cantidad: item.cantidad,
          })),
        retiranteDni: retiranteDni.trim() || undefined,
        retiranteNombre: retiranteNombre.trim() || undefined,
        notas: notas.trim() || undefined,
      });
      toast.showToast({
        title: "Entrega registrada",
        description: sale.codigoInterno,
        variant: "success",
      });
      onDelivered();
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudo entregar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-6">
      <div className="w-full max-w-2xl rounded-[14px] bg-[var(--color-card)] shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5">
          <div>
            <h2 className="text-lg font-black text-[var(--color-text)]">
              Entregar {sale.codigoInterno}
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {sale.correlativo} - {customerName(sale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
            aria-label="Cerrar"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={setAll}
              className="h-9 rounded-[14px] bg-[var(--color-input-bg)] px-4 text-xs font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              Entregar todo
            </button>
          </div>

          <div className="space-y-2">
            {detalles.map(({ detail, pendiente, cantidad }) => (
              <div
                key={detail.id}
                className="grid grid-cols-[1fr_110px] gap-3 rounded-[14px] bg-[var(--color-input-bg)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                    {detail.descripcion ??
                      detail.productoVariante.producto.nombre}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Total {detail.cantidad} - Entregado{" "}
                    {detail.cantidadEntregada} - Pendiente {pendiente}
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={pendiente}
                  value={cantidad}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setQuantities((current) => ({
                      ...current,
                      [detail.id]: Number.isFinite(next)
                        ? Math.max(0, Math.min(pendiente, next))
                        : 0,
                    }));
                  }}
                  className="h-10 rounded-[14px] bg-[var(--color-card)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              value={retiranteDni}
              onChange={(event) => setRetiranteDni(event.target.value)}
              placeholder="DNI quien retira (opcional)"
              className="h-10 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <input
              type="text"
              value={retiranteNombre}
              onChange={(event) => setRetiranteNombre(event.target.value)}
              placeholder="Nombre quien retira (opcional)"
              className="h-10 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <textarea
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Notas (opcional)"
            rows={3}
            className="w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 flex-1 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)] disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={totalToDeliver <= 0 || isSubmitting}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
              ) : (
                <TruckIcon size={18} weight="bold" />
              )}
              Entregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

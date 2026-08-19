"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  PackageIcon,
  SpinnerGapIcon,
  TruckIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
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
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function pendingQuantity(sale: VentaResponse) {
  return sale.detalles.reduce(
    (sum, detail) =>
      sum + Math.max(0, detail.cantidad - detail.cantidadEntregada),
    0,
  );
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
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-[var(--color-background)] p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-[var(--color-text)]">
              Entregas pendientes
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Ventas marcadas para recojo posterior.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDeliveries()}
            className="h-10 rounded-[8px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Actualizar
          </button>
        </div>

        <div className="mb-4 flex w-full max-w-md rounded-[8px] bg-[var(--color-input-bg)] p-1">
          {tabConfig.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "h-9 flex-1 rounded-[6px] px-3 text-sm font-circular-bold transition-colors",
                activeTab === tab.value
                  ? "bg-white text-[var(--color-primary)] shadow-sm"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-[var(--color-card)]">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerGapIcon
                size={28}
                weight="bold"
                className="animate-spin text-[var(--color-muted-foreground)]"
              />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <PackageIcon
                size={34}
                weight="bold"
                className="text-[var(--color-muted-foreground)]"
              />
              <p className="text-sm font-circular-bold text-[var(--color-text)]">
                No hay ventas en este estado
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-input-bg)] text-xs uppercase text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">Venta</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Fecha venta</th>
                    <th className="px-4 py-3">Recojo hasta</th>
                    <th className="px-4 py-3">Productos</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr
                      key={sale.publicId}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="font-circular-bold text-[var(--color-text)]">
                          {sale.codigoInterno}
                        </div>
                        <div className="text-xs text-[var(--color-muted-foreground)]">
                          {sale.correlativo}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text)]">
                        <div>{customerName(sale)}</div>
                        <div className="text-xs uppercase text-[var(--color-muted-foreground)]">
                          {sale.cliente
                            ? `${sale.cliente.tipoDocumento}: ${sale.cliente.numeroDocumento}`
                            : "Sin documento"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                        {formatDate(sale.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                        {formatDate(sale.recojoHasta)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text)]">
                        {activeTab === "pendiente"
                          ? `${pendingQuantity(sale)} pendiente(s)`
                          : `${sale.detalles.reduce((sum, d) => sum + d.cantidadEntregada, 0)} entregado(s)`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-circular-bold",
                            sale.estadoEntrega === "entregada"
                              ? "bg-[#10b981]/10 text-[#047857]"
                              : "bg-[#f59e0b]/10 text-[#b45309]",
                          )}
                        >
                          {sale.estadoEntrega}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {activeTab === "pendiente" ? (
                          <button
                            type="button"
                            onClick={() => setSelectedSale(sale)}
                            className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white hover:opacity-90"
                          >
                            <TruckIcon size={16} weight="bold" />
                            Entregar
                          </button>
                        ) : (
                          <CheckCircleIcon
                            size={20}
                            weight="bold"
                            className="ml-auto text-[#10b981]"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      <div className="w-full max-w-2xl rounded-[8px] bg-[var(--color-card)] shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
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
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
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
              className="h-9 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              Entregar todo
            </button>
          </div>

          <div className="space-y-2">
            {detalles.map(({ detail, pendiente, cantidad }) => (
              <div
                key={detail.id}
                className="grid grid-cols-[1fr_110px] gap-3 rounded-[8px] bg-[var(--color-input-bg)] p-3"
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
                  className="h-10 rounded-[8px] bg-white px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
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
              className="h-10 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <input
              type="text"
              value={retiranteNombre}
              onChange={(event) => setRetiranteNombre(event.target.value)}
              placeholder="Nombre quien retira (opcional)"
              className="h-10 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <textarea
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Notas (opcional)"
            rows={3}
            className="w-full rounded-[8px] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 flex-1 rounded-[8px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)] disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={totalToDeliver <= 0 || isSubmitting}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90 disabled:opacity-50"
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

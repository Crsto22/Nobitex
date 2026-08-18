"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartLineUpIcon,
  PackageIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { CalendarInput } from "@/components/ui/calendar-input";
import { Select } from "@/components/ui/select";
import { stockApi, stockProductLabel, type StockKardex } from "@/lib/api/stock";

type Location = Awaited<ReturnType<typeof stockApi.locations>>[number];

const movementLabels: Record<string, string> = {
  saldo_apertura: "Saldo de apertura",
  stock_inicial: "Stock inicial",
  entrada_manual: "Entrada manual",
  salida_manual: "Salida manual",
  ajuste_producto: "Ajuste de producto",
  venta: "Venta",
  anulacion_venta: "Anulacion de venta",
  nota_credito: "Nota de credito",
  traspaso_entrada: "Traspaso recibido",
  traspaso_salida: "Traspaso enviado",
};

export default function StockKardexDetailPage() {
  const params = useParams<{ variantPublicId: string }>();
  const variantPublicId = Array.isArray(params.variantPublicId)
    ? params.variantPublicId[0]
    : params.variantPublicId;
  const { showToast } = useSystemToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [kardex, setKardex] = useState<StockKardex | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    stockApi
      .locations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const load = useCallback(async () => {
    if (!variantPublicId) return;
    setLoading(true);
    try {
      const result = await stockApi.kardexByVariantPublicId(variantPublicId, {
        sucursalId: branchId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: 25,
      });
      setKardex(result);
    } catch (error) {
      showToast({
        title: "No se pudo cargar el Kardex",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [branchId, from, page, showToast, to, variantPublicId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const selectedLabel = kardex?.producto
    ? stockProductLabel(kardex.producto)
    : "Kardex";

  return (
    <DashboardShell
      headerParent={{ label: "Kardex", href: "/stock/kardex" }}
      headerTitle={selectedLabel}
    >
      <div className="min-h-full space-y-3 bg-[var(--color-background)] p-3 sm:space-y-4 sm:p-4 lg:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            icon={<PackageIcon size={22} weight="fill" />}
            label="Saldo inicial"
            value={kardex?.resumen.saldoInicial ?? 0}
          />
          <Metric
            icon={<ArrowDownIcon size={22} weight="fill" />}
            label="Entradas"
            value={kardex?.resumen.entradas ?? 0}
            tone="success"
          />
          <Metric
            icon={<ArrowUpIcon size={22} weight="fill" />}
            label="Salidas"
            value={kardex?.resumen.salidas ?? 0}
            tone="danger"
          />
          <Metric
            icon={<PackageIcon size={22} weight="fill" />}
            label="Saldo final"
            value={kardex?.resumen.saldoFinal ?? 0}
          />
          <Metric
            icon={<ChartLineUpIcon size={22} weight="fill" />}
            label="Valor inicial"
            value={money(kardex?.resumen.valorInicial)}
            money
          />
          <Metric
            icon={<ArrowDownIcon size={22} weight="fill" />}
            label="Valor entradas"
            value={money(kardex?.resumen.valorEntradas)}
            tone="success"
            money
          />
          <Metric
            icon={<ArrowUpIcon size={22} weight="fill" />}
            label="Valor salidas"
            value={money(kardex?.resumen.valorSalidas)}
            tone="danger"
            money
          />
          <Metric
            icon={<ChartLineUpIcon size={22} weight="fill" />}
            label="Valor final"
            value={money(kardex?.resumen.valorFinal)}
            money
          />
        </div>

        <section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_0.8fr_0.8fr_auto]">
            <Select
              className="order-2 md:order-1"
              value={branchId}
              onChange={(value) => {
                setBranchId(value);
                setPage(1);
              }}
              placeholder="Todas las ubicaciones"
              options={[
                { value: "", label: "Todas las ubicaciones" },
                ...locations.map((location) => ({
                  value: location.id,
                  label: location.nombre,
                })),
              ]}
            />
            <CalendarInput
              className="order-1 md:order-2"
              value={from}
              onChange={(value) => {
                setFrom(value);
                setPage(1);
              }}
              labelInline="Desde"
              clearable
            />
            <CalendarInput
              className="order-1 md:order-3"
              value={to}
              onChange={(value) => {
                setTo(value);
                setPage(1);
              }}
              labelInline="Hasta"
              clearable
            />
            <button
              onClick={() => void load()}
              className="order-3 h-11 rounded-[14px] bg-[#102a43] px-4 text-sm font-circular-bold text-white md:order-4"
            >
              Actualizar
            </button>
          </div>
        </section>

        <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Variante
              </p>
              <h2 className="truncate text-base font-circular-bold text-[var(--color-text)]">
                {selectedLabel}
              </h2>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {kardex?.meta.total ?? 0} movimientos
            </p>
          </div>

          <div className="space-y-2">
            {kardex?.data.map((row) => (
              <article
                key={row.id}
                className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-background)] p-3 md:grid-cols-[1fr_0.8fr_0.8fr_0.9fr_1fr] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                    {movementLabels[row.tipo]}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDateTime(row.createdAt)} ·{" "}
                    {row.sucursal.nombre}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Cantidad
                  </p>
                  <p
                    className={`font-circular-bold ${row.direccion === "entrada" ? "text-[#059669]" : "text-[#ea580c]"}`}
                  >
                    {row.direccion === "entrada" ? "+" : "-"}
                    {row.cantidad}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Saldo
                  </p>
                  <p className="text-sm font-circular-bold text-[var(--color-text)]">
                    {row.stockAnterior} → {row.stockPosterior}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Costo prom.
                  </p>
                  <p className="text-sm font-circular-bold text-[var(--color-text)]">
                    {money(row.costoPromedioPosterior)}
                  </p>
                </div>
                <div className="min-w-0 md:text-right">
                  <p className="truncate text-sm text-[var(--color-text)]">
                    {row.motivo || "Sin motivo"}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Valor mov. {money(row.valorMovimiento)}
                  </p>
                </div>
              </article>
            ))}
            {!kardex?.data.length && !loading ? (
              <div className="rounded-[14px] bg-[var(--color-background)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">
                Sin movimientos para los filtros seleccionados
              </div>
            ) : null}
            {loading ? (
              <p className="py-3 text-center text-sm text-[var(--color-muted-foreground)]">
                Actualizando...
              </p>
            ) : null}
          </div>
        </section>

        {kardex && kardex.meta.totalPages > 1 ? (
          <div className="flex items-center justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {page} / {kardex.meta.totalPages}
            </span>
            <button
              disabled={page >= kardex.meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function money(value?: string | null) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("es-PE", { style: "currency", currency: "PEN" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "p. m." : "a. m.";
  const displayHours = hours % 12 || 12;

  return `${day}/${month}/${year}, ${displayHours}:${minutes} ${period}`;
}

function Metric({
  icon,
  label,
  value,
  tone = "primary",
  money = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "primary" | "success" | "danger" | "info";
  money?: boolean;
}) {
  const toneClassName = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    danger: "bg-[#ef4444]/10 text-[#ef4444]",
    info: "bg-[#3b82f6]/10 text-[#3b82f6]",
  }[tone];

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-3 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClassName}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="truncate text-xl font-circular-bold leading-none text-[var(--color-text)] sm:text-2xl">
            {money ? value : Number(value).toLocaleString("es-PE")}
          </p>
        </div>
      </div>
    </div>
  );
}

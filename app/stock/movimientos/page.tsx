"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsDownUpIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Select } from "@/components/ui/select";
import { CalendarInput } from "@/components/ui/calendar-input";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { branchesApi, type Branch } from "@/lib/api/branches";
import {
  stockApi,
  stockProductLabel,
  type StockMovement,
  type StockMovementType,
} from "@/lib/api/stock";

const movementLabels: Record<StockMovementType, string> = {
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

export default function StockMovementsPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    branchesApi
      .findAll({ page: 1, limit: 100 })
      .then((result) => setBranches(result.data))
      .catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await stockApi.movements({
        page: meta.page,
        limit: meta.limit,
        search: search.trim() || undefined,
        sucursalId: branchId || undefined,
        tipo: (type || undefined) as StockMovementType | undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(result.data);
      setMeta(result.meta);
    } catch (error) {
      showToast({
        title: "No se pudo cargar el historial",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [branchId, from, meta.limit, meta.page, search, showToast, to, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pageEntries = useMemo(
    () => rows.filter((row) => row.direccion === "entrada").reduce((sum, row) => sum + row.cantidad, 0),
    [rows],
  );
  const pageExits = useMemo(
    () => rows.filter((row) => row.direccion === "salida").reduce((sum, row) => sum + row.cantidad, 0),
    [rows],
  );

  return (
    <DashboardShell headerTitle="Movimientos de stock">
      <div className="min-h-full space-y-4 bg-[var(--color-background)] p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-circular-bold text-[var(--color-text)]">Movimientos de stock</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">Entradas, salidas y ajustes por ubicacion.</p>
          </div>
          <button onClick={() => router.push("/stock/movimientos/nuevo")} className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white">
            <PlusIcon size={17} weight="bold" /> Nuevo movimiento
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric icon={<ArrowsDownUpIcon size={19} />} label="Movimientos" value={meta.total} featured />
          <Metric icon={<ArrowDownIcon size={19} />} label="Entradas en pagina" value={pageEntries} tone="success" />
          <Metric icon={<ArrowUpIcon size={19} />} label="Salidas en pagina" value={pageExits} tone="warning" />
        </div>

        <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.8fr_auto]">
            <div className="relative">
              <MagnifyingGlassIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Buscar producto, SKU o motivo" className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
            </div>
            <Select value={branchId} onChange={(value) => { setBranchId(value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Todas las ubicaciones" options={[{ value: "", label: "Todas las ubicaciones" }, ...branches.map((branch) => ({ value: branch.id, label: branch.nombre }))]} />
            <Select value={type} onChange={(value) => { setType(value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Todos los tipos" options={[{ value: "", label: "Todos los tipos" }, ...Object.entries(movementLabels).map(([value, label]) => ({ value, label }))]} />
            <CalendarInput value={from} onChange={(value) => { setFrom(value); setMeta((current) => ({ ...current, page: 1 })); }} labelInline="Desde" clearable />
            <CalendarInput value={to} onChange={(value) => { setTo(value); setMeta((current) => ({ ...current, page: 1 })); }} labelInline="Hasta" clearable />
            <button onClick={() => void load()} className="h-11 rounded-[14px] bg-[#102a43] px-4 text-sm font-circular-bold text-white">Actualizar</button>
          </div>
        </section>

        <section className="space-y-2">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm md:grid-cols-[1.4fr_0.8fr_0.7fr_0.8fr_1.2fr] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">{stockProductLabel(row.producto)}</p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">{row.producto.sku || "Sin SKU"} · {row.sucursal.nombre}</p>
              </div>
              <div><span className={`inline-flex rounded-full px-3 py-1 text-xs font-circular-bold ${row.direccion === "entrada" ? "bg-[#10b981]/10 text-[#059669]" : "bg-[#f97316]/10 text-[#ea580c]"}`}>{movementLabels[row.tipo]}</span></div>
              <div><p className="text-xs text-[var(--color-muted-foreground)]">Cantidad</p><p className={`font-circular-bold ${row.direccion === "entrada" ? "text-[#059669]" : "text-[#ea580c]"}`}>{row.direccion === "entrada" ? "+" : "-"}{row.cantidad}</p></div>
              <div><p className="text-xs text-[var(--color-muted-foreground)]">Saldo</p><p className="text-sm font-circular-bold text-[var(--color-text)]">{row.stockAnterior} → {row.stockPosterior}</p></div>
              <div className="min-w-0 md:text-right"><p className="truncate text-sm text-[var(--color-text)]">{row.motivo || "Sin motivo"}</p><p className="text-xs text-[var(--color-muted-foreground)]">{new Date(row.createdAt).toLocaleString("es-PE")} · {row.creadoPor ? `${row.creadoPor.nombre} ${row.creadoPor.apellido || ""}` : "Sistema"}</p></div>
            </article>
          ))}
          {!rows.length && !loading ? <div className="rounded-[14px] bg-[var(--color-card)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">Sin movimientos para los filtros seleccionados</div> : null}
          {loading ? <p className="py-3 text-center text-sm text-[var(--color-muted-foreground)]">Actualizando...</p> : null}
        </section>

        {meta.totalPages > 1 ? <div className="flex items-center justify-end gap-2"><button disabled={meta.page <= 1} onClick={() => setMeta((current) => ({ ...current, page: current.page - 1 }))} className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40">Anterior</button><span className="text-sm text-[var(--color-muted-foreground)]">{meta.page} / {meta.totalPages}</span><button disabled={meta.page >= meta.totalPages} onClick={() => setMeta((current) => ({ ...current, page: current.page + 1 }))} className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40">Siguiente</button></div> : null}
      </div>
    </DashboardShell>
  );
}

function Metric({ icon, label, value, featured = false, tone = "primary" }: { icon: React.ReactNode; label: string; value: number; featured?: boolean; tone?: "primary" | "success" | "warning" }) {
  const colors = tone === "success" ? "bg-[#10b981]/10 text-[#10b981]" : tone === "warning" ? "bg-[#f97316]/10 text-[#f97316]" : "bg-[#3b82f6]/10 text-[#3b82f6]";
  return <div className={`rounded-[14px] p-4 shadow-sm ${featured ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-card)] text-[var(--color-text)]"}`}><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${featured ? "bg-white/15" : colors}`}>{icon}</div><p className={`text-xs ${featured ? "text-white/75" : "text-[var(--color-muted-foreground)]"}`}>{label}</p><p className="text-xl font-circular-bold">{value.toLocaleString("es-PE")}</p></div>;
}

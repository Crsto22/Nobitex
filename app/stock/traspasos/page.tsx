"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  TruckIcon,
} from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Select } from "@/components/ui/select";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { stockApi, type StockTransfer } from "@/lib/api/stock";

type Location = Awaited<ReturnType<typeof stockApi.locations>>[number];

export default function StockTransfersPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [rows, setRows] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Location[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stockApi.locations().then(setBranches);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await stockApi.transfers({
        page: meta.page,
        limit: meta.limit,
        search: search.trim() || undefined,
        origenSucursalId: origin || undefined,
        destinoSucursalId: destination || undefined,
      });
      setRows(result.data);
      setMeta(result.meta);
    } catch (error) {
      showToast({ title: "No se pudieron cargar los traspasos", description: error instanceof Error ? error.message : "Intenta nuevamente.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [destination, meta.limit, meta.page, origin, search, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pageUnits = useMemo(() => rows.reduce((sum, row) => sum + row.cantidadTotal, 0), [rows]);
  const branchOptions = [{ value: "", label: "Todas las ubicaciones" }, ...branches.map((branch) => ({ value: branch.id, label: branch.nombre }))];

  return (
    <DashboardShell headerTitle="Traspasos de stock">
      <div className="min-h-full space-y-3 bg-[var(--color-background)] p-3 sm:space-y-4 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => router.push("/stock/traspasos/nuevo")} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white sm:w-auto"><PlusIcon size={17} weight="bold" /> Nuevo traspaso</button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric icon={<TruckIcon size={19} />} label="Traspasos" value={meta.total} featured />
          <Metric icon={<PackageIcon size={19} />} label="Unidades en pagina" value={pageUnits} tone="success" />
          <Metric icon={<ArrowRightIcon size={19} />} label="Ubicaciones disponibles" value={branches.length} tone="info" />
        </div>

        <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="relative"><MagnifyingGlassIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" /><input value={search} onChange={(event) => { setSearch(event.target.value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Buscar producto, ubicacion o motivo" aria-label="Buscar producto, ubicacion o motivo" className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm outline-none" /></div>
            <Select value={origin} onChange={(value) => { setOrigin(value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Todos los origenes" options={branchOptions} />
            <Select value={destination} onChange={(value) => { setDestination(value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Todos los destinos" options={branchOptions} />
            <button onClick={() => void load()} className="h-11 w-full rounded-[14px] bg-[#102a43] px-4 text-sm font-circular-bold text-white lg:w-auto">Actualizar</button>
          </div>
        </section>

        <section className="space-y-2">
          {rows.map((row) => (
            <article key={row.id} className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-sm sm:p-4 md:grid-cols-[1.1fr_auto_1.1fr_0.7fr_1fr_auto] md:items-center md:gap-3 md:gap-y-0">
              <Location label="Origen" name={row.origen.nombre} type={row.origen.tipo} />
              <ArrowRightIcon size={20} className="hidden text-[var(--color-primary)] md:block" />
              <Location label="Destino" name={row.destino.nombre} type={row.destino.tipo} />
              <div><p className="text-xs text-[var(--color-muted-foreground)]">Productos</p><p className="text-sm font-circular-bold text-[var(--color-text)]">{row.items.length} · {row.cantidadTotal} un.</p></div>
              <div className="min-w-0"><p className="truncate text-sm text-[var(--color-text)]">{row.motivo}</p><p className="text-xs text-[var(--color-muted-foreground)]">{new Date(row.createdAt).toLocaleString("es-PE")}</p></div>
              <button onClick={() => router.push(`/stock/traspasos/${row.publicId}`)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-input-bg)] text-[var(--color-primary)]" aria-label="Ver traspaso"><EyeIcon size={17} /></button>
            </article>
          ))}
          {!rows.length && !loading ? <div className="rounded-[14px] bg-[var(--color-card)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">Sin traspasos registrados</div> : null}
          {loading ? <p className="py-3 text-center text-sm text-[var(--color-muted-foreground)]">Actualizando...</p> : null}
        </section>

        {meta.totalPages > 1 ? <div className="flex items-center justify-end gap-2"><button disabled={meta.page <= 1} onClick={() => setMeta((current) => ({ ...current, page: current.page - 1 }))} className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40">Anterior</button><span className="text-sm text-[var(--color-muted-foreground)]">{meta.page} / {meta.totalPages}</span><button disabled={meta.page >= meta.totalPages} onClick={() => setMeta((current) => ({ ...current, page: current.page + 1 }))} className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40">Siguiente</button></div> : null}
      </div>
    </DashboardShell>
  );
}

function Location({ label, name, type }: { label: string; name: string; type: string }) { return <div className="min-w-0"><p className="text-xs text-[var(--color-muted-foreground)]">{label}</p><p className="truncate text-sm font-circular-bold text-[var(--color-text)]">{name}</p><p className="text-xs capitalize text-[var(--color-muted-foreground)]">{type}</p></div>; }
function Metric({ icon, label, value, featured = false, tone = "info" }: { icon: React.ReactNode; label: string; value: number; featured?: boolean; tone?: "success" | "info" }) { 
  const colors = tone === "success" ? "bg-[#10b981]/10 text-[#10b981]" : "bg-[#3b82f6]/10 text-[#3b82f6]"; 
  return <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors}`}>{icon}</div><div><p className="text-sm font-medium text-[var(--color-muted-foreground)]">{label}</p><p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">{value.toLocaleString("es-PE")}</p></div></div></div>; 
}

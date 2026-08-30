"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DotsThreeVerticalIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingCartIcon,
} from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { CalendarInput } from "@/components/ui/calendar-input";
import { Select } from "@/components/ui/select";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { purchasesApi, type PurchaseOrder } from "@/lib/api/purchases";

const documentLabels = {
  factura: "Factura",
  boleta: "Boleta",
  otro: "Otro",
} as const;

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    branchesApi.findAll({ page: 1, limit: 100, estado: "activo" }).then((result) => setBranches(result.data.filter((branch) => branch.tipo !== "asistencia"))).catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await purchasesApi.orders({
        page: meta.page,
        limit: meta.limit,
        search: search.trim() || undefined,
        destinoSucursalId: branchId || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(result.data);
      setMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, [branchId, from, meta.limit, meta.page, search, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pageTotal = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.total || 0), 0),
    [rows],
  );
  const pageUnits = useMemo(
    () => rows.reduce((sum, row) => sum + row.cantidadTotal, 0),
    [rows],
  );

  return (
    <DashboardShell headerTitle="Ordenes de compra">
      <div className="min-h-full space-y-3 bg-[var(--color-background)] p-3 sm:space-y-4 sm:p-4 lg:p-6">
        <div className="flex justify-end">
          <button onClick={() => router.push("/compras/ordenes/nuevo")} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] sm:w-auto">
            <PlusIcon size={17} weight="bold" /> Nueva orden
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric icon={<ShoppingCartIcon size={22} weight="fill" />} label="Ordenes" value={meta.total} />
          <Metric icon={<PackageIcon size={22} weight="fill" />} label="Unidades en pagina" value={pageUnits} tone="success" />
          <Metric icon={<ReceiptIcon size={22} weight="fill" />} label="Total en pagina" value={pageTotal} money />
        </div>

        <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto]">
            <div className="relative">
              <MagnifyingGlassIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Buscar proveedor, RUC o comprobante" className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
            </div>
            <Select value={branchId} onChange={(value) => { setBranchId(value); setMeta((current) => ({ ...current, page: 1 })); }} placeholder="Todos los destinos" options={[{ value: "", label: "Todos los destinos" }, ...branches.map((branch) => ({ value: branch.id, label: branch.nombre }))]} />
            <CalendarInput value={from} onChange={(value) => { setFrom(value); setMeta((current) => ({ ...current, page: 1 })); }} labelInline="Desde" clearable />
            <CalendarInput value={to} onChange={(value) => { setTo(value); setMeta((current) => ({ ...current, page: 1 })); }} labelInline="Hasta" clearable />
            <button onClick={() => void load()} className="h-11 rounded-[14px] bg-[#102a43] px-4 text-sm font-circular-bold text-white">Actualizar</button>
          </div>
        </section>

        <section className="space-y-2">
          {loading ? (
            <OrdersSkeleton />
          ) : rows.map((row) => (
            <article key={row.id} className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-sm sm:p-4 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.65fr_0.75fr_0.3fr] md:items-center md:gap-4 md:gap-y-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <ReceiptIcon size={20} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">{row.proveedor.displayName}</p>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">RUC {row.proveedor.ruc}</p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--color-text)]">{row.destino.nombre}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{row.destino.tipo === "tienda" ? "Tienda" : "Almacen"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">Productos</p>
                <p className="text-sm font-circular-bold text-[var(--color-text)]">{row.cantidadItems} / {row.cantidadTotal} und.</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">Total</p>
                <p className="text-sm font-circular-bold text-[var(--color-primary)]">{money(Number(row.total))}</p>
              </div>
              <div className="min-w-0 md:text-right">
                <p className="truncate text-sm text-[var(--color-text)]">{documentLabel(row)}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(row.createdAt).toLocaleDateString("es-PE")}</p>
              </div>
              <div className="relative flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-button-hover)]"
                  aria-label="Opciones"
                >
                  <DotsThreeVerticalIcon size={20} weight="bold" />
                </button>
                {openMenuId === row.id ? (
                  <div className="absolute right-0 top-10 z-20 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => router.push(`/compras/ordenes/${row.publicId}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-button-hover)]"
                    >
                      <EyeIcon size={16} />
                      Ver mas detalle
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {!rows.length && !loading ? <div className="rounded-[14px] bg-[var(--color-card)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">Sin ordenes registradas</div> : null}
        </section>

        {meta.totalPages > 1 ? (
          <div className="flex items-center justify-end gap-2">
            <button disabled={meta.page <= 1} onClick={() => setMeta((current) => ({ ...current, page: current.page - 1 }))} className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40">Anterior</button>
            <span className="text-sm text-[var(--color-muted-foreground)]">{meta.page} / {meta.totalPages}</span>
            <button disabled={meta.page >= meta.totalPages} onClick={() => setMeta((current) => ({ ...current, page: current.page + 1 }))} className="h-9 rounded-xl bg-[var(--color-card)] px-4 text-sm disabled:opacity-40">Siguiente</button>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function OrdersSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid animate-pulse grid-cols-2 gap-x-3 gap-y-3 rounded-[14px] bg-[var(--color-card)] p-3 shadow-sm sm:p-4 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.65fr_0.75fr_0.3fr] md:items-center md:gap-4"
        >
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock compact />
          <SkeletonBlock compact />
          <SkeletonBlock alignRight />
          <div className="flex justify-end">
            <div className="h-9 w-9 rounded-full bg-[var(--color-input-bg)]" />
          </div>
        </div>
      ))}
    </>
  );
}

function SkeletonBlock({
  compact = false,
  alignRight = false,
}: {
  compact?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={alignRight ? "space-y-2 md:items-end" : "space-y-2"}>
      <div
        className={`h-3 rounded-full bg-[var(--color-input-bg)] ${compact ? "w-16" : "w-24"} ${alignRight ? "ml-auto" : ""}`}
      />
      <div
        className={`h-4 rounded-full bg-[var(--color-input-bg)] ${compact ? "w-20" : "w-36"} ${alignRight ? "ml-auto" : ""}`}
      />
    </div>
  );
}

function documentLabel(row: PurchaseOrder) {
  if (!row.tipoComprobante) return "Sin comprobante";
  return `${documentLabels[row.tipoComprobante]} ${[row.serie, row.numero].filter(Boolean).join("-") || ""}`.trim();
}

function money(value: number) {
  return value.toLocaleString("es-PE", { style: "currency", currency: "PEN" });
}

function Metric({ icon, label, value, tone = "primary", money: isMoney = false }: { icon: ReactNode; label: string; value: number; tone?: "primary" | "success"; money?: boolean }) {
  const colors = tone === "success" ? "bg-[#10b981]/10 text-[#10b981]" : "bg-[#3b82f6]/10 text-[#3b82f6]";
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors}`}>{icon}</div>
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
          <p className="text-2xl font-circular-bold text-[var(--color-text)]">{isMoney ? money(value) : value.toLocaleString("es-PE")}</p>
        </div>
      </div>
    </div>
  );
}

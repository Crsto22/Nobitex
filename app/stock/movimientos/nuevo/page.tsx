"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  StockItemPicker,
  type SelectedStockItem,
} from "@/components/Stock/stock-item-picker";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Select } from "@/components/ui/select";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { stockApi, type StockDirection } from "@/lib/api/stock";

export default function NewStockMovementPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [direction, setDirection] = useState<StockDirection>("entrada");
  const [branchId, setBranchId] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<SelectedStockItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    branchesApi.findAll({ page: 1, limit: 100, estado: "activo" }).then((result) => {
      setBranches(result.data);
      if (result.data.length === 1) setBranchId(result.data[0].id);
    });
  }, []);

  const selectBranch = (value: string) => {
    if (value !== branchId) setItems([]);
    setBranchId(value);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!branchId || reason.trim().length < 3 || !items.length) {
      showToast({ title: "Completa el movimiento", description: "Selecciona ubicacion, productos y un motivo.", variant: "warning" });
      return;
    }
    if (direction === "salida" && items.some((item) => item.cantidad > item.available)) {
      showToast({ title: "Stock insuficiente", description: "Revisa las cantidades seleccionadas.", variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      await stockApi.createMovement({
        direccion: direction,
        sucursalId: branchId,
        motivo: reason.trim(),
        items: items.map((item) => ({ productoVarianteId: item.productoVarianteId, cantidad: item.cantidad })),
      });
      showToast({ title: "Movimiento registrado", variant: "success" });
      router.push("/stock/movimientos");
    } catch (error) {
      showToast({ title: "No se pudo registrar", description: error instanceof Error ? error.message : "Intenta nuevamente.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = items.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <DashboardShell headerTitle="Nuevo movimiento" headerParent={{ label: "Movimientos", href: "/stock/movimientos" }}>
      <form onSubmit={submit} className="min-h-full space-y-4 bg-[var(--color-background)] p-4 lg:p-6">
        <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
          <h1 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">Registrar movimiento</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Ajusta el stock de una tienda o almacen.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="space-y-5 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <div>
              <p className="mb-2 text-sm text-[#4e5671]">Tipo de movimiento</p>
              <div className="grid grid-cols-2 gap-2 rounded-[16px] bg-[var(--color-input-bg)] p-1">
                {(["entrada", "salida"] as StockDirection[]).map((value) => (
                  <button key={value} type="button" onClick={() => setDirection(value)} className={`flex h-10 items-center justify-center gap-2 rounded-[13px] text-sm font-circular-bold transition ${direction === value ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-muted-foreground)]"}`}>
                    {value === "entrada" ? <ArrowDownIcon size={17} /> : <ArrowUpIcon size={17} />}{value === "entrada" ? "Entrada" : "Salida"}
                  </button>
                ))}
              </div>
            </div>
            <Select label="Ubicacion" required searchable value={branchId} onChange={selectBranch} placeholder="Seleccionar tienda o almacen" options={branches.map((branch) => ({ value: branch.id, label: `${branch.nombre} · ${branch.tipo === "tienda" ? "Tienda" : "Almacen"}` }))} />
            <div>
              <label htmlFor="movement-reason" className="mb-2 block text-sm text-[#4e5671]">Motivo</label>
              <textarea id="movement-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={5} placeholder="Describe por que se realiza el movimiento" className="w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] p-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
            </div>
            <div className="rounded-[14px] bg-[var(--color-background)] p-4">
              <p className="text-xs text-[var(--color-muted-foreground)]">Resumen</p>
              <div className="mt-2 flex items-end justify-between"><p className="text-sm text-[var(--color-text)]">{items.length} productos</p><p className="text-2xl font-circular-bold text-[var(--color-primary)]">{totalUnits}</p></div>
            </div>
          </section>

          <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="mb-4"><h2 className="text-base font-circular-bold text-[var(--color-text)]">Productos y cantidades</h2><p className="text-sm text-[var(--color-muted-foreground)]">Busca y agrega las presentaciones que deseas ajustar.</p></div>
            <StockItemPicker sucursalId={branchId} items={items} onChange={setItems} enforceAvailable={direction === "salida"} />
          </section>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/stock/movimientos")} className="h-11 rounded-[14px] bg-[var(--color-card)] px-5 text-sm font-circular-bold text-[var(--color-text)]">Cancelar</button>
          <button type="submit" disabled={submitting} className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-60"><CheckIcon size={17} weight="bold" />{submitting ? "Registrando..." : "Registrar movimiento"}</button>
        </div>
      </form>
    </DashboardShell>
  );
}

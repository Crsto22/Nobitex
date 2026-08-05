"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  StockItemPicker,
  type SelectedStockItem,
} from "@/components/Stock/stock-item-picker";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Select } from "@/components/ui/select";
import { stockApi } from "@/lib/api/stock";

type Location = Awaited<ReturnType<typeof stockApi.locations>>[number];

export default function NewStockTransferPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<SelectedStockItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    stockApi.locations().then((result) => {
      setLocations(result);
      const origins = result.filter((location) => location.canUseAsOrigin);
      if (origins.length === 1) setOriginId(origins[0].id);
    });
  }, []);

  const changeOrigin = (value: string) => {
    if (value !== originId) setItems([]);
    setOriginId(value);
    if (value === destinationId) setDestinationId("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!originId || !destinationId || !items.length || reason.trim().length < 3) {
      showToast({ title: "Completa el traspaso", description: "Selecciona origen, destino, productos y motivo.", variant: "warning" });
      return;
    }
    if (items.some((item) => item.available < item.cantidad)) {
      showToast({ title: "Stock insuficiente", description: "Una cantidad supera el stock del origen.", variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await stockApi.createTransfer({
        origenSucursalId: originId,
        destinoSucursalId: destinationId,
        motivo: reason.trim(),
        items: items.map((item) => ({ productoVarianteId: item.productoVarianteId, cantidad: item.cantidad })),
      });
      showToast({ title: "Traspaso registrado", variant: "success" });
      router.push(`/stock/traspasos/${result.publicId}`);
    } catch (error) {
      showToast({ title: "No se pudo registrar", description: error instanceof Error ? error.message : "Intenta nuevamente.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = items.reduce((sum, item) => sum + item.cantidad, 0);
  const locationLabel = (location: Location) => `${location.nombre} · ${location.tipo === "tienda" ? "Tienda" : "Almacen"}`;

  return (
    <DashboardShell headerTitle="Nuevo traspaso" headerParent={{ label: "Traspasos", href: "/stock/traspasos" }}>
      <form onSubmit={submit} className="min-h-full space-y-4 bg-[var(--color-background)] p-4 lg:p-6">
        <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm"><h1 className="text-lg font-circular-bold text-[var(--color-text)]">Registrar traspaso</h1><p className="text-sm text-[var(--color-muted-foreground)]">Mueve productos entre tiendas y almacenes.</p></div>

        <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="space-y-5 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <Select label="Origen" required searchable value={originId} onChange={changeOrigin} placeholder="Seleccionar origen" options={locations.filter((location) => location.canUseAsOrigin).map((location) => ({ value: location.id, label: locationLabel(location) }))} />
            <div className="flex justify-center"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><ArrowRightIcon size={19} weight="bold" /></div></div>
            <Select label="Destino" required searchable value={destinationId} onChange={setDestinationId} placeholder="Seleccionar destino" options={locations.filter((location) => location.id !== originId).map((location) => ({ value: location.id, label: locationLabel(location) }))} />
            <div><label htmlFor="transfer-reason" className="mb-2 block text-sm text-[#4e5671]">Motivo</label><textarea id="transfer-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={5} maxLength={500} placeholder="Describe el motivo del traspaso" className="w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] p-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" /></div>
            <div className="rounded-[14px] bg-[var(--color-background)] p-4"><p className="text-xs text-[var(--color-muted-foreground)]">Resumen</p><div className="mt-2 flex items-end justify-between"><p className="text-sm text-[var(--color-text)]">{items.length} productos</p><p className="text-2xl font-circular-bold text-[var(--color-primary)]">{totalUnits}</p></div></div>
          </section>

          <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="mb-4"><h2 className="text-base font-circular-bold text-[var(--color-text)]">Productos a traspasar</h2><p className="text-sm text-[var(--color-muted-foreground)]">Las cantidades se descontaran del origen inmediatamente.</p></div>
            <StockItemPicker sucursalId={originId} items={items} onChange={setItems} enforceAvailable />
          </section>
        </div>

        <div className="flex justify-end gap-3"><button type="button" onClick={() => router.push("/stock/traspasos")} className="h-11 rounded-[14px] bg-[var(--color-card)] px-5 text-sm font-circular-bold">Cancelar</button><button type="submit" disabled={submitting} className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-60"><CheckIcon size={17} weight="bold" />{submitting ? "Registrando..." : "Registrar traspaso"}</button></div>
      </form>
    </DashboardShell>
  );
}

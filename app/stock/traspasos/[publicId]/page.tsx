"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRightIcon, PackageIcon, TruckIcon, UserIcon } from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { stockApi, stockProductLabel, type StockTransfer } from "@/lib/api/stock";

export default function StockTransferDetailPage() {
  const params = useParams<{ publicId: string }>();
  const { showToast } = useSystemToast();
  const [transfer, setTransfer] = useState<StockTransfer | null>(null);

  useEffect(() => {
    stockApi.transfer(params.publicId).then(setTransfer).catch((error) => {
      showToast({ title: "No se pudo cargar el traspaso", description: error instanceof Error ? error.message : "Intenta nuevamente.", variant: "error" });
    });
  }, [params.publicId, showToast]);

  return (
    <DashboardShell headerTitle="Detalle de traspaso" headerParent={{ label: "Traspasos", href: "/stock/traspasos" }}>
      <div className="min-h-full space-y-4 bg-[var(--color-background)] p-4 lg:p-6">
        {!transfer ? (
          <div className="rounded-[14px] bg-[var(--color-card)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">Cargando traspaso...</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryCard icon={<TruckIcon size={19} />} label="Unidades trasladadas" value={String(transfer.cantidadTotal)} featured />
              <SummaryCard icon={<PackageIcon size={19} />} label="Productos" value={String(transfer.items.length)} />
              <SummaryCard icon={<UserIcon size={19} />} label="Registrado por" value={transfer.creadoPor ? `${transfer.creadoPor.nombre} ${transfer.creadoPor.apellido || ""}` : "Sistema"} />
            </div>

            <section className="grid gap-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
              <Location title="Origen" name={transfer.origen.nombre} type={transfer.origen.tipo} />
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><ArrowRightIcon size={20} weight="bold" /></div>
              <Location title="Destino" name={transfer.destino.nombre} type={transfer.destino.tipo} />
            </section>

            <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-base font-circular-bold text-[var(--color-text)]">Productos trasladados</h2><p className="text-sm text-[var(--color-muted-foreground)]">{transfer.motivo}</p></div><p className="text-xs text-[var(--color-muted-foreground)]">{new Date(transfer.createdAt).toLocaleString("es-PE")}</p></div>
              <div className="space-y-2">
                {transfer.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-[14px] bg-[var(--color-background)] p-4"><div className="min-w-0"><p className="truncate text-sm font-circular-bold text-[var(--color-text)]">{stockProductLabel(item.producto)}</p><p className="text-xs text-[var(--color-muted-foreground)]">{item.producto.sku || "Sin SKU"}</p></div><div className="rounded-xl bg-[var(--color-primary)]/10 px-4 py-2 text-sm font-circular-bold text-[var(--color-primary)]">{item.cantidad} un.</div></div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function SummaryCard({ icon, label, value, featured = false }: { icon: React.ReactNode; label: string; value: string; featured?: boolean }) { return <div className={`rounded-[14px] p-4 shadow-sm ${featured ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-card)] text-[var(--color-text)]"}`}><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${featured ? "bg-white/15" : "bg-[#3b82f6]/10 text-[#3b82f6]"}`}>{icon}</div><p className={`text-xs ${featured ? "text-white/75" : "text-[var(--color-muted-foreground)]"}`}>{label}</p><p className="truncate text-lg font-circular-bold">{value}</p></div>; }
function Location({ title, name, type }: { title: string; name: string; type: string }) { return <div><p className="text-xs text-[var(--color-muted-foreground)]">{title}</p><p className="text-lg font-circular-bold text-[var(--color-text)]">{name}</p><span className="mt-2 inline-flex rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs capitalize text-[var(--color-muted-foreground)]">{type}</span></div>; }

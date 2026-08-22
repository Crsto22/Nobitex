"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  CalendarBlankIcon,
  IdentificationCardIcon,
  PackageIcon,
  ReceiptIcon,
  StorefrontIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  purchasesApi,
  type PurchaseDocumentType,
  type PurchaseOrder,
} from "@/lib/api/purchases";
import { stockProductLabel } from "@/lib/api/stock";

const documentLabels: Record<PurchaseDocumentType, string> = {
  factura: "Factura",
  boleta: "Boleta",
  otro: "Otro",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ publicId: string }>();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purchasesApi
      .order(params.publicId)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [params.publicId]);

  const subtotal = useMemo(
    () => order?.items.reduce((sum, item) => sum + Number(item.total), 0) ?? 0,
    [order],
  );

  return (
    <DashboardShell
      headerTitle="Detalle de compra"
      headerParent={{ label: "Ordenes de compra", href: "/compras/ordenes" }}
    >
      <div className="min-h-full space-y-4 bg-[var(--color-background)] p-4 lg:p-6">
        {loading ? (
          <p className="rounded-[14px] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
            Cargando detalle...
          </p>
        ) : order ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                icon={<UserIcon size={19} />}
                label="Proveedor"
                value={order.proveedor.displayName}
                helper={`RUC ${order.proveedor.ruc}`}
              />
              <InfoCard
                icon={<StorefrontIcon size={19} />}
                label="Destino"
                value={order.destino.nombre}
                helper={order.destino.tipo === "tienda" ? "Tienda" : "Almacen"}
              />
              <InfoCard
                icon={<ReceiptIcon size={19} />}
                label="Comprobante"
                value={documentLabel(order)}
                helper={order.fechaEmision ? date(order.fechaEmision) : "Sin fecha"}
              />
              <InfoCard
                icon={<PackageIcon size={19} />}
                label="Total"
                value={money(Number(order.total))}
                helper={`${order.cantidadTotal} unidades`}
              />
            </section>

            <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                    Productos
                  </h2>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {order.items.length} productos registrados
                  </p>
                </div>
                <p className="text-lg font-circular-bold text-[var(--color-primary)]">
                  {money(subtotal)}
                </p>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-3 rounded-[14px] bg-[var(--color-background)] p-3 sm:grid-cols-[1.3fr_0.45fr_0.55fr_0.55fr] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {stockProductLabel(item.producto)}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {item.producto.sku || "Sin SKU"}
                      </p>
                    </div>
                    <Cell label="Cantidad" value={item.cantidad.toString()} />
                    <Cell label="Costo" value={money(Number(item.costoUnitario))} />
                    <Cell label="Total" value={money(Number(item.total))} alignRight />
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:grid-cols-3">
              <MiniLine
                icon={<IdentificationCardIcon size={16} />}
                label="Codigo"
                value={order.publicId}
              />
              <MiniLine
                icon={<CalendarBlankIcon size={16} />}
                label="Registrado"
                value={date(order.createdAt)}
              />
              <MiniLine
                icon={<UserIcon size={16} />}
                label="Usuario"
                value={
                  order.creadoPor
                    ? `${order.creadoPor.nombre} ${order.creadoPor.apellido || ""}`.trim()
                    : "Sistema"
                }
              />
            </section>
          </>
        ) : (
          <p className="rounded-[14px] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
            Orden no encontrada
          </p>
        )}
      </div>
    </DashboardShell>
  );
}

function documentLabel(order: PurchaseOrder) {
  if (!order.tipoComprobante) return "Sin comprobante";
  return `${documentLabels[order.tipoComprobante]} ${[order.serie, order.numero].filter(Boolean).join("-")}`.trim();
}

function money(value: number) {
  return value.toLocaleString("es-PE", { style: "currency", currency: "PEN" });
}

function date(value: string) {
  return new Date(value).toLocaleDateString("es-PE");
}

function InfoCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
          <p className="truncate text-base font-circular-bold text-[var(--color-text)]">
            {value}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  alignRight = false,
}: {
  label: string;
  value: string;
  alignRight?: boolean;
}) {
  return (
    <div className={alignRight ? "sm:text-right" : ""}>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="text-sm font-circular-bold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function MiniLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-[var(--color-muted-foreground)]">{icon}</span>
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarIcon,
  CaretRightIcon,
  ClockIcon,
  IdentificationCardIcon,
  PackageIcon,
  ReceiptIcon,
  StorefrontIcon,
  UserIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { authFetch } from "@/lib/api/auth-fetch";
import {
  type PurchaseDocumentType,
  type PurchaseOrder,
} from "@/lib/api/purchases";
import { stockProductLabel } from "@/lib/api/stock";

const documentLabels: Record<PurchaseDocumentType, string> = {
  factura: "Factura",
  boleta: "Boleta",
  otro: "Otro",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const hours = d.getHours();
  const displayHours = hours % 12 || 12;
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  return `${displayHours}:${minutes} ${period}`;
}

function formatPrice(amount: string | number) {
  return `S/${Number(amount).toFixed(2)}`;
}

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicId) return;

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (isMounted) setIsLoading(true);
    }, 0);

    authFetch<PurchaseOrder>(`/purchases/orders/${publicId}`)
      .then((data) => {
        if (isMounted) setOrder(data);
      })
      .catch(() => {
        if (isMounted) setOrder(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [publicId]);

  if (isLoading) {
    return (
      <DashboardShell headerTitle="Detalle de compra">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <Image
            src="/svg/loader/Loader.svg"
            alt="Cargando detalle de compra"
            width={140}
            height={140}
            className="h-[140px] w-[140px]"
          />
        </div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell headerTitle="Detalle de compra">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <div className="text-center">
            <WarningCircleIcon
              size={48}
              weight="light"
              className="mx-auto text-[var(--color-muted-foreground)]"
            />
            <p className="mt-3 text-sm font-black text-[var(--color-text)]">
              Orden no encontrada
            </p>
            <button
              type="button"
              onClick={() => router.push("/compras/ordenes")}
              className="mt-4 h-10 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white transition-colors hover:opacity-90"
            >
              Volver a ordenes
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const creadoPor = order.creadoPor
    ? `${order.creadoPor.nombre} ${order.creadoPor.apellido || ""}`.trim()
    : "Sistema";

  return (
    <DashboardShell
      headerTitle={
        <nav
          className="flex min-w-0 items-center gap-2"
          aria-label="Ruta actual"
        >
          <Link
            href="/compras/ordenes"
            className="truncate text-sm font-circular-regular text-[var(--color-text)]/70 transition-colors hover:text-[var(--color-primary)]"
          >
            Ordenes de compra
          </Link>
          <CaretRightIcon
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {order.publicId}
          </span>
        </nav>
      }
    >
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6">
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--color-text)]">
              Orden de compra
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {order.publicId}
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-[#10b981]/10 px-4 py-1.5 text-xs font-circular-bold text-[#047857]">
            Registrada
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} />
            <span className="font-circular-regular">
              {formatDate(order.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon size={14} />
            <span className="font-circular-regular">
              {formatTime(order.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StorefrontIcon size={14} />
            <span className="font-circular-regular">{order.destino.nombre}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]">
              <UserIcon size={22} weight="fill" className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Proveedor
              </p>
              <p className="truncate text-base font-black text-[var(--color-text)]">
                {order.proveedor.displayName}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
                RUC: {order.proveedor.ruc}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoItem
            icon={<ReceiptIcon size={18} />}
            label="Comprobante"
            value={documentLabel(order)}
          />
          <InfoItem
            icon={<StorefrontIcon size={18} />}
            label="Destino"
            value={`${order.destino.nombre} · ${
              order.destino.tipo === "tienda" ? "Tienda" : "Almacen"
            }`}
          />
        </div>

        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <p className="mb-4 text-sm font-black text-[var(--color-text)]">
            Productos ({order.items.length})
          </p>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] p-3"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-input-bg)]">
                  <PackageIcon
                    size={24}
                    weight="light"
                    className="text-[var(--color-muted-foreground)]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                    {stockProductLabel(item.producto)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {item.producto.sku || "Sin SKU"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-circular-bold text-xs text-[var(--color-muted-foreground)]">
                    {item.cantidad} x {formatPrice(item.costoUnitario)}
                  </p>
                  <p className="font-circular-bold text-sm text-[var(--color-text)]">
                    {formatPrice(item.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">
                Productos
              </span>
              <span className="font-circular-bold text-[var(--color-text)]">
                {order.cantidadItems}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">
                Unidades
              </span>
              <span className="font-circular-bold text-[var(--color-text)]">
                {order.cantidadTotal}
              </span>
            </div>
            <div className="border-t border-[var(--color-border)] pt-2">
              <div className="flex items-center justify-between text-base">
                <span className="font-black text-[var(--color-text)]">
                  Total
                </span>
                <span className="font-circular-bold text-lg font-black text-[var(--color-text)] text-fixed-lg">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <FooterInfo
              icon={<IdentificationCardIcon size={16} />}
              label="Codigo"
              value={order.publicId}
            />
            <FooterInfo
              icon={<CalendarIcon size={16} />}
              label="Registrado"
              value={`${formatDate(order.createdAt)} · ${formatTime(
                order.createdAt,
              )}`}
            />
            <FooterInfo
              icon={<UserIcon size={16} />}
              label="Creado por"
              value={creadoPor}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function documentLabel(order: PurchaseOrder) {
  if (!order.tipoComprobante) return "Sin comprobante";
  const serieNumero = [order.serie, order.numero].filter(Boolean).join("-");
  return `${documentLabels[order.tipoComprobante]} ${serieNumero}`.trim();
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-card)] text-[var(--color-primary)]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-circular-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function FooterInfo({
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
      <span className="text-xs text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

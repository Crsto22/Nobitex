"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarBlankIcon,
  CaretRightIcon,
  ClockIcon,
  LockKeyIcon,
  ReceiptIcon,
  UserCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  cashRegisterApi,
  type CashMovement,
  type CashRegisterSession,
  type CashRegisterStatus,
} from "@/lib/api/cash-register";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  CashRegisterStatus,
  { label: string; bg: string; text: string }
> = {
  abierta: { label: "Abierta", bg: "bg-[#10b981]", text: "text-white" },
  cerrada: { label: "Cerrada", bg: "bg-[#6b7280]", text: "text-white" },
};

const movementConfig = {
  apertura: {
    label: "Apertura",
    icon: LockKeyIcon,
    tone: "text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  },
  venta: {
    label: "Venta",
    icon: ReceiptIcon,
    tone: "text-[#10b981] bg-[#10b981]/10",
  },
  ingreso: {
    label: "Ingreso",
    icon: ArrowUpIcon,
    tone: "text-[#3b82f6] bg-[#3b82f6]/10",
  },
  retiro: {
    label: "Retiro",
    icon: ArrowDownIcon,
    tone: "text-[#f59e0b] bg-[#f59e0b]/10",
  },
  anulacion_venta: {
    label: "Anulacion",
    icon: ArrowDownIcon,
    tone: "text-[#ef4444] bg-[#ef4444]/10",
  },
};
const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `S/${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Pendiente";
  const date = new Date(value);
  return dateTimeFormatter.format(date);
}

export default function CajaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!publicId) return;

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (isMounted) setIsLoading(true);
    }, 0);

    cashRegisterApi
      .findOne(publicId)
      .then((data) => {
        if (isMounted) setSession(data);
      })
      .catch(() => {
        if (isMounted) setSession(null);
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
      <DashboardShell headerTitle="Detalle de caja">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <Image
            src="/svg/loader/Loader.svg"
            alt="Cargando detalle de caja"
            width={140}
            height={140}
            className="h-[140px] w-[140px]"
          />
        </div>
      </DashboardShell>
    );
  }

  if (!session) {
    return (
      <DashboardShell headerTitle="Detalle de caja">
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 items-center justify-center bg-[var(--color-background)] p-4 lg:px-6">
          <div className="text-center">
            <WarningCircleIcon
              size={48}
              weight="light"
              className="mx-auto text-[var(--color-muted-foreground)]"
            />
            <p className="mt-3 text-sm font-black text-[var(--color-text)]">
              Caja no encontrada
            </p>
            <button
              type="button"
              onClick={() => router.push("/caja")}
              className="mt-4 h-10 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white transition-colors hover:opacity-90"
            >
              Volver a caja
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const status = statusConfig[session.estado];
  const expected = session.montoEsperadoActual ?? session.montoEsperado;

  return (
    <DashboardShell
      headerTitle={
        <nav className="flex min-w-0 items-center gap-2" aria-label="Ruta actual">
          <Link
            href="/caja"
            className="truncate text-sm font-circular-regular text-[var(--color-text)]/70 transition-colors hover:text-[var(--color-primary)]"
          >
            Caja
          </Link>
          <CaretRightIcon
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {session.sucursal.nombre}
          </span>
        </nav>
      }
    >
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6">
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-[var(--color-text)] text-fixed-lg">
              {session.sucursal.nombre}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-4 py-1.5 text-xs font-circular-bold",
              status.bg,
              status.text,
            )}
          >
            {status.label}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailCard label="Inicial" value={formatMoney(session.montoInicial)} />
          <DetailCard label="Esperado" value={formatMoney(expected)} tone="success" />
          <DetailCard
            label="Declarado"
            value={formatMoney(session.montoDeclarado)}
          />
          <DetailCard
            label="Diferencia"
            value={formatMoney(session.diferencia)}
            tone={Number(session.diferencia ?? 0) === 0 ? "default" : "warning"}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
          <div className="space-y-4">
            <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
              <p className="mb-4 text-sm font-black text-[var(--color-text)]">
                Informacion
              </p>
              <div className="space-y-3 text-sm">
                <InfoRow
                  icon={<UserCircleIcon size={17} />}
                  label="Usuario"
                  value={`${session.usuario.nombre} ${session.usuario.apellido ?? ""}`.trim()}
                />
                <InfoRow
                  icon={<ClockIcon size={17} />}
                  label="Apertura"
                  value={formatDateTime(session.openedAt)}
                />
                <InfoRow
                  icon={<CalendarBlankIcon size={17} />}
                  label="Cierre"
                  value={formatDateTime(session.closedAt)}
                />
              </div>
            </section>

            <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
              <p className="mb-4 text-sm font-black text-[var(--color-text)]">
                Totales por metodo
              </p>
              <div className="space-y-2">
                {(session.totalesPorMetodoPago ?? []).length > 0 ? (
                  session.totalesPorMetodoPago!.map((item) => (
                    <div
                      key={item.metodoPago?.id ?? "sin-metodo"}
                      className="flex items-center justify-between rounded-xl bg-[var(--color-card)] px-4 py-3"
                    >
                      <span className="text-sm font-circular-bold text-[var(--color-text)]">
                        {item.metodoPago?.nombre ?? "Sin metodo"}
                      </span>
                      <span className="text-sm font-circular-bold text-[var(--color-text)]">
                        {formatMoney(item.monto)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                    No hay movimientos por metodo.
                  </p>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <p className="mb-4 text-sm font-black text-[var(--color-text)]">
              Movimientos ({session.movimientos?.length ?? 0})
            </p>
            <div className="space-y-2">
              {(session.movimientos ?? []).length > 0 ? (
                session.movimientos!.map((movement) => (
                  <MovementRow key={movement.publicId} movement={movement} />
                ))
              ) : (
                <p className="rounded-xl bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                  No hay movimientos registrados.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function DetailCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const color =
    tone === "success"
      ? "text-[#10b981]"
      : tone === "warning"
        ? "text-[#f59e0b]"
        : "text-[var(--color-text)]";

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className={cn("mt-2 text-2xl font-circular-bold leading-none", color)}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-card)] px-4 py-3">
      <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </span>
      <span className="text-right font-circular-bold text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

function MovementRow({ movement }: { movement: CashMovement }) {
  const config = movementConfig[movement.tipo];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-card)] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            config.tone,
          )}
        >
          <Icon size={18} weight="bold" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {config.label}
            {movement.venta ? ` ${movement.venta.correlativo}` : ""}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {movement.metodoPago?.nombre ?? "Sin metodo"} -{" "}
            {formatDateTime(movement.createdAt)}
          </p>
          {movement.motivo ? (
            <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">
              {movement.motivo}
            </p>
          ) : null}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-circular-bold",
          Number(movement.monto) < 0 ? "text-[#ef4444]" : "text-[#10b981]",
        )}
      >
        {formatMoney(movement.monto)}
      </span>
    </div>
  );
}

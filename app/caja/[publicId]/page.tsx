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
  ClipboardTextIcon,
  ClockIcon,
  CreditCardIcon,
  FilePdfIcon,
  LockKeyIcon,
  MoneyIcon,
  ReceiptIcon,
  ScalesIcon,
  TrendUpIcon,
  UserCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  cashRegisterApi,
  downloadCashRegisterReport,
  type CashMovement,
  type CashRegisterPaymentMethod,
  type CashRegisterPdfFormat,
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

const paymentMethodIconConfig: Record<
  string,
  { src: string; label: string; bgColor: string }
> = {
  efectivo: {
    src: "/svg/metodo-pago/efectivo.png",
    label: "Efectivo",
    bgColor: "bg-[#10b981]",
  },
  yape: {
    src: "/svg/metodo-pago/Yape.svg",
    label: "Yape",
    bgColor: "bg-[#a221af]",
  },
  plin: {
    src: "/svg/metodo-pago/Plin.svg",
    label: "Plin",
    bgColor: "bg-[#00E2CE]",
  },
  transferencia: {
    src: "/svg/metodo-pago/transferencia.png",
    label: "Transferencia",
    bgColor: "bg-[#3b82f6]",
  },
  tarjeta: {
    src: "/svg/metodo-pago/transferencia.png",
    label: "Tarjeta",
    bgColor: "bg-[#6366f1]",
  },
};

function getPaymentMethodIcon(method: CashRegisterPaymentMethod | null) {
  const key =
    method?.codigo?.trim().toLowerCase() ||
    method?.nombreKey?.trim().toLowerCase() ||
    method?.nombre?.trim().toLowerCase() ||
    "";

  return paymentMethodIconConfig[key] ?? null;
}

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
  cobranza: {
    label: "Cobranza",
    icon: ArrowUpIcon,
    tone: "text-[#0ea5e9] bg-[#0ea5e9]/10",
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
  anulacion_cobranza: {
    label: "Anulacion cobranza",
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
  const { showToast } = useSystemToast();
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] =
    useState<CashRegisterPdfFormat | null>(null);

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

  const handleDownloadReport = async (format: CashRegisterPdfFormat) => {
    setDownloadingReport(format);

    try {
      await downloadCashRegisterReport(session, format);
    } catch (error) {
      showToast({
        title: "No se pudo descargar el informe",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setDownloadingReport(null);
    }
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={downloadingReport === "ticket80"}
              onClick={() => handleDownloadReport("ticket80")}
              className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ReceiptIcon size={15} weight="bold" />
              {downloadingReport === "ticket80"
                ? "Descargando..."
                : "Ticket 80 mm"}
            </button>
            <button
              type="button"
              disabled={downloadingReport === "a4"}
              onClick={() => handleDownloadReport("a4")}
              className="flex h-9 items-center gap-2 rounded-[12px] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <FilePdfIcon size={15} weight="bold" />
              {downloadingReport === "a4" ? "Descargando..." : "Informe A4"}
            </button>
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailCard
            icon={<MoneyIcon size={22} weight="fill" />}
            label="Inicial"
            value={formatMoney(session.montoInicial)}
          />
          <DetailCard
            icon={<TrendUpIcon size={22} weight="fill" />}
            label="Esperado"
            value={formatMoney(expected)}
            tone="success"
          />
          <DetailCard
            icon={<ClipboardTextIcon size={22} weight="fill" />}
            label="Declarado"
            value={formatMoney(session.montoDeclarado)}
          />
          <DetailCard
            icon={<ScalesIcon size={22} weight="fill" />}
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
                  session.totalesPorMetodoPago!.map((item) => {
                    const icon = getPaymentMethodIcon(item.metodoPago);

                    return (
                      <div
                        key={item.metodoPago?.id ?? "sin-metodo"}
                        className="flex items-center justify-between rounded-xl bg-[var(--color-card)] px-4 py-3"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          {icon ? (
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                icon.bgColor,
                              )}
                            >
                              <Image
                                src={icon.src}
                                width={28}
                                height={28}
                                alt={icon.label}
                                className="h-6 w-6 object-contain"
                              />
                            </span>
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                              <CreditCardIcon size={18} weight="fill" />
                            </span>
                          )}
                          <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                            {item.metodoPago?.nombre ?? "Sin metodo"}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-circular-bold text-[var(--color-text)]">
                          {formatMoney(item.monto)}
                        </span>
                      </div>
                    );
                  })
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
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
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
  const iconTone =
    tone === "success"
      ? "bg-[#10b981]/10 text-[#10b981]"
      : tone === "warning"
        ? "bg-[#f59e0b]/10 text-[#f59e0b]"
        : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]";

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            iconTone,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-circular-bold leading-none",
              color,
            )}
          >
            {value}
          </p>
        </div>
      </div>
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

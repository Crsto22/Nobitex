"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  CalendarBlankIcon,
  PlusIcon,
  QrCodeIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { useAuth } from "@/lib/auth/auth-provider";
import { getUserDisplayName } from "@/lib/auth/session";
import { formatCurrency, formatDate } from "@/lib/intl";

export default function AsistenciasPlanPage() {
  const { user, companyInfo, currentPlan, refreshPlan } = useAuth();
  const { showToast } = useSystemToast();
  const [workers, setWorkers] = useState("1");
  const [qrPoints, setQrPoints] = useState("1");
  const [isLoading, setIsLoading] = useState(!currentPlan);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshPlan();
    } catch (error) {
      showToast({
        title: "No se pudo cargar el plan",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [refreshPlan, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPlan(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPlan]);

  const attendance = currentPlan?.attendance;
  const pricing = currentPlan?.attendancePricing;
  const workerUnitPrice = Number(pricing?.employeeUnitPrice ?? 0);
  const qrUnitPrice = Number(pricing?.qrPointUnitPrice ?? 0);
  const workerCount = Math.max(0, Math.trunc(Number(workers) || 0));
  const qrCount = Math.max(0, Math.trunc(Number(qrPoints) || 0));
  const monthlyTotal = workerCount * workerUnitPrice + qrCount * qrUnitPrice;
  const hasPrices = workerUnitPrice > 0 || qrUnitPrice > 0;
  const companyName =
    companyInfo?.nombreComercial ?? user?.empresaNombreComercial ?? "Mi empresa";
  const customerName = getUserDisplayName(user);

  return (
    <DashboardShell headerTitle="Plan y facturacion">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6 lg:py-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-circular-bold text-[var(--color-text)]">
              Plan de asistencias
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadPlan()}
            disabled={isLoading}
            className="grid size-11 place-items-center rounded-[16px] bg-[var(--color-input-bg)] text-[var(--color-text)] disabled:opacity-50"
            aria-label="Actualizar plan"
          >
            <ArrowClockwiseIcon
              size={18}
              weight="bold"
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            label="Estado"
            value={attendance?.effectiveActive ? "Activo" : "Sin contratar"}
            icon={<CalendarBlankIcon size={20} weight="fill" />}
            color={attendance?.effectiveActive ? "#10b981" : "#f59e0b"}
          />
          <MetricCard
            label="Trabajadores"
            value={`${currentPlan?.usage.attendanceEmployees ?? 0} / ${attendance?.effectiveEmployeesLimit ?? 0}`}
            icon={<UsersThreeIcon size={20} weight="fill" />}
            color="#14b8a6"
          />
          <MetricCard
            label="Puntos QR"
            value={`${currentPlan?.usage.attendanceQrPoints ?? 0} / ${attendance?.effectiveQrPointsLimit ?? 0}`}
            icon={<QrCodeIcon size={20} weight="fill" />}
            color="#22c55e"
          />
          <MetricCard
            label="Vencimiento"
            value={
              attendance?.endsAt ? formatDate(attendance.endsAt) : "Sin fecha"
            }
            icon={<CalendarBlankIcon size={20} weight="fill" />}
            color="#2563eb"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-[12px] bg-[#14b8a6]/10 text-[#0f766e]">
                <QrCodeIcon size={20} weight="fill" />
              </span>
              <div>
                <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                  Asistencias
                </h2>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {attendance?.trial
                    ? "Beneficio activo por prueba gratuita."
                    : attendance?.effectiveActive
                      ? "Plan contratado activo."
                      : "Solicita el plan de asistencias."}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <LinkButton href="/asistencias/personal" label="Nuevo trabajador">
                <UsersThreeIcon size={18} weight="bold" />
              </LinkButton>
              <LinkButton href="/asistencias/puntos-qr" label="Nuevo QR">
                <QrCodeIcon size={18} weight="bold" />
              </LinkButton>
            </div>
          </article>

          <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
            <h2 className="text-base font-circular-bold text-[var(--color-text)]">
              Solicitar adicionales
            </h2>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {hasPrices
                ? `${formatCurrency(String(workerUnitPrice))} por trabajador y ${formatCurrency(String(qrUnitPrice))} por punto QR.`
                : "Precio segun cotizacion."}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Agregar trabajadores"
                value={workers}
                onChange={setWorkers}
              />
              <NumberField
                label="Agregar puntos QR"
                value={qrPoints}
                onChange={setQrPoints}
              />
            </div>

            <div className="mt-4 rounded-[12px] bg-[var(--color-input-bg)] p-4">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Total mensual estimado
              </p>
              <p className="mt-1 text-2xl font-circular-bold text-[var(--color-text)]">
                {hasPrices ? formatCurrency(String(monthlyTotal)) : "A cotizar"}
              </p>
              <a
                href={buildWhatsAppUrl({
                  companyName,
                  customerName,
                  customerEmail: user?.email,
                  workers: workerCount,
                  qrPoints: qrCount,
                  monthlyTotal,
                  hasPrices,
                })}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#25d366] px-4 text-sm font-circular-bold text-white transition-opacity hover:opacity-90"
              >
                <Image
                  src="/svg/redes-sociales/whatsapp.svg"
                  alt=""
                  width={18}
                  height={18}
                />
                Solicitar
              </a>
            </div>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <article className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <span
        className="grid size-10 place-items-center rounded-[11px]"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {icon}
      </span>
      <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-circular-bold text-[var(--color-text)]">
        {value}
      </p>
    </article>
  );
}

function LinkButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
    >
      {children}
      <PlusIcon size={16} weight="bold" />
      {label}
    </Link>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-circular-bold text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
      />
    </label>
  );
}

function buildWhatsAppUrl({
  companyName,
  customerName,
  customerEmail,
  workers,
  qrPoints,
  monthlyTotal,
  hasPrices,
}: {
  companyName: string;
  customerName: string;
  customerEmail?: string;
  workers: number;
  qrPoints: number;
  monthlyTotal: number;
  hasPrices: boolean;
}) {
  const message = [
    "Hola, deseo solicitar adicionales para el plan de asistencias de Nuvex.",
    `Empresa: ${companyName}`,
    `Cliente: ${customerName}`,
    customerEmail ? `Correo: ${customerEmail}` : "",
    `Agregar trabajadores: ${workers.toLocaleString("es-PE")}`,
    `Agregar puntos QR: ${qrPoints.toLocaleString("es-PE")}`,
    hasPrices
      ? `Total mensual estimado: ${formatCurrency(String(monthlyTotal))}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const phone = (process.env.NEXT_PUBLIC_NUVEX_WHATSAPP ?? "").replace(
    /\D/g,
    "",
  );
  const text = encodeURIComponent(message);
  return phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

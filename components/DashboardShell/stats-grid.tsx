"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BagIcon,
  BankIcon,
  EyeIcon,
  FileTextIcon,
  PackageIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";
import type { DashboardSummary } from "@/lib/api/dashboard";

type StatCardProps = {
  label: string;
  value: string;
  animatedCurrencyValue?: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  active?: boolean;
  badge?: string;
  bgColor?: string;
  textColor?: string;
};

function StatCard({
  label,
  value,
  animatedCurrencyValue,
  icon,
  iconBg,
  iconColor,
  active,
  badge,
  bgColor,
  textColor,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5 shadow-sm transition-colors duration-200",
        bgColor ||
          (active
            ? "bg-[var(--color-sidebar-active)]"
            : "bg-[var(--color-sidebar-bg)]"),
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            active ? "bg-white/20" : iconBg,
          )}
        >
          <span className={textColor || (active ? "text-white" : iconColor)}>
            {icon}
          </span>
        </div>
        {badge && (
          <span className="rounded-full bg-[#10b981]/20 px-2.5 py-1 text-xs font-circular-regular text-[#10b981]">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "text-sm font-medium",
            textColor ||
              (active
                ? "text-white/70"
                : "text-[var(--color-muted-foreground)]"),
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-circular-bold text-2xl leading-none",
            textColor || (active ? "text-white" : "text-[var(--color-text)]"),
          )}
        >
          {animatedCurrencyValue !== undefined ? (
            <AnimatedCurrencyValue value={animatedCurrencyValue} />
          ) : (
            value
          )}
        </span>
      </div>
    </div>
  );
}

function AnimatedCurrencyValue({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const endValue = Number.isFinite(value) ? value : 0;
    const duration = 850;
    const startTime = performance.now();
    let animationFrame = 0;

    const tick = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + (endValue - startValue) * easedProgress;

      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        previousValueRef.current = endValue;
        setDisplayValue(endValue);
      }
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{formatCurrency(displayValue)}</>;
}

export function CompactStatsCard({
  emitted,
  voided,
}: {
  emitted: number;
  voided: number;
}) {
  const total = emitted + voided;
  const emittedPercent = total > 0 ? Math.round((emitted / total) * 100) : 100;
  const voidedPercent = total > 0 ? Math.round((voided / total) * 100) : 0;

  const radius1 = 70;
  const radius2 = 52;
  const radius3 = 34;
  const strokeWidth = 12;
  const cx = 80;
  const cy = 80;

  const circumference1 = 2 * Math.PI * radius1;
  const circumference2 = 2 * Math.PI * radius2;
  const circumference3 = 2 * Math.PI * radius3;

  const emittedDash = (emittedPercent / 100) * circumference1;
  const voidedDash = (voidedPercent / 100) * circumference2;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx={cx}
            cy={cy}
            r={radius1}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference1}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius1}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${emittedDash} ${circumference1}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius2}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference2}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius2}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${voidedDash} ${circumference2}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius3}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference3}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-circular-bold text-2xl text-[var(--color-text)]">
            {total}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            Total
          </span>
        </div>
      </div>
      <div className="flex w-full gap-4">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--color-background)] p-3">
          <div className="h-3 w-3 rounded-full bg-[#10b981]" />
          <div className="min-w-0">
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
              Emitidos
            </p>
            <p className="font-circular-bold text-base text-[var(--color-text)]">
              {emitted}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--color-background)] p-3">
          <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <div className="min-w-0">
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
              Anulados
            </p>
            <p className="font-circular-bold text-base text-[var(--color-text)]">
              {voided}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const emptySummary: DashboardSummary = {
  todaySalesTotal: "0.00",
  salesFilterTotal: "0.00",
  periodSalesTotal: "0.00",
  averageTicket: "0.00",
  unitsSold: 0,
  variantsSold: 0,
  annulledAmount: "0.00",
  emittedCount: 0,
  voidedCount: 0,
};

function formatCurrency(amount: string | number) {
  const value = typeof amount === "number" ? amount : Number(amount);
  return `S/ ${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

function parseMoney(amount: string | number) {
  const value = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function buildStatsData(summary: DashboardSummary): StatCardProps[] {
  return [
    {
      label: "Ventas del filtro",
      value: formatCurrency(summary.salesFilterTotal),
      animatedCurrencyValue: parseMoney(summary.salesFilterTotal),
      icon: <BankIcon size={18} weight="bold" />,
      iconBg: "bg-[#eff6ff]",
      iconColor: "text-[#3b82f6]",
      active: true,
      badge: `${summary.emittedCount} ventas`,
    },
    {
      label: "Ventas del periodo",
      value: formatCurrency(summary.periodSalesTotal),
      animatedCurrencyValue: parseMoney(summary.periodSalesTotal),
      icon: <BagIcon size={18} weight="bold" />,
      iconBg: "bg-white/20",
      iconColor: "text-white",
      bgColor: "bg-[var(--color-primary)]",
      textColor: "text-white",
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(summary.averageTicket),
      animatedCurrencyValue: parseMoney(summary.averageTicket),
      icon: <FileTextIcon size={18} weight="bold" />,
      iconBg: "bg-[#ecfdf5]",
      iconColor: "text-[#10b981]",
    },
    {
      label: "Unidades vendidas",
      value: String(summary.unitsSold),
      icon: <PackageIcon size={18} weight="bold" />,
      iconBg: "bg-[#eff6ff]",
      iconColor: "text-[#3b82f6]",
    },
    {
      label: "Variantes vendidas",
      value: String(summary.variantsSold),
      icon: <EyeIcon size={18} weight="bold" />,
      iconBg: "bg-[#ecfdf5]",
      iconColor: "text-[#10b981]",
    },
    {
      label: "Monto anulado",
      value: formatCurrency(summary.annulledAmount),
      animatedCurrencyValue: parseMoney(summary.annulledAmount),
      icon: <TrashIcon size={18} weight="bold" />,
      iconBg: "bg-[#fff7ed]",
      iconColor: "text-[#f97316]",
    },
  ];
}

export function StatsGrid({ summary }: { summary?: DashboardSummary | null }) {
  const currentSummary = summary ?? emptySummary;
  const mainStatsData = buildStatsData(currentSummary);

  return (
    <div className="flex gap-4">
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-4">
        {mainStatsData.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="w-[500px] shrink-0">
        <CompactStatsCard
          emitted={currentSummary.emittedCount}
          voided={currentSummary.voidedCount}
        />
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import {
  BagIcon,
  BankIcon,
  EyeIcon,
  FileTextIcon,
  PackageIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";

type StatCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  active?: boolean;
  badge?: string;
  bgColor?: string;
  textColor?: string;
};

function StatCard({ label, value, icon, iconBg, iconColor, active, badge, bgColor, textColor }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5 shadow-sm transition-colors duration-200",
        bgColor || (active ? "bg-[var(--color-sidebar-active)]" : "bg-[var(--color-sidebar-bg)]"),
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            active ? "bg-white/20" : iconBg,
          )}
        >
          <span className={textColor || (active ? "text-white" : iconColor)}>{icon}</span>
        </div>
        {badge && (
          <span className="rounded-full bg-[#10b981]/20 px-2.5 py-1 text-xs font-semibold text-[#10b981]">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "text-sm font-medium",
            textColor || (active ? "text-white/70" : "text-[var(--color-muted-foreground)]"),
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "text-2xl font-bold leading-none",
            textColor || (active ? "text-white" : "text-[var(--color-text)]"),
          )}
          style={{ fontFamily: "var(--font-circular-x-sub)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function CompactStatsCard() {
  const emitted = 14;
  const voided = 5;
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
          <span
            className="text-2xl font-bold text-[var(--color-text)]"
            style={{ fontFamily: "var(--font-circular-x-sub)" }}
          >
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
            <p
              className="text-base font-bold text-[var(--color-text)]"
              style={{ fontFamily: "var(--font-circular-x-sub)" }}
            >
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
            <p
              className="text-base font-bold text-[var(--color-text)]"
              style={{ fontFamily: "var(--font-circular-x-sub)" }}
            >
              {voided}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const mainStatsData: StatCardProps[] = [
  {
    label: "Ventas del filtro",
    value: "S/ 1,143.00",
    icon: <BankIcon size={18} weight="bold" />,
    iconBg: "bg-[#eff6ff]",
    iconColor: "text-[#3b82f6]",
    active: true,
    badge: "+2.08%",
  },
  {
    label: "Ventas del periodo",
    value: "S/ 53,175.89",
    icon: <BagIcon size={18} weight="bold" />,
    iconBg: "bg-white/20",
    iconColor: "text-white",
    bgColor: "bg-[var(--color-primary)]",
    textColor: "text-white",
  },
  {
    label: "Ticket promedio",
    value: "S/ 81.64",
    icon: <FileTextIcon size={18} weight="bold" />,
    iconBg: "bg-[#ecfdf5]",
    iconColor: "text-[#10b981]",
  },
  {
    label: "Unidades vendidas",
    value: "15",
    icon: <PackageIcon size={18} weight="bold" />,
    iconBg: "bg-[#eff6ff]",
    iconColor: "text-[#3b82f6]",
  },
  {
    label: "Variantes vendidas",
    value: "10",
    icon: <EyeIcon size={18} weight="bold" />,
    iconBg: "bg-[#ecfdf5]",
    iconColor: "text-[#10b981]",
  },
  {
    label: "Monto anulado",
    value: "S/ 0.00",
    icon: <TrashIcon size={18} weight="bold" />,
    iconBg: "bg-[#fff7ed]",
    iconColor: "text-[#f97316]",
  },
];

export function StatsGrid() {
  return (
    <div className="flex gap-4">
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-4">
        {mainStatsData.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="w-[500px] shrink-0">
        <CompactStatsCard />
      </div>
    </div>
  );
}

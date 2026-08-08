"use client";

import type { TooltipContentProps } from "recharts";
import {
  ChartLineUpIcon,
  CirclesFourIcon,
  CubeIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/DashboardShell/recharts-components";
import type { ProductReportResponse } from "@/lib/api/reports";

const chartColors = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
];

export type RankingItem = {
  name: string;
  units: number;
  amount: number | string;
  color?: string | null;
};

function formatMoney(value: number) {
  return `S/ ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ProductTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload as {
    name: string;
    units?: number;
    amount?: number;
    countLabel?: string;
  };

  return (
    <div className="rounded-xl bg-[var(--color-sidebar-active)] px-3 py-2 shadow-lg">
      <p className="text-xs font-circular-regular text-white/70">{item.name}</p>
      <p className="text-sm font-circular-bold text-white">
        {item.amount !== undefined
          ? formatMoney(item.amount)
          : `${item.units ?? 0} ${item.countLabel ?? "unidades"}`}
      </p>
    </div>
  );
}

export function ProductReportSummary({
  summary,
}: {
  summary?: ProductReportResponse["summary"] | null;
}) {
  const summaryCards = [
    {
      label: "Productos activos",
      value: (summary?.activeProducts ?? 0).toLocaleString("es-PE"),
      icon: CubeIcon,
      color: "text-[#2563eb]",
      background: "bg-[#2563eb]/10",
      featured: "bg-[var(--color-sidebar-active)]",
    },
    {
      label: "Variantes activas",
      value: (summary?.activeVariants ?? 0).toLocaleString("es-PE"),
      icon: CirclesFourIcon,
      color: "text-[#0891b2]",
      background: "bg-[#0891b2]/10",
      featured: "bg-[var(--color-primary)]",
    },
    {
      label: "Sin stock",
      value: (summary?.outOfStockVariants ?? 0).toLocaleString("es-PE"),
      icon: WarningIcon,
      color: "text-[#e11d48]",
      background: "bg-[#e11d48]/10",
      featured: "",
    },
    {
      label: "Rotacion promedio",
      value: (summary?.averageTurnover ?? 0).toFixed(2),
      icon: ChartLineUpIcon,
      color: "text-[#059669]",
      background: "bg-[#059669]/10",
      featured: "",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map(
        ({ label, value, icon: Icon, color, background, featured }) => (
          <div
            key={label}
            className={`rounded-2xl p-5 shadow-sm ${
              featured
                ? featured
                : "bg-[var(--color-sidebar-bg)] ring-1 ring-[var(--color-border)]/60"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={`text-sm font-circular-regular ${
                    featured
                      ? "text-white/70"
                      : "text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {label}
                </p>
                <p
                  className={`mt-3 text-2xl font-circular-bold ${
                    featured ? "text-white" : "text-[var(--color-text)]"
                  }`}
                >
                  {value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  featured ? "bg-white/20" : background
                }`}
              >
                <Icon
                  size={20}
                  weight="bold"
                  className={featured ? "text-white" : color}
                />
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export function RankingByCountChart({
  data = [],
  title = "Top variantes por unidades",
  subtitle = "Mide traccion y rotacion por producto y variante vendida.",
  countLabel = "unidades",
}: {
  data?: RankingItem[];
  title?: string;
  subtitle?: string;
  countLabel?: string;
}) {
  const maxCount = Math.max(...data.map((item) => item.units), 1);
  const axisMax = maxCount <= 2 ? 2 : Math.ceil(maxCount / 4) * 4;
  const ticks = Array.from({ length: 5 }, (_, index) => (axisMax / 4) * index);
  const chartData = data.map((item) => ({
    ...item,
    amount: Number(item.amount),
    countLabel,
  }));

  return (
    <ReportPanel title={title} subtitle={subtitle}>
      <div className="h-[380px]">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ right: 36 }}>
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, axisMax]}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            <Tooltip content={ProductTooltip} cursor={false} />
            <Bar
              dataKey="units"
              fill="var(--color-primary)"
              radius={[0, 8, 8, 0]}
              barSize={18}
            >
              <LabelList
                dataKey="units"
                position="right"
                fill="var(--color-muted-foreground)"
                fontSize={11}
              />
            </Bar>
          </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </ReportPanel>
  );
}

export function RankingByAmountChart({
  data = [],
  title = "Top variantes por monto",
  subtitle = "Participacion de las variantes con mayor impacto economico.",
}: {
  data?: RankingItem[];
  title?: string;
  subtitle?: string;
}) {
  const amountVariants = data.slice(0, 6).map((item, index) => ({
    ...item,
    amount: Number(item.amount),
    color: item.color || chartColors[index % chartColors.length],
  }));
  const total = amountVariants.reduce((sum, item) => sum + item.amount, 0);

  return (
    <ReportPanel title={title} subtitle={subtitle}>
      <div className="relative h-[210px]">
        {amountVariants.length ? (
          <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={amountVariants}
              dataKey="amount"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {amountVariants.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={ProductTooltip} />
          </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
        {amountVariants.length ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase text-[var(--color-muted-foreground)]">
            Monto
          </span>
          <span className="text-2xl font-circular-bold text-[var(--color-text)]">
            S/ {(total / 1000).toFixed(1)}K
          </span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {amountVariants.map((item) => (
          <div
            key={item.name}
            className="flex min-w-0 items-center gap-3 rounded-xl bg-[var(--color-background)] p-3 ring-1 ring-[var(--color-border)]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-circular-bold text-[var(--color-text)]">
                {item.name}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {total > 0 ? ((item.amount / total) * 100).toFixed(1) : "0.0"}%
                del total
              </p>
            </div>
            <span className="shrink-0 text-sm font-circular-bold text-[var(--color-text)]">
              {formatMoney(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </ReportPanel>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      Sin datos para el periodo
    </div>
  );
}

function ReportPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm ring-1 ring-[var(--color-border)]/60 md:p-6">
      <h2 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
        {title}
      </h2>
      <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
        {subtitle}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

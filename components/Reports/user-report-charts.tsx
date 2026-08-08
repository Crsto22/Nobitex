"use client";

import { useState } from "react";
import type { TooltipContentProps } from "recharts";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/DashboardShell/recharts-components";
import type {
  UserCancellationItem,
  UserDailyEvolutionItem,
  UserKpiItem,
} from "@/lib/api/reports";
import { cn } from "@/lib/utils";

export type UserMetric = "amount" | "sales" | "ticket";
type DailyMetric = "amount" | "sales" | "cancellations" | "cancelledAmount";

const dailyMetrics: Array<{ label: string; value: DailyMetric }> = [
  { label: "Monto", value: "amount" },
  { label: "Ventas", value: "sales" },
  { label: "Anulaciones", value: "cancellations" },
  { label: "Monto anulado", value: "cancelledAmount" },
];

function formatMoney(value: number) {
  return `S/ ${value.toLocaleString("es-PE", {
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatMetric(value: number, metric: UserMetric) {
  return metric === "sales"
    ? value.toLocaleString("es-PE")
    : formatMoney(value);
}

function axisLabel(value: number, isCount: boolean) {
  if (isCount) return value.toLocaleString("es-PE");
  if (value >= 1000) return `S/ ${(value / 1000).toFixed(1)}K`;
  return `S/ ${value}`;
}

function UserTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload as {
    name?: string;
    label?: string;
    displayValue: string;
  };

  return (
    <div className="rounded-xl bg-[var(--color-sidebar-active)] px-3 py-2 shadow-lg">
      <p className="text-xs font-circular-regular text-white/70">
        {item.name ?? item.label}
      </p>
      <p className="text-sm font-circular-bold text-white">
        {item.displayValue}
      </p>
    </div>
  );
}

export function UserRankingChart({
  data = [],
  metric,
  height = 300,
}: {
  data?: UserKpiItem[];
  metric: UserMetric;
  height?: number;
}) {
  const chartData = data
    .map((user) => {
      const value =
        metric === "sales"
          ? user.sales
          : Number(metric === "ticket" ? user.averageTicket : user.amount);
      return {
        ...user,
        value,
        displayValue: formatMetric(value, metric),
      };
    })
    .sort((a, b) => b.value - a.value);
  const maxValue = Math.max(...chartData.map((item) => item.value), 1);

  return (
    <div style={{ height }}>
      {chartData.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ right: 54 }}>
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, maxValue]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              tickFormatter={(value) =>
                axisLabel(Number(value), metric === "sales")
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            <Tooltip content={UserTooltip} cursor={false} />
            <Bar
              dataKey="value"
              fill="var(--color-primary)"
              radius={[0, 8, 8, 0]}
              barSize={18}
            >
              <LabelList
                dataKey="displayValue"
                position="right"
                fill="var(--color-muted-foreground)"
                fontSize={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart />
      )}
    </div>
  );
}

export function UserRankingPanel({
  data,
  title,
  subtitle,
  metric,
}: {
  data?: UserKpiItem[];
  title: string;
  subtitle: string;
  metric: UserMetric;
}) {
  return (
    <section className="h-full rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm ring-1 ring-[var(--color-border)]/60 md:p-6">
      <h2 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
        {title}
      </h2>
      <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
        {subtitle}
      </p>
      <div className="mt-5">
        <UserRankingChart data={data} metric={metric} height={260} />
      </div>
    </section>
  );
}

function CancellationTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload as {
    name: string;
    cancellations: number;
    cancelledAmount: number;
  };

  return (
    <div className="rounded-xl bg-[var(--color-sidebar-active)] px-3 py-2 shadow-lg">
      <p className="text-xs font-circular-bold text-white">{item.name}</p>
      <p className="mt-1 text-xs text-[#fb923c]">
        Anulaciones: {item.cancellations}
      </p>
      <p className="text-xs text-[#60a5fa]">
        Monto anulado: {formatMoney(item.cancelledAmount)}
      </p>
    </div>
  );
}

export function CancellationControlChart({
  data = [],
}: {
  data?: UserCancellationItem[];
}) {
  const chartData = data
    .map((item) => ({
      name: item.name,
      cancellations: item.count,
      cancelledAmount: Number(item.amount),
    }))
    .sort(
      (a, b) =>
        b.cancellations - a.cancellations ||
        b.cancelledAmount - a.cancelledAmount,
    );
  const countMax = Math.max(...chartData.map((item) => item.cancellations), 1);
  const amountMax = Math.max(
    ...chartData.map((item) => item.cancelledAmount),
    1,
  );

  return (
    <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm ring-1 ring-[var(--color-border)]/60 md:p-6">
      <h2 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
        Control de anulaciones
      </h2>
      <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
        Cruza volumen de anulaciones con impacto economico por usuario.
      </p>

      <div className="mt-5 h-[300px]">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ right: 10 }}>
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="count"
                domain={[0, countMax]}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="amount"
                orientation="right"
                domain={[0, amountMax]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                tickFormatter={(value) => axisLabel(Number(value), false)}
              />
              <Tooltip content={CancellationTooltip} cursor={false} />
              <Bar
                yAxisId="count"
                dataKey="cancellations"
                fill="#f97316"
                radius={[7, 7, 0, 0]}
                barSize={24}
              />
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="cancelledAmount"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: "var(--color-primary)",
                  strokeWidth: 0,
                }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <ChartLegend color="#f97316" label="Anulaciones" />
        <ChartLegend color="var(--color-primary)" label="Monto anulado" />
      </div>
    </section>
  );
}

export function DailyUserEvolutionChart({
  data = [],
}: {
  data?: UserDailyEvolutionItem[];
}) {
  const [metric, setMetric] = useState<DailyMetric>("amount");
  const isCount = metric === "sales" || metric === "cancellations";
  const chartData = data.map((item) => {
    const value = Number(item[metric]);
    return {
      ...item,
      value,
      displayValue: isCount
        ? value.toLocaleString("es-PE")
        : formatMoney(value),
    };
  });
  const maxValue = Math.max(...chartData.map((item) => item.value), 1);

  return (
    <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm ring-1 ring-[var(--color-border)]/60 md:p-6">
      <h2 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
        Evolucion diaria por usuario
      </h2>
      <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
        Sigue el comportamiento diario y cambia la metrica para revisar
        tendencia.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {dailyMetrics.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMetric(item.value)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-circular-bold transition-colors",
              metric === item.value
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-background)] text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-button-hover)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 h-[320px]">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ right: 20 }}>
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                type="number"
                domain={[0, maxValue]}
                allowDecimals={!isCount}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                tickFormatter={(value) => axisLabel(Number(value), isCount)}
              />
              <Tooltip content={UserTooltip} cursor={false} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "var(--color-primary)",
                  strokeWidth: 0,
                }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </section>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--color-background)] px-3 py-2 text-xs font-circular-bold text-[var(--color-text)] ring-1 ring-[var(--color-border)]">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      Sin datos para el periodo
    </div>
  );
}

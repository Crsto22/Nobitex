import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/DashboardShell/recharts-components";
import type { TooltipContentProps } from "recharts";

import type { DashboardSalesTrendItem } from "@/lib/api/dashboard";

const emptySalesTrendData: DashboardSalesTrendItem[] = [];

const CustomTooltip = ({
  active,
  payload,
}: TooltipContentProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2 shadow-lg">
        <p className="font-circular-bold text-sm font-circular-bold text-white">
          + S/ {Number(payload[0].value).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function SalesTrendChart({
  data = emptySalesTrendData,
  granularity = "day",
}: {
  data?: DashboardSalesTrendItem[];
  granularity?: "hour" | "day";
}) {
  const subtitle =
    granularity === "hour" ? "Hoy por hora" : "Periodo seleccionado por dia";

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
            Tendencia de ventas
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="h-[280px]">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`}
              dx={-10}
            />
            <Tooltip content={CustomTooltip} cursor={false} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#salesGradient)"
              dot={false}
              activeDot={{
                r: 6,
                fill: "#8b5cf6",
                stroke: "#fff",
                strokeWidth: 3,
              }}
            />
          </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
            Sin datos para el periodo
          </div>
        )}
      </div>
    </div>
  );
}

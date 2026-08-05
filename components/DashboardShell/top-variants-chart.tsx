import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/DashboardShell/recharts-components";
import type { TooltipContentProps } from "recharts";

import type { DashboardTopVariantItem } from "@/lib/api/dashboard";

const CustomTooltip = ({
  active,
  payload,
}: TooltipContentProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2.5 shadow-lg">
        <p className="text-sm font-circular-bold text-white">
          {payload[0].payload.fullName}
        </p>
        <p className="font-circular-bold text-xs text-white/70">
          {payload[0].value} unidades
        </p>
      </div>
    );
  }
  return null;
};

export function TopVariantsChart({
  data = [],
}: {
  data?: DashboardTopVariantItem[];
}) {
  const chartData = data.map((item) => ({
    name: item.sizeName ? `Talla ${item.sizeName}` : item.name,
    fullName: item.name,
    value: item.units,
  }));

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-circular-bold text-[var(--color-text)]">
            Top variantes mas vendidas
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Por cantidad de unidades
          </p>
        </div>
      </div>
      <div className="h-[280px]">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                dx={-10}
              />
              <Tooltip content={CustomTooltip} cursor={false} />
              <Bar
                dataKey="value"
                fill="var(--color-primary)"
                radius={[8, 8, 0, 0]}
                barSize={32}
              />
            </BarChart>
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

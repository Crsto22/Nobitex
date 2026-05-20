"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const salesData = [
  { month: "Ene", value: 3200 },
  { month: "Feb", value: 1800 },
  { month: "Mar", value: 6500 },
  { month: "Abr", value: 11861 },
  { month: "May", value: 5200 },
  { month: "Jun", value: 6800 },
  { month: "Jul", value: 3100 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2 shadow-lg">
        <p className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-circular-x-sub)" }}>
          + S/ {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function SalesTrendChart() {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text)]">
            Tendencia de ventas
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Últimos 7 meses
          </p>
        </div>
        <div className="rounded-xl bg-[#10b981]/10 px-3 py-1.5">
          <span className="text-sm font-semibold text-[#10b981]" style={{ fontFamily: "var(--font-circular-x-sub)" }}>
            +12.5%
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={salesData}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
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
    </div>
  );
}

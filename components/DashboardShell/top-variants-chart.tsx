"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const variantsData = [
  { name: "Talla M", value: 45 },
  { name: "Talla L", value: 38 },
  { name: "Talla S", value: 32 },
  { name: "Talla XL", value: 28 },
  { name: "Talla XXL", value: 15 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2.5 shadow-lg">
        <p className="text-sm font-bold text-white">
          {payload[0].payload.name}
        </p>
        <p className="text-xs text-white/70" style={{ fontFamily: "var(--font-circular-x-sub)" }}>
          {payload[0].value} unidades
        </p>
      </div>
    );
  }
  return null;
};

export function TopVariantsChart() {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text)]">
            Top variantes más vendidas
          </h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Por cantidad de unidades
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={variantsData} barGap={8}>
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
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar
            dataKey="value"
            fill="var(--color-primary)"
            radius={[8, 8, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

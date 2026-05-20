"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const paymentData = [
  { name: "Yape", value: 45, color: "#7c3aed" },
  { name: "Plin", value: 30, color: "#10b981" },
  { name: "Transferencia", value: 25, color: "#3b82f6" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2 shadow-lg">
        <p className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-circular-x-sub)" }}>
          {payload[0].payload.name}
        </p>
        <p className="text-xs text-white/70" style={{ fontFamily: "var(--font-circular-x-sub)" }}>
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export function PaymentMethodsChart() {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--color-text)]">
        Ingresos por método de pago
      </h3>
      <div className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={paymentData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {paymentData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-circular-x-sub)" }}>
            100%
          </span>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-6">
        {paymentData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {item.name}
              </span>
              <span className="text-xs font-bold text-[var(--color-text)]" style={{ fontFamily: "var(--font-circular-x-sub)" }}>
                {item.value}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

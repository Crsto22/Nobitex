import type { TooltipContentProps } from "recharts";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "@/components/DashboardShell/recharts-components";
import type { DashboardPaymentMethodItem } from "@/lib/api/dashboard";

const CustomTooltip = ({
  active,
  payload,
}: TooltipContentProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-[var(--color-sidebar-active)] px-4 py-2 shadow-lg">
        <p className="font-circular-regular text-sm font-circular-bold text-white">
          {payload[0].payload.name}
        </p>
        <p className="font-circular-bold text-xs text-white/70">
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export function PaymentMethodsChart({
  data = [],
}: {
  data?: DashboardPaymentMethodItem[];
}) {
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.percentage,
    color: item.color,
  }));

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-circular-bold text-[var(--color-text)]">
        Ingresos por metodo de pago
      </h3>
      <div className="relative flex h-[220px] items-center justify-center">
        {chartData.length ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={CustomTooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-circular-bold text-2xl font-circular-bold text-[var(--color-text)]">
                100%
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            Sin datos para el periodo
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-center gap-6">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {item.name}
              </span>
              <span className="font-circular-bold text-xs font-circular-bold text-[var(--color-text)]">
                {item.value}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

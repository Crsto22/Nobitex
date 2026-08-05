import type { TooltipContentProps } from "recharts";
import {
  BankIcon,
  ChartLineUpIcon,
  FileTextIcon,
  ReceiptIcon,
} from "@phosphor-icons/react/ssr";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/DashboardShell/recharts-components";
import type {
  SalesReportResponse,
} from "@/lib/api/reports";

const documentLabels: Record<string, string> = {
  nota_venta: "Nota de venta",
  boleta: "Boleta",
  factura: "Factura",
  guia_remision: "Guia de remision",
  nota_credito_factura: "N.C. factura",
  nota_credito_boleta: "N.C. boleta",
};

function formatMoney(value: string | number) {
  const amount = Number(value);
  return `S/ ${(Number.isFinite(amount) ? amount : 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ChartTooltip({
  active,
  payload,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload as {
    name: string;
    value: number;
    displayValue?: string;
  };

  return (
    <div className="rounded-xl bg-[var(--color-sidebar-active)] px-3 py-2 shadow-lg">
      <p className="text-xs font-circular-regular text-white/70">{item.name}</p>
      <p className="text-sm font-circular-bold text-white">
        {item.displayValue ?? item.value.toLocaleString("es-PE")}
      </p>
    </div>
  );
}

export function SalesReportSummary({
  summary,
}: {
  summary?: SalesReportResponse["summary"] | null;
}) {
  const cards = [
    {
      label: "Ventas del dia",
      value: formatMoney(summary?.todaySalesTotal ?? 0),
      icon: BankIcon,
      color: "text-[#2563eb]",
      background: "bg-[#2563eb]/10",
      featured: "bg-[var(--color-sidebar-active)]",
    },
    {
      label: "Ventas del mes",
      value: formatMoney(summary?.monthSalesTotal ?? 0),
      icon: ChartLineUpIcon,
      color: "text-[#0891b2]",
      background: "bg-[#0891b2]/10",
      featured: "bg-[var(--color-primary)]",
    },
    {
      label: "Ticket promedio",
      value: formatMoney(summary?.averageTicket ?? 0),
      icon: ReceiptIcon,
      color: "text-[#059669]",
      background: "bg-[#059669]/10",
      featured: "",
    },
    {
      label: "Comprobantes",
      value: (summary?.emittedCount ?? 0).toLocaleString("es-PE"),
      icon: FileTextIcon,
      color: "text-[#f97316]",
      background: "bg-[#f97316]/10",
      featured: "",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(
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

export function SalesByDocumentTypeChart({
  data = [],
}: {
  data?: SalesReportResponse["salesByDocumentType"];
}) {
  const chartData = data.map((item) => ({
    name: documentLabels[item.type] ?? item.type,
    value: item.count,
    displayValue: `${item.count.toLocaleString("es-PE")} comprobantes`,
  }));

  return (
    <ReportPanel
      title="Ventas por tipo de comprobante"
      subtitle="Cantidad emitida por cada tipo"
    >
      <div className="h-[300px]">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ right: 48 }}>
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            <Tooltip content={ChartTooltip} cursor={false} />
            <Bar
              dataKey="value"
              fill="var(--color-primary)"
              radius={[0, 8, 8, 0]}
              barSize={24}
            >
              <LabelList
                dataKey="value"
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

export function SalesByBranchChart({
  data = [],
}: {
  data?: SalesReportResponse["salesByBranch"];
}) {
  const chartData = data.map((item) => ({
    name: item.name,
    value: Number(item.amount),
    displayValue: formatMoney(item.amount),
  }));

  return (
    <ReportPanel
      title="Ventas por sucursal"
      subtitle="Monto vendido dentro del periodo seleccionado"
    >
      <div className="h-[300px]">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ right: 72 }}>
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              tickFormatter={(value) =>
                Number(value) >= 1000
                  ? `S/ ${(Number(value) / 1000).toFixed(0)}k`
                  : `S/ ${value}`
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            <Tooltip content={ChartTooltip} cursor={false} />
            <Bar
              dataKey="value"
              fill="var(--color-primary)"
              radius={[0, 8, 8, 0]}
              barSize={24}
            />
          </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
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
    <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm ring-1 ring-[var(--color-border)]/60 md:p-6">
      <h2 className="text-lg font-circular-bold text-[var(--color-text)]">
        {title}
      </h2>
      <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
        {subtitle}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChartLineUpIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import {
  RankingByAmountChart,
  RankingByCountChart,
} from "@/components/Reports/product-report-panels";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  reportsApi,
  type ClientReportResponse,
  type ReportDateFilter,
} from "@/lib/api/reports";

export default function CustomerReportPage() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<ReportDateFilter>("today");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<ClientReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    branchesApi
      .findAll({ limit: 100, estado: "activo", tipo: "tienda" })
      .then((response) => {
        if (!isMounted) return;
        setBranches(response.data);
        setSelectedBranch(user?.sucursalId ?? "all");
      })
      .catch(() => {
        if (!isMounted) return;
        setBranches([]);
        setSelectedBranch(user?.sucursalId ?? "all");
      });

    return () => {
      isMounted = false;
    };
  }, [user?.sucursalId]);

  const loadReport = useCallback(() => {
    if (!selectedBranch) return;

    setIsLoading(true);
    setError(null);

    reportsApi
      .clients({
        dateFilter: selectedFilter,
        sucursalId: selectedBranch,
      })
      .then(setReport)
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el reporte de clientes",
        );
      })
      .finally(() => setIsLoading(false));
  }, [selectedBranch, selectedFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [loadReport]);

  const summaryCards = [
    {
      label: "Clientes activos",
      value: (report?.summary.activeClients ?? 0).toLocaleString("es-PE"),
      icon: UsersThreeIcon,
      featured: "bg-[var(--color-sidebar-active)]",
    },
    {
      label: "Clientes nuevos del mes",
      value: (report?.summary.newClientsThisMonth ?? 0).toLocaleString("es-PE"),
      icon: UserPlusIcon,
      featured: "bg-[var(--color-primary)]",
    },
    {
      label: "Recurrencia",
      value: `${(report?.summary.recurrenceRate ?? 0).toFixed(2)}%`,
      icon: ChartLineUpIcon,
      featured: "",
    },
  ];
  const topByPurchases = report?.topByPurchases.map((client) => ({
    name: client.name,
    units: client.purchases,
    amount: client.amount,
  }));
  const topByAmount = report?.topByAmount.map((client) => ({
    name: client.name,
    units: client.purchases,
    amount: client.amount,
  }));

  return (
    <DashboardShell headerTitle="Reporte de clientes">
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 md:px-8 lg:px-10 lg:py-8">
        <FilterBar
          selectedDateFilter={selectedFilter}
          onDateFilterChange={(value) =>
            setSelectedFilter(value as ReportDateFilter)
          }
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
          onRefresh={loadReport}
          isRefreshing={isLoading}
          allowAllBranches={!user?.sucursalId}
          ownOperations={user?.visibilidadOperaciones === "propias"}
        />

        {error ? (
          <div className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm font-circular-regular text-[#ef4444]">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon, featured }) => (
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
                    className={`mt-3 text-2xl font-circular-bold text-fixed-2xl ${
                      featured ? "text-white" : "text-[var(--color-text)]"
                    }`}
                  >
                    {value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    featured ? "bg-white/20" : "bg-[#059669]/10"
                  }`}
                >
                  <Icon
                    size={20}
                    weight="bold"
                    className={featured ? "text-white" : "text-[#059669]"}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-7">
            <RankingByCountChart
              data={topByPurchases}
              title="Top clientes por compras"
              subtitle="Identifica a quienes vuelven con mayor frecuencia en el periodo."
              countLabel="compras"
            />
          </div>
          <div className="min-w-0 xl:col-span-5">
            <RankingByAmountChart
              data={topByAmount}
              title="Top clientes por monto"
              subtitle="Muestra la participacion de quienes mas valor generan."
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

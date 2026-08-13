"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import {
  CancellationControlChart,
  DailyUserEvolutionChart,
  UserRankingChart,
  UserRankingPanel,
  type UserMetric,
} from "@/components/Reports/user-report-charts";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  reportsApi,
  type ReportDateFilter,
  type UserReportResponse,
} from "@/lib/api/reports";
import { cn } from "@/lib/utils";

const metrics: Array<{ label: string; value: UserMetric }> = [
  { label: "Monto", value: "amount" },
  { label: "Ventas", value: "sales" },
  { label: "Ticket promedio", value: "ticket" },
];

export default function UserReportPage() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<ReportDateFilter>("today");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<UserMetric>("amount");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<UserReportResponse | null>(null);
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

  const loadReport = useCallback((options: RequestInit = {}) => {
    if (!selectedBranch) return;

    setIsLoading(true);
    setError(null);

    reportsApi
      .users({
        dateFilter: selectedFilter,
        sucursalId: selectedBranch,
      }, options)
      .then(setReport)
      .catch((loadError: unknown) => {
        if (options.signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el reporte de usuarios",
        );
      })
      .finally(() => {
        if (!options.signal?.aborted) setIsLoading(false);
      });
  }, [selectedBranch, selectedFilter]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport({ signal: controller.signal });
    return () => controller.abort();
  }, [loadReport]);

  return (
    <DashboardShell headerTitle="Reporte de usuarios">
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:px-8 lg:px-10 lg:py-8">
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

        <section className="min-w-0">
          <h2 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
            KPIs por usuario
          </h2>
          <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
            Cambia la metrica para comparar mejor el rendimiento de cada
            colaborador.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {metrics.map((metric) => (
              <button
                key={metric.value}
                type="button"
                onClick={() => setSelectedMetric(metric.value)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-circular-bold transition-colors",
                  selectedMetric === metric.value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-sidebar-bg)] text-[var(--color-text)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                {metric.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <UserRankingChart
              data={report?.userKpis}
              metric={selectedMetric}
              height={300}
            />
          </div>
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
          <UserRankingPanel
            data={report?.userKpis}
            title="Ranking por monto"
            subtitle="Compara a los usuarios por ingreso generado en el periodo."
            metric="amount"
          />
          <UserRankingPanel
            data={report?.userKpis}
            title="Ranking por comprobantes"
            subtitle="Ordena a los usuarios por cantidad de ventas registradas."
            metric="sales"
          />
        </div>

        <CancellationControlChart data={report?.cancellations} />
        <DailyUserEvolutionChart data={report?.dailyEvolution} />
      </div>
    </DashboardShell>
  );
}

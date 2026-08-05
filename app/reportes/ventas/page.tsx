"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import { SalesTrendChart } from "@/components/DashboardShell/sales-trend-chart";
import { CompactStatsCard } from "@/components/DashboardShell/stats-grid";
import {
  SalesByBranchChart,
  SalesByDocumentTypeChart,
  SalesReportSummary,
} from "@/components/Reports/sales-report-panels";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  reportsApi,
  type ReportDateFilter,
  type SalesReportResponse,
} from "@/lib/api/reports";

export default function SalesReportPage() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<ReportDateFilter>("30days");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<SalesReportResponse | null>(null);
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
      .sales({
        sucursalId: selectedBranch === "all" ? undefined : selectedBranch,
        dateFilter: selectedFilter,
      })
      .then(setReport)
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el reporte de ventas",
        );
      })
      .finally(() => setIsLoading(false));
  }, [selectedBranch, selectedFilter]);

  useEffect(() => {
    // The report always reflects the active branch and date filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [loadReport]);

  return (
    <DashboardShell headerTitle="Reporte de ventas">
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

        <SalesReportSummary summary={report?.summary} />

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-12">
            <SalesTrendChart
              data={report?.salesTrend.data}
              granularity={report?.salesTrend.granularity}
            />
          </div>
          <div className="min-w-0 xl:col-span-7">
            <SalesByDocumentTypeChart data={report?.salesByDocumentType} />
          </div>
          <div className="min-w-0 xl:col-span-5">
            <CompactStatsCard
              emitted={report?.summary.emittedCount ?? 0}
              voided={report?.summary.voidedCount ?? 0}
            />
          </div>
          <div className="min-w-0 xl:col-span-12">
            <SalesByBranchChart data={report?.salesByBranch} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

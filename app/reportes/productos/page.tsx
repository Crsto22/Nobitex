"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import {
  ProductReportSummary,
  RankingByAmountChart,
  RankingByCountChart,
} from "@/components/Reports/product-report-panels";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  reportsApi,
  type ProductReportResponse,
  type ReportDateFilter,
} from "@/lib/api/reports";

export default function ProductReportPage() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<ReportDateFilter>("today");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<ProductReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    branchesApi
      .findAll({ limit: 100, estado: "activo" })
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
      .products({
        dateFilter: selectedFilter,
        sucursalId: selectedBranch,
      }, options)
      .then(setReport)
      .catch((loadError: unknown) => {
        if (options.signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el reporte de productos",
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
    <DashboardShell headerTitle="Reporte de productos">
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

        {error ? <ReportError message={error} /> : null}

        <ProductReportSummary summary={report?.summary} />

        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-7">
            <RankingByCountChart data={report?.topByUnits} />
          </div>
          <div className="min-w-0 xl:col-span-5">
            <RankingByAmountChart data={report?.topByAmount} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function ReportError({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm font-circular-regular text-[#ef4444]">
      {message}
    </div>
  );
}

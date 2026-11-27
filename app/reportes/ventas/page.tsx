"use client";

import { useCallback, useEffect, useState } from "react";
import { FileXlsIcon, SpinnerGapIcon } from "@/lib/icons";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import { SalesTrendChart } from "@/components/DashboardShell/sales-trend-chart";
import { CompactStatsCard } from "@/components/DashboardShell/stats-grid";
import {
  SalesByBranchChart,
  SalesByDocumentTypeChart,
  SalesReportSummary,
} from "@/components/Reports/sales-report-panels";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  reportsApi,
  type ReportDateFilter,
  type SalesReportResponse,
} from "@/lib/api/reports";
import { downloadBlob } from "@/lib/utils/download";

export default function SalesReportPage() {
  const { user } = useAuth();
  const { showToast } = useSystemToast();
  const [selectedFilter, setSelectedFilter] =
    useState<ReportDateFilter>("30days");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [report, setReport] = useState<SalesReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
      .sales({
        sucursalId: selectedBranch === "all" ? undefined : selectedBranch,
        dateFilter: selectedFilter,
      }, options)
      .then(setReport)
      .catch((loadError: unknown) => {
        if (options.signal?.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el reporte de ventas",
        );
      })
      .finally(() => {
        if (!options.signal?.aborted) setIsLoading(false);
      });
  }, [selectedBranch, selectedFilter]);

  useEffect(() => {
    const controller = new AbortController();
    // The report always reflects the active branch and date filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport({ signal: controller.signal });
    return () => controller.abort();
  }, [loadReport]);

  const handleExport = useCallback(async () => {
    if (!selectedBranch) return;

    setIsExporting(true);

    try {
      const blob = await reportsApi.exportSalesExcel({
        sucursalId: selectedBranch === "all" ? undefined : selectedBranch,
        dateFilter: selectedFilter,
      });
      const stamp = new Date().toISOString().slice(0, 10);

      downloadBlob(blob, `reporte-ventas-${selectedFilter}-${stamp}.xlsx`);
    } catch (exportError) {
      showToast({
        title: "No se pudo exportar",
        description:
          exportError instanceof Error
            ? exportError.message
            : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedBranch, selectedFilter, showToast]);

  return (
    <DashboardShell headerTitle="Reporte de ventas">
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
          actions={
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting || !selectedBranch}
              aria-label="Exportar Excel"
              title="Exportar Excel"
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#107c41] px-3 text-sm font-circular-bold text-white transition-colors hover:bg-[#0b5e31] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              {isExporting ? (
                <SpinnerGapIcon size={16} weight="bold" className="animate-spin" />
              ) : (
                <FileXlsIcon size={16} weight="bold" />
              )}
              <span className="hidden sm:inline">
                {isExporting ? "Exportando..." : "Exportar Excel"}
              </span>
            </button>
          }
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

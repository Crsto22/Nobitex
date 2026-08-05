"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, TagIcon } from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import { PaymentMethodsChart } from "@/components/DashboardShell/payment-methods-chart";
import { SalesTrendChart } from "@/components/DashboardShell/sales-trend-chart";
import { StatsGrid } from "@/components/DashboardShell/stats-grid";
import { TopVariantsChart } from "@/components/DashboardShell/top-variants-chart";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  dashboardApi,
  type DashboardDateFilter,
  type DashboardResponse,
} from "@/lib/api/dashboard";

export default function DashboardPage() {
  const { user, currentPlan } = useAuth();
  const [selectedFilter, setSelectedFilter] =
    useState<DashboardDateFilter>("today");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const assistantMessage = getAssistantMessage(dashboard, isLoadingDashboard);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      branchesApi
        .findAll({ limit: 100, estado: "activo", tipo: "tienda" })
        .then((response) => {
          if (isMounted) {
            setBranches(response.data);
            setSelectedBranch((current) => {
              if (current) {
                return current;
              }

              const principalBranch =
                response.data.find((branch) => branch.esPrincipal) ??
                response.data[0];

              return principalBranch?.id ?? "all";
            });
          }
        })
        .catch(() => {
          if (isMounted) {
            setBranches([]);
            setSelectedBranch((current) => current || "all");
          }
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const loadDashboard = useCallback(() => {
    if (!selectedBranch) {
      return;
    }

    setIsLoadingDashboard(true);
    setDashboardError(null);

    dashboardApi
      .find({
        sucursalId: selectedBranch === "all" ? undefined : selectedBranch,
        dateFilter: selectedFilter,
      })
      .then((response) => {
        setDashboard(response);
      })
      .catch((error: unknown) => {
        setDashboard(null);
        setDashboardError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los datos del dashboard",
        );
      })
      .finally(() => {
        setIsLoadingDashboard(false);
      });
  }, [selectedBranch, selectedFilter]);

  useEffect(() => {
    // Data is intentionally synchronized with the selected dashboard filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-10">
        <FilterBar
          selectedDateFilter={selectedFilter}
          onDateFilterChange={(value) =>
            setSelectedFilter(value as DashboardDateFilter)
          }
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
          onRefresh={loadDashboard}
          isRefreshing={isLoadingDashboard}
          allowAllBranches={!user?.sucursalId}
          ownOperations={user?.visibilidadOperaciones === "propias"}
        />
        {dashboardError ? (
          <div className="rounded-2xl bg-[#ef4444]/10 px-4 py-3 text-sm font-circular-regular text-[#ef4444]">
            {dashboardError}
          </div>
        ) : null}
        <StatsGrid summary={dashboard?.summary} />
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-6">
          <SalesTrendChart
            data={dashboard?.salesTrend.data}
            granularity={dashboard?.salesTrend.granularity}
          />
          <TopVariantsChart data={dashboard?.topVariants} />
          <PaymentMethodsChart data={dashboard?.paymentMethods} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex min-h-28 flex-col justify-between gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#3b82f6]">
                <TagIcon size={21} weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-circular-regular text-[var(--color-muted-foreground)]">
                  Plan actual
                </p>
                <p className="truncate text-lg font-circular-bold text-[var(--color-text)]">
                  {currentPlan?.plan.name ?? "Cargando..."}
                </p>
              </div>
            </div>
            <Link
              href="/configuracion/plan"
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white transition-opacity hover:opacity-90"
            >
              Mejorar el plan
              <ArrowUpRightIcon size={16} weight="bold" />
            </Link>
          </section>

          <section className="flex min-h-28 items-center gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <span
              className="norbitex-mascot norbitex-mascot--celebrate shrink-0"
              style={{ "--norbitex-scale": 0.32 } as CSSProperties}
              aria-hidden="true"
            />
            <div className="relative min-w-0 flex-1 rounded-[18px] bg-[var(--color-input-bg)] px-4 py-3 shadow-sm ring-1 ring-[var(--color-border)]">
              <span
                className="absolute top-6 -left-3 size-3 rounded-full bg-[var(--color-input-bg)] ring-1 ring-[var(--color-border)]"
                aria-hidden="true"
              />
              <span
                className="absolute top-4 -left-7 size-2 rounded-full bg-[var(--color-input-bg)] ring-1 ring-[var(--color-border)]"
                aria-hidden="true"
              />
              <p className="text-sm font-circular-bold text-[var(--color-text)]">
                Tu asistente Norbitex
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--color-muted-foreground)]">
                {assistantMessage}
              </p>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function getAssistantMessage(
  dashboard: DashboardResponse | null,
  isLoading: boolean,
) {
  if (isLoading && !dashboard) {
    return "Estoy revisando tus ventas para darte un resumen.";
  }

  if (!dashboard || dashboard.summary.emittedCount === 0) {
    return "Hola, bienvenido. Todo esta listo para registrar tu primera venta.";
  }

  const total = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(Number(dashboard.summary.salesFilterTotal) || 0);
  const topProduct = dashboard.topVariants[0];

  if (topProduct) {
    return `Registraste ${dashboard.summary.emittedCount} ventas por ${total}. ${topProduct.productName ?? topProduct.name} fue tu producto mas vendido con ${topProduct.units} unidades.`;
  }

  return `Registraste ${dashboard.summary.emittedCount} ventas por ${total} en el periodo seleccionado.`;
}

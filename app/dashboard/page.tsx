"use client";

import { useState } from "react";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { FilterBar } from "@/components/DashboardShell/filter-bar";
import { PaymentMethodsChart } from "@/components/DashboardShell/payment-methods-chart";
import { SalesTrendChart } from "@/components/DashboardShell/sales-trend-chart";
import { StatsGrid } from "@/components/DashboardShell/stats-grid";
import { TopVariantsChart } from "@/components/DashboardShell/top-variants-chart";

export default function DashboardPage() {
  const [selectedFilter, setSelectedFilter] = useState("today");

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-10 md:py-10">
        <FilterBar selectedDateFilter={selectedFilter} onDateFilterChange={setSelectedFilter} />
        <StatsGrid />
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-6">
          <SalesTrendChart />
          <TopVariantsChart />
          <PaymentMethodsChart />
        </div>
      </div>
    </DashboardShell>
  );
}

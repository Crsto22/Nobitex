import { authFetch } from "@/lib/api/auth-fetch";

export type ReportDateFilter = "today" | "7days" | "14days" | "30days";

export type ReportQuery = {
  dateFilter?: ReportDateFilter;
  sucursalId?: string;
};

export type ReportFilters = {
  sucursalId: string | null;
  dateFilter: ReportDateFilter;
  range: {
    start: string;
    end: string;
  };
};

export type SalesReportResponse = {
  filters: ReportFilters;
  summary: {
    todaySalesTotal: string;
    monthSalesTotal: string;
    averageTicket: string;
    emittedCount: number;
    voidedCount: number;
  };
  salesTrend: {
    granularity: "hour" | "day";
    data: Array<{ label: string; value: number }>;
  };
  salesByDocumentType: Array<{
    type: string;
    count: number;
    amount: string;
  }>;
  salesByBranch: Array<{
    branchId: string | null;
    name: string;
    amount: string;
  }>;
};

export type ProductRankingItem = {
  variantId: string;
  name: string;
  productName: string | null;
  colorName: string | null;
  colorHex: string | null;
  sizeName: string | null;
  units: number;
  amount: string;
};

export type ProductReportResponse = {
  filters: ReportFilters;
  summary: {
    activeProducts: number;
    activeVariants: number;
    outOfStockVariants: number;
    averageTurnover: number;
  };
  topByUnits: ProductRankingItem[];
  topByAmount: ProductRankingItem[];
};

export type ClientRankingItem = {
  clientId: string;
  name: string;
  purchases: number;
  amount: string;
};

export type ClientReportResponse = {
  filters: ReportFilters;
  summary: {
    activeClients: number;
    newClientsThisMonth: number;
    recurrenceRate: number;
  };
  topByPurchases: ClientRankingItem[];
  topByAmount: ClientRankingItem[];
};

export type UserKpiItem = {
  empresaUsuarioId: string;
  userId: string;
  name: string;
  amount: string;
  sales: number;
  averageTicket: string;
};

export type UserCancellationItem = {
  empresaUsuarioId: string;
  userId: string;
  name: string;
  count: number;
  amount: string;
};

export type UserDailyEvolutionItem = {
  label: string;
  amount: string;
  sales: number;
  cancellations: number;
  cancelledAmount: string;
};

export type UserReportResponse = {
  filters: ReportFilters;
  userKpis: UserKpiItem[];
  cancellations: UserCancellationItem[];
  dailyEvolution: UserDailyEvolutionItem[];
};

function buildQuery(query: ReportQuery) {
  const params = new URLSearchParams();

  if (query.dateFilter) {
    params.set("dateFilter", query.dateFilter);
  }
  if (query.sucursalId && query.sucursalId !== "all") {
    params.set("sucursalId", query.sucursalId);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const reportsApi = {
  sales(query: ReportQuery = {}) {
    return authFetch<SalesReportResponse>(`/reports/sales${buildQuery(query)}`);
  },

  products(query: ReportQuery = {}) {
    return authFetch<ProductReportResponse>(
      `/reports/products${buildQuery(query)}`,
    );
  },

  clients(query: ReportQuery = {}) {
    return authFetch<ClientReportResponse>(
      `/reports/clients${buildQuery(query)}`,
    );
  },

  users(query: ReportQuery = {}) {
    return authFetch<UserReportResponse>(`/reports/users${buildQuery(query)}`);
  },
};

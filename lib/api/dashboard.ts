import { authFetch } from "@/lib/api/auth-fetch";

export type DashboardSummary = {
  todaySalesTotal: string;
  salesFilterTotal: string;
  periodSalesTotal: string;
  averageTicket: string;
  unitsSold: number;
  variantsSold: number;
  annulledAmount: string;
  emittedCount: number;
  voidedCount: number;
};

export type DashboardDocumentTypeItem = {
  type: string;
  count: number;
  amount: string;
};

export type DashboardBranchSalesItem = {
  sucursalId: string | null;
  name: string;
  amount: string;
};

export type DashboardSalesTrendItem = {
  label: string;
  value: number;
};

export type DashboardDateFilter = "today" | "7days" | "14days" | "30days";

export type DashboardTopVariantItem = {
  productoVarianteId: string;
  name: string;
  productName: string | null;
  colorName: string | null;
  colorHex: string | null;
  sizeName: string | null;
  units: number;
  total: string;
};

export type DashboardPaymentMethodItem = {
  metodoPagoId: string;
  name: string;
  key: string | null;
  amount: string;
  percentage: number;
  color: string;
};

export type DashboardResponse = {
  filters: {
    sucursalId: string | null;
    dateFilter: DashboardDateFilter;
    range: {
      start: string;
      end: string;
    };
  };
  summary: DashboardSummary;
  salesTrend: {
    granularity: "hour" | "day";
    data: DashboardSalesTrendItem[];
  };
  salesByDocumentType: DashboardDocumentTypeItem[];
  salesByBranch: DashboardBranchSalesItem[];
  topVariants: DashboardTopVariantItem[];
  paymentMethods: DashboardPaymentMethodItem[];
};

export type DashboardQuery = {
  sucursalId?: string;
  dateFilter?: DashboardDateFilter;
};

export const dashboardApi = {
  find(query: DashboardQuery = {}) {
    const params = new URLSearchParams();

    if (query.sucursalId && query.sucursalId !== "all") {
      params.set("sucursalId", query.sucursalId);
    }

    if (query.dateFilter) {
      params.set("dateFilter", query.dateFilter);
    }

    const queryString = params.toString();
    return authFetch<DashboardResponse>(
      queryString ? `/dashboard?${queryString}` : "/dashboard",
    );
  },
};

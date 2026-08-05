import { authFetch } from "@/lib/api/auth-fetch";

export type PaymentMethodStatus = "activo" | "inactivo";

export type PaymentMethod = {
  id: string;
  empresaId: string;
  nombre: string;
  codigo: string | null;
  descripcion: string | null;
  esSistema: boolean;
  permiteVuelto: boolean;
  orden: number;
  estado: PaymentMethodStatus;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethodPayload = {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
};

export type PaymentMethodStatusFilter = "active" | "inactive";

export type PaymentMethodsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentMethodStatusFilter;
};

export type PaymentMethodsResponse = {
  data: PaymentMethod[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
  };
};

export const paymentMethodsApi = {
  findAll(query: PaymentMethodsQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) {
      params.set("page", String(query.page));
    }

    if (query.limit) {
      params.set("limit", String(query.limit));
    }

    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }

    if (query.status) {
      params.set("status", query.status);
    }

    const queryString = params.toString();
    return authFetch<PaymentMethodsResponse>(
      queryString ? `/payment-methods?${queryString}` : "/payment-methods"
    );
  },

  create(payload: PaymentMethodPayload) {
    return authFetch<PaymentMethod>("/payment-methods", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<PaymentMethodPayload> & { estado?: PaymentMethodStatus }) {
    return authFetch<PaymentMethod>(`/payment-methods/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return authFetch<PaymentMethod>(`/payment-methods/${id}`, {
      method: "DELETE",
    });
  },
};

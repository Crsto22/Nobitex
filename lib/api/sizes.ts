import { authFetch } from "@/lib/api/auth-fetch";

export type Size = {
  id: string;
  empresaId: string;
  nombre: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SizePayload = {
  nombre: string;
  activo?: boolean;
};

export type SizeStatusFilter = "active" | "inactive";

export type SizesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: SizeStatusFilter;
};

export type SizesResponse = {
  data: Size[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
  };
};

export const sizesApi = {
  findAll(query: SizesQuery = {}) {
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
    return authFetch<SizesResponse>(
      queryString ? `/sizes?${queryString}` : "/sizes"
    );
  },

  create(payload: SizePayload) {
    return authFetch<Size>("/sizes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<SizePayload>) {
    return authFetch<Size>(`/sizes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return authFetch<Size>(`/sizes/${id}`, {
      method: "DELETE",
    });
  },
};

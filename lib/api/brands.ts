import { authFetch } from "@/lib/api/auth-fetch";

export type Brand = {
  id: string;
  empresaId: string;
  nombre: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandPayload = {
  nombre: string;
  activo?: boolean;
};

export type BrandStatusFilter = "active" | "inactive";

export type BrandsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: BrandStatusFilter;
};

export type BrandsResponse = {
  data: Brand[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
  };
};

export const brandsApi = {
  findAll(query: BrandsQuery = {}) {
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
    return authFetch<BrandsResponse>(
      queryString ? `/brands?${queryString}` : "/brands"
    );
  },

  create(payload: BrandPayload) {
    return authFetch<Brand>("/brands", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<BrandPayload>) {
    return authFetch<Brand>(`/brands/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return authFetch<Brand>(`/brands/${id}`, {
      method: "DELETE",
    });
  },
};

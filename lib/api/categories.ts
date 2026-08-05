import { authFetch } from "@/lib/api/auth-fetch";

export type Category = {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryPayload = {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type CategoryStatusFilter = "active" | "inactive";

export type CategoriesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CategoryStatusFilter;
};

export type CategoriesResponse = {
  data: Category[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
  };
};

export const categoriesApi = {
  findAll(query: CategoriesQuery = {}) {
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
    return authFetch<CategoriesResponse>(
      queryString ? `/categories?${queryString}` : "/categories"
    );
  },

  create(payload: CategoryPayload) {
    return authFetch<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<CategoryPayload>) {
    return authFetch<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return authFetch<Category>(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};

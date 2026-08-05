import { authFetch } from "@/lib/api/auth-fetch";

export type Color = {
  id: string;
  empresaId: string;
  nombre: string;
  hex: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ColorPayload = {
  nombre: string;
  hex: string;
  activo?: boolean;
};

export type ColorStatusFilter = "active" | "inactive";

export type ColorsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ColorStatusFilter;
};

export type ColorsResponse = {
  data: Color[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
  };
};

export const colorsApi = {
  findAll(query: ColorsQuery = {}) {
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
    return authFetch<ColorsResponse>(
      queryString ? `/colors?${queryString}` : "/colors"
    );
  },

  create(payload: ColorPayload) {
    return authFetch<Color>("/colors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<ColorPayload>) {
    return authFetch<Color>(`/colors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return authFetch<Color>(`/colors/${id}`, {
      method: "DELETE",
    });
  },
};

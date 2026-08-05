import { authFetch } from "@/lib/api/auth-fetch";

export type BranchType = "tienda" | "almacen";
export type BranchStatus = "activo" | "inactivo";

export type Branch = {
  id: string;
  empresaId: string;
  nombre: string;
  tipo: BranchType;
  ubigeo: string;
  distrito: string;
  direccion: string;
  codigoEstablecimientoSunat: string | null;
  estado: BranchStatus;
  esPrincipal: boolean;
  modoCajaHabilitado: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BranchPayload = {
  nombre: string;
  tipo: BranchType;
  ubigeo: string;
  distrito: string;
  direccion: string;
  codigoEstablecimientoSunat?: string | null;
  estado?: BranchStatus;
  esPrincipal?: boolean;
  modoCajaHabilitado?: boolean;
};

export type BranchesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  tipo?: BranchType;
  estado?: BranchStatus;
};

export type BranchesResponse = {
  data: Branch[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
    storeTotal: number;
    warehouseTotal: number;
  };
};

export const branchesApi = {
  findAll(query: BranchesQuery = {}) {
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

    if (query.tipo) {
      params.set("tipo", query.tipo);
    }

    if (query.estado) {
      params.set("estado", query.estado);
    }

    const queryString = params.toString();
    return authFetch<BranchesResponse>(
      queryString ? `/branches?${queryString}` : "/branches"
    );
  },

  create(payload: BranchPayload) {
    return authFetch<Branch>("/branches", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<BranchPayload>) {
    return authFetch<Branch>(`/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return authFetch<Branch>(`/branches/${id}`, {
      method: "DELETE",
    });
  },
};

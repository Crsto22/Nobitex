import { authFetch } from "@/lib/api/auth-fetch";

export type UserRoleCode = "OWNER" | "ADMIN" | "VENDEDOR" | "ALMACENERO";
export type UserStatus = "activo" | "inactivo" | "bloqueado";

export type UserModule = {
  key: string;
  label: string;
  route: string;
};

export type CompanyUser = {
  id: string;
  empresaUsuarioId: string;
  nombre: string;
  apellido: string | null;
  email: string;
  telefono: string | null;
  estado: UserStatus;
  roles: { code: UserRoleCode; label: string }[];
  moduleKeys: string[];
  modules: UserModule[];
  isOwner: boolean;
  sucursal: { id: string; nombre: string; estado: "activo" | "inactivo" } | null;
  visibilidadOperaciones: "propias" | "todas";
  createdAt: string;
  updatedAt: string;
};

export type UsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  estado?: UserStatus;
};

export type CreateUserPayload = {
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  password: string;
  confirmarPassword: string;
  moduleKeys: string[];
  sucursalId?: string | null;
  visibilidadOperaciones: "propias" | "todas";
};

export type UpdateUserPayload = {
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  moduleKeys: string[];
  sucursalId?: string | null;
  visibilidadOperaciones: "propias" | "todas";
};

export type UsersResponse = {
  data: CompanyUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
    adminTotal: number;
    salesTotal: number;
    warehouseTotal: number;
  };
};

export const usersApi = {
  findAll(query: UsersQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.estado) params.set("estado", query.estado);

    const queryString = params.toString();
    return authFetch<UsersResponse>(queryString ? `/users?${queryString}` : "/users");
  },

  create(payload: CreateUserPayload) {
    return authFetch<CompanyUser>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  findOne(id: string) {
    return authFetch<CompanyUser>(`/users/${id}`);
  },

  update(id: string, payload: UpdateUserPayload) {
    return authFetch<CompanyUser>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateStatus(id: string, estado: Extract<UserStatus, "activo" | "inactivo">) {
    return authFetch<CompanyUser>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },

  remove(id: string) {
    return authFetch<{ success: boolean }>(`/users/${id}`, {
      method: "DELETE",
    });
  },
};

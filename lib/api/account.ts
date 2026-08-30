import { authFetch } from "@/lib/api/auth-fetch";
import type { LoginResponse } from "@/lib/api/auth";

export type AccountProfile = {
  id: string;
  empresaUsuarioId: string | null;
  nombre: string;
  apellido: string | null;
  email: string;
  telefono: string | null;
  roles: string[];
  moduleKeys: string[];
  sucursalId: string | null;
  sucursalTipo: "tienda" | "almacen" | "asistencia" | null;
  sucursal: {
    id: string;
    nombre: string;
    estado: "activo" | "inactivo";
    tipo: "tienda" | "almacen" | "asistencia";
  } | null;
  visibilidadOperaciones: "propias" | "todas";
};

export type UpdateAccountPayload = {
  nombre: string;
  apellido?: string;
  telefono?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  password: string;
  confirmarPassword: string;
};

export const accountApi = {
  me() {
    return authFetch<AccountProfile>("/auth/me");
  },

  update(payload: UpdateAccountPayload) {
    return authFetch<LoginResponse>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  changePassword(payload: ChangePasswordPayload) {
    return authFetch<LoginResponse>("/auth/me/password", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

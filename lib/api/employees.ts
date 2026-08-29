import { authFetch } from "@/lib/api/auth-fetch";
import type { ConsultaDniResponse } from "@/lib/api/clients";

export type EmployeeDocumentType = "dni" | "carnet_extranjeria" | "otro";
export type EmployeeStatus = "activo" | "inactivo";
export type EmployeeAccessStatus = "pendiente" | "activado" | "expirado";

export type Employee = {
  id: string;
  empresaId: string;
  turnoId: string | null;
  turno: {
    id: string;
    nombre: string;
    horaEntrada: string;
    horaSalida: string;
  } | null;
  tipoDocumento: EmployeeDocumentType;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  email: string;
  telefono: string;
  estado: EmployeeStatus;
  accessStatus: EmployeeAccessStatus;
  deviceStatus: "sin_dispositivo" | "registrado";
  workerDeviceName: string | null;
  workerDeviceRegisteredAt: string | null;
  activationUrl: string | null;
  activationTokenExpiresAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeePayload = {
  tipoDocumento: EmployeeDocumentType;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  email: string;
  telefono: string;
  turnoId?: string | null;
  estado?: EmployeeStatus;
};

export type EmployeesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  estado?: EmployeeStatus;
};

export type EmployeesResponse = {
  data: Employee[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
    dniTotal: number;
  };
};

export const employeesApi = {
  findAll(query: EmployeesQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.estado) params.set("estado", query.estado);

    const queryString = params.toString();
    return authFetch<EmployeesResponse>(
      queryString
        ? `/attendance/employees?${queryString}`
        : "/attendance/employees",
    );
  },

  create(payload: EmployeePayload) {
    return authFetch<Employee>("/attendance/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: EmployeePayload) {
    return authFetch<Employee>(`/attendance/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateStatus(id: string, estado: EmployeeStatus) {
    return authFetch<Employee>(`/attendance/employees/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },

  remove(id: string) {
    return authFetch<Employee>(`/attendance/employees/${id}`, {
      method: "DELETE",
    });
  },

  generateAccessToken(id: string) {
    return authFetch<Employee>(`/attendance/employees/${id}/access-token`, {
      method: "POST",
    });
  },

  resetDevice(id: string) {
    return authFetch<Employee>(`/attendance/employees/${id}/device/reset`, {
      method: "PATCH",
    });
  },

  consultarDni(dni: string) {
    return authFetch<ConsultaDniResponse>(`/documento/dni/${dni}`);
  },
};

import { authFetch } from "@/lib/api/auth-fetch";

export type ShiftStatus = "activo" | "inactivo";

export type Shift = {
  id: string;
  empresaId: string;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  diasLaborables: number[];
  estado: ShiftStatus;
  assignedEmployeesTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type ShiftPayload = {
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  diasLaborables: number[];
  estado?: ShiftStatus;
};

export type ShiftsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  estado?: ShiftStatus;
};

export type ShiftsResponse = {
  data: Shift[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
    assignedEmployeesTotal: number;
  };
};

export const shiftsApi = {
  findAll(query: ShiftsQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.estado) params.set("estado", query.estado);

    const queryString = params.toString();
    return authFetch<ShiftsResponse>(
      queryString ? `/attendance/shifts?${queryString}` : "/attendance/shifts",
    );
  },

  create(payload: ShiftPayload) {
    return authFetch<Shift>("/attendance/shifts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: ShiftPayload) {
    return authFetch<Shift>(`/attendance/shifts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateStatus(id: string, estado: ShiftStatus) {
    return authFetch<Shift>(`/attendance/shifts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },

  assignEmployees(id: string, employeeIds: string[]) {
    return authFetch<Shift>(`/attendance/shifts/${id}/employees`, {
      method: "PATCH",
      body: JSON.stringify({ employeeIds }),
    });
  },

  remove(id: string) {
    return authFetch<Shift>(`/attendance/shifts/${id}`, {
      method: "DELETE",
    });
  },
};

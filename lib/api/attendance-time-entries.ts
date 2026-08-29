import { authFetch } from "@/lib/api/auth-fetch";

export type AttendanceTimeEntryRange = "7days" | "14days" | "21days" | "month";
export type AttendanceTimeEntryStatusFilter =
  | "todos"
  | "asistencias"
  | "faltas"
  | "tardanzas"
  | "incompletos";
export type AttendanceDayStatus =
  | "asistencia"
  | "falta"
  | "tardanza"
  | "incompleto"
  | "descanso"
  | "sin_turno"
  | "pendiente";

export type AttendanceTimeEntry = {
  id: string;
  empleadoId: string;
  turnoId: string | null;
  sucursalId: string | null;
  puntoQrId: string | null;
  tipo: "entrada" | "salida";
  metodo: "qr" | "manual";
  estado: "valido" | "observado" | "anulado";
  fechaHora: string;
  hora: string;
  latitud: number | null;
  longitud: number | null;
  createdAt: string;
};

export type AttendanceDay = {
  date: string;
  weekday: string;
  weekdayNumber: number;
  isFuture: boolean;
};

export type AttendanceDayResult = {
  date: string;
  weekday: string;
  status: AttendanceDayStatus;
  entrada: AttendanceTimeEntry | null;
  salida: AttendanceTimeEntry | null;
  turno: {
    id: string;
    nombre: string;
    horaEntrada: string;
    horaSalida: string;
  } | null;
  sucursal: { id: string; nombre: string } | null;
  puntoQr: { id: string; nombre: string } | null;
};

export type AttendanceTimeEntryRow = {
  employee: {
    id: string;
    nombres: string;
    apellidoPaterno: string | null;
    apellidoMaterno: string | null;
    numeroDocumento: string;
  };
  turno: {
    id: string;
    nombre: string;
    horaEntrada: string;
    horaSalida: string;
  } | null;
  days: AttendanceDayResult[];
};

export type AttendanceTimeEntriesResponse = {
  range: AttendanceTimeEntryRange;
  status: AttendanceTimeEntryStatusFilter;
  filters: {
    sucursalId: string | null;
    turnoId: string | null;
  };
  summary: {
    asistencias: number;
    faltas: number;
    tardanzas: number;
    incompletos: number;
  };
  days: AttendanceDay[];
  rows: AttendanceTimeEntryRow[];
};

export type AttendanceTimeEntriesQuery = {
  range?: AttendanceTimeEntryRange;
  status?: AttendanceTimeEntryStatusFilter;
  search?: string;
  sucursalId?: string;
  turnoId?: string;
};

export type AttendanceTimeEntryHistoryItem = AttendanceTimeEntry & {
  empleado: {
    id: string;
    nombres: string;
    apellidoPaterno: string | null;
    apellidoMaterno: string | null;
    numeroDocumento: string;
  };
  turno: {
    id: string;
    nombre: string;
    horaEntrada: string;
    horaSalida: string;
  } | null;
  sucursal: { id: string; nombre: string } | null;
  puntoQr: { id: string; nombre: string } | null;
};

export type AttendanceTimeEntryHistoryQuery = {
  page?: number;
  limit?: number;
  search?: string;
  empleadoId?: string;
  sucursalId?: string;
  tipo?: "todos" | "entrada" | "salida";
  metodo?: "todos" | "qr" | "manual";
  estado?: "todos" | "valido" | "observado" | "anulado";
  desde?: string;
  hasta?: string;
};

export type AttendanceTimeEntryHistoryResponse = {
  data: AttendanceTimeEntryHistoryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateManualAttendanceTimeEntryPayload = {
  empleadoId: string;
  tipo: "entrada" | "salida";
  fechaHora: string;
  sucursalId?: string;
};

export const attendanceTimeEntriesApi = {
  findAll(query: AttendanceTimeEntriesQuery = {}) {
    const params = new URLSearchParams();

    if (query.range) params.set("range", query.range);
    if (query.status) params.set("status", query.status);
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.sucursalId && query.sucursalId !== "todos") {
      params.set("sucursalId", query.sucursalId);
    }
    if (query.turnoId && query.turnoId !== "todos") {
      params.set("turnoId", query.turnoId);
    }

    const queryString = params.toString();
    return authFetch<AttendanceTimeEntriesResponse>(
      queryString
        ? `/attendance/time-entries?${queryString}`
        : "/attendance/time-entries",
    );
  },

  findHistory(query: AttendanceTimeEntryHistoryQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.empleadoId && query.empleadoId !== "todos") {
      params.set("empleadoId", query.empleadoId);
    }
    if (query.sucursalId && query.sucursalId !== "todos") {
      params.set("sucursalId", query.sucursalId);
    }
    if (query.tipo && query.tipo !== "todos") params.set("tipo", query.tipo);
    if (query.metodo && query.metodo !== "todos") {
      params.set("metodo", query.metodo);
    }
    if (query.estado && query.estado !== "todos") {
      params.set("estado", query.estado);
    }
    if (query.desde) params.set("desde", query.desde);
    if (query.hasta) params.set("hasta", query.hasta);

    const queryString = params.toString();
    return authFetch<AttendanceTimeEntryHistoryResponse>(
      queryString
        ? `/attendance/time-entries/history?${queryString}`
        : "/attendance/time-entries/history",
    );
  },

  createManual(payload: CreateManualAttendanceTimeEntryPayload) {
    return authFetch<AttendanceTimeEntryHistoryItem>(
      "/attendance/time-entries/manual",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};

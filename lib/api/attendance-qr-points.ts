import { authFetch } from "@/lib/api/auth-fetch";

export type QrPointStatus = "activo" | "inactivo";
export type QrPointType = "normal" | "dinamico";

export type QrPoint = {
  id: string;
  empresaId: string;
  sucursalId: string;
  sucursal: {
    id: string;
    nombre: string;
    tipo: "tienda" | "almacen";
    direccion: string;
    distrito: string;
  };
  nombre: string;
  codigo: string;
  latitud: number;
  longitud: number;
  precisionMetros: number | null;
  radioMetros: number;
  tipoQr: QrPointType;
  refreshSeconds: number;
  estado: QrPointStatus;
  createdAt: string;
  updatedAt: string;
};

export type QrPointPayload = {
  nombre: string;
  sucursalId: string;
  latitud: number;
  longitud: number;
  precisionMetros?: number | null;
  radioMetros?: number;
  tipoQr?: QrPointType;
  refreshSeconds?: number;
  estado?: QrPointStatus;
};

export type QrPointsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  estado?: QrPointStatus;
};

export type QrPointsResponse = {
  data: QrPoint[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
    branchesWithQrTotal: number;
  };
};

export type QrPointQrResponse = {
  content: string;
  dataUrl: string;
  tipoQr: QrPointType;
  refreshSeconds: number;
  expiresAt: string | null;
  serverTime: string;
};

export const attendanceQrPointsApi = {
  findAll(query: QrPointsQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.estado) params.set("estado", query.estado);

    const queryString = params.toString();
    return authFetch<QrPointsResponse>(
      queryString
        ? `/attendance/qr-points?${queryString}`
        : "/attendance/qr-points",
    );
  },

  create(payload: QrPointPayload) {
    return authFetch<QrPoint>("/attendance/qr-points", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: QrPointPayload) {
    return authFetch<QrPoint>(`/attendance/qr-points/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateStatus(id: string, estado: QrPointStatus) {
    return authFetch<QrPoint>(`/attendance/qr-points/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },

  getQr(id: string) {
    return authFetch<QrPointQrResponse>(`/attendance/qr-points/${id}/qr`);
  },

  remove(id: string) {
    return authFetch<QrPoint>(`/attendance/qr-points/${id}`, {
      method: "DELETE",
    });
  },
};

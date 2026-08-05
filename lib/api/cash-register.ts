import { authFetch } from "@/lib/api/auth-fetch";

export type CashRegisterStatus = "abierta" | "cerrada";
export type CashMovementType =
  | "apertura"
  | "venta"
  | "ingreso"
  | "retiro"
  | "anulacion_venta";

export type CashAmount = {
  metodoPagoId: string;
  monto: string;
};

export type CashMovement = {
  publicId: string;
  tipo: CashMovementType;
  monto: string;
  motivo: string | null;
  referencia: string | null;
  createdAt: string;
  metodoPago: CashRegisterPaymentMethod | null;
  venta: { publicId: string; correlativo: string } | null;
};

export type CashRegisterPaymentMethod = {
  id: string;
  nombre: string;
  nombreKey: string;
  codigo?: string | null;
  esSistema?: boolean;
  permiteVuelto?: boolean;
};

export type CashRegisterSession = {
  publicId: string;
  estado: CashRegisterStatus;
  openedAt: string;
  closedAt: string | null;
  montoInicial: string;
  montoEsperado: string | null;
  montoDeclarado: string | null;
  diferencia: string | null;
  observacionesApertura: string | null;
  observacionesCierre: string | null;
  montoEsperadoActual?: string;
  sucursal: { id: string; nombre: string; tipo: string };
  usuario: {
    id: string;
    nombre: string;
    apellido: string | null;
    email: string;
  };
  movimientos?: CashMovement[];
  totalesPorMetodoPago?: Array<{
    metodoPago: CashRegisterPaymentMethod | null;
    monto: string;
  }>;
};

export type CashRegistersQuery = {
  page?: number;
  limit?: number;
  sucursalId?: string;
  usuarioId?: string;
  estado?: CashRegisterStatus;
  from?: string;
  to?: string;
};

export type CashRegistersResponse = {
  data: CashRegisterSession[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type OpenCashRegisterPayload = {
  sucursalId: string;
  saldosIniciales?: CashAmount[];
  observaciones?: string;
};

export type CloseCashRegisterPayload = {
  sucursalId: string;
  saldosDeclarados: CashAmount[];
  observaciones?: string;
};

export type CreateCashMovementPayload = {
  sucursalId: string;
  tipo: "ingreso" | "retiro";
  metodoPagoId: string;
  monto: string;
  motivo: string;
  referencia?: string;
};

export const cashRegisterApi = {
  open(payload: OpenCashRegisterPayload) {
    return authFetch<CashRegisterSession>("/cash-register/open", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  current(sucursalId: string) {
    const params = new URLSearchParams({ sucursalId });
    return authFetch<CashRegisterSession | null>(
      `/cash-register/current?${params.toString()}`,
    );
  },

  createMovement(payload: CreateCashMovementPayload) {
    return authFetch<CashMovement>("/cash-register/movements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  close(payload: CloseCashRegisterPayload) {
    return authFetch<CashRegisterSession>("/cash-register/close", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  findAll(query: CashRegistersQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.sucursalId) params.set("sucursalId", query.sucursalId);
    if (query.usuarioId) params.set("usuarioId", query.usuarioId);
    if (query.estado) params.set("estado", query.estado);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);

    const queryString = params.toString();
    return authFetch<CashRegistersResponse>(
      queryString ? `/cash-register?${queryString}` : "/cash-register",
    );
  },

  findOne(publicId: string) {
    return authFetch<CashRegisterSession>(`/cash-register/${publicId}`);
  },
};

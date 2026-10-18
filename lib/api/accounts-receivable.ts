import { authFetch } from "@/lib/api/auth-fetch";

export type ReceivableStatus =
  "pendiente" | "parcial" | "pagada" | "anulacion_pendiente" | "anulada";

export type ReceivableInstallmentStatus =
  "pendiente" | "parcial" | "pagada" | "anulada";

export type ReceivableSummary = {
  totalPendiente: string;
  totalVencido: string;
  totalPorVencer: string;
  cobradoMes: string;
  clientesConDeuda: number;
};

export type Receivable = {
  publicId: string;
  moneda: string;
  totalVenta: string;
  adelanto: string;
  saldoInicial: string;
  saldoPendiente: string;
  saldoFavor: string;
  estado: ReceivableStatus;
  vencida: boolean;
  primerVencimiento: string;
  ultimoPagoAt: string | null;
  createdAt: string;
  cliente: {
    id: string;
    nombre: string | null;
    razonSocial: string | null;
    tipoDocumento: string;
    numeroDocumento: string | null;
    telefono: string | null;
    email: string | null;
  };
  sucursal: { id: string; nombre: string } | null;
  venta: {
    publicId: string;
    codigoInterno: string;
    correlativo: string;
    tipoComprobante: string;
    formaPago: "CONTADO" | "CREDITO";
    estado: string;
    sunatEstado: string;
    createdAt: string;
  };
  cuotas: Array<{
    numero: number;
    fechaVencimiento: string;
    montoOriginal: string;
    montoPagado: string;
    saldo: string;
    estado: ReceivableInstallmentStatus;
    vencida: boolean;
  }>;
  pagos: Array<{
    publicId: string;
    origen: "venta" | "cobranza";
    monto: string;
    montoRecibido: string | null;
    vuelto: string;
    referencia: string | null;
    estado: "activo" | "anulado";
    createdAt: string;
    metodoPago: { id: string; nombre: string };
    creadoPor: { id: string; nombre: string } | null;
    cuotas: Array<{ numero: number; monto: string }>;
  }>;
};

export type ReceivablesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  clienteId?: string;
  sucursalId?: string;
  estado?: ReceivableStatus;
  situacion?: "vencida" | "vigente";
  desde?: string;
  hasta?: string;
};

export type RegisterReceivablePayment = {
  requestId: string;
  sucursalId?: string;
  metodoPagoId: string;
  monto: string;
  montoRecibido?: string;
  referencia?: string;
};

function toQueryString(query: ReceivablesQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export const accountsReceivableApi = {
  summary() {
    return authFetch<ReceivableSummary>("/accounts-receivable/summary");
  },
  findAll(query: ReceivablesQuery = {}) {
    const queryString = toQueryString(query);
    return authFetch<{
      data: Receivable[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(
      queryString
        ? `/accounts-receivable?${queryString}`
        : "/accounts-receivable",
    );
  },
  findOne(publicId: string) {
    return authFetch<Receivable>(`/accounts-receivable/${publicId}`);
  },
  registerPayment(publicId: string, payload: RegisterReceivablePayment) {
    return authFetch<Receivable>(`/accounts-receivable/${publicId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  annulPayment(publicId: string, razon: string) {
    return authFetch<Receivable>(
      `/accounts-receivable/payments/${publicId}/annul`,
      { method: "POST", body: JSON.stringify({ razon }) },
    );
  },
};

import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";
import type {
  CreateSalePago,
  CreateSaleDetalle,
  VentaTipoComprobante,
  VentaDescuentoTipo,
  VentaDetalleResponse,
  VentaResponse,
} from "@/lib/api/sales";
import type { Client } from "@/lib/api/clients";
import {
  appendHistoryPeriod,
  type HistoryPeriodQuery,
} from "@/lib/history-period";

export type CotizacionEstado =
  | "borrador"
  | "enviada"
  | "aceptada"
  | "rechazada"
  | "vencida"
  | "convertida"
  | "anulada";

export type CreateQuotationPayload = {
  requestId?: string;
  sucursalId?: string;
  clienteId?: string;
  estado?: CotizacionEstado;
  descuentoTipo?: VentaDescuentoTipo;
  descuentoValor?: string;
  detalles: CreateSaleDetalle[];
  observaciones?: string;
  validaHasta?: string;
};

export type UpdateQuotationPayload = Partial<CreateQuotationPayload>;

export type ConvertQuotationPayload = {
  requestId?: string;
  tipoComprobante: VentaTipoComprobante;
  clienteId?: string | null;
  pagos: CreateSalePago[];
  observaciones?: string;
  recogerDespues?: boolean;
  recojoHasta?: string;
};

export type ConvertQuotationResponse = {
  quotation: QuotationResponse;
  sale: VentaResponse;
};

export type QuotationResponse = {
  publicId: string;
  serie: string;
  numero: number;
  correlativo: string;
  estado: CotizacionEstado;
  subtotal: string;
  descuentoTipo: string | null;
  descuentoValor: string | null;
  descuentoMonto: string;
  total: string;
  observaciones: string | null;
  validaHasta: string | null;
  anuladoAt: string | null;
  anuladoRazon: string | null;
  createdAt: string;
  convertidaVentaId: string | null;
  convertidaVenta: {
    publicId: string;
    correlativo: string;
  } | null;
  sucursal: { id: string; nombre: string } | null;
  cliente: Client | null;
  creadoPor: {
    id: string;
    nombre: string;
    apellido: string | null;
  } | null;
  detalles: VentaDetalleResponse[];
};

export type QuotationsQuery = HistoryPeriodQuery & {
  page?: number;
  limit?: number;
  estado?: CotizacionEstado;
  sucursalId?: string;
  clienteId?: string;
  desde?: string;
  hasta?: string;
  search?: string;
};

export type QuotationsResponse = {
  data: QuotationResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const quotationsApi = {
  create(payload: CreateQuotationPayload) {
    return authFetch<QuotationResponse>("/quotations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  findAll(query: QuotationsQuery = {}, options: RequestInit = {}) {
    const params = new URLSearchParams();
    appendHistoryPeriod(params, query);

    if (query.page) {
      params.set("page", String(query.page));
    }

    if (query.limit) {
      params.set("limit", String(query.limit));
    }

    if (query.estado) {
      params.set("estado", query.estado);
    }

    if (query.sucursalId) {
      params.set("sucursalId", query.sucursalId);
    }

    if (query.clienteId) {
      params.set("clienteId", query.clienteId);
    }

    if (query.desde) {
      params.set("desde", query.desde);
    }

    if (query.hasta) {
      params.set("hasta", query.hasta);
    }

    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }

    const queryString = params.toString();
    return authFetch<QuotationsResponse>(
      queryString ? `/quotations?${queryString}` : "/quotations",
      options,
    );
  },

  findOne(publicId: string) {
    return authFetch<QuotationResponse>(`/quotations/${publicId}`);
  },

  downloadPdf(publicId: string) {
    return authBlobFetch(`/quotations/${publicId}/pdf`);
  },

  update(publicId: string, payload: UpdateQuotationPayload) {
    return authFetch<QuotationResponse>(`/quotations/${publicId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  annul(publicId: string, razon: string) {
    return authFetch<QuotationResponse>(`/quotations/${publicId}/annul`, {
      method: "PATCH",
      body: JSON.stringify({ razon }),
    });
  },

  convertToSale(publicId: string, payload: ConvertQuotationPayload) {
    return authFetch<ConvertQuotationResponse>(
      `/quotations/${publicId}/convert-to-sale`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};

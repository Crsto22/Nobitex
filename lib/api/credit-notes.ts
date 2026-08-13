import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";
import type { VentaResponse, VentaTipoComprobante } from "@/lib/api/sales";
import type { HistoryPeriodQuery } from "@/lib/history-period";

export type CreditNoteSunatEstado =
  | "pendiente_envio"
  | "enviando"
  | "pendiente_cdr"
  | "aceptado"
  | "observado"
  | "rechazado"
  | "error_transitorio"
  | "error_definitivo";

export type CreditNoteItemPayload = {
  ventaDetalleId: string;
  cantidad: number;
};

export type CreateCreditNotePayload = {
  ventaPublicId: string;
  serieId?: string;
  serie?: string;
  codigoMotivo: "02" | "03" | "06" | "07";
  descripcionMotivo: string;
  items?: CreditNoteItemPayload[];
};

export type CreditNoteResponse = {
  publicId: string;
  correlativo: string;
  tipoComprobante: Extract<
    VentaTipoComprobante,
    "nota_credito_factura" | "nota_credito_boleta"
  >;
  serie: string;
  numero: number;
  codigoMotivo: string;
  descripcionMotivo: string;
  moneda: string;
  subtotal: string;
  descuentoMonto: string;
  igvPorcentaje: string;
  opGravadas: string;
  opExoneradas: string;
  opInafectas: string;
  igvMonto: string;
  total: string;
  estado: string;
  stockDevuelto: boolean;
  sunat: {
    estado: CreditNoteSunatEstado;
    codigo: string | null;
    mensaje: string | null;
    hash: string | null;
    xmlDisponible: boolean;
    cdrDisponible: boolean;
    enviadoAt: string | null;
    respondidoAt: string | null;
  };
  ventaReferencia: {
    publicId: string;
    correlativo: string;
    tipoComprobante: VentaTipoComprobante;
    serie: string;
    numero: number;
    createdAt: string;
  };
  sucursal: { id: string; nombre: string } | null;
  cliente: {
    id: string;
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string | null;
  } | null;
  serieComprobante: {
    id: string;
    serie: string;
    tipoComprobante: VentaTipoComprobante;
  };
  creadoPor: {
    id: string;
    nombre: string;
    apellido: string;
  } | null;
  detalles: {
    id: string;
    ventaDetalleId: string | null;
    descripcion: string | null;
    cantidad: number;
    unidadMedidaCodigo: string;
    precioUnitario: string;
    valorUnitario: string;
    descuentoMonto: string;
    valorVenta: string;
    igvMonto: string;
    subtotal: string;
    total: string;
    tipoAfectacionIgvCodigo: string;
    productoVariante: {
      id: string;
      sku: string | null;
      producto: {
        id: string;
        publicId: string;
        nombre: string;
        tipo: "normal" | "variantes";
      };
      color: { id: string; nombre: string; hex: string };
      talla: { id: string; nombre: string };
      imagen: {
        id: string;
        urlOriginal: string;
        urlWebp: string;
        urlThumbnail: string;
      } | null;
    };
  }[];
  createdAt: string;
  updatedAt: string;
};

export type CreditNotesQuery = HistoryPeriodQuery & {
  page?: number;
  limit?: number;
  search?: string;
  tipoComprobante?: "nota_credito_factura" | "nota_credito_boleta";
  sunatEstado?: CreditNoteSunatEstado;
  ventaPublicId?: string;
};

export type CreditNotesResponse = {
  data: CreditNoteResponse[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    aceptados: number;
    porEnviar: number;
    observados: number;
    rechazados: number;
    errores: number;
    montoAceptado: string;
  };
};

function queryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const creditNotesApi = {
  findAll(query: CreditNotesQuery = {}, options: RequestInit = {}) {
    return authFetch<CreditNotesResponse>(
      `/credit-notes${queryString(query)}`,
      options,
    );
  },
  findOne(publicId: string) {
    return authFetch<CreditNoteResponse>(`/credit-notes/${publicId}`);
  },
  create(payload: CreateCreditNotePayload) {
    return authFetch<CreditNoteResponse>("/credit-notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  retrySunat(publicId: string) {
    return authFetch(`/credit-notes/${publicId}/sunat/retry`, {
      method: "POST",
    });
  },
  downloadPdf(publicId: string) {
    return authBlobFetch(`/credit-notes/${publicId}/pdf`);
  },
  downloadSunatXml(publicId: string) {
    return authBlobFetch(`/credit-notes/${publicId}/sunat/xml`);
  },
  downloadSunatCdr(publicId: string) {
    return authBlobFetch(`/credit-notes/${publicId}/sunat/cdr`);
  },
};

export type { VentaResponse };

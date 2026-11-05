import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";

export type DebitNoteStatus =
  | "pendiente_envio"
  | "enviando"
  | "pendiente_cdr"
  | "aceptado"
  | "observado"
  | "rechazado"
  | "error_transitorio"
  | "error_definitivo";

export type EligibleDebitSale = {
  publicId: string;
  correlativo: string;
  tipoComprobante: "factura" | "boleta";
  moneda: string;
  total: string;
  cliente: { nombre: string; documento: string | null } | null;
  detalles: {
    id: string;
    descripcion: string;
    cantidad: number;
    total: string;
    tipoAfectacionIgvCodigo: string;
  }[];
};

export type DebitNoteResponse = {
  publicId: string;
  tipoComprobante: "nota_debito_factura" | "nota_debito_boleta";
  serie: string;
  numero: number | null;
  correlativo: string | null;
  codigoMotivo: string;
  descripcionMotivo: string;
  fechaVencimiento: string;
  moneda: string;
  opGravadas: string;
  opExoneradas: string;
  opInafectas: string;
  igvMonto: string;
  total: string;
  ventaReferencia: {
    publicId: string;
    correlativo: string;
    tipoComprobante: "factura" | "boleta";
    total: string;
    createdAt: string;
  };
  cliente: { id: string; nombre: string; documento: string | null };
  sucursal: { id: string; nombre: string } | null;
  detalles: {
    id: string;
    ventaDetalleId: string;
    descripcion: string;
    importe: string;
    valorVenta: string;
    igvMonto: string;
    tipoAfectacionIgvCodigo: string;
  }[];
  sunat: {
    estado: DebitNoteStatus;
    codigo: string | null;
    mensaje: string | null;
    enviadoAt: string | null;
    respondidoAt: string | null;
    archivosDisponibles: boolean;
  };
  billing: {
    documentId: string | null;
    environment: "BETA" | "PRODUCTION";
    status: string;
    updatedAt: string | null;
    lastError: string | null;
    attempts: number;
  };
};

export type CreateDebitNotePayload = {
  ventaPublicId: string;
  serieId?: string;
  serie?: string;
  codigoMotivo: "01" | "02" | "03";
  descripcionMotivo: string;
  fechaVencimiento: string;
  ajustes: {
    ventaDetalleId: string;
    importe: string;
    descripcion: string;
  }[];
};

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.size ? `?${params.toString()}` : "";
}

export const debitNotesApi = {
  findAll(
    values: {
      page?: number;
      limit?: number;
      search?: string;
      sunatEstado?: string;
      tipoComprobante?: string;
      periodo?: string;
      desde?: string;
      hasta?: string;
    } = {},
  ) {
    return authFetch<{
      data: DebitNoteResponse[];
      total: number;
      page: number;
    }>(`/debit-notes${query(values)}`);
  },
  eligibleSales(search = "") {
    return authFetch<EligibleDebitSale[]>(
      `/debit-notes/eligible-sales${query({ search })}`,
    );
  },
  findOne(publicId: string) {
    return authFetch<DebitNoteResponse>(`/debit-notes/${publicId}`);
  },
  create(payload: CreateDebitNotePayload) {
    return authFetch<DebitNoteResponse>("/debit-notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  retry(publicId: string) {
    return authFetch(`/debit-notes/${publicId}/sunat/retry`, {
      method: "POST",
    });
  },
  pdf(publicId: string) {
    return authBlobFetch(`/debit-notes/${publicId}/pdf`);
  },
  ticket(publicId: string) {
    return authBlobFetch(`/debit-notes/${publicId}/ticket`);
  },
  xml(publicId: string) {
    return authBlobFetch(`/debit-notes/${publicId}/sunat/xml`);
  },
  cdr(publicId: string) {
    return authBlobFetch(`/debit-notes/${publicId}/sunat/cdr`);
  },
};

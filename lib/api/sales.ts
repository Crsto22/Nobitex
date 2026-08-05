import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";
import {
  appendHistoryPeriod,
  type HistoryPeriodQuery,
} from "@/lib/history-period";

export type SaleProductVariant = {
  varianteId: string;
  sku: string | null;
  codigoBarras: string | null;
  precioVenta: string;
  precioMayorista: string | null;
  stockTotal: number;
  stockSucursal: number | null;
  imagen: {
    id: string;
    urlOriginal: string;
    urlWebp: string;
    urlThumbnail: string;
  } | null;
  color: {
    id: string;
    nombre: string;
    hex: string;
  };
  talla: {
    id: string;
    nombre: string;
  };
};

export type SaleProduct = {
  productoId: string;
  empresaId: string;
  nombre: string;
  tipo: "normal" | "variantes";
  descripcion: string | null;
  precioMinimo: string;
  precioMaximo: string;
  stockTotal: number;
  stockSucursal: number | null;
  cantidadVariantes: number;
  imagen: SaleProductVariant["imagen"];
  variantes: SaleProductVariant[];
  marca: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string } | null;
  unidadMedida: {
    codigo: string;
    descripcion: string;
  };
  tipoAfectacionIgv: {
    codigo: string;
    descripcion: string;
  };
};

export type SaleProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sucursalId?: string;
  categoriaId?: string;
  marcaId?: string;
  colorId?: string;
  tallaId?: string;
};

export type SaleProductsResponse = {
  data: SaleProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type VentaTipoComprobante =
  | "nota_venta"
  | "factura"
  | "boleta"
  | "guia_remision"
  | "nota_credito_factura"
  | "nota_credito_boleta";
export type VentaEstado = "pendiente" | "completada" | "anulada" | "nc_emitida";
export type VentaDescuentoTipo = "porcentaje" | "monto";
export type VentaSunatBajaEstado =
  | "no_aplica"
  | "pendiente_envio"
  | "enviando"
  | "pendiente_cdr"
  | "aceptado"
  | "observado"
  | "rechazado"
  | "error_transitorio"
  | "error_definitivo";

export type VentaSunatBajaResponse = {
  estado: VentaSunatBajaEstado;
  codigo: string | null;
  mensaje: string | null;
  ticket: string | null;
  tipo: "RA" | "RC" | null;
  lote: string | null;
  xmlDisponible: boolean;
  cdrDisponible: boolean;
  solicitadaAt: string | null;
  respondidaAt: string | null;
};

export type CreateSaleDetalle = {
  productoVarianteId: string;
  cantidad: number;
  precioUnitario?: string;
  descuentoTipo?: VentaDescuentoTipo;
  descuentoValor?: string;
};

export type CreateSalePago = {
  metodoPagoId: string;
  monto: string;
  montoRecibido?: string;
  referencia?: string;
};

export type CreateSalePayload = {
  tipoComprobante: VentaTipoComprobante;
  sucursalId?: string;
  clienteId?: string;
  descuentoTipo?: VentaDescuentoTipo;
  descuentoValor?: string;
  detalles: CreateSaleDetalle[];
  pagos: CreateSalePago[];
  observaciones?: string;
};

export type VentaDetalleResponse = {
  id: string;
  descripcion: string | null;
  cantidad: number;
  unidadMedidaCodigo: string;
  tipoAfectacionIgvCodigo: string;
  precioUnitario: string;
  valorUnitario: string;
  descuentoTipo: string | null;
  descuentoValor: string | null;
  descuentoMonto: string;
  valorVenta: string;
  igvMonto: string;
  subtotal: string;
  total: string;
  productoVariante: {
    id: string;
    sku: string | null;
    codigoBarras: string | null;
    producto: {
      id: string;
      publicId: string;
      nombre: string;
      tipo: "normal" | "variantes";
    };
    color: {
      id: string;
      nombre: string;
      hex: string;
    };
    talla: {
      id: string;
      nombre: string;
    };
    imagen: {
      id: string;
      urlOriginal: string;
      urlWebp: string;
      urlThumbnail: string;
    } | null;
  };
};

export type VentaPagoResponse = {
  id: string;
  monto: string;
  montoRecibido: string | null;
  vuelto: string;
  referencia: string | null;
  estado: string;
  metodoPago: {
    id: string;
    nombre: string;
    nombreKey: string;
    codigo: string | null;
    esSistema: boolean;
    permiteVuelto: boolean;
  };
};

export type VentaResponse = {
  publicId: string;
  tipoComprobante: VentaTipoComprobante;
  serie: string;
  numero: number;
  correlativo: string;
  estado: VentaEstado;
  moneda: string;
  formaPago: string;
  subtotal: string;
  descuentoTipo: string | null;
  descuentoValor: string | null;
  descuentoMonto: string;
  igvPorcentaje: string;
  opGravadas: string;
  opExoneradas: string;
  opInafectas: string;
  igvMonto: string;
  total: string;
  sunat: {
    estado:
      | "no_aplica"
      | "pendiente_envio"
      | "enviando"
      | "pendiente_cdr"
      | "aceptado"
      | "observado"
      | "rechazado"
      | "error_transitorio"
      | "error_definitivo";
    codigo: string | null;
    mensaje: string | null;
    hash: string | null;
    xmlDisponible: boolean;
    cdrDisponible: boolean;
    enviadoAt: string | null;
    respondidoAt: string | null;
  };
  sunatBaja: VentaSunatBajaResponse;
  observaciones: string | null;
  anuladoAt: string | null;
  anuladoRazon: string | null;
  createdAt: string;
  sucursal: { id: string; nombre: string } | null;
  cliente: {
    id: string;
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
  } | null;
  serieComprobante: {
    id: string;
    serie: string;
    tipoComprobante: string;
  };
  cajaSesion: {
    publicId: string;
    estado: "abierta" | "cerrada";
    openedAt: string;
    closedAt: string | null;
  } | null;
  creadoPor: {
    id: string;
    nombre: string;
    apellido: string | null;
  } | null;
  detalles: VentaDetalleResponse[];
  pagos: VentaPagoResponse[];
};

export type VentaAnnulResponse =
  | VentaResponse
  | {
      publicId: string;
      correlativo: string;
      estado: VentaEstado;
      tipoAnulacion: "local" | "baja_sunat" | null;
      razon: string | null;
      anuladoAt: string | null;
      sunatBaja: VentaSunatBajaResponse;
      message?: string;
    };

export type VentaSunatStatusResponse = {
  publicId: string;
  tipoComprobante: VentaTipoComprobante;
  correlativo: string;
  estado: VentaResponse["sunat"]["estado"];
  codigo: string | null;
  mensaje: string | null;
  hash: string | null;
  enviadoAt: string | null;
  respondidoAt: string | null;
  archivos: {
    xml: { nombre: string | null } | null;
    cdr: { nombre: string | null } | null;
  };
};

export type VentasQuery = HistoryPeriodQuery & {
  page?: number;
  limit?: number;
  tipoComprobante?: VentaTipoComprobante;
  estado?: VentaEstado;
  sucursalId?: string;
  clienteId?: string;
  search?: string;
};

export type VentasResponse = {
  data: VentaResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ComprobanteSunatEstado =
  | "pendiente_envio"
  | "enviando"
  | "aceptado"
  | "observado"
  | "rechazado"
  | "error_transitorio"
  | "error_definitivo";

export type ComprobantesQuery = HistoryPeriodQuery & {
  page?: number;
  limit?: number;
  search?: string;
  tipoComprobante?: Extract<VentaTipoComprobante, "factura" | "boleta">;
  sunatEstado?: ComprobanteSunatEstado;
};

export type ComprobantesResponse = VentasResponse & {
  summary: {
    aceptados: number;
    porEnviar: number;
    observados: number;
    rechazados: number;
    errores: number;
    montoAceptado: string;
  };
};

export type SerieComprobante = {
  id: string;
  tipoComprobante: VentaTipoComprobante;
  serie: string;
  numeroActual: number;
  esPrincipal: boolean;
  aplicaTodasSucursales: boolean;
  sucursales: { id: string; nombre: string }[];
  activo: boolean;
  createdAt: string;
};

export type SeriesQuery = {
  page?: number;
  limit?: number;
  tipoComprobante?: VentaTipoComprobante;
  activo?: boolean;
  search?: string;
  sucursalId?: string;
};

export type SeriesResponse = {
  data: SerieComprobante[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateSeriePayload = {
  tipoComprobante: VentaTipoComprobante;
  serie: string;
  aplicaTodasSucursales?: boolean;
  sucursalIds?: string[];
  esPrincipal?: boolean;
};

export type UpdateSeriePayload = {
  esPrincipal?: boolean;
  activo?: boolean;
  aplicaTodasSucursales?: boolean;
  sucursalIds?: string[];
};

export const salesApi = {
  findProducts(query: SaleProductsQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) {
      params.set("page", String(query.page));
    }

    if (query.limit) {
      params.set("limit", String(query.limit));
    }

    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }

    if (query.sucursalId) {
      params.set("sucursalId", query.sucursalId);
    }

    if (query.sucursalId) {
      params.set("sucursalId", query.sucursalId);
    }

    if (query.categoriaId) {
      params.set("categoriaId", query.categoriaId);
    }

    if (query.marcaId) {
      params.set("marcaId", query.marcaId);
    }

    if (query.colorId) {
      params.set("colorId", query.colorId);
    }

    if (query.tallaId) {
      params.set("tallaId", query.tallaId);
    }

    const queryString = params.toString();
    return authFetch<SaleProductsResponse>(
      queryString ? `/sales/products?${queryString}` : "/sales/products",
    );
  },

  create(payload: CreateSalePayload) {
    return authFetch<VentaResponse>("/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  findAll(query: VentasQuery = {}) {
    const params = new URLSearchParams();
    appendHistoryPeriod(params, query);

    if (query.page) {
      params.set("page", String(query.page));
    }

    if (query.limit) {
      params.set("limit", String(query.limit));
    }

    if (query.tipoComprobante) {
      params.set("tipoComprobante", query.tipoComprobante);
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

    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }

    const queryString = params.toString();
    return authFetch<VentasResponse>(
      queryString ? `/sales?${queryString}` : "/sales",
    );
  },

  findComprobantes(query: ComprobantesQuery = {}) {
    const params = new URLSearchParams();
    appendHistoryPeriod(params, query);

    if (query.page) {
      params.set("page", String(query.page));
    }

    if (query.limit) {
      params.set("limit", String(query.limit));
    }

    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }

    if (query.tipoComprobante) {
      params.set("tipoComprobante", query.tipoComprobante);
    }

    if (query.sunatEstado) {
      params.set("sunatEstado", query.sunatEstado);
    }

    const queryString = params.toString();
    return authFetch<ComprobantesResponse>(
      queryString
        ? `/sales/comprobantes?${queryString}`
        : "/sales/comprobantes",
    );
  },

  findOne(publicId: string) {
    return authFetch<VentaResponse>(`/sales/${publicId}`);
  },

  downloadPdf(publicId: string) {
    return authBlobFetch(`/sales/${publicId}/pdf`);
  },

  downloadTicket(publicId: string) {
    return authBlobFetch(`/sales/${publicId}/ticket`);
  },

  getSunatStatus(publicId: string) {
    return authFetch<VentaSunatStatusResponse>(`/sales/${publicId}/sunat`);
  },

  retrySunat(publicId: string) {
    return authFetch<VentaSunatStatusResponse>(
      `/sales/${publicId}/sunat/retry`,
      {
        method: "POST",
      },
    );
  },

  downloadSunatXml(publicId: string) {
    return authBlobFetch(`/sales/${publicId}/sunat/xml`);
  },

  downloadSunatCdr(publicId: string) {
    return authBlobFetch(`/sales/${publicId}/sunat/cdr`);
  },

  annul(publicId: string, razon: string) {
    return authFetch<VentaAnnulResponse>(`/sales/${publicId}/annul`, {
      method: "PATCH",
      body: JSON.stringify({ razon }),
    });
  },

  consultSunatBajaTicket(publicId: string) {
    return authFetch<VentaAnnulResponse>(
      `/sales/${publicId}/sunat/baja/consultar-ticket`,
      {
        method: "POST",
      },
    );
  },

  downloadSunatBajaXml(publicId: string) {
    return authBlobFetch(`/sales/${publicId}/sunat/baja/xml`);
  },

  downloadSunatBajaCdr(publicId: string) {
    return authBlobFetch(`/sales/${publicId}/sunat/baja/cdr`);
  },
};

export const seriesApi = {
  findAll(query: SeriesQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) {
      params.set("page", String(query.page));
    }

    if (query.limit) {
      params.set("limit", String(query.limit));
    }

    if (query.tipoComprobante) {
      params.set("tipoComprobante", query.tipoComprobante);
    }

    if (query.activo !== undefined) {
      params.set("activo", String(query.activo));
    }

    if (query.search?.trim()) {
      params.set("search", query.search.trim());
    }

    const queryString = params.toString();
    return authFetch<SeriesResponse>(
      queryString ? `/sales/series?${queryString}` : "/sales/series",
    );
  },

  create(payload: CreateSeriePayload) {
    return authFetch<SerieComprobante>("/sales/series", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateSeriePayload) {
    return authFetch<SerieComprobante>(`/sales/series/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};

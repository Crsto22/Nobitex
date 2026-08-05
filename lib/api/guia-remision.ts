import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";

export type GuiaRemisionEstado =
  | "borrador"
  | "emitida"
  | "aceptada"
  | "rechazada"
  | "anulada";

export type GuiaRemisionSunatEstado =
  | "no_aplica"
  | "pendiente_envio"
  | "enviando"
  | "pendiente_cdr"
  | "aceptado"
  | "observado"
  | "rechazado"
  | "error_transitorio"
  | "error_definitivo";

export type GuiaRemisionResponse = {
  publicId: string;
  serie: string;
  numero: number;
  correlativo: string;
  fechaEmision: string;
  fechaInicioTraslado: string;
  fechaEntregaTransportista: string | null;
  motivoTraslado: string;
  descripcionMotivo: string | null;
  modalidadTransporte: "01" | "02";
  pesoBrutoTotal: string;
  unidadPeso: string;
  numeroBultos: number | null;
  observaciones: string | null;
  partida: {
    sucursalId: string | null;
    sucursalNombre: string | null;
    ubigeo: string;
    direccion: string;
  };
  llegada: {
    sucursalId: string | null;
    sucursalNombre: string | null;
    ubigeo: string;
    direccion: string;
  };
  destinatario: {
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial: string;
  };
  estado: GuiaRemisionEstado;
  sunat: {
    estado: GuiaRemisionSunatEstado;
    codigo: string | null;
    mensaje: string | null;
    hash: string | null;
    ticket: string | null;
    xmlDisponible: boolean;
    cdrDisponible: boolean;
    pdfDisponible: boolean;
    enviadoAt: string | null;
    respondidoAt: string | null;
  };
  sucursal: {
    id: string;
    nombre: string;
  };
  detalles: {
    id: string;
    productoVarianteId: string | null;
    productoNombre: string | null;
    descripcion: string;
    cantidad: string;
    unidadMedida: string;
    codigoProducto: string | null;
    pesoUnitario: string | null;
  }[];
  documentosRelacionados: {
    tipoDocumento: string;
    serie: string;
    numero: string;
  }[];
  participantes: {
    tipo: "conductor" | "transportista";
    tipoDocumento: string;
    numeroDocumento: string;
    nombres: string | null;
    apellidos: string | null;
    razonSocial: string | null;
    licencia: string | null;
    registroMtc: string | null;
    esPrincipal: boolean;
  }[];
  vehiculos: {
    placa: string;
    esPrincipal: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type GuiasRemisionQuery = {
  page?: number;
  limit?: number;
  q?: string;
  estado?: GuiaRemisionEstado;
  sunatEstado?: GuiaRemisionSunatEstado;
  sucursalId?: string;
};

export type GuiasRemisionResponse = {
  data: GuiaRemisionResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateGuiaRemisionDetalle = {
  descripcion: string;
  cantidad: string;
  unidadMedida?: string;
  codigoProducto?: string;
  pesoUnitario?: string;
};

export type CreateGuiaRemisionPayload = {
  sucursalId?: string;
  serie?: string;
  fechaInicioTraslado: string;
  fechaEntregaTransportista?: string;
  motivoTraslado?: string;
  descripcionMotivo?: string;
  modalidadTransporte: "01" | "02";
  pesoBrutoTotal: string;
  unidadPeso?: string;
  numeroBultos?: number;
  observaciones?: string;
  sucursalPartidaId?: string;
  sucursalLlegadaId?: string;
  destinatarioTipoDoc: string;
  destinatarioNroDoc: string;
  destinatarioRazonSocial: string;
  detalles: CreateGuiaRemisionDetalle[];
  documentosRelacionados?: {
    tipoDocumento: string;
    serie: string;
    numero: string;
  }[];
  catalogoParticipanteIds?: string[];
  catalogoVehiculoIds?: string[];
  emitirDirectamente?: boolean;
};

export type GuiaCatalogoParticipanteTipo = "conductor" | "transportista";

export type GuiaCatalogoParticipante = {
  publicId: string;
  tipo: GuiaCatalogoParticipanteTipo;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  licencia: string | null;
  registroMtc: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GuiaCatalogoVehiculo = {
  publicId: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GuiaCatalogosQuery = {
  page?: number;
  limit?: number;
  q?: string;
  tipo?: GuiaCatalogoParticipanteTipo;
  activo?: boolean;
};

export type GuiaCatalogoParticipantesResponse = {
  data: GuiaCatalogoParticipante[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type GuiaCatalogoVehiculosResponse = {
  data: GuiaCatalogoVehiculo[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateGuiaCatalogoParticipantePayload = {
  tipo: GuiaCatalogoParticipanteTipo;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  licencia?: string;
  registroMtc?: string;
};

export type UpdateGuiaCatalogoParticipantePayload =
  CreateGuiaCatalogoParticipantePayload & {
    activo?: boolean;
  };

export type CreateGuiaCatalogoVehiculoPayload = {
  placa: string;
  marca?: string;
  modelo?: string;
};

export type UpdateGuiaCatalogoVehiculoPayload =
  CreateGuiaCatalogoVehiculoPayload & {
    activo?: boolean;
  };

function buildCatalogosQuery(query: GuiaCatalogosQuery = {}) {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.tipo) params.set("tipo", query.tipo);
  if (query.activo !== undefined) params.set("activo", String(query.activo));

  return params.toString();
}

export const guiaRemisionApi = {
  create(payload: CreateGuiaRemisionPayload) {
    return authFetch<GuiaRemisionResponse>("/guia-remision", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  findAll(query: GuiasRemisionQuery = {}) {
    const params = new URLSearchParams();

    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.q?.trim()) params.set("q", query.q.trim());
    if (query.estado) params.set("estado", query.estado);
    if (query.sunatEstado) params.set("sunatEstado", query.sunatEstado);
    if (query.sucursalId) params.set("sucursalId", query.sucursalId);

    const queryString = params.toString();
    return authFetch<GuiasRemisionResponse>(
      queryString ? `/guia-remision?${queryString}` : "/guia-remision",
    );
  },

  findOne(publicId: string) {
    return authFetch<GuiaRemisionResponse>(`/guia-remision/${publicId}`);
  },

  emitir(publicId: string) {
    return authFetch<GuiaRemisionResponse>(`/guia-remision/${publicId}/emitir`, {
      method: "POST",
    });
  },

  consultarCdr(publicId: string) {
    return authFetch<GuiaRemisionResponse>(
      `/guia-remision/${publicId}/consultar-cdr`,
      { method: "POST" },
    );
  },

  downloadPdf(publicId: string) {
    return authBlobFetch(`/guia-remision/${publicId}/pdf`);
  },

  downloadSunatXml(publicId: string) {
    return authBlobFetch(`/guia-remision/${publicId}/sunat/xml`);
  },

  downloadSunatCdr(publicId: string) {
    return authBlobFetch(`/guia-remision/${publicId}/sunat/cdr`);
  },
};

export const guiaRemisionCatalogosApi = {
  findParticipantes(query: GuiaCatalogosQuery = {}) {
    const queryString = buildCatalogosQuery(query);
    return authFetch<GuiaCatalogoParticipantesResponse>(
      queryString
        ? `/guia-remision/catalogos/participantes?${queryString}`
        : "/guia-remision/catalogos/participantes",
    );
  },

  createParticipante(payload: CreateGuiaCatalogoParticipantePayload) {
    return authFetch<GuiaCatalogoParticipante>(
      "/guia-remision/catalogos/participantes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateParticipante(
    publicId: string,
    payload: UpdateGuiaCatalogoParticipantePayload,
  ) {
    return authFetch<GuiaCatalogoParticipante>(
      `/guia-remision/catalogos/participantes/${publicId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  removeParticipante(publicId: string) {
    return authFetch<{ success: boolean }>(
      `/guia-remision/catalogos/participantes/${publicId}`,
      { method: "DELETE" },
    );
  },

  findVehiculos(query: GuiaCatalogosQuery = {}) {
    const queryString = buildCatalogosQuery(query);
    return authFetch<GuiaCatalogoVehiculosResponse>(
      queryString
        ? `/guia-remision/catalogos/vehiculos?${queryString}`
        : "/guia-remision/catalogos/vehiculos",
    );
  },

  createVehiculo(payload: CreateGuiaCatalogoVehiculoPayload) {
    return authFetch<GuiaCatalogoVehiculo>(
      "/guia-remision/catalogos/vehiculos",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateVehiculo(
    publicId: string,
    payload: UpdateGuiaCatalogoVehiculoPayload,
  ) {
    return authFetch<GuiaCatalogoVehiculo>(
      `/guia-remision/catalogos/vehiculos/${publicId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  removeVehiculo(publicId: string) {
    return authFetch<{ success: boolean }>(
      `/guia-remision/catalogos/vehiculos/${publicId}`,
      { method: "DELETE" },
    );
  },
};

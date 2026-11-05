import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";

export type GuiaRemisionEstado =
  "borrador" | "emitida" | "aceptada" | "rechazada" | "anulada";

export type GuiaRemisionSunatEstado =
  | "no_aplica"
  | "pendiente_envio"
  | "enviando"
  | "pendiente_cdr"
  | "validado_beta"
  | "aceptado"
  | "observado"
  | "rechazado"
  | "error_transitorio"
  | "error_definitivo";

export const GUIA_REMISION_MOTIVO_OPTIONS = [
  { label: "Venta", value: "01" },
  { label: "Compra", value: "02" },
  { label: "Venta con entrega a terceros", value: "03" },
  { label: "Traslado entre establecimientos", value: "04" },
  { label: "Consignacion", value: "05" },
  { label: "Devolucion", value: "06" },
  { label: "Recojo de bienes transformados", value: "07" },
  { label: "Importacion", value: "08" },
  { label: "Exportacion", value: "09" },
  { label: "Otros", value: "13" },
  { label: "Venta sujeta a confirmacion del comprador", value: "14" },
  { label: "Traslado de bienes para transformacion", value: "17" },
  { label: "Traslado por emisor itinerante", value: "18" },
  { label: "Traslado de mercancia extranjera", value: "19" },
] as const;

export const GUIA_REMISION_DOCUMENTO_RELACIONADO_OPTIONS = [
  { label: "Factura", value: "01" },
  { label: "Boleta de venta", value: "03" },
  { label: "Liquidacion de compra", value: "04" },
  { label: "Guia de remision remitente", value: "09" },
  { label: "Ticket o cinta de maquina registradora", value: "12" },
  { label: "Comprobante de operaciones - Ley 29972", value: "48" },
  { label: "Constancia de deposito IVAP", value: "49" },
  { label: "Declaracion Aduanera de Mercancias (DAM)", value: "50" },
  { label: "Declaracion Simplificada (DS)", value: "52" },
  { label: "Resolucion de adjudicacion de bienes - SUNAT", value: "71" },
  { label: "Resolucion de comiso de bienes - SUNAT", value: "72" },
  { label: "Guia de transporte forestal o de fauna - SERFOR", value: "73" },
  { label: "Guia de transito - SUCAMEC", value: "74" },
  { label: "Autorizacion de saneamiento ambiental - MINSA", value: "75" },
  { label: "Autorizacion para manejo y recojo de residuos", value: "76" },
  { label: "Certificado fitosanitario", value: "77" },
  {
    label: "Registro de usuarios y transportistas de alcohol etilico",
    value: "78",
  },
  { label: "Constancia de deposito - Detraccion", value: "80" },
  { label: "Codigo de autorizacion SCOP", value: "81" },
  { label: "Manifiesto de carga (MC)", value: "91" },
  { label: "Cita u orden de entrega del terminal portuario", value: "92" },
] as const;

export function isGuiaDocumentoRelacionadoRequired(motivo: string) {
  return ["08", "09", "19"].includes(motivo);
}

export function getGuiaDocumentoRelacionadoOptions(motivo: string) {
  const allowed =
    motivo === "08" || motivo === "09"
      ? new Set(["50", "52"])
      : motivo === "19"
        ? new Set(["50", "52", "91", "92"])
        : motivo === "13"
          ? new Set(
              GUIA_REMISION_DOCUMENTO_RELACIONADO_OPTIONS.map(
                (option) => option.value,
              ).filter((value) => value !== "91" && value !== "92"),
            )
          : new Set(
              GUIA_REMISION_DOCUMENTO_RELACIONADO_OPTIONS.map(
                (option) => option.value,
              ).filter(
                (value) =>
                  value !== "50" &&
                  value !== "52" &&
                  value !== "91" &&
                  value !== "92",
              ),
            );

  return GUIA_REMISION_DOCUMENTO_RELACIONADO_OPTIONS.filter((option) =>
    allowed.has(option.value),
  );
}

export type GuiaRemisionResponse = {
  publicId: string;
  serie: string;
  numero: number | null;
  correlativo: string | null;
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
  billing: {
    documentId: string | null;
    environment: "BETA" | "PRODUCTION" | null;
    status: string | null;
    updatedAt: string | null;
    lastError: string | null;
    attempts: number;
  } | null;
  void: {
    status: "MANUAL_ACTION_REQUIRED" | "CONFIRMED" | null;
    reference: string | null;
    requestedAt: string | null;
    confirmedAt: string | null;
  } | null;
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
    serie: string | null;
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
    serie?: string;
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

  findAll(query: GuiasRemisionQuery = {}, options: RequestInit = {}) {
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
      options,
    );
  },

  findOne(publicId: string) {
    return authFetch<GuiaRemisionResponse>(`/guia-remision/${publicId}`);
  },

  emitir(publicId: string) {
    return authFetch<GuiaRemisionResponse>(
      `/guia-remision/${publicId}/emitir`,
      {
        method: "POST",
      },
    );
  },

  consultarCdr(publicId: string) {
    return authFetch<GuiaRemisionResponse>(
      `/guia-remision/${publicId}/consultar-cdr`,
      { method: "POST" },
    );
  },

  requestManualVoid(publicId: string, razon: string) {
    return authFetch<GuiaRemisionResponse>(`/guia-remision/${publicId}/void`, {
      method: "POST",
      body: JSON.stringify({ razon }),
    });
  },

  confirmManualVoid(publicId: string, referenciaSol: string) {
    return authFetch<GuiaRemisionResponse>(
      `/guia-remision/${publicId}/void/confirm`,
      {
        method: "POST",
        body: JSON.stringify({ referenciaSol }),
      },
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
  findParticipantes(query: GuiaCatalogosQuery = {}, options: RequestInit = {}) {
    const queryString = buildCatalogosQuery(query);
    return authFetch<GuiaCatalogoParticipantesResponse>(
      queryString
        ? `/guia-remision/catalogos/participantes?${queryString}`
        : "/guia-remision/catalogos/participantes",
      options,
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

  findVehiculos(query: GuiaCatalogosQuery = {}, options: RequestInit = {}) {
    const queryString = buildCatalogosQuery(query);
    return authFetch<GuiaCatalogoVehiculosResponse>(
      queryString
        ? `/guia-remision/catalogos/vehiculos?${queryString}`
        : "/guia-remision/catalogos/vehiculos",
      options,
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

  updateVehiculo(publicId: string, payload: UpdateGuiaCatalogoVehiculoPayload) {
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

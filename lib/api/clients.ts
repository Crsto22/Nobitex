import { authFetch } from "@/lib/api/auth-fetch";

export type ClientDocumentType = "dni" | "ruc" | "sin_documento";
export type ClientStatus = "activo" | "inactivo";

export type Client = {
  id: string;
  empresaId: string;
  tipoDocumento: ClientDocumentType;
  numeroDocumento: string | null;
  nombre: string | null;
  razonSocial: string | null;
  displayName: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ubigeo: string | null;
  distrito: string | null;
  estado: ClientStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientPayload = {
  tipoDocumento?: ClientDocumentType;
  numeroDocumento?: string | null;
  nombre?: string | null;
  razonSocial?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  ubigeo?: string | null;
  distrito?: string | null;
  estado?: ClientStatus;
};

export type ClientsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  tipoDocumento?: ClientDocumentType;
  estado?: ClientStatus;
};

export type ClientsResponse = {
  data: Client[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
    dniTotal: number;
    rucTotal: number;
  };
};

export type ConsultaDniResponse = {
  success: boolean;
  dni: string;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  codVerifica: number | null;
  codVerificaLetra: string | null;
};

export type ConsultaRucResponse = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  telefonos: string[];
  tipo: string | null;
  estado: string | null;
  condicion: string | null;
  direccion: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  ubigeo: string | null;
  capital: string | null;
};

export const clientsApi = {
  findAll(query: ClientsQuery = {}, options: RequestInit = {}) {
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

    if (query.tipoDocumento) {
      params.set("tipoDocumento", query.tipoDocumento);
    }

    if (query.estado) {
      params.set("estado", query.estado);
    }

    const queryString = params.toString();
    return authFetch<ClientsResponse>(
      queryString ? `/clients?${queryString}` : "/clients",
      options,
    );
  },

  create(payload: ClientPayload) {
    return authFetch<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<ClientPayload>) {
    return authFetch<Client>(`/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  remove(id: string) {
    return authFetch<Client>(`/clients/${id}`, {
      method: "DELETE",
    });
  },

  consultarDni(dni: string) {
    return authFetch<ConsultaDniResponse>(`/documento/dni/${dni}`);
  },

  consultarRuc(ruc: string) {
    return authFetch<ConsultaRucResponse>(`/documento/ruc/${ruc}`);
  },
};

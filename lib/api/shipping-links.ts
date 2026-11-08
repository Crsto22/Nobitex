import { apiRequest } from "@/lib/api/client";
import type { SaleShippingAgency } from "@/lib/api/sales";

export type PublicShippingMetodo = {
  metodo: string;
  nombre: string;
  tipo: "courier" | "recojo" | "domicilio";
  direccion: string | null;
};

export type PublicShippingDespacho = {
  diasSemana: number[];
  horaCorte: string;
  anticipacionDias: number;
  fechasDisponibles: string[];
};

export type PublicShippingRecojo = {
  diasSemana: number[];
  horaCorte: string;
  anticipacionDias: number;
  usaDespacho: boolean;
  fechasDisponibles: string[];
  fechaListo: string | null;
};

export type PublicShippingLink = {
  estado: "pendiente" | "recibido";
  venta: { correlativo: string };
  negocio: { nombreComercial: string; logoUrl: string | null };
  metodosEnvio: PublicShippingMetodo[];
  despacho: PublicShippingDespacho | null;
  recojo: PublicShippingRecojo | null;
};

export type SubmitShippingDetails = {
  nombreCompleto: string;
  dni: string;
  tipoDocumento: "DNI" | "CE";
  celular: string;
  metodo: string;
  fechaEnvio?: string;
  agencia?: SaleShippingAgency;
  agenciaExternalId?: string;
  direccionEntrega?: string;
  referenciaEntrega?: string;
};

export type PublicShippingAgency = {
  externalId: string;
  nombre: string;
  direccion: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  ubigeo: string | null;
  latitud: number | null;
  longitud: number | null;
  distanceKm?: number | null;
};

export type SearchShippingAgenciesOptions = {
  q?: string;
  lat?: number;
  lng?: number;
};

export const shippingLinksApi = {
  findOne(code: string) {
    return apiRequest<PublicShippingLink>(`/public/shipping-links/${code}`, {
      cache: "no-store",
    });
  },

  submit(code: string, payload: SubmitShippingDetails) {
    return apiRequest<{ estado: "recibido" }>(
      `/public/shipping-links/${code}`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  },

  searchAgencies(
    code: string,
    agencia: SaleShippingAgency,
    options: SearchShippingAgenciesOptions = {},
  ) {
    const params = new URLSearchParams({ agencia });
    if (options.q) params.set("q", options.q);
    if (options.lat !== undefined) params.set("lat", String(options.lat));
    if (options.lng !== undefined) params.set("lng", String(options.lng));
    return apiRequest<PublicShippingAgency[]>(
      `/public/shipping-links/${code}/agencies?${params.toString()}`,
      { cache: "no-store" },
    );
  },
};

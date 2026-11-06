import { apiRequest } from "@/lib/api/client";
import type { SaleShippingAgency } from "@/lib/api/sales";

export type PublicShippingLink = {
  estado: "pendiente" | "recibido";
  venta: { correlativo: string };
  negocio: { nombreComercial: string; logoUrl: string | null };
};

export type SubmitShippingDetails = {
  nombreCompleto: string;
  dni: string;
  celular: string;
  agencia: SaleShippingAgency;
  agenciaExternalId: string;
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

  searchAgencies(code: string, agencia: SaleShippingAgency, q: string) {
    const params = new URLSearchParams({ agencia, q });
    return apiRequest<PublicShippingAgency[]>(
      `/public/shipping-links/${code}/agencies?${params.toString()}`,
      { cache: "no-store" },
    );
  },
};

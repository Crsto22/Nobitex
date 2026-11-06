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
};

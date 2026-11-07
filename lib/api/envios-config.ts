import { authFetch } from "@/lib/api/auth-fetch";
import type { SaleShippingAgency } from "@/lib/api/sales";

export type EnvioMetodoConfig = {
  metodo: string;
  nombre: string;
  activo: boolean;
};

export const enviosConfigApi = {
  findAll() {
    return authFetch<EnvioMetodoConfig[]>("/envios-config");
  },

  toggle(metodo: SaleShippingAgency | string, activo: boolean) {
    return authFetch<EnvioMetodoConfig>(
      `/envios-config/${encodeURIComponent(metodo)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ activo }),
      },
    );
  },
};

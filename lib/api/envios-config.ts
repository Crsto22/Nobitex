import { authFetch } from "@/lib/api/auth-fetch";
import type { SaleShippingAgency } from "@/lib/api/sales";

export type EnvioMetodoTipo = "courier" | "recojo" | "domicilio";

export type EnvioMetodoConfig = {
  metodo: string;
  nombre: string;
  tipo: EnvioMetodoTipo;
  activo: boolean;
  direccion: string | null;
};

export type UpdateEnvioConfigPayload = {
  activo: boolean;
  direccion?: string | null;
};

export const enviosConfigApi = {
  findAll() {
    return authFetch<EnvioMetodoConfig[]>("/envios-config");
  },

  update(metodo: SaleShippingAgency | string, payload: UpdateEnvioConfigPayload) {
    return authFetch<EnvioMetodoConfig>(
      `/envios-config/${encodeURIComponent(metodo)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },
};

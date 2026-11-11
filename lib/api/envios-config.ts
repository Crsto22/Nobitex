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

export type DespachoConfig = {
  diasSemana: number[];
  horaCorte: string;
  anticipacionDias: number;
  configurado: boolean;
};

export type UpdateDespachoConfigPayload = {
  diasSemana: number[];
  horaCorte: string;
  anticipacionDias: number;
};

export type RecojoConfig = {
  diasSemana: number[];
  horaCorte: string;
  anticipacionDias: number;
  configurado: boolean;
  usaDespacho: boolean;
};

export type UpdateRecojoConfigPayload = {
  usarDespacho: boolean;
  diasSemana?: number[];
  horaCorte?: string;
  anticipacionDias?: number;
};

export type EnvioPreviewColor = {
  key: string;
  label: string;
  value: string;
};

export const envioPreviewColors: EnvioPreviewColor[] = [
  { key: "azul-nuvex", label: "Azul Nuvex", value: "#101D69" },
  { key: "negro", label: "Negro", value: "#111827" },
  { key: "verde", label: "Verde", value: "#047857" },
  { key: "naranja", label: "Naranja", value: "#EA580C" },
  { key: "rojo", label: "Rojo", value: "#B91C1C" },
  { key: "morado", label: "Morado", value: "#6D28D9" },
  { key: "turquesa", label: "Turquesa", value: "#0F766E" },
  { key: "vino", label: "Vino", value: "#7F1D1D" },
];

export type EnvioPreviewConfig = {
  titulo: string | null;
  descripcion: string | null;
  colorPrimario: string;
  textoCentral: string | null;
  escalaContenido: number;
  configurado: boolean;
  actualizadoAt: string | null;
};

export type UpdateEnvioPreviewConfigPayload = {
  titulo?: string | null;
  descripcion?: string | null;
  colorPrimario: string;
  textoCentral?: string | null;
  escalaContenido: number;
};

export const enviosConfigApi = {
  findAll() {
    return authFetch<EnvioMetodoConfig[]>("/envios-config");
  },

  findDespacho() {
    return authFetch<DespachoConfig>("/envios-config/despacho");
  },

  updateDespacho(payload: UpdateDespachoConfigPayload) {
    return authFetch<DespachoConfig>("/envios-config/despacho", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  findRecojo() {
    return authFetch<RecojoConfig>("/envios-config/recojo");
  },

  findPreview() {
    return authFetch<EnvioPreviewConfig>("/envios-config/preview");
  },

  updatePreview(payload: UpdateEnvioPreviewConfigPayload) {
    return authFetch<EnvioPreviewConfig>("/envios-config/preview", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateRecojo(payload: UpdateRecojoConfigPayload) {
    return authFetch<RecojoConfig>("/envios-config/recojo", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  update(metodo: SaleShippingAgency | string, payload: UpdateEnvioConfigPayload) {
    return authFetch<EnvioMetodoConfig>(
      `/envios-config/metodo/${encodeURIComponent(metodo)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },
};

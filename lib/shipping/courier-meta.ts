import type { SaleShippingAgency } from "@/lib/api/sales";

export type CourierMeta = {
  /** Nombre visible para el usuario. */
  label: string;
  /** Texto corto para badges compactos. */
  shortLabel: string;
  /** Logo del courier en /public. */
  image: string;
  /** Fondo y color de texto para badges en listas. */
  badgeClass: string;
  /** Fondo del tab activo en Entregas. */
  tabClass: string;
  /** Fondo del metodo seleccionado en el enlace publico. */
  publicSelectedBg: string;
  /** Color del check del metodo seleccionado en el enlace publico. */
  publicCheckColor: string;
  /** Punto de leyenda del mapa. */
  legendDotClass: string;
  /** Color del pin de agencia en el mapa. */
  pinClass: string;
};

/**
 * Identidad visual de los couriers que se muestran en la app.
 * Centralizado para que agregar un courier nuevo no obligue a repetir
 * condicionales en cada pantalla.
 */
export const COURIER_META: Record<SaleShippingAgency, CourierMeta> = {
  SHALOM: {
    label: "Shalom",
    shortLabel: "SHALOM",
    image: "/envios/shalom.svg",
    badgeClass: "bg-[#dc2626] text-white",
    tabClass: "bg-[#dc2626] text-white shadow-sm hover:bg-[#b91c1c]",
    publicSelectedBg: "bg-[#e52421] ring-2 ring-[#e52421]",
    publicCheckColor: "text-white",
    legendDotClass: "bg-[#dc2626]",
    pinClass: "text-[#dc2626]",
  },
  OLVA: {
    label: "Olva",
    shortLabel: "OLVA",
    image: "/envios/olva.webp",
    badgeClass: "bg-[#eab308] text-black",
    tabClass: "bg-[#facc15] text-black shadow-sm hover:bg-[#eab308]",
    publicSelectedBg: "bg-[#fba832] ring-2 ring-[#fba832]",
    publicCheckColor: "text-[#1f2937]",
    legendDotClass: "bg-[#eab308]",
    pinClass: "text-[#ca8a04]",
  },
  MARVISUR: {
    label: "Marvisur",
    shortLabel: "MARVISUR",
    image: "/envios/marvisurexpreso.webp",
    badgeClass: "bg-[#1d1d1b] text-white",
    tabClass: "bg-[#1d1d1b] text-white shadow-sm hover:bg-black",
    publicSelectedBg: "bg-[#e42222]/10 ring-2 ring-[#e42222]",
    publicCheckColor: "text-[#e42222]",
    legendDotClass: "bg-[#1d1d1b]",
    pinClass: "text-[#1d1d1b]",
  },
};

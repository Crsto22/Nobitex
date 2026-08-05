import { authFetch } from "@/lib/api/auth-fetch";

export type StockDirection = "entrada" | "salida";
export type StockMovementType =
  | "saldo_apertura"
  | "stock_inicial"
  | "entrada_manual"
  | "salida_manual"
  | "ajuste_producto"
  | "venta"
  | "anulacion_venta"
  | "nota_credito"
  | "traspaso_entrada"
  | "traspaso_salida";

export type StockProduct = {
  productoVarianteId: string;
  productoId: string;
  productoPublicId: string;
  nombre: string;
  tipo: "normal" | "variantes";
  sku: string | null;
  codigoBarras: string | null;
  color: { nombre: string; hex: string } | null;
  talla: string | null;
};

export type StockMovement = {
  id: string;
  direccion: StockDirection;
  tipo: StockMovementType;
  cantidad: number;
  stockAnterior: number;
  stockPosterior: number;
  motivo: string | null;
  referenciaTipo: string | null;
  referenciaId: string | null;
  traspasoPublicId: string | null;
  sucursal: { id: string; nombre: string; tipo: "tienda" | "almacen" };
  producto: StockProduct;
  creadoPor: { id: string; nombre: string; apellido: string | null } | null;
  createdAt: string;
};

export type StockTransfer = {
  id: string;
  publicId: string;
  motivo: string;
  origen: { id: string; nombre: string; tipo: "tienda" | "almacen" };
  destino: { id: string; nombre: string; tipo: "tienda" | "almacen" };
  creadoPor: { id: string; nombre: string; apellido: string | null } | null;
  items: Array<{ id: string; cantidad: number; producto: StockProduct }>;
  cantidadTotal: number;
  createdAt: string;
};

type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function queryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const stockApi = {
  locations() {
    return authFetch<
      Array<{
        id: string;
        nombre: string;
        tipo: "tienda" | "almacen";
        canUseAsOrigin: boolean;
      }>
    >("/stock/locations");
  },

  movements(query: {
    page?: number;
    limit?: number;
    search?: string;
    sucursalId?: string;
    tipo?: StockMovementType;
    from?: string;
    to?: string;
  } = {}) {
    return authFetch<{ data: StockMovement[]; meta: PageMeta }>(
      `/stock/movements${queryString(query)}`,
    );
  },

  createMovement(payload: {
    direccion: StockDirection;
    sucursalId: string;
    motivo: string;
    items: Array<{ productoVarianteId: string; cantidad: number }>;
  }) {
    return authFetch<{ data: StockMovement[] }>("/stock/movements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  transfers(query: {
    page?: number;
    limit?: number;
    search?: string;
    origenSucursalId?: string;
    destinoSucursalId?: string;
    from?: string;
    to?: string;
  } = {}) {
    return authFetch<{ data: StockTransfer[]; meta: PageMeta }>(
      `/stock/transfers${queryString(query)}`,
    );
  },

  transfer(publicId: string) {
    return authFetch<StockTransfer>(`/stock/transfers/${publicId}`);
  },

  createTransfer(payload: {
    origenSucursalId: string;
    destinoSucursalId: string;
    motivo: string;
    items: Array<{ productoVarianteId: string; cantidad: number }>;
  }) {
    return authFetch<StockTransfer>("/stock/transfers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export function stockProductLabel(product: StockProduct) {
  if (product.tipo === "normal") return product.nombre;
  return [product.nombre, product.color?.nombre, product.talla]
    .filter(Boolean)
    .join(" / ");
}

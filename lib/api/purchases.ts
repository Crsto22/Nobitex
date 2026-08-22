import { authFetch } from "@/lib/api/auth-fetch";
import type { StockProduct } from "@/lib/api/stock";

export type Supplier = {
  id: string;
  empresaId: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  displayName: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  personaContacto: string | null;
  telefonoContacto: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPayload = {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  personaContacto?: string | null;
  telefonoContacto?: string | null;
  activo?: boolean;
};

export type PurchaseDocumentType = "factura" | "boleta" | "otro";

export type PurchaseOrder = {
  id: string;
  publicId: string;
  proveedor: { id: string; ruc: string; razonSocial: string; displayName: string };
  destino: { id: string; nombre: string; tipo: "tienda" | "almacen" };
  tipoComprobante: PurchaseDocumentType | null;
  fechaEmision: string | null;
  serie: string | null;
  numero: string | null;
  total: string;
  cantidadItems: number;
  cantidadTotal: number;
  creadoPor: { id: string; nombre: string; apellido: string | null } | null;
  items: Array<{
    id: string;
    cantidad: number;
    costoUnitario: string;
    total: string;
    producto: StockProduct;
  }>;
  createdAt: string;
  updatedAt: string;
};

type PageMeta = { page: number; limit: number; total: number; totalPages: number };

function queryString(query: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const purchasesApi = {
  suppliers(query: { page?: number; limit?: number; search?: string; activo?: boolean } = {}) {
    return authFetch<{
      data: Supplier[];
      meta: PageMeta & { activeTotal: number; inactiveTotal: number };
    }>(`/purchases/suppliers${queryString(query)}`);
  },

  createSupplier(payload: SupplierPayload) {
    return authFetch<Supplier>("/purchases/suppliers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateSupplier(id: string, payload: SupplierPayload) {
    return authFetch<Supplier>(`/purchases/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  removeSupplier(id: string) {
    return authFetch<Supplier>(`/purchases/suppliers/${id}`, { method: "DELETE" });
  },

  orders(query: {
    page?: number;
    limit?: number;
    search?: string;
    proveedorId?: string;
    destinoSucursalId?: string;
    from?: string;
    to?: string;
  } = {}) {
    return authFetch<{ data: PurchaseOrder[]; meta: PageMeta }>(
      `/purchases/orders${queryString(query)}`,
    );
  },

  order(publicId: string) {
    return authFetch<PurchaseOrder>(`/purchases/orders/${publicId}`);
  },

  createOrder(payload: {
    proveedorId: string;
    destinoSucursalId: string;
    tipoComprobante?: PurchaseDocumentType;
    fechaEmision?: string;
    serie?: string;
    numero?: string;
    items: Array<{ productoVarianteId: string; cantidad: number; costoUnitario: number }>;
  }) {
    return authFetch<PurchaseOrder>("/purchases/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

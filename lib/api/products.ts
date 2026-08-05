import { authFetch } from "@/lib/api/auth-fetch";

export type ProductImageResponse = {
  id: string;
  urlOriginal: string;
  urlWebp: string;
  urlThumbnail: string;
  orden: number;
  esPrincipal: boolean;
  width: number | null;
  height: number | null;
};

export type ProductResponse = {
  id: string;
  publicId: string;
  empresaId: string;
  nombre: string;
  tipo: "normal" | "variantes";
  descripcion: string | null;
  activo: boolean;
  stockTotal: number;
  stockSucursal: number | null;
  marca: { id: string; nombre: string } | null;
  categoria: { id: string; nombre: string } | null;
  unidadMedida: { id: string; codigo: string; descripcion: string };
  tipoAfectacionIgv: { id: string; codigo: string; descripcion: string };
  colores: Array<{
    id: string;
    activo: boolean;
    color: { id: string; nombre: string; hex: string };
    imagenes: ProductImageResponse[];
  }>;
  variantes: Array<{
    id: string;
    productoColorId: string;
    color: { id: string; nombre: string; hex: string };
    talla: { id: string; nombre: string };
    sku: string | null;
    codigoBarras: string | null;
    precioCompra: string | null;
    precioVenta: string;
    precioMayorista: string | null;
    activo: boolean;
    stockTotal: number;
    stockSucursal: number | null;
    inventarios: Array<{
      id: string;
      sucursal: { id: string; nombre: string; tipo: string };
      stockActual: number;
      stockMinimo: number;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ProductStatusFilter = "active" | "inactive";

export type ProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: string;
  marcaId?: string;
  colorId?: string;
  tallaId?: string;
  sucursalId?: string;
  status?: ProductStatusFilter;
};

export type ProductsResponse = {
  data: ProductResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    activeTotal: number;
    inactiveTotal: number;
  };
};

export type DeletedProductResponse = {
  publicId: string;
  nombre: string;
  activo: false;
  deletedAt: string;
};

export const productsApi = {
  findAll(query: ProductsQuery = {}) {
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

    if (query.categoriaId) {
      params.set("categoriaId", query.categoriaId);
    }

    if (query.marcaId) {
      params.set("marcaId", query.marcaId);
    }

    if (query.colorId) {
      params.set("colorId", query.colorId);
    }

    if (query.tallaId) {
      params.set("tallaId", query.tallaId);
    }

    if (query.sucursalId) {
      params.set("sucursalId", query.sucursalId);
    }

    if (query.status) {
      params.set("status", query.status);
    }

    const queryString = params.toString();
    return authFetch<ProductsResponse>(
      queryString ? `/products?${queryString}` : "/products"
    );
  },

  findById(publicId: string) {
    return authFetch<ProductResponse>(`/products/${publicId}`);
  },

  update(publicId: string, payload: FormData) {
    return authFetch<ProductResponse>(`/products/${publicId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  create(payload: FormData) {
    return authFetch<ProductResponse>("/products", {
      method: "POST",
      body: payload,
    });
  },

  remove(publicId: string) {
    return authFetch<DeletedProductResponse>(`/products/${publicId}`, {
      method: "DELETE",
    });
  },
};

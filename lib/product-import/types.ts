export type ImportFieldKey =
  | "codigoModelo"
  | "nombre"
  | "categoria"
  | "descripcion"
  | "color"
  | "talla"
  | "sku"
  | "codigoBarras"
  | "precioVenta"
  | "precioMayorista"
  | "stock"
  | "unidadMedida";

export type ColumnMapping = Record<ImportFieldKey, number | null>;

export type ParsedSheet = {
  fileName: string;
  sheetName: string;
  headers: string[];
  headerRowIndex: number;
  rows: string[][];
  rowNumbers: number[];
  totalRows: number;
  mapping: ColumnMapping;
  missingRequired: ImportFieldKey[];
};

export type ImportVariantInput = {
  rowNumber: number;
  color: string;
  size: string;
  sku: string;
  barcode: string;
  precioVenta: number;
  precioMayorista: number | null;
  stock: number | null;
  stockMinimo: number | null;
};

export type ImportProductInput = {
  codigoModelo: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  unidadMedida: string;
  variants: ImportVariantInput[];
};

export type ParseIssue = {
  severity: "error" | "warning";
  scope: "global" | "product" | "variant";
  rowNumber?: number;
  field?: string;
  productName?: string;
  codigoModelo?: string;
  message: string;
};

export type ParsedProducts = {
  products: ImportProductInput[];
  issues: ParseIssue[];
};

export type ValidateImportPayload = {
  sucursalId: string;
  products: ImportProductInput[];
};

export type ExecuteImportPayload = ValidateImportPayload & {
  colors: Array<{ nombre: string; hex: string }>;
};

export type ImportIssue = {
  severity: "error" | "warning";
  scope: "global" | "product" | "variant";
  code?: string;
  rowNumber?: number;
  codigoModelo?: string;
  productName?: string;
  field?: string;
  message: string;
};

export type ValidationVariant = {
  rowNumber: number;
  color: string;
  size: string;
  sku: string;
  barcode: string;
  precioVenta: number;
  precioMayorista: number | null;
  stock: number | null;
  action: "create" | "update" | "error";
  issues: ImportIssue[];
};

export type ValidationProduct = {
  codigoModelo: string;
  nombre: string;
  categoria: string;
  tipo: "normal" | "variantes";
  action: "create" | "update" | "error";
  existing: {
    publicId: string;
    nombre: string;
    tipo: "normal" | "variantes";
  } | null;
  variants: ValidationVariant[];
  issues: ImportIssue[];
};

export type ImportColorValue = {
  nombre: string;
  key: string;
  exists: boolean;
  deleted: boolean;
  hex: string | null;
};

export type ValidateImportResponse = {
  summary: {
    products: number;
    variants: number;
    createProducts: number;
    updateProducts: number;
    errorProducts: number;
    errors: number;
    warnings: number;
  };
  products: ValidationProduct[];
  newValues: {
    categories: string[];
    sizes: string[];
    colors: ImportColorValue[];
  };
  issues: ImportIssue[];
};

export type ExecuteImportResponse = {
  summary: {
    productsCreated: number;
    productsUpdated: number;
    productsSkipped: number;
    variantsCreated: number;
    variantsUpdated: number;
    variantsSkipped: number;
  };
  products: Array<{
    codigoModelo: string;
    nombre: string;
    publicId: string | null;
    action: "created" | "updated" | "skipped";
    message?: string;
  }>;
  errors: Array<{
    rowNumber: number;
    nombre: string;
    message: string;
  }>;
};

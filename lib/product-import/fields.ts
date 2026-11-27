import type { ColumnMapping, ImportFieldKey } from "@/lib/product-import/types";

export type ImportFieldDefinition = {
  key: ImportFieldKey;
  label: string;
  required?: boolean;
  hint?: string;
  synonyms: string[];
  group: "Producto" | "Variante" | "Precios y stock" | "Configuracion";
};

export const importFields: ImportFieldDefinition[] = [
  {
    key: "codigoModelo",
    label: "Cod. Modelo",
    hint: "Agrupa las variantes del mismo producto",
    synonyms: [
      "cod modelo",
      "codigo modelo",
      "codigo de modelo",
      "modelo",
      "cod",
      "codigo",
    ],
    group: "Producto",
  },
  {
    key: "nombre",
    label: "Nombre Producto",
    required: true,
    synonyms: ["nombre producto", "nombre", "producto"],
    group: "Producto",
  },
  {
    key: "categoria",
    label: "Categoria",
    required: true,
    synonyms: ["categoria", "rubro", "linea"],
    group: "Producto",
  },
  {
    key: "descripcion",
    label: "Descripcion",
    synonyms: ["descripcion", "detalle"],
    group: "Producto",
  },
  {
    key: "color",
    label: "Color",
    hint: "Obligatorio si el producto tiene variantes",
    synonyms: ["color", "colour"],
    group: "Variante",
  },
  {
    key: "talla",
    label: "Talla",
    hint: "Obligatorio si el producto tiene variantes",
    synonyms: ["talla", "size", "medida"],
    group: "Variante",
  },
  {
    key: "sku",
    label: "SKU Variante",
    hint: "Si esta vacio se genera automaticamente",
    synonyms: ["sku variante", "sku", "codigo sku"],
    group: "Variante",
  },
  {
    key: "codigoBarras",
    label: "Cod. Barras",
    synonyms: [
      "cod barras",
      "codigo barras",
      "codigo de barras",
      "barras",
      "ean",
    ],
    group: "Variante",
  },
  {
    key: "precioVenta",
    label: "Precio Venta",
    required: true,
    synonyms: ["precio venta", "precio de venta", "precio", "pvp"],
    group: "Precios y stock",
  },
  {
    key: "precioMayorista",
    label: "Precio Mayor",
    synonyms: [
      "precio mayor",
      "precio mayorista",
      "p mayor",
      "precio por mayor",
    ],
    group: "Precios y stock",
  },
  {
    key: "stock",
    label: "Stock",
    hint: "Se asigna a la sucursal destino",
    synonyms: ["stock", "cantidad", "existencia"],
    group: "Precios y stock",
  },
  {
    key: "unidadMedida",
    label: "Unidad de medida",
    hint: "Default: uni (NIU)",
    synonyms: ["unidad medida", "unidad de medida", "unidad", "um"],
    group: "Configuracion",
  },
];

export const importFieldGroups: Array<{
  label: ImportFieldDefinition["group"];
  keys: ImportFieldKey[];
}> = [
  {
    label: "Producto",
    keys: ["codigoModelo", "nombre", "categoria", "descripcion"],
  },
  {
    label: "Variante",
    keys: ["color", "talla", "sku", "codigoBarras"],
  },
  {
    label: "Precios y stock",
    keys: ["precioVenta", "precioMayorista", "stock"],
  },
  {
    label: "Configuracion",
    keys: ["unidadMedida"],
  },
];

export const requiredImportFields = importFields
  .filter((field) => field.required)
  .map((field) => field.key);

export function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findFieldByHeader(
  header: string,
): ImportFieldDefinition | undefined {
  const normalized = normalizeHeader(header);
  return importFields.find((field) =>
    field.synonyms.some((synonym) => normalizeHeader(synonym) === normalized),
  );
}

export function detectMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const mapping = emptyMapping();
  const used = new Set<number>();

  for (const field of importFields) {
    const index = normalizedHeaders.findIndex((header, position) => {
      if (used.has(position)) {
        return false;
      }

      return field.synonyms.some(
        (synonym) => normalizeHeader(synonym) === header,
      );
    });

    if (index >= 0) {
      mapping[field.key] = index;
      used.add(index);
    }
  }

  for (const field of importFields) {
    if (mapping[field.key] !== null) {
      continue;
    }

    const index = normalizedHeaders.findIndex((header, position) => {
      if (used.has(position) || !header) {
        return false;
      }

      return field.synonyms.some((synonym) => {
        const normalizedSynonym = normalizeHeader(synonym);
        return (
          normalizedSynonym.length > 3 &&
          (header.includes(normalizedSynonym) ||
            normalizedSynonym.includes(header))
        );
      });
    });

    if (index >= 0) {
      mapping[field.key] = index;
      used.add(index);
    }
  }

  return mapping;
}

export function emptyMapping(): ColumnMapping {
  return {
    codigoModelo: null,
    nombre: null,
    categoria: null,
    descripcion: null,
    color: null,
    talla: null,
    sku: null,
    codigoBarras: null,
    precioVenta: null,
    precioMayorista: null,
    stock: null,
    unidadMedida: null,
  };
}

export function mappingByHeader(
  headers: string[],
  mapping: ColumnMapping,
): Record<ImportFieldKey, string> {
  const result = {} as Record<ImportFieldKey, string>;

  for (const field of importFields) {
    const index = mapping[field.key];
    result[field.key] = index !== null ? (headers[index] ?? "") : "";
  }

  return result;
}

export function mappingFromHeader(
  headers: string[],
  headerMapping: Record<ImportFieldKey, string>,
): ColumnMapping {
  const mapping = emptyMapping();

  for (const field of importFields) {
    const header = headerMapping[field.key];
    if (!header) {
      continue;
    }

    const index = headers.findIndex(
      (candidate) => normalizeHeader(candidate) === normalizeHeader(header),
    );
    mapping[field.key] = index >= 0 ? index : null;
  }

  return mapping;
}

export function missingRequiredFields(mapping: ColumnMapping): ImportFieldKey[] {
  return requiredImportFields.filter((key) => mapping[key] === null);
}

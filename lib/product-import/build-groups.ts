import type {
  ColumnMapping,
  ImportFieldKey,
  ImportProductInput,
  ImportVariantInput,
  ParseIssue,
  ParsedProducts,
  ParsedSheet,
} from "@/lib/product-import/types";

type RowValues = Record<ImportFieldKey, string>;

type GroupedRow = {
  rowNumber: number;
  values: RowValues;
};

const productLevelFields: ImportFieldKey[] = [
  "nombre",
  "categoria",
  "descripcion",
  "unidadMedida",
];

export function buildProductGroups(
  sheet: ParsedSheet,
  mapping: ColumnMapping,
): ParsedProducts {
  const issues: ParseIssue[] = [];
  const groups = new Map<
    string,
    { code: string; rows: GroupedRow[] }
  >();

  sheet.rows.forEach((row, index) => {
    const values = readRow(row, mapping);
    const rowNumber = sheet.rowNumbers[index] ?? index + 2;
    const code = normalizeModelCode(values.codigoModelo);
    const key = code ? `code:${code.toLowerCase()}` : `row:${rowNumber}`;
    const group = groups.get(key) ?? { code, rows: [] };
    group.rows.push({ rowNumber, values });
    groups.set(key, group);
  });

  const nameCounts = new Map<string, number>();
  for (const group of groups.values()) {
    const name = firstNonEmpty(group.rows.map((row) => row.values.nombre));
    const key = productNameKey(name);
    if (key) {
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }
  }

  const skuRows = new Map<string, number[]>();
  const barcodeRows = new Map<string, number[]>();
  const products: ImportProductInput[] = [];

  for (const group of groups.values()) {
    const firstRow = group.rows[0];
    const nombre = firstNonEmpty(group.rows.map((row) => row.values.nombre));
    const categoria = firstNonEmpty(
      group.rows.map((row) => row.values.categoria),
    );
    const descripcion = firstNonEmpty(
      group.rows.map((row) => row.values.descripcion),
    );
    const unidadMedida =
      firstNonEmpty(group.rows.map((row) => row.values.unidadMedida)) || "uni";

    for (const field of productLevelFields) {
      const distinct = new Set(
        group.rows
          .map((row) => normalizeValue(row.values[field]))
          .filter(Boolean),
      );

      if (distinct.size > 1) {
        issues.push({
          severity: "error",
          scope: "product",
          rowNumber: firstRow.rowNumber,
          field,
          message: `Las filas del Cod. Modelo ${group.code || "(sin codigo)"} tienen valores distintos en ${field}. Usa el mismo valor en todas.`,
        });
      }
    }

    if (!nombre) {
      issues.push({
        severity: "error",
        scope: "product",
        rowNumber: firstRow.rowNumber,
        field: "nombre",
        message: "El Nombre Producto es obligatorio.",
      });
    }

    if (!categoria) {
      issues.push({
        severity: "error",
        scope: "product",
        rowNumber: firstRow.rowNumber,
        field: "categoria",
        message: "La Categoria es obligatoria.",
      });
    }

    const nameKey = productNameKey(nombre);
    if (nameKey && (nameCounts.get(nameKey) ?? 0) > 1) {
      issues.push({
        severity: "error",
        scope: "product",
        rowNumber: firstRow.rowNumber,
        field: "nombre",
        message:
          "Hay mas de un Cod. Modelo con el mismo Nombre Producto. Usa un solo codigo si son el mismo producto.",
      });
    }

    const hasVariantData = group.rows.some(
      (row) => Boolean(row.values.color || row.values.talla),
    );

    if (!hasVariantData && group.rows.length > 1) {
      issues.push({
        severity: "error",
        scope: "product",
        rowNumber: group.rows[1].rowNumber,
        field: "color",
        message:
          "Las filas con el mismo Cod. Modelo no tienen Color ni Talla. Si son productos distintos, usa un Cod. Modelo diferente.",
      });
    }

    const variantKeys = new Set<string>();
    const variants: ImportVariantInput[] = group.rows.map(({ rowNumber, values }) => {
      const color = values.color.trim();
      const size = values.talla.trim();

      if (hasVariantData) {
        if (!color) {
          issues.push({
            severity: "error",
            scope: "variant",
            rowNumber,
            field: "color",
            message: "El Color es obligatorio para un producto con variantes.",
          });
        }
        if (!size) {
          issues.push({
            severity: "error",
            scope: "variant",
            rowNumber,
            field: "talla",
            message: "La Talla es obligatoria para un producto con variantes.",
          });
        }
      }

      const variantKey = `${color.toLowerCase()}|${size.toLowerCase()}`;
      if (hasVariantData && variantKeys.has(variantKey)) {
        issues.push({
          severity: "error",
          scope: "variant",
          rowNumber,
          field: "color",
          message: `La combinacion ${color || "(sin color)"} / ${size || "(sin talla)"} esta repetida en el archivo.`,
        });
      }
      variantKeys.add(variantKey);

      const price = parsePrice(values.precioVenta);
      if (price === null) {
        issues.push({
          severity: "error",
          scope: "variant",
          rowNumber,
          field: "precioVenta",
          message: "El Precio Venta es obligatorio.",
        });
      }

      const wholesalePrice = parsePrice(values.precioMayorista);
      if (values.precioMayorista.trim() && wholesalePrice === null) {
        issues.push({
          severity: "error",
          scope: "variant",
          rowNumber,
          field: "precioMayorista",
          message: "El Precio Mayor no es un numero valido.",
        });
      }

      const stock = parseStock(values.stock);
      if (stock === "invalid") {
        issues.push({
          severity: "error",
          scope: "variant",
          rowNumber,
          field: "stock",
          message: "El Stock debe ser un numero entero mayor o igual a cero.",
        });
      }

      const sku = values.sku.trim();
      if (sku) {
        skuRows.set(sku.toUpperCase(), [
          ...(skuRows.get(sku.toUpperCase()) ?? []),
          rowNumber,
        ]);
      }

      const barcode = values.codigoBarras.trim();
      if (barcode) {
        barcodeRows.set(barcode, [
          ...(barcodeRows.get(barcode) ?? []),
          rowNumber,
        ]);
      }

      return {
        rowNumber,
        color,
        size,
        sku,
        barcode,
        precioVenta: price ?? 0,
        precioMayorista: wholesalePrice,
        stock: stock === "invalid" ? null : stock,
        stockMinimo: null,
      };
    });

    products.push({
      codigoModelo: group.code,
      nombre,
      categoria,
      descripcion,
      unidadMedida,
      variants,
    });
  }

  for (const [sku, rows] of skuRows) {
    if (rows.length > 1) {
      const product = products.find((item) =>
        item.variants.some(
          (variant) => variant.sku.trim().toUpperCase() === sku,
        ),
      );
      issues.push({
        severity: "error",
        scope: "variant",
        rowNumber: rows[1],
        field: "sku",
        message: `El SKU ${sku} esta duplicado en el archivo (filas ${rows.join(", ")}).`,
        ...(product ? { productName: product.nombre } : {}),
      });
    }
  }

  for (const [barcode, rows] of barcodeRows) {
    if (rows.length > 1) {
      issues.push({
        severity: "error",
        scope: "variant",
        rowNumber: rows[1],
        field: "codigoBarras",
        message: `El codigo de barras ${barcode} esta duplicado en el archivo (filas ${rows.join(", ")}).`,
      });
    }
  }

  return { products, issues };
}

export function parsePrice(value: string): number | null {
  const clean = value.replace(/[^\d.,-]/g, "").trim();

  if (!clean || clean === "-" || clean === "." || clean === ",") {
    return null;
  }

  let normalized = clean;

  if (clean.includes(",") && clean.includes(".")) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");

    normalized =
      lastComma > lastDot
        ? clean.replace(/\./g, "").replace(",", ".")
        : clean.replace(/,/g, "");
  } else if (clean.includes(",")) {
    const [integerPart, decimalPart = ""] = clean.split(",");
    normalized =
      decimalPart.length <= 2
        ? `${integerPart}.${decimalPart}`
        : clean.replace(/,/g, "");
  }

  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function parseStock(value: string): number | null | "invalid" {
  const clean = value.trim();

  if (!clean) {
    return null;
  }

  const number = parsePrice(clean);

  if (number === null || !Number.isInteger(number)) {
    return "invalid";
  }

  return number;
}

function readRow(row: string[], mapping: ColumnMapping): RowValues {
  const values = {} as RowValues;

  for (const [key, index] of Object.entries(mapping) as Array<
    [ImportFieldKey, number | null]
  >) {
    values[key] = index !== null ? (row[index] ?? "").trim() : "";
  }

  return values;
}

function firstNonEmpty(values: string[]) {
  return values.map((value) => value.trim()).find(Boolean) ?? "";
}

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function productNameKey(value: string) {
  return normalizeValue(value);
}

function normalizeModelCode(value: string) {
  const clean = value.trim().replace(/\s+/g, " ");

  if (!clean) {
    return "";
  }

  return clean.replace(/\.0+$/, "");
}

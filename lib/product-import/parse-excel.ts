import {
  detectMapping,
  missingRequiredFields,
} from "@/lib/product-import/fields";
import type { ParsedSheet } from "@/lib/product-import/types";

const maxRows = 5000;

export async function readProductImportFile(file: File): Promise<ParsedSheet> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const csvSeparator = file.name.toLowerCase().endsWith(".csv")
    ? detectCsvSeparator(buffer)
    : null;
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
    cellDates: false,
    ...(csvSeparator ? { FS: csvSeparator } : {}),
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error("El archivo no tiene hojas para leer.");
  }

  const preferredSheet = workbook.SheetNames.find(
    (name) => normalizeSheetName(name) === "productos",
  );
  const sheetName = preferredSheet ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error("No se pudo leer la hoja del archivo.");
  }

  const matrix = XLSX.utils
    .sheet_to_json<Array<string | number | boolean>>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: true,
    })
    .map((row) =>
      row.map((cell) => String(cell ?? "").replace(/^\uFEFF/, "").trim()),
    );

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const baseRow = range.s.r;

  const nonEmptyRows = matrix.filter((row) =>
    row.some((cell) => Boolean(cell)),
  );

  if (nonEmptyRows.length === 0) {
    throw new Error("El archivo esta vacio.");
  }

  const headerIndex = findHeaderRow(matrix);
  const headers = matrix[headerIndex] ?? [];
  const dataRows = matrix
    .slice(headerIndex + 1)
    .map((row, index) => ({
      row,
      matrixIndex: headerIndex + 1 + index,
    }))
    .filter(({ row }) => row.some((cell) => Boolean(cell)));

  if (dataRows.length > maxRows) {
    throw new Error(
      `El archivo supera el limite de ${maxRows.toLocaleString("es-PE")} filas.`,
    );
  }

  const mapping = detectMapping(headers);
  const missingRequired = missingRequiredFields(mapping);

  return {
    fileName: file.name,
    sheetName,
    headers,
    headerRowIndex: headerIndex,
    rows: dataRows.map(({ row }) => normalizeRow(row, headers.length)),
    rowNumbers: dataRows.map(
      ({ matrixIndex }) => baseRow + matrixIndex + 1,
    ),
    totalRows: dataRows.length,
    mapping,
    missingRequired,
  };
}

function findHeaderRow(matrix: string[][]) {
  let bestIndex = 0;
  let bestScore = -1;

  matrix.slice(0, 20).forEach((row, index) => {
    if (!row.some((cell) => Boolean(cell))) {
      return;
    }

    const mapping = detectMapping(row);
    const score = Object.values(mapping).filter(
      (value) => value !== null,
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function normalizeRow(row: string[], length: number) {
  return Array.from({ length }, (_, index) => row[index] ?? "");
}

function normalizeSheetName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectCsvSeparator(buffer: ArrayBuffer) {
  const text = new TextDecoder("utf-8").decode(buffer.slice(0, 4096));
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;

  if (semicolons > commas) {
    return ";";
  }
  if (tabs > commas) {
    return "\t";
  }
  return null;
}

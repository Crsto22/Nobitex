import { downloadBlob } from "@/lib/utils/download";

const headers = [
  "Cód. Modelo",
  "Nombre Producto",
  "Categoría",
  "Descripción",
  "Color",
  "Talla",
  "SKU Variante",
  "Cód. Barras",
  "Precio Venta",
  "Precio Mayor",
  "Stock",
  "unidad_medida",
];

const exampleRows = [
  [
    "MOD-001",
    "Gorra Clasica",
    "Accesorios",
    "Gorra ajustable",
    "",
    "",
    "GOR-001",
    "7750000010",
    29.9,
    "",
    20,
    "uni",
  ],
  [
    "MOD-002",
    "Polo Slim Fit",
    "Varones",
    "Algodon 100%",
    "ROJO",
    "S",
    "PS-001-R-S",
    "775001001",
    45,
    35,
    20,
    "uni",
  ],
  [
    "",
    "",
    "",
    "",
    "ROJO",
    "M",
    "PS-001-R-M",
    "775001002",
    45,
    35,
    15,
    "uni",
  ],
  [
    "",
    "",
    "",
    "",
    "AZUL",
    "S",
    "PS-001-A-S",
    "775001003",
    45,
    35,
    10,
    "uni",
  ],
  [
    "",
    "",
    "",
    "",
    "AZUL",
    "M",
    "PS-001-A-M",
    "775001004",
    45,
    35,
    12,
    "uni",
  ],
  [
    "MOD-003",
    "Servicio de estampado",
    "Servicios",
    "Servicio por unidad",
    "",
    "",
    "SRV-001",
    "",
    15,
    "",
    0,
    "servicio",
  ],
];

const instructions = [
  ["Instrucciones de importacion"],
  [""],
  ["1. Usa una fila por variante. Los productos con variantes repiten el Cod. Modelo."],
  ["2. Cod. Modelo agrupa las filas del mismo producto."],
  ["3. Nombre Producto, Categoria y Descripcion solo son obligatorios en la primera fila del grupo."],
  ["4. Si un Cod. Modelo aparece una sola vez, se importa como producto de una sola variante."],
  ["5. Si no hay Cod. Modelo, cada fila sera un producto independiente."],
  ["6. Color y Talla son obligatorios cuando el producto tiene mas de una fila."],
  ["7. Precio Venta es obligatorio."],
  ["8. El Stock se asigna a la sucursal seleccionada en el wizard. Si esta vacio, se usa 0."],
  ["9. SKU Variante y Cod. Barras deben ser unicos. Si el SKU esta vacio, se genera automaticamente."],
  ["10. Los colores nuevos pediran un hexadecimal antes de importar."],
  ["11. Las categorias y tallas nuevas se crean automaticamente."],
  ["12. unidad_medida acepta: uni/unidad, docena, servicio o el codigo SUNAT (NIU, DZN, ZZ, etc.)."],
  ["13. Maximo 5,000 filas por archivo."],
  ["14. La hoja Ejemplo es solo referencia. No se importa."],
];

export async function downloadProductImportTemplate() {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const productsSheet = XLSX.utils.aoa_to_sheet([headers]);
  productsSheet["!cols"] = [
    { wch: 14 },
    { wch: 26 },
    { wch: 18 },
    { wch: 30 },
    { wch: 14 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
  ];

  const exampleSheet = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  exampleSheet["!cols"] = productsSheet["!cols"];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 100 }];

  XLSX.utils.book_append_sheet(workbook, productsSheet, "Productos");
  XLSX.utils.book_append_sheet(workbook, exampleSheet, "Ejemplo");
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instrucciones");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "plantilla-importacion-productos.xlsx",
  );
}

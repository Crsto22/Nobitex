"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileArrowUpIcon,
  SpinnerGapIcon,
} from "@/lib/icons";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ImportStepper } from "@/components/ProductImport/import-stepper";
import { MappingStep } from "@/components/ProductImport/mapping-step";
import { PreviewStep } from "@/components/ProductImport/preview-step";
import { ResultStep } from "@/components/ProductImport/result-step";
import { UploadStep } from "@/components/ProductImport/upload-step";
import type {
  BranchOption,
  ImportStep,
} from "@/components/ProductImport/types";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { branchesApi } from "@/lib/api/branches";
import { productImportApi } from "@/lib/api/product-import";
import { useAuth } from "@/lib/auth/auth-provider";
import { buildProductGroups } from "@/lib/product-import/build-groups";
import { suggestColorHex } from "@/lib/product-import/colors";
import {
  emptyMapping,
  mappingByHeader,
  mappingFromHeader,
  missingRequiredFields,
  requiredImportFields,
} from "@/lib/product-import/fields";
import { readProductImportFile } from "@/lib/product-import/parse-excel";
import { downloadProductImportTemplate } from "@/lib/product-import/template";
import type {
  ImportIssue,
  ImportProductInput,
  ImportFieldKey,
  ParseIssue,
  ParsedSheet,
  ValidateImportResponse,
  ExecuteImportResponse,
} from "@/lib/product-import/types";
import { downloadBlob } from "@/lib/utils/download";

const maxVariantsPerChunk = 300;
const maxProductsPerChunk = 50;

export function ProductImportWizard() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const { user } = useAuth();
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<ImportStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [headerMapping, setHeaderMapping] = useState<Record<ImportFieldKey, string>>(
    mappingByHeader([], emptyMapping()),
  );
  const [parsedProducts, setParsedProducts] = useState<ImportProductInput[]>([]);
  const [validation, setValidation] = useState<ValidateImportResponse | null>(null);
  const [colorHexByKey, setColorHexByKey] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExecuteImportResponse | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    branchesApi
      .findAll({ page: 1, limit: 100, estado: "activo" })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const scopedBranchId = user?.sucursalId ?? null;
        const allBranches = response.data
          .filter((branch) => branch.tipo !== "asistencia")
          .map((branch) => ({
            id: branch.id,
            nombre: branch.nombre,
            esPrincipal: branch.esPrincipal,
          }));
        const availableBranches = scopedBranchId
          ? allBranches.filter((branch) => branch.id === scopedBranchId)
          : allBranches;

        if (availableBranches.length === 0 && !scopedBranchId) {
          throw new Error("Sin sucursales");
        }

        const resolvedBranches =
          availableBranches.length > 0
            ? availableBranches
            : [
                {
                  id: scopedBranchId!,
                  nombre: "Mi sucursal",
                  esPrincipal: true,
                },
              ];

        setBranches(resolvedBranches);
        const principalBranch =
          resolvedBranches.find((branch) => branch.esPrincipal) ??
          resolvedBranches[0];
        setBranchId(scopedBranchId ?? principalBranch.id);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        const scopedBranchId = user?.sucursalId ?? null;
        setBranches(
          scopedBranchId
            ? [{ id: scopedBranchId, nombre: "Mi sucursal", esPrincipal: true }]
            : [{ id: "principal", nombre: "Principal", esPrincipal: true }],
        );
        setBranchId(scopedBranchId ?? "principal");
      });

    return () => {
      isMounted = false;
    };
  }, [user?.sucursalId]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const canContinueUpload = Boolean(file) && Boolean(branchId) && !isParsing;
  const hasDuplicateMapping = useMemo(() => {
    const used = Object.values(headerMapping).filter(Boolean);
    return new Set(used).size !== used.length;
  }, [headerMapping]);
  const canContinueMapping =
    requiredImportFields.every((key) => Boolean(headerMapping[key])) &&
    !hasDuplicateMapping &&
    !isValidating;

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setSheet(null);
    setHeaderMapping(mappingByHeader([], emptyMapping()));
    setParsedProducts([]);
    setValidation(null);
    setColorHexByKey({});
    setResult(null);
    setErrorMessage(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadProductImportTemplate();
      showToast({
        title: "Plantilla descargada",
        description: "La plantilla incluye hojas de ejemplo e instrucciones.",
        variant: "success",
      });
    } catch {
      showToast({
        title: "No se pudo descargar",
        description: "Intenta nuevamente.",
        variant: "error",
      });
    }
  };

  const handleContinueUpload = async () => {
    if (!file || !branchId || isParsing) {
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const parsedSheet = await readProductImportFile(file);
      setSheet(parsedSheet);
      setHeaderMapping(
        mappingByHeader(parsedSheet.headers, parsedSheet.mapping),
      );
      setStep(2);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo leer el archivo.";
      setErrorMessage(message);
      showToast({
        title: "No se pudo leer el Excel",
        description: message,
        variant: "error",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleContinueMapping = async () => {
    if (!sheet || !canContinueMapping) {
      return;
    }

    const mapping = mappingFromHeader(sheet.headers, headerMapping);
    const missing = missingRequiredFields(mapping);
    if (missing.length > 0) {
      showToast({
        title: "Faltan columnas",
        description: "Asigna las columnas obligatorias antes de continuar.",
        variant: "warning",
      });
      return;
    }

    const parsed = buildProductGroups(sheet, mapping);
    setParsedProducts(parsed.products);

    if (parsed.products.length === 0) {
      showToast({
        title: "No hay productos",
        description: "El archivo no tiene filas con datos para importar.",
        variant: "warning",
      });
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);

    try {
      const response = await productImportApi.validate({
        sucursalId: branchId,
        products: parsed.products,
      });
      const merged = mergeParseIssues(response, parsed.issues);
      setValidation(merged);
      setColorHexByKey((current) => {
        const next = { ...current };
        for (const color of merged.newValues.colors) {
          if (!color.exists && !next[color.key]) {
            next[color.key] = suggestColorHex(color.nombre);
          }
        }
        return next;
      });
      setStep(3);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo validar el archivo.";
      setErrorMessage(message);
      showToast({
        title: "No se pudo validar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const validIndexes = useMemo(() => {
    if (!validation) {
      return [];
    }

    return validation.products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => product.action !== "error")
      .map(({ index }) => index);
  }, [validation]);

  const newColors = validation?.newValues.colors.filter((item) => !item.exists) ?? [];
  const validColorKeys = useMemo(() => {
    if (!validation) {
      return new Set<string>();
    }

    const keys = new Set<string>();
    for (const index of validIndexes) {
      const product = validation.products[index];
      for (const variant of product?.variants ?? []) {
        if (variant.color) {
          keys.add(normalizeColorKey(variant.color));
        }
      }
    }
    return keys;
  }, [validIndexes, validation]);

  const requiredNewColors = newColors.filter((item) =>
    validColorKeys.has(item.key),
  );
  const colorsReady = requiredNewColors.every((item) =>
    /^#[0-9a-fA-F]{6}$/.test(colorHexByKey[item.key] ?? ""),
  );
  const canExecute =
    Boolean(validation) &&
    validIndexes.length > 0 &&
    colorsReady &&
    !isExecuting;

  const handleExecute = async () => {
    if (!validation || !canExecute) {
      return;
    }

    const selectedProducts = validIndexes
      .map((index) => parsedProducts[index])
      .filter((product): product is ImportProductInput => Boolean(product));

    if (selectedProducts.length === 0) {
      return;
    }

    const chunks = chunkProducts(selectedProducts);
    const totals = chunks.reduce(
      (total, chunk) =>
        total + chunk.reduce((sum, product) => sum + product.variants.length, 0),
      0,
    );

    setIsExecuting(true);
    setProgress({ done: 0, total: totals });
    setErrorMessage(null);

    const accumulated: ExecuteImportResponse = {
      summary: {
        productsCreated: 0,
        productsUpdated: 0,
        productsSkipped: 0,
        variantsCreated: 0,
        variantsUpdated: 0,
        variantsSkipped: 0,
      },
      products: [],
      errors: [],
    };

    const skippedProducts = validation.products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => product.action === "error");

    for (const { product, index } of skippedProducts) {
      accumulated.summary.productsSkipped += 1;
      accumulated.summary.variantsSkipped +=
        parsedProducts[index]?.variants.length ?? product.variants.length;
      accumulated.errors.push({
        rowNumber: product.variants[0]?.rowNumber ?? 1,
        nombre: product.nombre,
        message:
          product.issues.find((issue) => issue.severity === "error")?.message ??
          "Producto omitido por errores de validación.",
      });
    }

    const colors = requiredNewColors
      .filter((item) => /^#[0-9a-fA-F]{6}$/.test(colorHexByKey[item.key] ?? ""))
      .map((item) => ({ nombre: item.nombre, hex: colorHexByKey[item.key] }));

    try {
      for (const chunk of chunks) {
        const response = await productImportApi.execute({
          sucursalId: branchId,
          products: chunk,
          colors,
        });

        accumulated.summary.productsCreated += response.summary.productsCreated;
        accumulated.summary.productsUpdated += response.summary.productsUpdated;
        accumulated.summary.productsSkipped += response.summary.productsSkipped;
        accumulated.summary.variantsCreated += response.summary.variantsCreated;
        accumulated.summary.variantsUpdated += response.summary.variantsUpdated;
        accumulated.summary.variantsSkipped += response.summary.variantsSkipped;
        accumulated.products.push(...response.products);
        accumulated.errors.push(...response.errors);

        const chunkVariants = chunk.reduce(
          (sum, product) => sum + product.variants.length,
          0,
        );
        setProgress((current) => ({
          done: Math.min(totals, current.done + chunkVariants),
          total: totals,
        }));
      }

      setResult(accumulated);
      setStep(4);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo importar.";
      setErrorMessage(message);
      showToast({
        title: "No se pudo importar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!result || result.errors.length === 0) {
      return;
    }

    const csv = [
      ["Fila", "Producto", "Mensaje"],
      ...result.errors.map((error) => [
        String(error.rowNumber),
        error.nombre,
        error.message,
      ]),
    ]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\r\n");

    downloadBlob(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }),
      "errores-importacion-productos.csv",
    );
  };

  const handleImportAnother = () => {
    setFile(null);
    setSheet(null);
    setHeaderMapping(mappingByHeader([], emptyMapping()));
    setParsedProducts([]);
    setValidation(null);
    setColorHexByKey({});
    setResult(null);
    setErrorMessage(null);
    setProgress({ done: 0, total: 0 });
    setStep(1);
  };

  const handleStepClick = (targetStep: ImportStep) => {
    if (isParsing || isValidating || isExecuting || result) {
      return;
    }
    setStep(targetStep);
  };

  return (
    <DashboardShell
      headerTitle="Importar productos"
      headerParent={{ label: "Productos", href: "/catalogo/productos" }}
    >
      <div className="min-h-full bg-[var(--color-background)] p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1240px] space-y-4">
          <section
            ref={topRef}
            className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <FileArrowUpIcon size={22} weight="fill" />
                </span>
                <h1 className="text-lg font-circular-bold text-[var(--color-text)] sm:text-xl">
                  Importar Productos
                </h1>
              </div>
              <span className="pt-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                Paso {step} de 4
              </span>
            </div>

            <ImportStepper
              currentStep={step}
              onStepClick={handleStepClick}
            />
          </section>

          {errorMessage ? (
            <div className="rounded-[12px] border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 text-sm font-circular-regular text-[#b91c1c]">
              {errorMessage}
            </div>
          ) : null}

          {step === 1 ? (
            <UploadStep
              file={file}
              onFileChange={handleFileChange}
              branches={branches}
              branchId={branchId}
              onBranchChange={setBranchId}
              onDownloadTemplate={() => void handleDownloadTemplate()}
            />
          ) : null}

          {step === 2 && sheet ? (
            <MappingStep
              fileName={sheet.fileName}
              headers={sheet.headers}
              headerMapping={headerMapping}
              rows={sheet.rows}
              rowNumbers={sheet.rowNumbers}
              onMappingChange={(field, header) =>
                setHeaderMapping((current) => ({ ...current, [field]: header }))
              }
            />
          ) : null}

          {step === 3 && validation ? (
            <PreviewStep
              validation={validation}
              colorHexByKey={colorHexByKey}
              onColorHexChange={(key, value) =>
                setColorHexByKey((current) => ({ ...current, [key]: value }))
              }
            />
          ) : null}

          {step === 3 && isValidating ? (
            <section className="flex flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] p-12 shadow-sm">
              <SpinnerGapIcon
                size={32}
                weight="bold"
                className="animate-spin text-[var(--color-primary)]"
              />
              <p className="mt-3 text-sm font-circular-bold text-[var(--color-text)]">
                Validando productos contra tu catálogo...
              </p>
              <p className="mt-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                Estamos buscando productos existentes, SKU duplicados y valores
                nuevos.
              </p>
            </section>
          ) : null}

          {step === 4 && result ? (
            <ResultStep
              result={result}
              onDownloadErrors={handleDownloadErrors}
              onImportAnother={handleImportAnother}
            />
          ) : null}

          {step < 4 ? (
            <div className="flex flex-col-reverse gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => router.push("/catalogo/productos")}
                  className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isExecuting || isValidating}
                  onClick={() =>
                    setStep((current) => Math.max(1, current - 1) as ImportStep)
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeftIcon size={16} weight="bold" />
                  Volver
                </button>
              )}

              {step === 1 ? (
                <button
                  type="button"
                  disabled={!canContinueUpload}
                  onClick={() => void handleContinueUpload()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <SpinnerGapIcon
                        size={16}
                        weight="bold"
                        className="animate-spin"
                      />
                      Analizando...
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRightIcon size={16} weight="bold" />
                    </>
                  )}
                </button>
              ) : null}

              {step === 2 ? (
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  {!canContinueMapping ? (
                    <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                      {hasDuplicateMapping
                        ? "Una columna no puede estar asignada a dos campos."
                        : "Asigna las columnas obligatorias para continuar."}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={!canContinueMapping}
                    onClick={() => void handleContinueMapping()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isValidating ? (
                      <>
                        <SpinnerGapIcon
                          size={16}
                          weight="bold"
                          className="animate-spin"
                        />
                        Validando...
                      </>
                    ) : (
                      <>
                        Continuar
                        <ArrowRightIcon size={16} weight="bold" />
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              {step === 3 && validation ? (
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  {!colorsReady ? (
                    <p className="text-[11px] font-circular-regular text-[#dc2626]">
                      Completa el hexadecimal de todos los colores nuevos.
                    </p>
                  ) : validIndexes.length === 0 ? (
                    <p className="text-[11px] font-circular-regular text-[#dc2626]">
                      Corrige los errores para poder importar.
                    </p>
                  ) : validation.summary.errorProducts > 0 ? (
                    <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                      Se omitiran {validation.summary.errorProducts} producto(s)
                      con error.
                    </p>
                  ) : (
                    <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                      {validIndexes.length} producto(s) listos para importar.
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={!canExecute}
                    onClick={() => void handleExecute()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isExecuting ? (
                      <>
                        <SpinnerGapIcon
                          size={16}
                          weight="bold"
                          className="animate-spin"
                        />
                        Importando {progress.done}/{progress.total}...
                      </>
                    ) : (
                      <>
                        Importar Ahora
                        <ArrowRightIcon size={16} weight="bold" />
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}

function chunkProducts(products: ImportProductInput[]) {
  const chunks: ImportProductInput[][] = [];
  let current: ImportProductInput[] = [];
  let currentVariants = 0;

  for (const product of products) {
    const variantCount = product.variants.length;
    const wouldExceed =
      current.length > 0 &&
      (current.length >= maxProductsPerChunk ||
        currentVariants + variantCount > maxVariantsPerChunk);

    if (wouldExceed) {
      chunks.push(current);
      current = [];
      currentVariants = 0;
    }

    current.push(product);
    currentVariants += variantCount;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function mergeParseIssues(
  response: ValidateImportResponse,
  parseIssues: ParseIssue[],
): ValidateImportResponse {
  if (parseIssues.length === 0) {
    return response;
  }

  const products = response.products.map((product) => ({
    ...product,
    issues: [...product.issues],
    variants: product.variants.map((variant) => ({
      ...variant,
      issues: [...variant.issues],
    })),
  }));
  const issues: ImportIssue[] = [...response.issues];

  for (const parseIssue of parseIssues) {
    const issue: ImportIssue = {
      severity: parseIssue.severity,
      scope: parseIssue.scope,
      rowNumber: parseIssue.rowNumber,
      field: parseIssue.field,
      message: parseIssue.message,
    };

    issues.push(issue);

    const product =
      products.find(
        (item) =>
          parseIssue.rowNumber !== undefined &&
          item.variants.some(
            (variant) => variant.rowNumber === parseIssue.rowNumber,
          ),
      ) ??
      products.find(
        (item) =>
          Boolean(parseIssue.productName) &&
          item.nombre.trim().toLowerCase() ===
            parseIssue.productName!.trim().toLowerCase(),
      );

    if (!product) {
      continue;
    }

    product.issues.push(issue);

    if (parseIssue.scope === "variant" && parseIssue.rowNumber !== undefined) {
      const variant = product.variants.find(
        (item) => item.rowNumber === parseIssue.rowNumber,
      );
      if (variant) {
        variant.issues.push(issue);
        variant.action = "error";
      }
    }

    if (parseIssue.severity === "error") {
      product.action = "error";
    }
  }

  return {
    ...response,
    summary: {
      ...response.summary,
      createProducts: products.filter((product) => product.action === "create")
        .length,
      updateProducts: products.filter((product) => product.action === "update")
        .length,
      errorProducts: products.filter((product) => product.action === "error")
        .length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
    products,
    issues,
  };
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeColorKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

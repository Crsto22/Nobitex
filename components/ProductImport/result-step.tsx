"use client";

import Link from "next/link";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  PackageIcon,
  TagIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@/lib/icons";

import type { ExecuteImportResponse } from "@/lib/product-import/types";
import { cn } from "@/lib/utils";

type ResultStepProps = {
  result: ExecuteImportResponse;
  onDownloadErrors: () => void;
  onImportAnother: () => void;
};

export function ResultStep({
  result,
  onDownloadErrors,
  onImportAnother,
}: ResultStepProps) {
  const hasErrors = result.errors.length > 0 || result.summary.productsSkipped > 0;
  const totalProducts =
    result.summary.productsCreated + result.summary.productsUpdated;
  const totalVariants =
    result.summary.variantsCreated + result.summary.variantsUpdated;

  return (
    <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:p-6">
      <div className="flex flex-col items-center py-4 text-center">
        <span
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            hasErrors
              ? "bg-[#f59e0b]/10 text-[#b45309]"
              : "bg-[#10b981]/10 text-[#047857]",
          )}
        >
          {hasErrors ? (
            <WarningCircleIcon size={34} weight="fill" />
          ) : (
            <CheckCircleIcon size={34} weight="fill" />
          )}
        </span>
        <h2 className="mt-4 text-lg font-circular-bold text-[var(--color-text)]">
          {hasErrors
            ? "Importación completada con observaciones"
            : "Importación completada"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm font-circular-regular text-[var(--color-muted-foreground)]">
          {hasErrors
            ? `Se procesaron ${totalProducts} productos y ${totalVariants} variantes. ${result.summary.productsSkipped} producto(s) no se pudieron importar.`
            : `Se procesaron ${totalProducts} productos y ${totalVariants} variantes correctamente.`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ResultMetric
          icon={<PackageIcon size={18} weight="fill" />}
          label="Productos creados"
          value={result.summary.productsCreated}
          tone="primary"
        />
        <ResultMetric
          icon={<ArrowClockwiseIcon size={18} weight="fill" />}
          label="Productos actualizados"
          value={result.summary.productsUpdated}
          tone="info"
        />
        <ResultMetric
          icon={<TagIcon size={18} weight="fill" />}
          label="Variantes creadas / actualizadas"
          value={`${result.summary.variantsCreated} / ${result.summary.variantsUpdated}`}
          tone="success"
        />
        <ResultMetric
          icon={<XCircleIcon size={18} weight="fill" />}
          label="Productos omitidos"
          value={result.summary.productsSkipped}
          tone={result.summary.productsSkipped > 0 ? "danger" : "neutral"}
        />
      </div>

      {result.errors.length > 0 ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-circular-bold text-[var(--color-text)]">
                Productos que no se importaron
              </h3>
              <p className="mt-0.5 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                Corrige el archivo y vuelve a importar. Los productos ya
                importados se actualizarán, no se duplicarán.
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadErrors}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <DownloadSimpleIcon size={15} weight="bold" />
              Descargar errores
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded-[12px] border border-[var(--color-border)]">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="bg-[var(--color-background)]">
                <tr>
                  {["Fila", "Producto", "Mensaje"].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2.5 text-[10px] font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.errors.map((error, index) => (
                  <tr
                    key={`${error.rowNumber}-${error.nombre}-${index}`}
                    className="odd:bg-[var(--color-background)]/40"
                  >
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                      {error.rowNumber}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-bold text-[var(--color-text)]">
                      {error.nombre || "—"}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[#dc2626]">
                      {error.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onImportAnother}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
        >
          <ArrowClockwiseIcon size={16} weight="bold" />
          Importar otro archivo
        </button>
        <Link
          href="/catalogo/productos"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-opacity hover:opacity-90"
        >
          Ver productos
        </Link>
      </div>
    </section>
  );
}

function ResultMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "info" | "danger" | "success" | "neutral";
}) {
  const toneClassName = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    info: "bg-[#3b82f6]/10 text-[#3b82f6]",
    danger: "bg-[#ef4444]/10 text-[#dc2626]",
    success: "bg-[#10b981]/10 text-[#047857]",
    neutral: "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
  }[tone];

  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            toneClassName,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-lg font-circular-bold leading-none text-[var(--color-text)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  TagIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@/lib/icons";

import type {
  ImportIssue,
  ValidateImportResponse,
  ValidationProduct,
  ValidationVariant,
} from "@/lib/product-import/types";
import { suggestColorHex } from "@/lib/product-import/colors";
import { cn } from "@/lib/utils";

type PreviewRow = ValidationVariant & {
  productName: string;
  codigoModelo: string;
  categoria: string;
  existing: ValidationProduct["existing"];
  productAction: ValidationProduct["action"];
  issues: ImportIssue[];
  status: "ok" | "warning" | "error";
};

type PreviewStepProps = {
  validation: ValidateImportResponse;
  colorHexByKey: Record<string, string>;
  onColorHexChange: (key: string, value: string) => void;
};

const pageSize = 50;

export function PreviewStep({
  validation,
  colorHexByKey,
  onColorHexChange,
}: PreviewStepProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todas");
  const [color, setColor] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<"all" | "error">("all");
  const [page, setPage] = useState(1);

  const rows = useMemo<PreviewRow[]>(() => {
    return validation.products.flatMap((product) => {
      const productIssues = product.issues.filter(
        (issue) => issue.scope === "product" || issue.scope === "global",
      );

      return product.variants.map((variant) => {
        const issues = [...productIssues, ...variant.issues];
        const hasError =
          product.action === "error" ||
          variant.action === "error" ||
          issues.some((issue) => issue.severity === "error");
        const hasWarning = issues.some(
          (issue) => issue.severity === "warning",
        );

        return {
          ...variant,
          productName: product.nombre,
          codigoModelo: product.codigoModelo,
          categoria: product.categoria,
          existing: product.existing,
          productAction: product.action,
          issues,
          status: hasError ? "error" : hasWarning ? "warning" : "ok",
        };
      });
    });
  }, [validation.products]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          validation.products
            .map((product) => product.categoria)
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [validation.products],
  );

  const colors = useMemo(
    () =>
      Array.from(
        new Map(
          validation.newValues.colors.map((item) => [
            item.nombre.toLowerCase(),
            item,
          ]),
        ).values(),
      ),
    [validation.newValues.colors],
  );

  const colorHexMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of validation.newValues.colors) {
      map.set(
        item.nombre.toLowerCase(),
        item.hex ?? colorHexByKey[item.key] ?? suggestColorHex(item.nombre),
      );
    }
    return map;
  }, [colorHexByKey, validation.newValues.colors]);

  const newColors = colors.filter((item) => !item.exists);
  const newCategories = validation.newValues.categories;
  const newSizes = validation.newValues.sizes;
  const globalIssues = validation.issues.filter(
    (issue) => issue.scope === "global",
  );

  const filteredRows = useMemo(() => {
    const searchKey = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (category !== "todas" && row.categoria !== category) {
        return false;
      }
      if (color !== "todos" && row.color.toLowerCase() !== color) {
        return false;
      }
      if (statusFilter === "error" && row.status !== "error") {
        return false;
      }
      if (!searchKey) {
        return true;
      }

      return [
        row.productName,
        row.codigoModelo,
        row.sku,
        row.barcode,
        row.color,
        row.size,
        row.categoria,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchKey);
    });
  }, [category, color, rows, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const errorRows = rows.filter((row) => row.status === "error").length;
  const warningRows = rows.filter((row) => row.status === "warning").length;

  return (
    <section className="space-y-4">
      {newCategories.length > 0 ||
      newSizes.length > 0 ||
      newColors.length > 0 ? (
        <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <WarningCircleIcon
              size={18}
              weight="fill"
              className="text-[#b45309]"
            />
            <p className="text-sm font-circular-bold text-[var(--color-text)]">
              Valores nuevos — se crearán automáticamente al importar
            </p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {newCategories.length > 0 ? (
              <ValueCard
                title="Categorías nuevas"
                subtitle={`${newCategories.length} por crear`}
                values={newCategories}
              />
            ) : null}

            {newSizes.length > 0 ? (
              <ValueCard
                title="Tallas nuevas"
                subtitle={`${newSizes.length} por crear`}
                values={newSizes}
              />
            ) : null}
          </div>

          {newColors.length > 0 ? (
            <div className="mt-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
              <p className="text-xs font-circular-bold text-[var(--color-text)]">
                Colores nuevos
              </p>
              <p className="mt-0.5 text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                Asigna un hexadecimal a cada color nuevo para poder crearlo.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {newColors.map((item) => {
                  const value =
                    colorHexByKey[item.key] ?? suggestColorHex(item.nombre);
                  const isValid = /^#[0-9a-fA-F]{6}$/.test(value);

                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-2"
                    >
                      <input
                        type="color"
                        value={isValid ? value : "#94A3B8"}
                        onChange={(event) =>
                          onColorHexChange(item.key, event.target.value)
                        }
                        className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-0.5"
                        aria-label={`Color ${item.nombre}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-circular-bold text-[var(--color-text)]">
                          {item.nombre}
                        </p>
                        <input
                          type="text"
                          value={value}
                          onChange={(event) =>
                            onColorHexChange(item.key, event.target.value)
                          }
                          placeholder="#RRGGBB"
                          className={cn(
                            "mt-1 h-7 w-full rounded-md bg-[var(--color-input-bg)] px-2 font-mono text-[11px] text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20",
                            !isValid && "ring-1 ring-[#dc2626]",
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {globalIssues.length > 0 ? (
        <div className="rounded-[12px] border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-3">
          {globalIssues.map((issue, index) => (
            <p
              key={`${issue.code}-${index}`}
              className={cn(
                "text-sm font-circular-regular",
                issue.severity === "error"
                  ? "text-[#b91c1c]"
                  : "text-[#92400e]",
              )}
            >
              {issue.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-circular-bold text-[var(--color-text)]">
              Vista previa
            </h2>
            <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
              Revisa los datos antes de importar. Nada se guarda hasta que
              confirmes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Metric icon={<PackageIcon size={14} weight="fill" />} label="Productos" value={validation.summary.products} />
            <Metric icon={<TagIcon size={14} weight="fill" />} label="Variantes" value={validation.summary.variants} />
            <Metric
              icon={<XCircleIcon size={14} weight="fill" />}
              label="Errores"
              value={errorRows}
              tone={errorRows > 0 ? "danger" : "neutral"}
            />
            <Metric
              icon={<WarningCircleIcon size={14} weight="fill" />}
              label="Avisos"
              value={warningRows}
              tone={warningRows > 0 ? "warning" : "neutral"}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative">
            <MagnifyingGlassIcon
              size={17}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, código, SKU, color, talla..."
              className="h-10 w-full rounded-[12px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <div className="flex items-center gap-1 rounded-[12px] bg-[var(--color-input-bg)] p-1">
            {[
              { id: "all" as const, label: "Todas" },
              { id: "error" as const, label: `Errores (${errorRows})` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setStatusFilter(item.id);
                  setPage(1);
                }}
                className={cn(
                  "h-8 rounded-[9px] px-3 text-xs transition-colors",
                  statusFilter === item.id
                    ? "bg-[var(--color-card)] font-circular-bold text-[var(--color-text)] shadow-sm"
                    : "font-circular-regular text-[var(--color-muted-foreground)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Categorías
          </span>
          <FilterChip
            active={category === "todas"}
            label="Todas"
            onClick={() => {
              setCategory("todas");
              setPage(1);
            }}
          />
          {categories.map((item) => (
            <FilterChip
              key={item}
              active={category === item}
              label={item}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
            />
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Color
          </span>
          <FilterChip
            active={color === "todos"}
            label="Todos"
            onClick={() => {
              setColor("todos");
              setPage(1);
            }}
          />
          {colors.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setColor(item.nombre.toLowerCase());
                setPage(1);
              }}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors",
                color === item.nombre.toLowerCase()
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-circular-bold text-[var(--color-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full border border-[var(--color-border)]"
                style={{
                  backgroundColor:
                    colorHexMap.get(item.nombre.toLowerCase()) ??
                    suggestColorHex(item.nombre),
                }}
              />
              {item.nombre}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
            Mostrando {filteredRows.length} variante(s) de{" "}
            {validation.summary.variants} en el archivo ·{" "}
            {validation.summary.products} producto(s)
          </p>
          <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
            {validation.summary.createProducts} por crear ·{" "}
            {validation.summary.updateProducts} por actualizar
          </p>
        </div>

        <div className="mt-3 overflow-x-auto rounded-[12px] border border-[var(--color-border)]">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-[var(--color-background)]">
              <tr>
                {[
                  "Nombre",
                  "Color",
                  "Talla",
                  "SKU",
                  "Cód. Barras",
                  "Precio",
                  "P. Mayor",
                  "Stock",
                  "Estado",
                ].map((header) => (
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
              {visibleRows.length > 0 ? (
                visibleRows.map((row) => (
                  <tr
                    key={`${row.rowNumber}-${row.sku}-${row.color}-${row.size}`}
                    className={cn(
                      "align-top odd:bg-[var(--color-background)]/40",
                      row.status === "error" && "bg-[#ef4444]/5",
                    )}
                  >
                    <td className="border-b border-[var(--color-border)] px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-circular-bold text-[var(--color-text)]">
                          {row.productName}
                        </p>
                        {row.existing ? (
                          <span className="rounded-full bg-[#3b82f6]/10 px-1.5 py-0.5 text-[9px] font-circular-bold text-[#2563eb]">
                            Existente
                          </span>
                        ) : null}
                        {row.productAction === "update" ? (
                          <span className="rounded-full bg-[#10b981]/10 px-1.5 py-0.5 text-[9px] font-circular-bold text-[#047857]">
                            Se actualizará
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                        {row.codigoModelo || "Sin código"} · Fila {row.rowNumber}
                      </p>
                      {row.issues.length > 0 ? (
                        <ul className="mt-1 space-y-0.5">
                          {row.issues
                            .filter((issue) => issue.severity === "error")
                            .slice(0, 2)
                            .map((issue, index) => (
                              <li
                                key={`${issue.code}-${index}`}
                                className="max-w-[300px] text-[10px] font-circular-regular text-[#dc2626]"
                              >
                                {issue.message}
                              </li>
                            ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3">
                      {row.color ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-circular-regular text-[var(--color-text)]">
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-[var(--color-border)]"
                            style={{
                              backgroundColor:
                                colorHexMap.get(row.color.toLowerCase()) ??
                                suggestColorHex(row.color),
                            }}
                          />
                          {row.color}
                        </span>
                      ) : (
                        <span className="text-[var(--color-placeholder)]">
                          -
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[var(--color-text)]">
                      {row.size || (
                        <span className="text-[var(--color-placeholder)]">
                          -
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[var(--color-text)]">
                      {row.sku || (
                        <span className="text-[var(--color-placeholder)]">
                          Automático
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[var(--color-text)]">
                      {row.barcode || (
                        <span className="text-[var(--color-placeholder)]">
                          -
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[var(--color-text)]">
                      {formatCurrency(row.precioVenta)}
                    </td>
                    <td className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[var(--color-text)]">
                      {row.precioMayorista !== null && row.precioMayorista !== undefined
                        ? formatCurrency(row.precioMayorista)
                        : "—"}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 text-xs font-circular-regular text-[var(--color-text)]">
                      {row.stock === null ? "—" : row.stock}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3">
                      <StatusBadge status={row.status} action={row.action} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-12 text-center text-sm font-circular-regular text-[var(--color-muted-foreground)]"
                  >
                    No hay variantes con este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
              Página {currentPage} de {pageCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[var(--color-input-bg)] px-2.5 text-xs font-circular-regular text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CaretLeftIcon size={12} weight="bold" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                disabled={currentPage >= pageCount}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[var(--color-input-bg)] px-2.5 text-xs font-circular-regular text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <CaretRightIcon size={12} weight="bold" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ValueCard({
  title,
  subtitle,
  values,
}: {
  title: string;
  subtitle: string;
  values: string[];
}) {
  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-circular-bold text-[var(--color-text)]">
            {title}
          </p>
          <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        </div>
        <TagIcon
          size={16}
          className="shrink-0 text-[var(--color-muted-foreground)]"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full bg-[var(--color-card)] px-2 py-0.5 text-[10px] font-circular-regular text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "neutral" | "danger" | "warning";
}) {
  const toneClass = {
    neutral: "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
    danger: "bg-[#ef4444]/10 text-[#dc2626]",
    warning: "bg-[#f59e0b]/10 text-[#b45309]",
  }[tone];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-input-bg)] px-2.5 py-1 text-[11px] text-[var(--color-muted-foreground)]">
      <span
        className={cn("flex h-5 w-5 items-center justify-center rounded-full", toneClass)}
      >
        {icon}
      </span>
      <span className="font-circular-regular">{label}</span>
      <span className="font-circular-bold text-[var(--color-text)]">{value}</span>
    </span>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-2.5 text-[11px] transition-colors",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-card)] font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
      )}
    >
      {label}
    </button>
  );
}

function StatusBadge({
  status,
  action,
}: {
  status: PreviewRow["status"];
  action: ValidationVariant["action"];
}) {
  const config = {
    ok: {
      label: action === "update" ? "Actualizar" : "Crear",
      className: "bg-[#10b981]/10 text-[#047857]",
      icon: <CheckCircleIcon size={12} weight="fill" />,
    },
    warning: {
      label: "Aviso",
      className: "bg-[#f59e0b]/10 text-[#b45309]",
      icon: <WarningCircleIcon size={12} weight="fill" />,
    },
    error: {
      label: "Error",
      className: "bg-[#ef4444]/10 text-[#dc2626]",
      icon: <XCircleIcon size={12} weight="fill" />,
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-circular-bold",
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

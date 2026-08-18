"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  PackageIcon,
} from "@phosphor-icons/react/ssr";

import { BranchFilter } from "@/components/ProductCatalog/branch-filter";
import { CategoryFilter } from "@/components/ProductCatalog/category-filter";
import { ColorFilter } from "@/components/ProductCatalog/color-filter";
import { SizeFilter } from "@/components/ProductCatalog/size-filter";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { categoriesApi, type Category } from "@/lib/api/categories";
import { colorsApi, type Color } from "@/lib/api/colors";
import { sizesApi, type Size } from "@/lib/api/sizes";
import { stockApi, type StockKardexVariant } from "@/lib/api/stock";
import { defaultPageSize } from "@/lib/pagination";

const filterPageSize = Math.min(defaultPageSize, 12);
const pageSize = 18;

type VariantsMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const emptyMeta: VariantsMeta = {
  page: 1,
  limit: pageSize,
  total: 0,
  totalPages: 1,
};

export default function StockKardexPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedColor, setSelectedColor] = useState("todos");
  const [selectedSize, setSelectedSize] = useState("todos");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [variants, setVariants] = useState<StockKardexVariant[]>([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [page, setPage] = useState(1);
  const [colorPage, setColorPage] = useState(1);
  const [sizePage, setSizePage] = useState(1);
  const [colorTotalPages, setColorTotalPages] = useState(1);
  const [sizeTotalPages, setSizeTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);
  const [hasLoadedBranches, setHasLoadedBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadColors = useCallback(async (targetPage = 1, append = false) => {
    setIsLoadingColors(true);
    try {
      const response = await colorsApi.findAll({
        page: targetPage,
        limit: filterPageSize,
        status: "active",
      });
      setColors((current) =>
        append ? mergeById(current, response.data) : response.data,
      );
      setColorPage(response.meta.page);
      setColorTotalPages(response.meta.totalPages);
    } catch {
      if (!append) setColors([]);
    } finally {
      setIsLoadingColors(false);
    }
  }, []);

  const loadSizes = useCallback(async (targetPage = 1, append = false) => {
    setIsLoadingSizes(true);
    try {
      const response = await sizesApi.findAll({
        page: targetPage,
        limit: filterPageSize,
        status: "active",
      });
      setSizes((current) =>
        append ? mergeById(current, response.data) : response.data,
      );
      setSizePage(response.meta.page);
      setSizeTotalPages(response.meta.totalPages);
    } catch {
      if (!append) setSizes([]);
    } finally {
      setIsLoadingSizes(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    branchesApi
      .findAll({ limit: 100, estado: "activo" })
      .then((response) => {
        const activeBranches = response.data;
        const principalBranch =
          activeBranches.find((branch) => branch.esPrincipal) ??
          activeBranches[0];
        setBranches(activeBranches);
        setSelectedBranch((current) => current || principalBranch?.id || "");
      })
      .catch(() => {})
      .finally(() => setHasLoadedBranches(true));
  }, []);

  useEffect(() => {
    categoriesApi
      .findAll({ limit: 100, status: "active" })
      .then((response) => setCategories(response.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadColors();
      void loadSizes();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadColors, loadSizes]);

  useEffect(() => {
    if (!hasLoadedBranches) return;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);

      stockApi
        .kardexVariants(
          {
            page,
            limit: pageSize,
            search: debouncedSearchTerm,
            categoriaId:
              selectedCategory === "todos" ? undefined : selectedCategory,
            colorId: selectedColor === "todos" ? undefined : selectedColor,
            tallaId: selectedSize === "todos" ? undefined : selectedSize,
            sucursalId: selectedBranch || undefined,
          },
          { signal: controller.signal },
        )
        .then((response) => {
          setVariants(response.data);
          setMeta(response.meta);
        })
        .catch((loadError: unknown) => {
          if (
            loadError instanceof DOMException &&
            loadError.name === "AbortError"
          ) {
            return;
          }
          setVariants([]);
          setMeta(emptyMeta);
          setError("No se pudieron cargar las variantes");
        })
        .finally(() => setIsLoading(false));
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    debouncedSearchTerm,
    hasLoadedBranches,
    page,
    selectedBranch,
    selectedCategory,
    selectedColor,
    selectedSize,
  ]);

  const totalStock = useMemo(
    () => variants.reduce((sum, variant) => sum + variant.stockTotal, 0),
    [variants],
  );

  return (
    <DashboardShell
      headerTitle={
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-sm font-circular-regular text-[var(--color-text)]/70">
            Kardex
          </span>
          <BranchFilter
            branches={branches}
            selectedBranchId={selectedBranch}
            isOpen={isBranchOpen}
            className="w-[170px] sm:w-[220px]"
            onOpenChange={setIsBranchOpen}
            onBranchChange={(branchId) => {
              setSelectedBranch(branchId);
              setPage(1);
            }}
          />
        </div>
      }
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <MetricCard label="Variantes" value={meta.total} />
          <MetricCard label="Stock visible" value={totalStock} />
          <MetricCard
            label="Pagina"
            value={`${meta.page} / ${meta.totalPages}`}
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative flex-1">
              <MagnifyingGlassIcon
                size={18}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
              />
              <input
                type="text"
                placeholder="Buscar por producto, SKU, codigo, color o talla..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>

            <CategoryFilter
              categories={categories}
              selectedCategoryId={selectedCategory}
              isOpen={isCategoryOpen}
              onOpenChange={setIsCategoryOpen}
              onCategoryChange={(categoryId) => {
                setSelectedCategory(categoryId);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <ColorFilter
              colors={colors}
              selectedColorId={selectedColor}
              canLoadMore={colorPage < colorTotalPages}
              isLoading={isLoadingColors}
              onColorChange={(colorId) => {
                setSelectedColor(colorId);
                setPage(1);
              }}
              onLoadMore={() => void loadColors(colorPage + 1, true)}
            />
            <SizeFilter
              sizes={sizes}
              selectedSizeId={selectedSize}
              canLoadMore={sizePage < sizeTotalPages}
              isLoading={isLoadingSizes}
              onSizeChange={(sizeId) => {
                setSelectedSize(sizeId);
                setPage(1);
              }}
              onLoadMore={() => void loadSizes(sizePage + 1, true)}
            />
          </div>
        </div>

        <div className="pb-2">
          {error ? (
            <EmptyState message={error} />
          ) : isLoading ? (
            <VariantGridSkeleton />
          ) : variants.length === 0 ? (
            <EmptyState message="Intenta con otros filtros de busqueda" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {variants.map((variant) => (
                <VariantCard key={variant.variantPublicId} variant={variant} />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {variants.length} de {meta.total} variantes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isLoading || meta.page <= 1}
            >
              Anterior
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-2 text-xs font-circular-bold text-white">
              {meta.page}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(meta.totalPages, currentPage + 1),
                )
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isLoading || meta.page >= meta.totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function VariantCard({ variant }: { variant: StockKardexVariant }) {
  const variantName =
    variant.tipo === "normal"
      ? "Producto normal"
      : [variant.color?.nombre, variant.talla?.nombre]
          .filter(Boolean)
          .join(" / ");
  const stock = variant.stockSucursal ?? variant.stockTotal;

  return (
    <Link
      href={`/stock/kardex/${variant.variantPublicId}`}
      className="group flex min-h-[172px] flex-col justify-between rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-[var(--color-primary)]/20"
    >
      <div className="flex gap-3">
        <div
          className="h-14 w-14 shrink-0 rounded-[12px] bg-[var(--color-input-bg)] bg-cover bg-center"
          style={
            variant.imageUrl
              ? { backgroundImage: `url(${variant.imageUrl})` }
              : undefined
          }
        >
          {!variant.imageUrl ? (
            <div className="flex h-full w-full items-center justify-center text-[var(--color-primary)]">
              <PackageIcon size={24} weight="fill" />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-circular-bold text-[var(--color-text)]">
            {variant.nombre}
          </h2>
          <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">
            {variantName || "Sin variante"}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">
            {variant.sku || variant.codigoBarras || "Sin SKU"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Stock</p>
          <p className="text-xl font-circular-bold text-[var(--color-text)]">
            {stock.toLocaleString("es-PE")}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-primary)] text-white transition group-hover:translate-x-0.5">
          <ArrowRightIcon size={18} weight="bold" />
        </div>
      </div>
    </Link>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[14px] bg-[var(--color-sidebar-bg)] p-4 shadow-sm">
      <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-2 truncate text-2xl font-circular-bold text-[var(--color-text)]">
        {typeof value === "number" ? value.toLocaleString("es-PE") : value}
      </p>
    </div>
  );
}

function VariantGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[172px] animate-pulse rounded-[14px] bg-[var(--color-card)]"
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[14px] bg-[var(--color-card)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">
      {message}
    </div>
  );
}

function mergeById<T extends { id: string }>(current: T[], next: T[]) {
  const map = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

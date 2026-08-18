"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChartLineUpIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  WifiHighIcon,
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
import { cn } from "@/lib/utils";

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
            compactOnMobile
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
          <MetricCard
            icon={<PackageIcon size={22} weight="fill" />}
            label="Variantes"
            value={meta.total}
            tone="primary"
          />
          <MetricCard
            icon={<WifiHighIcon size={22} weight="fill" />}
            label="Stock visible"
            value={totalStock}
            tone="success"
          />
          <MetricCard
            icon={<ChartLineUpIcon size={22} weight="fill" />}
            label="Pagina"
            value={`${meta.page} / ${meta.totalPages}`}
            tone="info"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3 lg:flex lg:items-center lg:justify-between">
            <label className="relative lg:flex-1">
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
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
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
  const stock = variant.stockSucursal ?? variant.stockTotal;

  return (
    <Link
      href={`/stock/kardex/${variant.variantPublicId}`}
      className="group flex min-h-[150px] gap-3 rounded-[14px] bg-[var(--color-card)] p-3 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-[var(--color-primary)]/20"
    >
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-input-bg)]">
        {variant.imageUrl ? (
          <Image
            src={variant.imageUrl}
            width={80}
            height={80}
            unoptimized
            alt={variant.nombre}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <Image
            src="/Logo/Nuvex.png"
            width={56}
            height={56}
            alt="Sin imagen"
            className="h-14 w-14 object-contain grayscale opacity-35"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          {variant.color ? (
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-white shadow-sm ring-1 ring-black/10"
              style={{ backgroundColor: variant.color.hex }}
              title={variant.color.nombre}
            />
          ) : null}
          {variant.talla ? (
            <span
              className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-input-bg)] px-2 text-xs font-circular-bold text-[var(--color-text)]"
              title={`Talla: ${variant.talla.nombre}`}
            >
              {variant.talla.nombre}
            </span>
          ) : (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-input-bg)] px-2 text-xs font-circular-bold text-[var(--color-text)]">
              Normal
            </span>
          )}
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm font-black text-[var(--color-text)]">
          {variant.nombre}
        </p>
        <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
          {variant.sku || variant.codigoBarras || "Sin SKU"}
        </p>

        <div className="mt-auto flex items-end justify-end pt-2">
          <span
            className={cn(
              "font-sora-extrabold flex h-7 items-center gap-1 rounded-full px-2 text-[15px] text-white",
              stock >= 3
                ? "bg-[var(--color-sidebar-active)]"
                : "bg-[#ef4444]",
            )}
          >
            <PackageIcon size={14} weight="bold" />
            {stock}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "success" | "danger" | "info";
}) {
  const toneClassName = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    danger: "bg-[#ef4444]/10 text-[#ef4444]",
    info: "bg-[#3b82f6]/10 text-[#3b82f6]",
  }[tone];

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-3 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClassName}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="truncate text-xl font-circular-bold leading-none text-[var(--color-text)] sm:text-2xl">
            {typeof value === "number" ? value.toLocaleString("es-PE") : value}
          </p>
        </div>
      </div>
    </div>
  );
}

function VariantGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[150px] animate-pulse rounded-[14px] bg-[var(--color-card)]"
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  WifiHighIcon,
} from "@phosphor-icons/react/ssr";

import { BranchFilter } from "@/components/ProductCatalog/branch-filter";
import { CategoryFilter } from "@/components/ProductCatalog/category-filter";
import { ColorFilter } from "@/components/ProductCatalog/color-filter";
import {
  ProductCard,
  type ProductCatalogItem,
} from "@/components/ProductCatalog/product-card";
import { SizeFilter } from "@/components/ProductCatalog/size-filter";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { categoriesApi, type Category } from "@/lib/api/categories";
import { colorsApi, type Color } from "@/lib/api/colors";
import {
  productsApi,
  type ProductResponse,
  type ProductsResponse,
} from "@/lib/api/products";
import { sizesApi, type Size } from "@/lib/api/sizes";
import { defaultPageSize } from "@/lib/pagination";

const filterPageSize = Math.min(defaultPageSize, 12);

const emptyProductsMeta: ProductsResponse["meta"] = {
  page: 1,
  limit: defaultPageSize,
  total: 0,
  totalPages: 1,
  activeTotal: 0,
  inactiveTotal: 0,
};

export default function CatalogoProductosPage() {
  const { showToast } = useSystemToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedColor, setSelectedColor] = useState("todos");
  const [selectedSize, setSelectedSize] = useState("todos");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<Category[]>([]);
  const [catalogColors, setCatalogColors] = useState<Color[]>([]);
  const [catalogSizes, setCatalogSizes] = useState<Size[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [productsMeta, setProductsMeta] = useState(emptyProductsMeta);
  const [page, setPage] = useState(1);
  const [colorPage, setColorPage] = useState(1);
  const [sizePage, setSizePage] = useState(1);
  const [colorTotalPages, setColorTotalPages] = useState(1);
  const [sizeTotalPages, setSizeTotalPages] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);
  const [hasLoadedBranches, setHasLoadedBranches] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductCatalogItem | null>(
    null,
  );

  const loadColors = useCallback(async (targetPage = 1, append = false) => {
    setIsLoadingColors(true);

    try {
      const response = await colorsApi.findAll({
        page: targetPage,
        limit: filterPageSize,
        status: "active",
      });

      setCatalogColors((currentColors) =>
        append ? mergeById(currentColors, response.data) : response.data,
      );
      setColorPage(response.meta.page);
      setColorTotalPages(response.meta.totalPages);
    } catch {
      if (!append) {
        setCatalogColors([]);
        setColorPage(1);
        setColorTotalPages(1);
      }
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

      setCatalogSizes((currentSizes) =>
        append ? mergeById(currentSizes, response.data) : response.data,
      );
      setSizePage(response.meta.page);
      setSizeTotalPages(response.meta.totalPages);
    } catch {
      if (!append) {
        setCatalogSizes([]);
        setSizePage(1);
        setSizeTotalPages(1);
      }
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
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      branchesApi
        .findAll({ limit: 100, estado: "activo" })
        .then((response) => {
          if (!isMounted) {
            return;
          }

          const activeBranches = response.data;
          const principalBranch =
            activeBranches.find((branch) => branch.esPrincipal) ??
            activeBranches[0];

          setBranches(activeBranches);
          setSelectedBranch(
            (currentBranch) => currentBranch || principalBranch?.id || "",
          );
          setHasLoadedBranches(true);
        })
        .catch(() => {
          if (isMounted) {
            setHasLoadedBranches(true);
          }
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    categoriesApi
      .findAll({ limit: 100, status: "active" })
      .then((response) => {
        if (isMounted) {
          setCatalogCategories(response.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadColors(1, false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadColors]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSizes(1, false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSizes]);

  useEffect(() => {
    if (!hasLoadedBranches) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsLoadingProducts(true);
      setProductsError(null);

      productsApi
        .findAll(
          {
            page,
            limit: defaultPageSize,
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
          if (!isMounted) {
            return;
          }

          setProducts(response.data);
          setProductsMeta(response.meta);
        })
        .catch((error: unknown) => {
          if (!isMounted) {
            return;
          }
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          setProducts([]);
          setProductsMeta(emptyProductsMeta);
          setProductsError("No se pudieron cargar los productos");
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingProducts(false);
          }
        });
    }, 0);

    return () => {
      isMounted = false;
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

  const catalogProducts = useMemo(
    () => products.map(toProductCatalogItem),
    [products],
  );
  const totalProducts = productsMeta.total;
  const inStockCount = catalogProducts.filter(
    (product) => product.stock > 0,
  ).length;
  const outOfStockCount = catalogProducts.filter(
    (product) => product.stock === 0,
  ).length;
  const totalValue = products.reduce((sum, product) => {
    return (
      sum +
      product.variantes.reduce((variantSum, variant) => {
        const stock = variant.inventarios.reduce(
          (stockSum, inventory) => stockSum + inventory.stockActual,
          0,
        );

        return variantSum + Number(variant.precioVenta) * stock;
      }, 0)
    );
  }, 0);

  const refreshProducts = async (targetPage = page) => {
    const response = await productsApi.findAll({
      page: targetPage,
      limit: defaultPageSize,
      search: debouncedSearchTerm,
      categoriaId: selectedCategory === "todos" ? undefined : selectedCategory,
      colorId: selectedColor === "todos" ? undefined : selectedColor,
      tallaId: selectedSize === "todos" ? undefined : selectedSize,
      sucursalId: selectedBranch || undefined,
    });

    setProducts(response.data);
    setProductsMeta(response.meta);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProduct) {
      return;
    }

    setIsLoadingProducts(true);

    try {
      await productsApi.remove(deleteProduct.publicId);

      const targetPage = products.length === 1 && page > 1 ? page - 1 : page;

      setPage(targetPage);
      await refreshProducts(targetPage);
      showToast({
        title: "Producto eliminado",
        description: "El producto y sus variantes se eliminaron correctamente.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el producto.";

      showToast({
        title: "No se pudo eliminar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsLoadingProducts(false);
      setDeleteProduct(null);
    }
  };

  return (
    <DashboardShell
      headerTitle={
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-sm font-circular-regular text-[var(--color-text)]/70">
            Productos
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
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MetricCard
            icon={<PackageIcon size={22} weight="fill" />}
            label="Total Productos"
            value={totalProducts}
            tone="primary"
          />
          <MetricCard
            icon={<WifiHighIcon size={22} weight="fill" />}
            label="En Stock"
            value={inStockCount}
            tone="success"
          />
          <MetricCard
            icon={<PackageIcon size={22} weight="fill" />}
            label="Agotados"
            value={outOfStockCount}
            tone="danger"
          />
          <MetricCard
            icon={<PackageIcon size={22} weight="fill" />}
            label="Valor Inventario"
            value={formatCurrency(totalValue)}
            tone="info"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex-1">
                <MagnifyingGlassIcon
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU o codigo..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <CategoryFilter
                  categories={catalogCategories}
                  selectedCategoryId={selectedCategory}
                  isOpen={isCategoryOpen}
                  onOpenChange={setIsCategoryOpen}
                  onCategoryChange={(categoryId) => {
                    setSelectedCategory(categoryId);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <Link
              href="/catalogo/productos/crear"
              className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
            >
              <PlusIcon size={18} weight="bold" />
              Nuevo Producto
            </Link>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <ColorFilter
              colors={catalogColors}
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
              sizes={catalogSizes}
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
          {productsError ? (
            <EmptyProducts message={productsError} />
          ) : isLoadingProducts ? (
            <ProductGridSkeleton />
          ) : catalogProducts.length === 0 ? (
            <EmptyProducts message="Intenta con otros filtros de busqueda" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {catalogProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onDelete={setDeleteProduct}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {catalogProducts.length} de {totalProducts} productos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) => Math.max(1, currentPage - 1))
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isLoadingProducts || productsMeta.page <= 1}
            >
              Anterior
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-2 text-xs font-circular-bold text-white">
              {productsMeta.page}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(productsMeta.totalPages, currentPage + 1),
                )
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={
                isLoadingProducts ||
                productsMeta.page >= productsMeta.totalPages
              }
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteProduct !== null}
        onClose={() => setDeleteProduct(null)}
        onConfirm={confirmDeleteProduct}
        title="Eliminar producto"
        description="Seguro que deseas eliminar este producto? Tambien se eliminaran sus variantes y sus imagenes."
        itemName={deleteProduct?.name}
      />
    </DashboardShell>
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
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[220px] animate-pulse rounded-[12px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
        >
          <div className="h-28 rounded-xl bg-[var(--color-input-bg)]" />
          <div className="mt-4 h-4 w-3/4 rounded bg-[var(--color-input-bg)]" />
          <div className="mt-2 h-3 w-1/2 rounded bg-[var(--color-input-bg)]" />
          <div className="mt-8 flex justify-between">
            <div className="h-4 w-14 rounded bg-[var(--color-input-bg)]" />
            <div className="h-7 w-12 rounded-full bg-[var(--color-input-bg)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProducts({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] py-16 text-center">
      <Image
        src="/img/productos-vacio.png"
        width={256}
        height={256}
        alt="No hay productos"
        className="h-auto w-[min(34%,70px)] max-h-[18dvh] object-contain opacity-90 sm:w-[min(38%,90px)] md:w-[min(42%,110px)] md:max-h-[24dvh] lg:w-[min(46%,120px)] lg:max-h-[26dvh] xl:w-[min(48%,130px)] xl:max-h-[28dvh]"
      />
      <p className="mt-3 text-sm font-black text-[var(--color-text)]">
        No hay productos
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
        {message}
      </p>
    </div>
  );
}

function toProductCatalogItem(product: ProductResponse): ProductCatalogItem {
  const firstVariant = product.variantes[0];
  const colors =
    product.tipo === "normal"
      ? []
      : product.colores.map((productColor) => {
          const colorVariants = product.variantes.filter(
            (variant) => variant.color.id === productColor.color.id,
          );
          const firstColorVariant = colorVariants[0];
          const colorStock = colorVariants.reduce((variantSum, variant) => {
            return (
              variantSum +
              (variant.stockSucursal ??
                variant.stockTotal ??
                variant.inventarios.reduce(
                  (stockSum, inventory) => stockSum + inventory.stockActual,
                  0,
                ))
            );
          }, 0);
          const colorMinPrice = colorVariants.reduce<number | null>(
            (minValue, variant) => {
              const price = Number(variant.precioVenta);

              if (!Number.isFinite(price)) {
                return minValue;
              }

              return minValue === null ? price : Math.min(minValue, price);
            },
            null,
          );
          const image = getColorImage(productColor.imagenes);
          const sizes = colorVariants.map((variant) => ({
            id: variant.talla.id,
            name: variant.talla.nombre,
            stock:
              variant.stockSucursal ??
              variant.stockTotal ??
              variant.inventarios.reduce(
                (stockSum, inventory) => stockSum + inventory.stockActual,
                0,
              ),
            price: formatCurrency(Number(variant.precioVenta)),
            sku: variant.sku ?? variant.codigoBarras ?? `PROD-${product.id}`,
          }));

          return {
            id: productColor.color.id,
            name: productColor.color.nombre,
            hex: productColor.color.hex,
            image,
            stock: colorStock,
            price: formatCurrency(colorMinPrice ?? 0),
            sku:
              firstColorVariant?.sku ??
              firstColorVariant?.codigoBarras ??
              `PROD-${product.id}`,
            size: firstColorVariant?.talla.nombre ?? "-",
            sizes,
          };
        });
  const principalImage =
    colors.find((color) => color.image)?.image ??
    getColorImage(
      product.colores.flatMap((productColor) => productColor.imagenes),
    );
  const firstColor = product.colores[0]?.color ?? firstVariant?.color;
  const stock =
    product.stockSucursal ??
    product.stockTotal ??
    product.variantes.reduce((variantSum, variant) => {
      return (
        variantSum +
        variant.inventarios.reduce(
          (stockSum, inventory) => stockSum + inventory.stockActual,
          0,
        )
      );
    }, 0);
  const minPrice = product.variantes.reduce<number | null>(
    (minValue, variant) => {
      const price = Number(variant.precioVenta);

      if (!Number.isFinite(price)) {
        return minValue;
      }

      return minValue === null ? price : Math.min(minValue, price);
    },
    null,
  );

  return {
    id: product.id,
    publicId: product.publicId,
    name: product.nombre,
    tipo: product.tipo,
    sku:
      firstVariant?.sku ?? firstVariant?.codigoBarras ?? `PROD-${product.id}`,
    price: formatCurrency(minPrice ?? 0),
    stock,
    image: principalImage,
    colorHex: firstColor?.hex ?? "#94A3B8",
    size: firstVariant?.talla.nombre ?? "-",
    colors,
  };
}

function getColorImage(images: ProductResponse["colores"][number]["imagenes"]) {
  const image = images.find((item) => item.esPrincipal) ?? images[0];

  return image?.urlThumbnail ?? image?.urlWebp ?? image?.urlOriginal ?? null;
}

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function mergeById<T extends { id: string }>(
  primaryItems: T[],
  secondaryItems: T[],
) {
  const itemsById = new Map<string, T>();

  [...primaryItems, ...secondaryItems].forEach((item) => {
    itemsById.set(item.id, item);
  });

  return Array.from(itemsById.values());
}

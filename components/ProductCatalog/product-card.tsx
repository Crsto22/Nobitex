"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  PackageIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

export type ProductCatalogItem = {
  id: string;
  publicId: string;
  name: string;
  tipo: "normal" | "variantes";
  sku: string;
  price: string;
  stock: number;
  image: string | null;
  colorHex: string;
  size: string;
  colors: ProductCatalogColor[];
};

export type ProductCatalogColor = {
  id: string;
  name: string;
  hex: string;
  image: string | null;
  stock: number;
  price: string;
  sku: string;
  size: string;
  sizes: ProductCatalogSize[];
};

export type ProductCatalogSize = {
  id: string;
  name: string;
  stock: number;
  price: string;
  sku: string;
};

const productPlaceholderImage = "/Logo/Nuvex.png";

export function ProductCard({
  product,
  onDelete,
}: {
  product: ProductCatalogItem;
  onDelete?: (product: ProductCatalogItem) => void;
}) {
  const router = useRouter();
  const [selectedColorId, setSelectedColorId] = useState(
    product.colors[0]?.id ?? "",
  );
  const [selectedSizeIdByColor, setSelectedSizeIdByColor] = useState<
    Record<string, string>
  >({});
  const selectedColor = useMemo(() => {
    return (
      product.colors.find((color) => color.id === selectedColorId) ??
      product.colors[0] ?? {
        id: product.id,
        name: product.name,
        hex: product.colorHex,
        image: product.image,
        stock: product.stock,
        price: product.price,
        sku: product.sku,
        size: product.size,
        sizes: [],
      }
    );
  }, [product, selectedColorId]);
  const selectedSizeId =
    selectedSizeIdByColor[selectedColor.id] ?? selectedColor.sizes[0]?.id ?? "";
  const selectedSize =
    selectedColor.sizes.find((size) => size.id === selectedSizeId) ??
    selectedColor.sizes[0] ??
    null;
  const displayStock = selectedSize?.stock ?? selectedColor.stock;
  const displaySku = selectedSize?.sku ?? selectedColor.sku;
  const displayPrice = selectedSize?.price ?? selectedColor.price;
  const displaySize = selectedSize?.name ?? selectedColor.size;
  const isUnavailable = displayStock <= 0;

  return (
    <div
      className={cn(
        "group relative flex min-h-[220px] flex-col rounded-[12px] bg-[var(--color-card)] p-3 text-left shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors duration-200 hover:-translate-y-0.5 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]",
        isUnavailable && "opacity-60",
      )}
    >
      {isUnavailable ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[12px] bg-black/10">
          <span className="rounded-lg bg-[#ef4444] px-3 py-1 text-xs font-circular-bold text-white">
            Agotado
          </span>
        </div>
      ) : null}

      <div className="relative flex h-28 items-center justify-center">
        <div className="absolute top-1 right-1 z-20 flex gap-1">
          <button
            type="button"
            onClick={() => router.push(`/catalogo/productos/crear?id=${product.publicId}`)}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-card)]/80 text-[var(--color-text)] shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--color-primary)] hover:text-white"
            aria-label={`Editar ${product.name}`}
          >
            <PencilSimpleIcon size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(product)}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-card)]/80 text-[#ef4444] shadow-sm backdrop-blur-sm transition-colors hover:bg-[#ef4444] hover:text-white"
            aria-label={`Eliminar ${product.name}`}
          >
            <TrashIcon size={13} weight="bold" />
          </button>
        </div>
        {selectedColor.image ? (
          <Image
            src={selectedColor.image}
            alt={`${product.name} ${selectedColor.name}`}
            width={112}
            height={112}
            unoptimized
            className="h-full  rounded-xl object-contain drop-shadow-[0_10px_12px_rgba(31,36,42,0.16)]"
          />
        ) : (
          <Image
            src={productPlaceholderImage}
            width={96}
            height={96}
            alt="Producto sin imagen"
            className="h-20 w-20 object-contain grayscale opacity-35"
          />
        )}
        {product.tipo === "variantes" ? <div
          className="absolute top-0 left-0 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-circular-bold text-white"
          style={{ backgroundColor: selectedColor.hex }}
          title={displaySize}
        >
          <span className="max-w-10 truncate">{displaySize}</span>
        </div> : null}
      </div>

      <div className="relative z-30 mt-2 flex items-center justify-between gap-2">
        {product.colors.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {product.colors.map((color) => {
              const isSelected = selectedColor.id === color.id;

              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColorId(color.id)}
                  className={cn(
                    "h-5 w-5 rounded-full border border-white shadow-sm ring-2 ring-offset-1 ring-offset-[var(--color-card)] transition-colors hover:scale-110",
                    isSelected ? "scale-110" : "ring-transparent",
                  )}
                  style={{
                    backgroundColor: color.hex,
                    "--tw-ring-color": isSelected ? color.hex : "transparent",
                  } as React.CSSProperties}
                  title={`${color.name} · Stock ${color.stock}`}
                  aria-label={`Ver color ${color.name}`}
                />
              );
            })}
          </div>
        ) : null}

        {selectedColor.sizes.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {selectedColor.sizes.map((size) => {
              const isSelected = selectedSize?.id === size.id;

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() =>
                    setSelectedSizeIdByColor((currentValue) => ({
                      ...currentValue,
                      [selectedColor.id]: size.id,
                    }))
                  }
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-circular-bold transition-colors font-circular-regular",
                    isSelected
                      ? "bg-[var(--color-primary)] text-white"
                      : size.stock > 0
                        ? "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                        : "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/15",
                  )}
                  title={`${size.name} · Stock ${size.stock}`}
                >
                  {size.name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <p className="mt-4 line-clamp-2 text-sm font-black text-[var(--color-text)]">
        {product.name}
      </p>
      <p className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)] font-circular-regular">
        {displaySku}
      </p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span className="truncate text-sm font-circular-bold text-[var(--color-muted-foreground)]">
          {displayPrice}
        </span>
        <span
          className={cn(
            "font-sora-extrabold flex h-7 items-center gap-1 rounded-full px-2 text-[15px] text-white",
            displayStock >= 3 ? "bg-[var(--color-sidebar-active)]" : "bg-[#ef4444]",
          )}
        >
          <PackageIcon size={14} weight="bold" />
          {displayStock}
        </span>
      </div>
    </div>
  );
}

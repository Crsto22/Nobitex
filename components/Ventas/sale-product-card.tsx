"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { PackageIcon } from "@phosphor-icons/react/ssr";

import type { SaleProduct, SaleProductVariant } from "@/lib/api/sales";
import { cn } from "@/lib/utils";

const placeholderImage = "/Logo/Norvitex.png";

type SaleProductCardProps = {
  product: SaleProduct;
  cartQuantities: Record<string, number>;
  onAdd: (variant: SaleProductVariant) => void;
};

export function hasAvailableSaleProductStock(
  product: SaleProduct,
  cartQuantities: Record<string, number>,
) {
  return product.variantes.some(
    (variant) =>
      (variant.stockSucursal ?? variant.stockTotal) -
        (cartQuantities[variant.varianteId] ?? 0) >
      0,
  );
}

function imageUrl(variant?: SaleProductVariant) {
  return (
    variant?.imagen?.urlThumbnail ??
    variant?.imagen?.urlWebp ??
    variant?.imagen?.urlOriginal ??
    null
  );
}

export function SaleProductCard({
  product,
  cartQuantities,
  onAdd,
}: SaleProductCardProps) {
  const colors = useMemo(
    () =>
      Array.from(
        Map.groupBy(product.variantes, (variant) => variant.color.id),
        ([id, variants]) => ({
          id,
          color: variants[0].color,
          variants,
          stock: variants.reduce(
            (total, variant) =>
              total +
              Math.max(
                0,
                (variant.stockSucursal ?? variant.stockTotal) -
                  (cartQuantities[variant.varianteId] ?? 0),
              ),
            0,
          ),
        }),
      ),
    [cartQuantities, product.variantes],
  );
  const firstColor = colors.find((color) => color.stock > 0) ?? colors[0];
  const [colorId, setColorId] = useState(firstColor?.id ?? "");
  const selectedColor =
    colors.find((color) => color.id === colorId) ?? firstColor;
  const firstAvailableVariant =
    selectedColor?.variants.find(
      (variant) =>
        (variant.stockSucursal ?? variant.stockTotal) -
          (cartQuantities[variant.varianteId] ?? 0) >
        0,
    ) ?? selectedColor?.variants[0];
  const [selectedByColor, setSelectedByColor] = useState<
    Record<string, string>
  >({});
  const selectedVariant =
    selectedColor?.variants.find(
      (variant) =>
        variant.varianteId === selectedByColor[selectedColor.id] &&
        (variant.stockSucursal ?? variant.stockTotal) -
          (cartQuantities[variant.varianteId] ?? 0) >
          0,
    ) ?? firstAvailableVariant;
  const stock = selectedVariant
    ? Math.max(
        0,
        (selectedVariant.stockSucursal ?? selectedVariant.stockTotal) -
          (cartQuantities[selectedVariant.varianteId] ?? 0),
      )
    : 0;
  const image = imageUrl(selectedVariant) ?? imageUrl(product.variantes[0]);
  const isNormal = product.tipo === "normal";
  const productStock = colors.reduce((total, color) => total + color.stock, 0);

  if (!hasAvailableSaleProductStock(product, cartQuantities)) return null;

  const addSelected = () => {
    if (selectedVariant && stock > 0) onAdd(selectedVariant);
  };

  return (
    <article
      role="button"
      tabIndex={productStock > 0 ? 0 : -1}
      onClick={addSelected}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          addSelected();
        }
      }}
      className={cn(
        "group relative flex min-h-[220px] cursor-pointer flex-col rounded-[12px] bg-[var(--color-card)] p-3 text-left shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]",
        productStock <= 0 && "cursor-not-allowed opacity-60",
      )}
    >
      {productStock <= 0 ? (
        <span className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-lg bg-[#ef4444] px-3 py-1 text-xs font-circular-bold text-white">
          Agotado
        </span>
      ) : null}

      <div className="relative flex h-28 items-center justify-center">
        {image ? (
          <Image
            src={image}
            alt={product.nombre}
            width={112}
            height={112}
            unoptimized
            className="h-full w-full rounded-xl object-contain drop-shadow-[0_10px_12px_rgba(31,36,42,0.16)]"
          />
        ) : (
          <Image
            src={placeholderImage}
            width={96}
            height={96}
            alt="Producto sin imagen"
            className="h-20 w-20 object-contain grayscale opacity-35"
          />
        )}
        {!isNormal && selectedVariant ? (
          <span
            className="absolute left-0 top-0 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-circular-bold text-white"
            style={{ backgroundColor: selectedVariant.color.hex }}
          >
            {selectedVariant.talla.nombre}
          </span>
        ) : null}
      </div>

      {!isNormal ? (
        <div className="relative z-10 mt-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {colors.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setColorId(item.id);
                }}
                className={cn(
                  "h-5 w-5 cursor-pointer rounded-full border border-white shadow-sm ring-2 ring-offset-1 ring-offset-[var(--color-card)] transition-transform hover:scale-110",
                  selectedColor?.id === item.id
                    ? "scale-110"
                    : "ring-transparent",
                  item.stock <= 0 && "opacity-40",
                )}
                style={
                  {
                    backgroundColor: item.color.hex,
                    "--tw-ring-color":
                      selectedColor?.id === item.id
                        ? item.color.hex
                        : "transparent",
                  } as React.CSSProperties
                }
                title={`${item.color.nombre} · Stock ${item.stock}`}
                aria-label={`Seleccionar color ${item.color.nombre}`}
              />
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap justify-end gap-1">
            {selectedColor?.variants.map((variant) => {
              const remaining = Math.max(
                0,
                (variant.stockSucursal ?? variant.stockTotal) -
                  (cartQuantities[variant.varianteId] ?? 0),
              );
              const selected =
                variant.varianteId === selectedVariant?.varianteId;

              return (
                <button
                  key={variant.varianteId}
                  type="button"
                  disabled={remaining <= 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedByColor((current) => ({
                      ...current,
                      [selectedColor.id]: variant.varianteId,
                    }));
                  }}
                  className={cn(
                    "flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-full bg-[var(--color-input-bg)] px-2 text-xs font-circular-bold text-[var(--color-text)] transition-colors",
                    selected && "bg-[var(--color-primary)] text-white",
                    remaining <= 0 &&
                      "cursor-not-allowed bg-[#ef4444]/10 text-[#ef4444] opacity-50",
                  )}
                  title={`${variant.talla.nombre} · Stock ${remaining}`}
                >
                  {variant.talla.nombre}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="mt-4 line-clamp-2 text-sm font-black text-[var(--color-text)]">
        {product.nombre}
      </p>
      <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
        {selectedVariant?.sku ?? selectedVariant?.codigoBarras ?? "Sin codigo"}
      </p>
      {!isNormal && selectedVariant ? (
        <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] font-circular-regular uppercase text-[var(--color-muted-foreground)]">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selectedVariant.color.hex }}
          />
          {selectedVariant.color.nombre}
        </p>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span className="truncate text-sm font-circular-bold text-[var(--color-muted-foreground)]">
          S/{Number(selectedVariant?.precioVenta ?? 0).toFixed(2)}
        </span>
        <span
          className={cn(
            "font-sora-extrabold flex h-7 items-center gap-1 rounded-full px-2 text-[15px] text-white",
            stock >= 3 ? "bg-[var(--color-sidebar-active)]" : "bg-[#ef4444]",
          )}
        >
          <PackageIcon size={14} weight="bold" />
          {stock}
        </span>
      </div>
    </article>
  );
}

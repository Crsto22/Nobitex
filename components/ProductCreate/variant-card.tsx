"use client";

import Image from "next/image";
import { CaretRightIcon, PackageIcon } from "@phosphor-icons/react/ssr";

import type { Branch } from "@/lib/api/branches";
import { cn } from "@/lib/utils";
import type { ProductVariant, VariantMotionState } from "./types";

type VariantCardProps = {
  variant: ProductVariant;
  motionState: VariantMotionState;
  imagePreview: string;
  placeholderImage: string;
  branches: Branch[];
  shouldCollapseAutoCodes: boolean;
  autoSku: boolean;
  autoBarcode: boolean;
  simple?: boolean;
  initialValues?: {
    sku: string | null;
    codigoBarras: string | null;
    precioCompra: string | null;
    precioVenta: string;
    precioMayorista: string | null;
    stocks: Record<string, number>;
  };
};

export function VariantCard({
  variant,
  motionState,
  imagePreview,
  placeholderImage,
  branches,
  shouldCollapseAutoCodes,
  autoSku,
  autoBarcode,
  simple = false,
  initialValues,
}: VariantCardProps) {
  return (
    <div
      className={cn(
        "rounded-[18px] bg-[#F4F4F4] p-3 shadow-sm transition-colors duration-300 ease-out will-change-transform motion-reduce:transition-none dark:bg-[var(--color-input-bg)]",
        motionState === "enter" && "translate-y-3 scale-[0.98] opacity-0",
        motionState === "visible" && "translate-y-0 scale-100 opacity-100",
        motionState === "exit" && "-translate-y-2 scale-[0.97] opacity-0",
      )}
    >
      <div className="mb-3 flex min-w-0 items-center gap-2">
        {simple ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
            <PackageIcon size={16} weight="fill" />
          </span>
        ) : (
          <>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs font-black text-white">
              {variant.size.nombre}
            </span>
            <span
              className="h-8 w-8 shrink-0 rounded-full"
              style={{ backgroundColor: variant.color.hex }}
              aria-label={variant.color.label}
            />
          </>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-[var(--color-text)] dark:text-[var(--color-input-text)]">
            {simple ? "Producto normal" : `Variante ${variant.size.nombre}`}
          </p>
          {!simple ? (
            <p className="truncate text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
              {variant.color.label}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div className="relative flex aspect-square min-h-24 items-center justify-center overflow-hidden rounded-[16px] bg-white dark:bg-[var(--color-background)]">
          {imagePreview ? (
            <Image
              src={imagePreview}
              alt={
                simple
                  ? "Imagen del producto"
                  : `Producto variante ${variant.size.nombre} ${variant.color.label}`
              }
              width={320}
              height={320}
              unoptimized
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <Image
              src={placeholderImage}
              alt="Producto sin imagen"
              width={80}
              height={80}
              className="h-20 w-20 object-contain grayscale opacity-35"
            />
          )}
        </div>

        <div className="min-w-0">
          {shouldCollapseAutoCodes ? (
            <details className="group rounded-[14px] bg-white px-3 py-2 dark:bg-[var(--color-background)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-circular-bold text-[var(--color-muted-foreground)] font-circular-regular marker:hidden">
                SKU y codigo automaticos
                <CaretRightIcon
                  size={14}
                  weight="bold"
                  className="shrink-0 transition-transform group-open:rotate-90"
                />
              </summary>
              <AutoCodeInputs
                variantId={variant.id}
                skuDisabled={autoSku}
                barcodeDisabled={autoBarcode}
                sku={initialValues?.sku}
                codigoBarras={initialValues?.codigoBarras}
              />
            </details>
          ) : (
            <AutoCodeInputs
              variantId={variant.id}
              skuDisabled={autoSku}
              barcodeDisabled={autoBarcode}
              sku={initialValues?.sku}
              codigoBarras={initialValues?.codigoBarras}
            />
          )}

          {branches.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {branches.map((branch) => (
                <label key={`${variant.id}-${branch.id}`} className="flex min-w-0 flex-col gap-1">
                  <span className="font-circular-regular truncate text-[10px] font-circular-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]">
                    Stock {branch.nombre}
                  </span>
                  <div className="relative min-w-0">
                    <PackageIcon
                      size={15}
                      weight="fill"
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-primary)]"
                    />
                    <input
                      name={`stock-${variant.id}-${branch.id}`}
                      type="number"
                      min="0"
                      placeholder="0"
                      defaultValue={initialValues?.stocks[branch.id] ?? 0}
                      className="font-circular-regular h-9 w-full min-w-0 rounded-[12px] bg-white pr-3 pl-8 text-base font-circular-bold leading-none text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]"
                    />
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-[12px] bg-white px-3 py-2 text-[11px] font-circular-regular text-[var(--color-muted-foreground)] dark:bg-[var(--color-background)]">
              Crea una sucursal activa para asignar stock.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <PriceInput
          name={`precioCompra-${variant.id}`}
          label="Compra"
          initialValue={initialValues?.precioCompra}
        />
        <PriceInput
          name={`precioVenta-${variant.id}`}
          label="Venta"
          required
          initialValue={initialValues?.precioVenta}
        />
        <PriceInput
          name={`precioMayorista-${variant.id}`}
          label="Mayor"
          initialValue={initialValues?.precioMayorista}
        />
      </div>
    </div>
  );
}

function AutoCodeInputs({
  variantId,
  skuDisabled,
  barcodeDisabled,
  sku,
  codigoBarras,
}: {
  variantId: string;
  skuDisabled?: boolean;
  barcodeDisabled?: boolean;
  sku?: string | null;
  codigoBarras?: string | null;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-circular-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] font-circular-regular">
          SKU
        </span>
        <input
          name={`sku-${variantId}`}
          type="text"
          disabled={skuDisabled}
          defaultValue={sku ?? undefined}
          placeholder="Automatico"
          className="h-9 rounded-[12px] bg-[#F4F4F4] px-3 text-xs font-circular-bold text-[var(--color-muted-foreground)] outline-none disabled:cursor-not-allowed font-circular-regular dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-circular-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] font-circular-regular">
          Cod. barras
        </span>
        <input
          name={`codigoBarras-${variantId}`}
          type="text"
          disabled={barcodeDisabled}
          defaultValue={codigoBarras ?? undefined}
          placeholder="Automatico"
          className="h-9 rounded-[12px] bg-[#F4F4F4] px-3 text-xs font-circular-bold text-[var(--color-muted-foreground)] outline-none disabled:cursor-not-allowed font-circular-regular dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70"
        />
      </label>
    </div>
  );
}

function PriceInput({
  name,
  label,
  required,
  initialValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  initialValue?: string | null;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-circular-regular text-[10px] font-circular-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <div className="relative min-w-0">
        <span className="font-circular-regular pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-circular-bold leading-none text-[var(--color-input-text)]">
          S/
        </span>
        <input
          name={name}
          type="number"
          min="0"
          step="0.01"
          required={required}
          defaultValue={initialValue ?? undefined}
          placeholder="0.00"
          className="font-circular-regular h-9 w-full min-w-0 rounded-[12px] bg-white pr-2 pl-8 text-base font-circular-bold leading-none text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]"
        />
      </div>
    </label>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { CaretRightIcon, PackageIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";

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
  allowPriceEdit?: boolean;
  defaultPriceEditorOpen?: boolean;
  isUnavailable?: boolean;
  onToggleUnavailable?: () => void;
  initialValues?: VariantInitialValues;
};

type VariantInitialValues = {
  sku: string | null;
  codigoBarras: string | null;
  precioCompra: string | null;
  precioVenta: string;
  precioMayorista: string | null;
  stocks: Record<string, number>;
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
  allowPriceEdit = false,
  defaultPriceEditorOpen = false,
  isUnavailable = false,
  onToggleUnavailable,
  initialValues,
}: VariantCardProps) {
  const [isEditingPrices, setIsEditingPrices] = useState(
    Boolean(defaultPriceEditorOpen),
  );

  return (
    <div
      className={cn(
        "relative rounded-[18px] bg-[#F4F4F4] p-3 shadow-sm transition-colors duration-300 ease-out will-change-transform motion-reduce:transition-none dark:bg-[var(--color-input-bg)]",
        motionState === "enter" && "translate-y-3 scale-[0.98] opacity-0",
        motionState === "visible" && "translate-y-0 scale-100 opacity-100",
        motionState === "exit" && "-translate-y-2 scale-[0.97] opacity-0",
        isUnavailable &&
          "border-2 border-dashed border-[#3b82f6]/60 bg-white dark:bg-[var(--color-background)]",
      )}
    >
      <input
        type="hidden"
        name={`disponible-${variant.id}`}
        value={isUnavailable ? "false" : "true"}
      />
      <div className={cn(isUnavailable && "hidden")}>
      <div
        className={cn(
          "mb-3 flex min-w-0 items-center gap-2",
          simple && "hidden",
        )}
      >
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
        {allowPriceEdit ? (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleUnavailable}
              aria-label={
                isUnavailable
                  ? "Marcar como disponible"
                  : "Marcar como no disponible"
              }
              title={
                isUnavailable
                  ? "Marcar como disponible"
                  : "Marcar como no disponible"
              }
              aria-pressed={isUnavailable}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[12px] transition-colors",
                isUnavailable
                  ? "bg-[#ef4444] text-white"
                  : "bg-white text-[var(--color-muted-foreground)] hover:bg-[#ef4444]/10 hover:text-[#ef4444] dark:bg-[var(--color-background)]",
              )}
            >
              <ProhibitIcon size={15} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setIsEditingPrices((current) => !current)}
              className="h-8 shrink-0 rounded-[12px] bg-white px-3 text-xs font-circular-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)] dark:bg-[var(--color-background)]"
            >
              {isEditingPrices ? "Usar global" : "Editar precio"}
            </button>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-3",
          simple ? "grid-cols-1" : "grid-cols-[96px_minmax(0,1fr)]",
        )}
      >
        <div
          className={cn(
            "relative flex aspect-square min-h-24 items-center justify-center overflow-hidden rounded-[16px] bg-white dark:bg-[var(--color-background)]",
            simple && "hidden",
          )}
        >
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
                      defaultValue={initialValues?.stocks[branch.id] ?? undefined}
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

      {simple || isEditingPrices ? (
        <>
          {allowPriceEdit && isEditingPrices ? (
            <input
              type="hidden"
              name={`priceOverride-${variant.id}`}
              value="true"
            />
          ) : null}
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
        </>
      ) : null}
      </div>
      {isUnavailable ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <p className="px-4 text-center text-sm font-circular-bold text-[var(--color-text)]">
            Talla {variant.size.nombre} · {variant.color.label}
          </p>
          <button
            type="button"
            onClick={onToggleUnavailable}
            className="flex h-9 items-center justify-center rounded-[12px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white shadow-md transition-colors hover:opacity-90"
          >
            Activar
          </button>
        </div>
      ) : null}
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
          placeholder={skuDisabled ? "Automatico" : undefined}
          className={cn(
            "h-9 rounded-[12px] px-3 text-xs font-circular-bold outline-none font-circular-regular",
            skuDisabled
              ? "bg-[#F4F4F4] text-[var(--color-muted-foreground)] disabled:cursor-not-allowed dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70"
              : "bg-white text-[var(--color-input-text)] placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]",
          )}
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
          placeholder={barcodeDisabled ? "Automatico" : undefined}
          className={cn(
            "h-9 rounded-[12px] px-3 text-xs font-circular-bold outline-none font-circular-regular",
            barcodeDisabled
              ? "bg-[#F4F4F4] text-[var(--color-muted-foreground)] disabled:cursor-not-allowed dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70"
              : "bg-white text-[var(--color-input-text)] placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]",
          )}
        />
      </label>
    </div>
  );
}

export function PriceInput({
  name,
  label,
  required,
  initialValue,
  surface = "card",
}: {
  name: string;
  label: string;
  required?: boolean;
  initialValue?: string | null;
  surface?: "card" | "page";
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
          className={cn(
            "font-circular-regular h-9 w-full min-w-0 rounded-[12px] pr-2 pl-8 text-base font-circular-bold leading-none text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:text-[var(--color-input-text)]",
            surface === "page"
              ? "bg-[var(--color-input-bg)]"
              : "bg-white dark:bg-[var(--color-background)]",
          )}
        />
      </div>
    </label>
  );
}

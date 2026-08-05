"use client";

import Image from "next/image";
import {
  CaretRightIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import type { CatalogColor, ProductColorImage } from "./types";

type ProductColorImagesCarouselProps = {
  colors: CatalogColor[];
  colorImages: Record<string, ProductColorImage>;
  page: number;
  pageCount: number;
  visibleColors: CatalogColor[];
  showControls: boolean;
  simple?: boolean;
  onPageChange: (page: number) => void;
  onImageChange: (
    color: CatalogColor,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onImageRemove: (colorId: string) => void;
};

export function ProductColorImagesCarousel({
  colors,
  colorImages,
  page,
  pageCount,
  visibleColors,
  showControls,
  simple = false,
  onPageChange,
  onImageChange,
  onImageRemove,
}: ProductColorImagesCarouselProps) {
  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="block text-xs font-circular-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
          {simple ? "Imagen del producto" : "Imagenes por color"}
        </p>
        {showControls ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Ver imagenes anteriores"
            >
              <CaretRightIcon size={14} weight="bold" className="rotate-180" />
            </button>
            <span className="min-w-7 text-center text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
              {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
              disabled={page >= pageCount - 1}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Ver imagenes siguientes"
            >
              <CaretRightIcon size={14} weight="bold" />
            </button>
          </div>
        ) : null}
      </div>

      {colors.length > 0 ? (
        <div className="relative">
          <div
            key={page}
            className={
              simple
                ? "mx-auto grid w-full max-w-md grid-cols-1"
                : "grid grid-cols-4 gap-2"
            }
          >
            {visibleColors.map((color, index) => {
              const colorImage = colorImages[color.id];

              return (
                <div
                  key={`${page}-${color.id}`}
                  className="group color-image-card-motion relative"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <label
                    className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border border-[var(--color-border)]/70 bg-[var(--color-card)] px-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)] transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-input-bg)] dark:shadow-none"
                    aria-label={
                      simple
                        ? "Seleccionar imagen del producto"
                        : `Imagen para color ${color.label}`
                    }
                  >
                    {colorImage ? (
                      <Image
                        src={colorImage.preview}
                        alt={
                          simple
                            ? "Imagen del producto"
                            : `Imagen color ${color.label}`
                        }
                        width={320}
                        height={320}
                        unoptimized
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <>
                        <UploadSimpleIcon
                          size={simple ? 42 : 24}
                          weight="light"
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="mt-1.5 text-xs font-circular-bold text-[var(--color-text)]">
                          Subir imagen
                        </span>
                        {!simple ? (
                          <span className="mt-0.5 max-w-full truncate text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                            {color.label}
                          </span>
                        ) : null}
                      </>
                    )}
                    {!simple ? (
                      <span
                        className="absolute top-2 left-2 h-5 w-5 rounded-full shadow-[0_0_0_2px_#fff] dark:shadow-[0_0_0_2px_var(--color-card)]"
                        style={{ backgroundColor: color.hex }}
                      />
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => onImageChange(color, event)}
                      className="hidden"
                    />
                  </label>
                  {colorImage ? (
                    <button
                      type="button"
                      onClick={() => onImageRemove(color.id)}
                      className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ef4444] text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                      aria-label={`Quitar imagen de ${color.label}`}
                    >
                      <XIcon size={12} weight="bold" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--color-card)] px-4 py-6 text-center text-xs font-circular-regular text-[var(--color-muted-foreground)]">
          Selecciona un color para agregar su imagen.
        </div>
      )}
    </div>
  );
}

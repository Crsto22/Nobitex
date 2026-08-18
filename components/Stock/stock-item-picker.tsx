"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";
import { productsApi, type ProductResponse } from "@/lib/api/products";
import { cn } from "@/lib/utils";

export type SelectedStockItem = {
  productoVarianteId: string;
  label: string;
  sku: string | null;
  available: number;
  cantidad: number;
  costoUnitario?: number;
};

type Option = Omit<SelectedStockItem, "cantidad">;

export function StockItemPicker({
  sucursalId,
  items,
  onChange,
  enforceAvailable = false,
  showCostInput = false,
}: {
  sucursalId: string;
  items: SelectedStockItem[];
  onChange: (items: SelectedStockItem[]) => void;
  enforceAvailable?: boolean;
  showCostInput?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sucursalId) {
      return;
    }
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await productsApi.findAll({
          page: 1,
          limit: 50,
          sucursalId,
          search: search.trim() || undefined,
          status: "active",
        });
        setProducts(result.data);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search, sucursalId]);

  const options = useMemo<Option[]>(
    () =>
      products.flatMap((product) =>
        product.variantes
          .filter((variant) => variant.activo)
          .map((variant) => ({
            productoVarianteId: variant.id,
            label:
              product.tipo === "normal"
                ? product.nombre
                : [product.nombre, variant.color.nombre, variant.talla.nombre]
                    .filter(Boolean)
                    .join(" / "),
            sku: variant.sku,
            available:
              variant.inventarios.find(
                (inventory) => inventory.sucursal.id === sucursalId,
              )?.stockActual ?? 0,
          })),
      ),
    [products, sucursalId],
  );
  const selectedIds = new Set(items.map((item) => item.productoVarianteId));

  const add = (option: Option) => {
    if (selectedIds.has(option.productoVarianteId)) return;
    onChange([...items, { ...option, cantidad: 1 }]);
  };

  const setQuantity = (id: string, value: number) => {
    onChange(
      items.map((item) =>
        item.productoVarianteId === id
          ? {
              ...item,
              cantidad: Math.max(
                1,
                enforceAvailable ? Math.min(value, item.available) : value,
              ),
            }
          : item,
      ),
    );
  };

  const setCost = (id: string, value: number) => {
    onChange(
      items.map((item) =>
        item.productoVarianteId === id
          ? { ...item, costoUnitario: Math.max(0, value) }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <MagnifyingGlassIcon
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            sucursalId
              ? "Buscar producto, SKU o codigo"
              : "Selecciona una ubicacion"
          }
          disabled={!sucursalId}
          className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-60"
        />
      </div>

      {sucursalId && search.trim() ? (
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-[14px] bg-[var(--color-background)] p-2">
          {loading ? (
            <p className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">
              Buscando...
            </p>
          ) : options.length ? (
            options.map((option) => (
              <button
                key={option.productoVarianteId}
                type="button"
                onClick={() => add(option)}
                disabled={
                  selectedIds.has(option.productoVarianteId) ||
                  (enforceAvailable && option.available <= 0)
                }
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--color-card)] px-3 py-3 text-left transition hover:bg-[var(--color-button-hover)] disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-circular-bold text-[var(--color-text)]">
                    {option.label}
                  </span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {option.sku || "Sin SKU"} · Stock {option.available}
                  </span>
                </span>
                <PlusIcon
                  size={18}
                  weight="bold"
                  className="text-[var(--color-primary)]"
                />
              </button>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">
              No se encontraron productos
            </p>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.productoVarianteId}
            className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-background)] p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                {item.label}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {item.sku || "Sin SKU"} · Disponible {item.available}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showCostInput ? (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label="Costo unitario"
                  value={item.costoUnitario ?? ""}
                  onChange={(event) =>
                    setCost(
                      item.productoVarianteId,
                      Number(event.target.value) || 0,
                    )
                  }
                  placeholder="Costo"
                  className="h-9 w-24 rounded-xl bg-[var(--color-input-bg)] px-3 text-sm outline-none"
                />
              ) : null}
              <button
                type="button"
                onClick={() =>
                  setQuantity(item.productoVarianteId, item.cantidad - 1)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-input-bg)]"
                aria-label="Disminuir cantidad"
              >
                <MinusIcon size={15} weight="bold" />
              </button>
              <input
                type="number"
                min={1}
                aria-label="Cantidad"
                max={enforceAvailable ? item.available : undefined}
                value={item.cantidad}
                onChange={(event) =>
                  setQuantity(
                    item.productoVarianteId,
                    Number(event.target.value) || 1,
                  )
                }
                className="h-9 w-16 rounded-xl bg-[var(--color-input-bg)] text-center text-sm font-circular-bold outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setQuantity(item.productoVarianteId, item.cantidad + 1)
                }
                disabled={enforceAvailable && item.cantidad >= item.available}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-input-bg)] disabled:opacity-40"
                aria-label="Aumentar cantidad"
              >
                <PlusIcon size={15} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    items.filter(
                      (entry) =>
                        entry.productoVarianteId !== item.productoVarianteId,
                    ),
                  )
                }
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl bg-[#ef4444]/10 text-[#ef4444]",
                )}
                aria-label="Quitar producto"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))}
        {!items.length ? (
          <div className="rounded-[14px] bg-[var(--color-background)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            Agrega al menos un producto
          </div>
        ) : null}
      </div>
    </div>
  );
}

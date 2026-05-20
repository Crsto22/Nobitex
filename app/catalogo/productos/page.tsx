"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  CaretDownIcon,
  PackageIcon,
  PencilSimpleIcon,
  TrashIcon,
  PlusIcon,
  WifiHighIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import Link from "next/link";

const products = [
  {
    id: "PROD-001",
    name: "Polo rosado",
    price: "S/50.00",
    priceValue: 50.0,
    stock: 10,
    image: "https://png.pngtree.com/png-clipart/20240306/original/pngtree-pink-polo-t-shirt-png-image_14524870.png",
    badgeColor: "bg-[#ec4899]",
    size: "M",
    category: "polos",
    sku: "POL-ROS-001",
  },
  {
    id: "PROD-002",
    name: "Polo negro",
    price: "S/50.00",
    priceValue: 50.0,
    stock: 5,
    image: "https://static.vecteezy.com/system/resources/thumbnails/078/674/136/small/plain-black-polo-shirt-mockup-png.png",
    badgeColor: "bg-[#1f2937]",
    size: "L",
    category: "polos",
    sku: "POL-NEG-002",
  },
  {
    id: "PROD-003",
    name: "Camisa blanca",
    price: "S/65.00",
    priceValue: 65.0,
    stock: 12,
    image: null,
    badgeColor: "bg-[#e5e7eb]",
    size: "S",
    category: "camisas",
    sku: "CAM-BLA-003",
  },
  {
    id: "PROD-004",
    name: "Jeans azul",
    price: "S/80.00",
    priceValue: 80.0,
    stock: 8,
    image: null,
    badgeColor: "bg-[#3b82f6]",
    size: "M",
    category: "pantalones",
    sku: "JEA-AZU-004",
  },
  {
    id: "PROD-005",
    name: "Casaca negra",
    price: "S/120.00",
    priceValue: 120.0,
    stock: 3,
    image: null,
    badgeColor: "bg-[#1f2937]",
    size: "L",
    category: "casacas",
    sku: "CAS-NEG-005",
  },
  {
    id: "PROD-006",
    name: "Gorra roja",
    price: "S/25.00",
    priceValue: 25.0,
    stock: 15,
    image: null,
    badgeColor: "bg-[#ef4444]",
    size: "U",
    category: "accesorios",
    sku: "GOR-ROJ-006",
  },
  {
    id: "PROD-007",
    name: "Zapatos deportivos",
    price: "S/150.00",
    priceValue: 150.0,
    stock: 2,
    image: null,
    badgeColor: "bg-[#10b981]",
    size: "42",
    category: "calzado",
    sku: "ZAP-DEP-007",
  },
  {
    id: "PROD-008",
    name: "Chaleco gris",
    price: "S/45.00",
    priceValue: 45.0,
    stock: 0,
    image: null,
    badgeColor: "bg-[#6b7280]",
    size: "M",
    category: "casacas",
    sku: "CHA-GRI-008",
  },
  {
    id: "PROD-009",
    name: "Polo verde",
    price: "S/50.00",
    priceValue: 50.0,
    stock: 9,
    image: null,
    badgeColor: "bg-[#10b981]",
    size: "S",
    category: "polos",
    sku: "POL-VER-009",
  },
  {
    id: "PROD-010",
    name: "Blusa floral",
    price: "S/55.00",
    priceValue: 55.0,
    stock: 4,
    image: null,
    badgeColor: "bg-[#f59e0b]",
    size: "XS",
    category: "blusas",
    sku: "BLU-FLO-010",
  },
];

const productPlaceholderImage = "/Logo/ChatGPT Image 24 abr 2026, 19_10_40.png";

function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain drop-shadow-[0_10px_12px_rgba(31,36,42,0.16)]"
    />
  );
}

function ProductPlaceholderImage({ className }: { className?: string }) {
  return (
    <Image
      src={productPlaceholderImage}
      width={96}
      height={96}
      alt="Producto sin imagen"
      className={cn("object-contain brightness-0 opacity-25", className)}
    />
  );
}

export default function CatalogoProductosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const categories = [
    { label: "TODOS", value: "todos" },
    { label: "POLOS", value: "polos" },
    { label: "CAMISAS", value: "camisas" },
    { label: "PANTALONES", value: "pantalones" },
    { label: "CASACAS", value: "casacas" },
    { label: "ACCESORIOS", value: "accesorios" },
    { label: "CALZADO", value: "calzado" },
    { label: "BLUSAS", value: "blusas" },
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "todos" || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + p.priceValue * p.stock, 0);

  return (
    <DashboardShell headerTitle="Catálogo de Productos">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        {/* Stats */}
        <div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <PackageIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Productos
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {totalProducts}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <WifiHighIcon size={22} weight="fill" className="text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  En Stock
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {inStockCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef4444]/10">
                <PackageIcon size={22} weight="fill" className="text-[#ef4444]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Agotados
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {outOfStockCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <PackageIcon size={22} weight="fill" className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Valor Inventario
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  S/{totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <label className="relative flex-1">
              <MagnifyingGlassIcon
                size={18}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
              />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>

            <div className="relative w-[180px]">
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-medium text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                <span className="truncate">{categories.find((c) => c.value === selectedCategory)?.label || "TODOS"}</span>
                <CaretDownIcon size={16} className="shrink-0" />
              </button>
              {isCategoryOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-full min-w-[160px] rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                  {categories.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.value);
                        setIsCategoryOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                        selectedCategory === category.value
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                      )}
                    >
                      <span className="truncate">{category.label}</span>
                      {selectedCategory === category.value && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" className="shrink-0">
                          <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,0-11.32,11.32l56,56a24,24,0,0,0,33.94,0l128-128a8,8,0,0,0-11.32-11.32Z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link
            href="/catalogo/productos/crear"
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
          >
            <PlusIcon size={18} weight="bold" />
            Nuevo Producto
          </Link>
        </div>

        {/* Color & Size Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]">
              Todos
            </button>
            <div className="flex flex-wrap gap-2">
              <button className="h-6 w-6 rounded-full bg-[#ec4899] ring-2 ring-[#ec4899] ring-offset-1 ring-offset-[var(--color-background)]" />
              <button className="h-6 w-6 rounded-full bg-[#1f2937] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#1f2937]" />
              <button className="h-6 w-6 rounded-full bg-[#3b82f6] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#3b82f6]" />
              <button className="h-6 w-6 rounded-full bg-[#e5e7eb] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#e5e7eb]" />
              <button className="h-6 w-6 rounded-full bg-[#ef4444] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#ef4444]" />
              <button className="h-6 w-6 rounded-full bg-[#10b981] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#10b981]" />
              <button className="h-6 w-6 rounded-full bg-[#f59e0b] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#f59e0b]" />
              <button className="h-6 w-6 rounded-full bg-[#8b5cf6] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#8b5cf6]" />
              <button className="h-6 w-6 rounded-full bg-[#f97316] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#f97316]" />
              <button className="h-6 w-6 rounded-full bg-[#06b6d4] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#06b6d4]" />
              <button className="h-6 w-6 rounded-full bg-[#6366f1] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#6366f1]" />
              <button className="h-6 w-6 rounded-full bg-[#84cc16] ring-2 ring-transparent ring-offset-1 ring-offset-[var(--color-background)] transition-all hover:ring-[#84cc16]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]">
              Todos
            </button>
            <div className="flex gap-2">
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[10px] font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]">
                XS
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
                S
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[10px] font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]">
                M
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[10px] font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]">
                L
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Product Grid */}
        <div className="pb-2">
          {filteredProducts.length === 0 ? (
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
                Intenta con otros filtros de búsqueda
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredProducts.map((product) => {
                const isUnavailable = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className={cn(
                      "group relative flex min-h-[220px] flex-col rounded-[12px] bg-[var(--color-card)] p-3 text-left shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all duration-200 hover:-translate-y-0.5 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]",
                      isUnavailable && "opacity-60",
                    )}
                  >
                    {isUnavailable && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[12px] bg-black/10">
                        <span className="rounded-lg bg-[#ef4444] px-3 py-1 text-xs font-bold text-white">
                          Agotado
                        </span>
                      </div>
                    )}
                    <div className="relative flex h-28 items-center justify-center">
                      {product.image ? (
                        <ProductImage src={product.image} alt={product.name} />
                      ) : (
                        <ProductPlaceholderImage className="h-20 w-20" />
                      )}
                      <div
                        className={cn(
                          "absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white",
                          product.badgeColor,
                        )}
                      >
                        {product.size}
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-black text-[var(--color-text)]">
                      {product.name}
                    </p>
                    <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                      {product.sku}
                    </p>
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <span className="text-sm font-bold text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {product.price}
                      </span>
                      <span
                        className={cn(
                          "flex h-7 items-center gap-1 rounded-full px-2 text-sm font-bold text-white [font-family:var(--font-circular-x-sub)]",
                          product.stock >= 3
                            ? "bg-[var(--color-sidebar-active)]"
                            : "bg-[#ef4444]",
                        )}
                      >
                        <PackageIcon size={14} weight="bold" />
                        {product.stock}
                      </span>
                    </div>

                    {/* Actions overlay on hover */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[12px] bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--color-text)] transition-colors hover:bg-[var(--color-primary)] hover:text-white"
                          aria-label={`Editar ${product.name}`}
                        >
                          <PencilSimpleIcon size={18} weight="bold" />
                        </button>
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#ef4444] transition-colors hover:bg-[#ef4444] hover:text-white"
                          aria-label={`Eliminar ${product.name}`}
                        >
                          <TrashIcon size={18} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filteredProducts.length} de {totalProducts} productos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled
            >
              Anterior
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-bold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

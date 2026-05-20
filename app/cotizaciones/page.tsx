"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  CaretDownIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartSimpleIcon,
  TicketIcon,
  TrashIcon,
  UserCircleIcon,
  NotepadIcon,
  CheckIcon,
  BuildingsIcon,
  WifiHighIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

const products = [
  {
    name: "Polo rosado",
    price: "S/50.00",
    stock: 10,
    image:
      "https://png.pngtree.com/png-clipart/20240306/original/pngtree-pink-polo-t-shirt-png-image_14524870.png",
    badgeColor: "bg-[#ec4899]",
    size: "M",
  },
  {
    name: "Polo negro",
    price: "S/50.00",
    stock: 5,
    image:
      "https://static.vecteezy.com/system/resources/thumbnails/078/674/136/small/plain-black-polo-shirt-mockup-png.png",
    badgeColor: "bg-[#1f2937]",
    size: "L",
  },
  {
    name: "Camisa blanca",
    price: "S/65.00",
    stock: 12,
    image: null,
    badgeColor: "bg-[#e5e7eb]",
    size: "S",
  },
  {
    name: "Jeans azul",
    price: "S/80.00",
    stock: 8,
    image: null,
    badgeColor: "bg-[#3b82f6]",
    size: "M",
  },
  {
    name: "Casaca negra",
    price: "S/120.00",
    stock: 3,
    image: null,
    badgeColor: "bg-[#1f2937]",
    size: "L",
  },
  {
    name: "Gorra roja",
    price: "S/25.00",
    stock: 15,
    image: null,
    badgeColor: "bg-[#ef4444]",
    size: "U",
  },
  {
    name: "Zapatos deportivos",
    price: "S/150.00",
    stock: 2,
    image: null,
    badgeColor: "bg-[#10b981]",
    size: "42",
  },
  {
    name: "Chaleco gris",
    price: "S/45.00",
    stock: 0,
    image: null,
    badgeColor: "bg-[#6b7280]",
    size: "M",
  },
  {
    name: "Polo verde",
    price: "S/50.00",
    stock: 9,
    image: null,
    badgeColor: "bg-[#10b981]",
    size: "S",
  },
  {
    name: "Blusa floral",
    price: "S/55.00",
    stock: 4,
    image: null,
    badgeColor: "bg-[#f59e0b]",
    size: "XS",
  },
] as const;

const branches = [
  { label: "Sucursal Centro", value: "centro" },
  { label: "Sucursal Norte", value: "norte" },
  { label: "Sucursal Sur", value: "sur" },
];

const productPlaceholderImage =
  "/Logo/ChatGPT Image 24 abr 2026, 19_10_40.png";

type Product = (typeof products)[number];

type CartItem = {
  name: string;
  price: string;
  priceValue: number;
  image: string | null;
  quantity: number;
  stock: number;
  badgeColor: string;
  size: string;
};

function parsePrice(price: string) {
  const amount = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPrice(amount: number) {
  return `S/${amount.toFixed(2)}`;
}

function formatCurrentTime() {
  const date = new Date();
  const hours = date.getHours();
  const displayHours = hours % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";

  return `${displayHours}:${minutes}:${seconds} ${period}`;
}

function getServerTimeSnapshot() {
  return "--:--:-- --";
}

function subscribeToCurrentTime(onStoreChange: () => void) {
  const timeoutId = window.setTimeout(onStoreChange, 0);
  const intervalId = window.setInterval(onStoreChange, 1000);

  return () => {
    window.clearTimeout(timeoutId);
    window.clearInterval(intervalId);
  };
}

function useCurrentTime() {
  return useSyncExternalStore(
    subscribeToCurrentTime,
    formatCurrentTime,
    getServerTimeSnapshot,
  );
}

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

function DropdownButton({
  label,
  options,
  selected,
  onSelect,
  icon,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = options.find((o) => o.value === selected);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-left transition-colors hover:bg-[var(--color-button-hover)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0 text-[var(--color-muted-foreground)]">{icon}</span>}
          <span className="truncate text-sm font-semibold text-[var(--color-text)]">
            {currentOption?.label || label}
          </span>
        </span>
        <CaretDownIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                selected === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              {option.label}
              {selected === option.value && <CheckIcon size={16} weight="bold" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CotizacionesPage() {
  const [selectedBranch, setSelectedBranch] = useState("centro");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const currentTime = useCurrentTime();
  const [timeValue, timePeriod] = currentTime.split(" ");

  const subtotal = cartItems.reduce(
    (total, item) => total + item.priceValue * item.quantity,
    0,
  );

  const addProductToCart = (product: Product) => {
    if (product.stock === 0) {
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.name === product.name);

      if (existingItem) {
        return currentItems.map((item) =>
          item.name === product.name
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, item.stock),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          name: product.name,
          price: product.price,
          priceValue: parsePrice(product.price),
          image: product.image,
          quantity: 1,
          stock: product.stock,
          badgeColor: product.badgeColor,
          size: product.size,
        },
      ];
    });
  };

  const increaseQuantity = (productName: string) => {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.name === productName
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, item.stock),
            }
          : item,
      ),
    );
  };

  const decreaseQuantity = (productName: string) => {
    setCartItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.name !== productName) {
          return [item];
        }

        if (item.quantity <= 1) {
          return [];
        }

        return [{ ...item, quantity: item.quantity - 1 }];
      }),
    );
  };

  const removeFromCart = (productName: string) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.name !== productName),
    );
  };

  return (
    <DashboardShell headerTitle="Cotizaciones">
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-[var(--color-background)] p-4 transition-colors duration-200 lg:flex-row lg:gap-6 lg:px-6">
        <section className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex">
          <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_142px_32px]">
            <label className="relative">
              <MagnifyingGlassIcon
                size={18}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
              />
              <input
                type="text"
                placeholder="Buscar producto, SKU o codigo de barras..."
                className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>

            <button
              type="button"
              className="flex h-11 items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-medium text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              Todas las categorias
              <CaretDownIcon size={16} />
            </button>

            <div className="flex h-11 items-center justify-center rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-black text-[var(--color-input-text)] [font-family:var(--font-circular-x-sub)]">
              <time dateTime={currentTime} className="flex items-baseline gap-1.5 tabular-nums">
                <span>{timeValue}</span>
                <span className="text-[10px] font-black text-[var(--color-muted-foreground)]">
                  {timePeriod}
                </span>
              </time>
            </div>

            <div className="flex h-11 items-center justify-center">
              <WifiHighIcon
                size={22}
                weight="bold"
                className="text-[#10b981]"
                aria-label="Conectado"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
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

          <div className="scrollbar-hidden mt-6 grid min-h-0 flex-1 auto-rows-max content-start grid-cols-2 gap-4 overflow-y-auto pr-1 pb-2 sm:grid-cols-3 md:grid-cols-4 lg:mt-8 lg:grid-cols-5">
            {products.map((product) => {
              const cartQuantity =
                cartItems.find((item) => item.name === product.name)?.quantity ?? 0;
              const availableStock = product.stock - cartQuantity;
              const isUnavailable = availableStock <= 0;

              return (
                <button
                  key={product.name}
                  type="button"
                  onClick={() => addProductToCart(product)}
                  disabled={isUnavailable}
                  className={cn(
                    "group relative flex min-h-[220px] flex-col rounded-[12px] bg-[var(--color-card)] p-3 text-left shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0 dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]",
                    isUnavailable && "opacity-60",
                  )}
                >
                  {isUnavailable && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[12px] bg-black/10">
                      <span className="rounded-lg bg-[#ef4444] px-3 py-1 text-xs font-bold text-white">
                        {product.stock === 0 ? "Agotado" : "Sin stock"}
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
                      className={`absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${product.badgeColor}`}
                    >
                      {product.size}
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-black text-[var(--color-text)]">
                    {product.name}
                  </p>
                  <div className="mt-auto flex items-end justify-between pt-5">
                    <span className="text-sm font-bold text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                      {product.price}
                    </span>
                    <span
                      className={cn(
                        "flex h-7 items-center gap-1 rounded-full px-2 text-sm font-bold text-white [font-family:var(--font-circular-x-sub)]",
                        availableStock >= 3
                          ? "bg-[var(--color-sidebar-active)]"
                          : "bg-[#ef4444]",
                      )}
                    >
                      <PackageIcon size={14} weight="bold" />
                      {availableStock}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex h-full min-h-0 w-full shrink-0 flex-col lg:w-[360px]">
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <div className="flex items-center gap-3">
              <ShoppingCartSimpleIcon size={23} className="text-[var(--color-text)]" />
              <h2 className="text-lg font-black text-[var(--color-text)]">Carrito</h2>
            </div>
            <div className="w-[180px]">
              <DropdownButton
                label="Sucursal"
                options={branches}
                selected={selectedBranch}
                onSelect={setSelectedBranch}
                icon={<BuildingsIcon size={18} weight="bold" />}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 px-2">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-left transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <UserCircleIcon size={28} weight="fill" className="text-[var(--color-secondary)]" />
                <span className="truncate text-sm font-semibold text-[var(--color-text)]">
                  Cristhofer...
                </span>
              </span>
              <CaretDownIcon size={16} className="text-[var(--color-muted-foreground)]" />
            </button>
          </div>

          <div className="scrollbar-hidden mt-5 min-h-0 flex-1 overflow-y-auto px-2">
            {cartItems.length === 0 ? (
              <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-[14px] px-6 text-center">
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
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                <div
                  key={item.name}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3"
                >
                  <div className="h-16 w-16">
                    {item.image ? (
                      <ProductImage src={item.image} alt={item.name} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ProductPlaceholderImage className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-text)]">
                      {item.name}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${item.badgeColor}`}
                      >
                        {item.size}
                      </div>
                      <div className="inline-flex h-8 items-center overflow-hidden rounded-full bg-[var(--color-input-bg)] text-[var(--color-text)]">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.name)}
                          className="flex h-full w-8 items-center justify-center hover:bg-[var(--color-button-hover)]"
                          aria-label={`Restar ${item.name}`}
                        >
                          <MinusIcon size={14} />
                        </button>
                        <span className="min-w-5 px-1 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.name)}
                          disabled={item.quantity >= item.stock}
                          className="flex h-full w-8 items-center justify-center hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Sumar ${item.name}`}
                        >
                          <PlusIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex h-full flex-col items-end justify-between py-1">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.name)}
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <TrashIcon size={18} weight="bold" className="text-[#ff6e65]" />
                    </button>
                    <span className="text-sm font-bold text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                      {formatPrice(item.priceValue * item.quantity)}
                    </span>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-[var(--color-border)] pt-4 px-2">
            <div className="flex items-center justify-between text-sm font-semibold text-[var(--color-muted-foreground)]">
              <span>Sub Total</span>
              <span className="[font-family:var(--font-circular-x-sub)]">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="mt-5 flex items-center justify-between text-sm font-black text-[var(--color-text)]">
              <span>Total</span>
              <span className="[font-family:var(--font-circular-x-sub)]">
                {formatPrice(subtotal)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 px-2">
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              <TicketIcon size={18} />
              Descuento
            </button>
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              <NotepadIcon size={18} />
              Nota
            </button>
          </div>

          <button
            type="button"
            disabled={cartItems.length === 0}
            className="mt-4 mb-4 h-12 w-full rounded-[14px] bg-[#ff7417] text-sm font-black text-white shadow-[0_8px_18px_rgba(255,116,23,0.3)] transition-colors hover:bg-[#f2670a] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Guardar cotizacion
          </button>
        </aside>
      </div>
    </DashboardShell>
  );
}

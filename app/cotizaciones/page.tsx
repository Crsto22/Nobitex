"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import {
  CaretDownIcon,
  ArrowsLeftRightIcon,
  CurrencyCircleDollarIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartSimpleIcon,
  TicketIcon,
  TrashIcon,
  NotepadIcon,
  CheckIcon,
  XIcon,
  BuildingsIcon,
  WifiHighIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import {
  GenericClientAvatar,
  UserAvatar,
} from "@/components/UserAvatar/user-avatar";
import { ClientCreateModal } from "@/components/Clients/client-create-modal";
import { CartPriceInput } from "@/components/Ventas/cart-price-input";
import {
  SaleProductCard,
  hasAvailableSaleProductStock,
} from "@/components/Ventas/sale-product-card";
import { CartVariantSelect } from "@/components/Ventas/cart-variant-select";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { CalendarInput } from "@/components/ui/calendar-input";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { categoriesApi, type Category } from "@/lib/api/categories";
import { clientsApi, type Client } from "@/lib/api/clients";
import { colorsApi, type Color } from "@/lib/api/colors";
import { quotationsApi } from "@/lib/api/quotations";
import {
  salesApi,
  type SaleProduct,
  type SaleProductVariant,
  type SaleProductsResponse,
  type VentaDescuentoTipo,
} from "@/lib/api/sales";
import { sizesApi, type Size } from "@/lib/api/sizes";
import { defaultPageSize } from "@/lib/pagination";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { useAuth } from "@/lib/auth/auth-provider";

const productPlaceholderImage = "/Logo/Nuvex.png";
const filterPageSize = Math.min(defaultPageSize, 12);
const emptySaleProductsMeta: SaleProductsResponse["meta"] = {
  page: 1,
  limit: defaultPageSize,
  total: 0,
  totalPages: 1,
};

type CartItem = {
  id: string;
  name: string;
  tipo: "normal" | "variantes";
  price: string;
  priceValue: number;
  salePriceValue: number;
  wholesalePriceValue: number | null;
  image: string | null;
  quantity: number;
  stock: number;
  colorHex: string;
  colorName: string;
  size: string;
  sku: string;
  product: SaleProduct;
};

function formatPrice(amount: number) {
  return `S/${amount.toFixed(2)}`;
}

function parseDecimalInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
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
    <Image
      src={src}
      alt={alt}
      width={160}
      height={160}
      unoptimized
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
      className={cn("object-contain grayscale opacity-35", className)}
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
          {icon && (
            <span className="shrink-0 text-[var(--color-muted-foreground)]">
              {icon}
            </span>
          )}
          <span className="truncate text-sm font-circular-regular text-[var(--color-text)]">
            {currentOption?.label || label}
          </span>
        </span>
        <CaretDownIcon
          size={16}
          className="shrink-0 text-[var(--color-muted-foreground)]"
        />
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
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                selected === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              {option.label}
              {selected === option.value && (
                <CheckIcon size={16} weight="bold" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CotizacionesPage() {
  const minimumQuotationDate = new Date().toISOString().slice(0, 10);
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedColor, setSelectedColor] = useState("todos");
  const [selectedSize, setSelectedSize] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [variantEditorItemId, setVariantEditorItemId] = useState<string | null>(
    null,
  );
  const [productsMeta, setProductsMeta] = useState(emptySaleProductsMeta);
  const [productPage, setProductPage] = useState(1);
  const [colorPage, setColorPage] = useState(1);
  const [sizePage, setSizePage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [colorTotalPages, setColorTotalPages] = useState(1);
  const [sizeTotalPages, setSizeTotalPages] = useState(1);
  const [clientTotalPages, setClientTotalPages] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isSavingQuotation, setIsSavingQuotation] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isClientCreateModalOpen, setIsClientCreateModalOpen] = useState(false);
  const [isDiscountEditorOpen, setIsDiscountEditorOpen] = useState(false);
  const [discountType, setDiscountType] =
    useState<VentaDescuentoTipo>("porcentaje");
  const [discountValue, setDiscountValue] = useState("");
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [quotationNote, setQuotationNote] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const clientSearchRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [priceItemId, setPriceItemId] = useState<string | null>(null);
  const toast = useSystemToast();
  const currentTime = useCurrentTime();
  const [timeValue, timePeriod] = currentTime.split(" ");
  const categoryOptions = [
    { label: "Todas las categorias", value: "todos" },
    ...categories.map((category) => ({
      label: category.nombre,
      value: category.id,
    })),
  ];

  const loadColors = useCallback(async (targetPage = 1, append = false) => {
    setIsLoadingColors(true);
    try {
      const response = await colorsApi.findAll({
        page: targetPage,
        limit: filterPageSize,
        status: "active",
      });
      setColors((current) =>
        append
          ? [
              ...current,
              ...response.data.filter(
                (c) => !current.some((x) => x.id === c.id),
              ),
            ]
          : response.data,
      );
      setColorPage(response.meta.page);
      setColorTotalPages(response.meta.totalPages);
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
        append
          ? [
              ...current,
              ...response.data.filter(
                (s) => !current.some((x) => x.id === s.id),
              ),
            ]
          : response.data,
      );
      setSizePage(response.meta.page);
      setSizeTotalPages(response.meta.totalPages);
    } finally {
      setIsLoadingSizes(false);
    }
  }, []);

  const loadClients = useCallback(
    async (targetPage = 1, append = false) => {
      setIsLoadingClients(true);
      try {
        const response = await clientsApi.findAll({
          page: targetPage,
          limit: filterPageSize,
          search: clientSearch.trim() || undefined,
          estado: "activo",
        });
        setClients((current) =>
          append
            ? [
                ...current,
                ...response.data.filter(
                  (c) => !current.some((x) => x.id === c.id),
                ),
              ]
            : response.data,
        );
        setClientPage(response.meta.page);
        setClientTotalPages(response.meta.totalPages);
      } finally {
        setIsLoadingClients(false);
      }
    },
    [clientSearch],
  );

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      branchesApi
        .findAll({ limit: 100, estado: "activo", tipo: "tienda" })
        .then((response) => {
          if (!isMounted) return;
          const activeBranches = response.data;
          const defaultBranch =
            activeBranches.find((b) => b.esPrincipal) ?? activeBranches[0];
          setBranches(activeBranches);
          setSelectedBranch((current) => current || defaultBranch?.id || "");
        })
        .catch(() => {});
    }, 0);
    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      categoriesApi
        .findAll({ limit: 100, status: "active" })
        .then((response) => {
          if (isMounted) setCategories(response.data);
        })
        .catch(() => {});
    }, 0);
    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
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
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setProductPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedBranch) {
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingProducts(true);
      setProductsError(null);

      salesApi
        .findProducts({
          page: productPage,
          limit: defaultPageSize,
          search: debouncedSearchTerm,
          sucursalId: selectedBranch,
          categoriaId:
            selectedCategory === "todos" ? undefined : selectedCategory,
          colorId: selectedColor === "todos" ? undefined : selectedColor,
          tallaId: selectedSize === "todos" ? undefined : selectedSize,
        })
        .then((response) => {
          if (!isMounted) {
            return;
          }

          setProducts(response.data);
          setProductsMeta(response.meta);
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setProducts([]);
          setProductsMeta(emptySaleProductsMeta);
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
      window.clearTimeout(timeoutId);
    };
  }, [
    debouncedSearchTerm,
    productPage,
    selectedBranch,
    selectedCategory,
    selectedColor,
    selectedSize,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadClients(1, false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadClients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target as Node)
      ) {
        setIsClientDropdownOpen(false);
      }
    };
    if (isClientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      const animationFrame = requestAnimationFrame(() => {
        clientSearchRef.current?.focus();
      });
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        cancelAnimationFrame(animationFrame);
      };
    }
  }, [isClientDropdownOpen]);

  useEffect(() => {
    if (!isDiscountEditorOpen) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      discountInputRef.current?.focus();
      discountInputRef.current?.select();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [isDiscountEditorOpen]);

  useEffect(() => {
    if (!isNoteEditorOpen) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      noteInputRef.current?.focus();
      const noteLength = noteInputRef.current?.value.length ?? 0;
      noteInputRef.current?.setSelectionRange(noteLength, noteLength);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [isNoteEditorOpen]);

  const subtotal = cartItems.reduce(
    (total, item) => total + item.priceValue * item.quantity,
    0,
  );
  const rawDiscountValue = parseDecimalInput(discountValue);
  const discountAmount = (() => {
    if (!discountValue.trim() || subtotal <= 0) {
      return 0;
    }

    if (discountType === "porcentaje") {
      const percentage = Math.min(Math.max(rawDiscountValue, 0), 100);
      return Number(((subtotal * percentage) / 100).toFixed(2));
    }

    return Number(Math.min(Math.max(rawDiscountValue, 0), subtotal).toFixed(2));
  })();
  const hasDiscountApplied = discountAmount > 0;
  const total = Math.max(Number((subtotal - discountAmount).toFixed(2)), 0);

  const addVariantToCart = (
    product: SaleProduct,
    variant: SaleProductVariant,
  ) => {
    const stock = variant.stockSucursal ?? variant.stockTotal;
    if (stock <= 0) {
      return;
    }

    const priceValue = Number(variant.precioVenta);
    const wholesalePriceValue = variant.precioMayorista
      ? Number(variant.precioMayorista)
      : null;
    const image =
      variant.imagen?.urlThumbnail ??
      variant.imagen?.urlWebp ??
      variant.imagen?.urlOriginal ??
      null;

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === variant.varianteId,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === variant.varianteId
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
          id: variant.varianteId,
          name: product.nombre,
          tipo: product.tipo,
          price: formatPrice(priceValue),
          priceValue,
          salePriceValue: priceValue,
          wholesalePriceValue,
          image,
          quantity: 1,
          stock,
          colorHex: variant.color.hex,
          colorName: variant.color.nombre,
          size: variant.talla.nombre,
          sku:
            variant.sku ?? variant.codigoBarras ?? `VAR-${variant.varianteId}`,
          product,
        },
      ];
    });
  };

  const increaseQuantity = (productId: string) => {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, item.stock),
            }
          : item,
      ),
    );
  };

  const decreaseQuantity = (productId: string) => {
    setCartItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.id !== productId) {
          return [item];
        }

        if (item.quantity <= 1) {
          return [];
        }

        return [{ ...item, quantity: item.quantity - 1 }];
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId),
    );
  };

  const cartQuantities = Object.fromEntries(
    cartItems.map((item) => [item.id, item.quantity]),
  );
  const availableProducts = products.filter((product) =>
    hasAvailableSaleProductStock(product, cartQuantities),
  );

  const replaceCartVariant = (itemId: string, variantId: string) => {
    setCartItems((items) => {
      const current = items.find((item) => item.id === itemId);
      const variant = current?.product.variantes.find(
        (item) => item.varianteId === variantId,
      );
      if (!current || !variant || variantId === itemId) return items;

      const stock = variant.stockSucursal ?? variant.stockTotal;
      if (stock <= 0) return items;
      const existing = items.find((item) => item.id === variantId);
      if (existing) {
        return items
          .filter((item) => item.id !== itemId)
          .map((item) =>
            item.id === variantId
              ? {
                  ...item,
                  quantity: Math.min(
                    item.quantity + current.quantity,
                    item.stock,
                  ),
                }
              : item,
          );
      }

      const price = Number(variant.precioVenta);
      const wholesale = variant.precioMayorista
        ? Number(variant.precioMayorista)
        : null;
      return items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              id: variant.varianteId,
              price: formatPrice(price),
              priceValue: price,
              salePriceValue: price,
              wholesalePriceValue: wholesale,
              image:
                variant.imagen?.urlThumbnail ??
                variant.imagen?.urlWebp ??
                variant.imagen?.urlOriginal ??
                null,
              quantity: Math.min(item.quantity, stock),
              stock,
              colorHex: variant.color.hex,
              colorName: variant.color.nombre,
              size: variant.talla.nombre,
              sku:
                variant.sku ??
                variant.codigoBarras ??
                `VAR-${variant.varianteId}`,
            }
          : item,
      );
    });
    setVariantEditorItemId(null);
  };

  const refreshProducts = useCallback(() => {
    if (!selectedBranch) {
      return;
    }

    setIsLoadingProducts(true);
    setProductsError(null);

    salesApi
      .findProducts({
        page: productPage,
        limit: defaultPageSize,
        search: debouncedSearchTerm,
        sucursalId: selectedBranch,
        categoriaId:
          selectedCategory === "todos" ? undefined : selectedCategory,
        colorId: selectedColor === "todos" ? undefined : selectedColor,
        tallaId: selectedSize === "todos" ? undefined : selectedSize,
      })
      .then((response) => {
        setProducts(response.data);
        setProductsMeta(response.meta);
      })
      .catch(() => {
        setProducts([]);
        setProductsMeta(emptySaleProductsMeta);
        setProductsError("No se pudieron cargar los productos");
      })
      .finally(() => {
        setIsLoadingProducts(false);
      });
  }, [
    debouncedSearchTerm,
    productPage,
    selectedBranch,
    selectedCategory,
    selectedColor,
    selectedSize,
  ]);

  const handleSaveQuotation = async () => {
    if (cartItems.length === 0 || isSavingQuotation) {
      return;
    }

    setIsSavingQuotation(true);

    const loadingId = toast.showToast({
      title: "Guardando cotizacion...",
      description: "Estamos registrando los productos seleccionados",
      variant: "loading",
    });

    try {
      const quotation = await quotationsApi.create({
        sucursalId: selectedBranch || undefined,
        clienteId: selectedClient?.id || undefined,
        descuentoTipo: hasDiscountApplied ? discountType : undefined,
        descuentoValor: hasDiscountApplied
          ? Number.parseFloat(discountValue.replace(",", ".")).toFixed(2)
          : undefined,
        detalles: cartItems.map((item) => ({
          productoVarianteId: item.id,
          cantidad: item.quantity,
          precioUnitario: item.priceValue.toFixed(2),
        })),
        observaciones: quotationNote.trim() || undefined,
        validaHasta: validUntil
          ? new Date(`${validUntil}T23:59:59`).toISOString()
          : undefined,
      });

      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Cotizacion registrada",
        description: `Correlativo: ${quotation.correlativo} - Total: ${formatPrice(Number(quotation.total))}`,
        variant: "success",
        duration: 5000,
      });

      setCartItems([]);
      setDiscountValue("");
      setQuotationNote("");
      setValidUntil("");
      setIsDiscountEditorOpen(false);
      setIsNoteEditorOpen(false);
      refreshProducts();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo registrar la cotizacion";

      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Error al guardar",
        description: message,
        variant: "error",
        duration: 5000,
      });
    } finally {
      setIsSavingQuotation(false);
    }
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
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>

            <DropdownButton
              label="Todas las categorias"
              options={categoryOptions}
              selected={selectedCategory}
              onSelect={(categoryId) => {
                setSelectedCategory(categoryId);
                setProductPage(1);
              }}
            />

            <div className="flex h-11 items-center justify-center rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-black text-[var(--color-input-text)] font-circular-regular">
              <time
                dateTime={currentTime}
                className="flex items-baseline gap-1.5 tabular-nums"
              >
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
              <button
                type="button"
                onClick={() => {
                  setSelectedColor("todos");
                  setProductPage(1);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-circular-bold transition-colors",
                  selectedColor === "todos"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                Todos
              </button>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const isSelected = selectedColor === color.id;

                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color.id);
                        setProductPage(1);
                      }}
                      className={cn(
                        "h-6 w-6 rounded-full ring-2 ring-offset-1 ring-offset-[var(--color-background)] transition-colors hover:scale-105",
                        isSelected ? "scale-105" : "ring-transparent",
                      )}
                      style={
                        {
                          backgroundColor: color.hex,
                          "--tw-ring-color": isSelected
                            ? color.hex
                            : "transparent",
                        } as React.CSSProperties
                      }
                      title={color.nombre}
                      aria-label={color.nombre}
                    />
                  );
                })}
                {colorPage < colorTotalPages ? (
                  <button
                    type="button"
                    onClick={() => void loadColors(colorPage + 1, true)}
                    disabled={isLoadingColors}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Cargar mas colores"
                  >
                    <CaretDownIcon
                      size={12}
                      className="-rotate-90"
                      weight="bold"
                    />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSize("todos");
                  setProductPage(1);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-circular-bold transition-colors",
                  selectedSize === "todos"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                Todos
              </button>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => {
                      setSelectedSize(size.id);
                      setProductPage(1);
                    }}
                    className={cn(
                      "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[10px] font-circular-bold transition-colors",
                      selectedSize === size.id
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                    title={size.nombre}
                  >
                    {size.nombre}
                  </button>
                ))}
                {sizePage < sizeTotalPages ? (
                  <button
                    type="button"
                    onClick={() => void loadSizes(sizePage + 1, true)}
                    disabled={isLoadingSizes}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Cargar mas tallas"
                  >
                    <CaretDownIcon
                      size={12}
                      className="-rotate-90"
                      weight="bold"
                    />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="scrollbar-hidden mt-6 grid min-h-0 flex-1 auto-rows-max content-start grid-cols-2 gap-4 overflow-y-auto pr-1 pb-2 sm:grid-cols-3 md:grid-cols-4 lg:mt-8 2xl:grid-cols-6">
            {productsError ? (
              <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-[14px] bg-[var(--color-card)] text-sm font-circular-bold text-[var(--color-muted-foreground)]">
                {productsError}
              </div>
            ) : isLoadingProducts ? (
              Array.from({ length: 10 }).map((_, index) => (
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
              ))
            ) : availableProducts.length === 0 ? (
              <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] text-center">
                <ProductPlaceholderImage className="h-16 w-16" />
                <p className="mt-3 text-sm font-circular-regular text-[var(--color-text)]">
                  No hay productos disponibles
                </p>
              </div>
            ) : (
              availableProducts.map((product) => (
                <SaleProductCard
                  key={product.productoId}
                  product={product}
                  cartQuantities={cartQuantities}
                  onAdd={(variant) => addVariantToCart(product, variant)}
                />
              ))
            )}
          </div>

          {availableProducts.length > 0 ? (
          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <p className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              Mostrando {availableProducts.length} de {productsMeta.total} productos
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setProductPage((currentPage) => Math.max(1, currentPage - 1))
                }
                disabled={isLoadingProducts || productsMeta.page <= 1}
                className="h-8 rounded-[10px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-[10px] bg-[var(--color-primary)] px-2 text-xs font-circular-bold text-white">
                {productsMeta.page}
              </span>
              <button
                type="button"
                onClick={() =>
                  setProductPage((currentPage) =>
                    Math.min(productsMeta.totalPages, currentPage + 1),
                  )
                }
                disabled={
                  isLoadingProducts ||
                  productsMeta.page >= productsMeta.totalPages
                }
                className="h-8 rounded-[10px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
          ) : null}
        </section>

        <aside className="flex h-full min-h-0 w-full shrink-0 flex-col lg:w-[360px]">
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <div className="flex items-center gap-3">
              <ShoppingCartSimpleIcon
                size={23}
                className="text-[var(--color-text)]"
              />
              <h2 className="text-lg font-black text-[var(--color-text)] text-fixed-lg">
                Carrito
              </h2>
            </div>
            <div className="w-[180px]">
              {user?.sucursalId ? (
                <div className="flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold text-[var(--color-text)]">
                  <BuildingsIcon size={17} weight="bold" />
                  <span className="truncate">
                    {branches.find((branch) => branch.id === selectedBranch)
                      ?.nombre ?? "Sucursal asignada"}
                  </span>
                </div>
              ) : (
                <DropdownButton
                  label="Sucursal"
                  options={branches.map((b) => ({
                    label: b.nombre,
                    value: b.id,
                  }))}
                  selected={selectedBranch}
                  onSelect={(branchId) => {
                    setSelectedBranch(branchId);
                    setProductPage(1);
                    setCartItems([]);
                  }}
                  icon={<BuildingsIcon size={18} weight="bold" />}
                />
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 px-2">
            <div ref={clientDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-left transition-colors hover:bg-[var(--color-button-hover)]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedClient ? (
                    <UserAvatar
                      seed={selectedClient.id}
                      name={selectedClient.displayName}
                      size={28}
                      className="size-7"
                    />
                  ) : (
                    <GenericClientAvatar size={28} />
                  )}
                  <span className="truncate text-sm font-circular-regular text-[var(--color-text)]">
                    {selectedClient
                      ? selectedClient.displayName
                      : "Seleccionar cliente"}
                  </span>
                </span>
                <CaretDownIcon
                  size={16}
                  className="text-[var(--color-muted-foreground)]"
                />
              </button>
              {isClientDropdownOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl bg-[var(--color-card)] shadow-lg ring-1 ring-[var(--color-border)]">
                  <div className="border-b border-[var(--color-border)] p-2">
                    <div className="relative">
                      <MagnifyingGlassIcon
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                      />
                      <input
                        ref={clientSearchRef}
                        type="text"
                        placeholder="Buscar por nombre, documento, email..."
                        aria-label="Buscar por nombre, documento, email..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setClientPage(1);
                        }}
                        className="h-9 w-full rounded-lg bg-[var(--color-input-bg)] pl-9 pr-4 text-sm font-circular-regular text-[var(--color-input-text)] outline-none transition-shadow duration-200 placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
                      />
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsClientDropdownOpen(false);
                        setIsClientCreateModalOpen(true);
                      }}
                      className="mb-1 flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-left text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-button-hover)] dark:bg-[var(--color-card)]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <PlusIcon size={18} weight="bold" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-circular-bold">
                          Crear cliente
                        </span>
                        <span className="block truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                          Registrar y seleccionar
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setIsClientDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                        !selectedClient
                          ? "bg-[var(--color-primary)] text-white shadow-sm"
                          : "text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]",
                      )}
                    >
                      <GenericClientAvatar size={32} />
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-circular-regular">
                          Cliente generico
                        </span>
                        <span
                          className={cn(
                            "block truncate text-xs font-circular-regular transition-colors",
                            !selectedClient
                              ? "text-white/80"
                              : "text-[var(--color-muted-foreground)]",
                          )}
                        >
                          Sin documento
                        </span>
                      </div>
                    </button>

                    {clients.map((client) => {
                      const docLabel =
                        client.tipoDocumento === "dni"
                          ? "DNI"
                          : client.tipoDocumento === "ruc"
                            ? "RUC"
                            : "Sin doc";
                      const isActive = selectedClient?.id === client.id;

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedClient(client);
                            setIsClientDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                            isActive
                              ? "bg-[var(--color-primary)] text-white shadow-sm"
                              : "text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]",
                          )}
                        >
                          <UserAvatar
                            seed={client.id}
                            name={client.displayName}
                            size={32}
                            className="size-8"
                          />
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-circular-regular">
                              {client.displayName}
                            </span>
                            <span
                              className={cn(
                                "block truncate text-xs font-circular-regular transition-colors",
                                isActive
                                  ? "text-white/80"
                                  : "text-[var(--color-muted-foreground)]",
                              )}
                            >
                              {docLabel} {client.numeroDocumento || ""}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {clientPage < clientTotalPages && (
                      <div className="border-t border-[var(--color-border)] pt-1">
                        <button
                          type="button"
                          onClick={() => void loadClients(clientPage + 1, true)}
                          disabled={isLoadingClients}
                          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-circular-bold text-[var(--color-muted-foreground)] transition-colors duration-150 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CaretDownIcon
                            size={14}
                            weight="bold"
                            className={cn(isLoadingClients && "animate-spin")}
                          />
                          {isLoadingClients
                            ? "Cargando..."
                            : "Cargar mas clientes"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <CalendarInput
              labelInline="Valida hasta"
              value={validUntil}
              min={minimumQuotationDate}
              onChange={setValidUntil}
              clearable
            />
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
                    key={item.id}
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
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {item.tipo === "variantes" ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.colorHex }}
                              />
                              {item.colorName}
                            </span>
                            <span className="text-[10px] font-circular-regular text-[var(--color-muted-foreground)]">
                              Talla: {item.size}
                            </span>
                          </>
                        ) : null}
                        <div className="inline-flex h-8 items-center overflow-hidden rounded-full bg-[var(--color-input-bg)] text-[var(--color-text)]">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.id)}
                            className="flex h-full w-8 items-center justify-center hover:bg-[var(--color-button-hover)]"
                            aria-label={`Restar ${item.name}`}
                          >
                            <MinusIcon size={14} />
                          </button>
                          <span className="min-w-5 px-1 text-center text-sm font-circular-regular">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.id)}
                            disabled={item.quantity >= item.stock}
                            className="flex h-full w-8 items-center justify-center hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Sumar ${item.name}`}
                          >
                            <PlusIcon size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVariantEditorItemId(null);
                            setPriceItemId((current) =>
                              current === item.id ? null : item.id,
                            );
                          }}
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]",
                            Math.abs(item.priceValue - item.salePriceValue) >=
                              0.005 &&
                              "bg-[var(--color-primary)] text-white hover:text-white",
                          )}
                          aria-label={`Cambiar precio de ${item.name}`}
                          title="Cambiar precio"
                        >
                          <CurrencyCircleDollarIcon size={16} weight="bold" />
                        </button>
                        {item.tipo === "variantes" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPriceItemId(null);
                              setVariantEditorItemId((current) =>
                                current === item.id ? null : item.id,
                              );
                            }}
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]",
                              variantEditorItemId === item.id &&
                                "bg-[var(--color-primary)] text-white hover:text-white",
                            )}
                            aria-label={`Cambiar variante de ${item.name}`}
                            title="Cambiar variante"
                          >
                            <ArrowsLeftRightIcon size={16} weight="bold" />
                          </button>
                        ) : null}
                      </div>
                      {priceItemId === item.id ? (
                        <CartPriceInput
                          key={`${item.id}-${item.priceValue}`}
                          currentPrice={item.priceValue}
                          salePrice={item.salePriceValue}
                          wholesalePrice={item.wholesalePriceValue}
                          onClose={() => setPriceItemId(null)}
                          onApply={(price) => {
                            setCartItems((items) =>
                              items.map((current) =>
                                current.id === item.id
                                  ? { ...current, priceValue: price }
                                  : current,
                              ),
                            );
                            setPriceItemId(null);
                          }}
                        />
                      ) : null}
                      {variantEditorItemId === item.id ? (
                        <CartVariantSelect
                          product={item.product}
                          value={item.id}
                          onChange={(variantId) =>
                            replaceCartVariant(item.id, variantId)
                          }
                        />
                      ) : null}
                    </div>
                    <div className="flex h-full flex-col items-end justify-between py-1">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <TrashIcon
                          size={18}
                          weight="bold"
                          className="text-[#ff6e65]"
                        />
                      </button>
                      <span className="text-sm font-circular-bold text-[var(--color-muted-foreground)]">
                        {formatPrice(item.priceValue * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-[var(--color-border)] pt-4 px-2">
            <div className="flex items-center justify-between text-sm font-circular-regular text-[var(--color-muted-foreground)]">
              <span>Sub Total</span>
              <span className="font-circular-bold">
                {formatPrice(subtotal)}
              </span>
            </div>
            {hasDiscountApplied ? (
              <div className="mt-2 flex items-center justify-between text-sm font-circular-regular text-[var(--color-muted-foreground)]">
                <span>
                  Descuento
                  {discountType === "porcentaje"
                    ? ` (${discountValue.trim()}%)`
                    : ""}
                </span>
                <span className="font-circular-bold text-[#ef4444]">
                  -{formatPrice(discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-between text-sm font-black text-[var(--color-text)]">
              <span>Total</span>
              <span className="font-circular-bold">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-3 px-2">
            <div
              className={cn(
                "min-w-0 overflow-hidden rounded-[14px] transition-colors duration-300 ease-out",
                isDiscountEditorOpen
                  ? "flex-1 bg-[var(--color-input-bg)]"
                  : isNoteEditorOpen
                    ? "w-0 flex-none opacity-0 pointer-events-none"
                    : "flex-1 bg-transparent",
              )}
            >
              {isDiscountEditorOpen ? (
                <div className="animate-in fade-in zoom-in-95 duration-200 p-2.5 ">
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 items-center px-1 text-sm font-circular-bold text-[var(--color-text)]">
                      <TicketIcon size={18} />
                    </div>
                    <div className="relative min-w-0 flex-1">
                      {discountType === "monto" ? (
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-circular-bold text-[var(--color-muted-foreground)]">
                          S/
                        </span>
                      ) : null}
                      <input
                        ref={discountInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        max={discountType === "porcentaje" ? "100" : undefined}
                        value={discountValue}
                        onChange={(event) =>
                          setDiscountValue(event.target.value)
                        }
                        placeholder={
                          discountType === "porcentaje" ? "0 - 100" : "0.00"
                        }
                        className={cn(
                          "h-10 w-full rounded-[12px] border-none bg-[var(--color-input-bg)] pr-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-0",
                          discountType === "monto"
                            ? "pl-9 font-circular-bold"
                            : "px-3 font-circular-bold",
                        )}
                      />
                    </div>
                    <div className="flex shrink-0 rounded-[12px] bg-[var(--color-background)] p-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType("porcentaje")}
                        className={cn(
                          "h-8 rounded-[8px] px-2.5 text-xs transition-colors",
                          discountType === "porcentaje"
                            ? "bg-[var(--color-primary)] text-white font-circular-bold"
                            : "text-[var(--color-muted-foreground)] font-circular-regular",
                        )}
                        aria-label="Descuento por porcentaje"
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("monto")}
                        className={cn(
                          "h-8 rounded-[8px] px-2.5 text-xs transition-colors",
                          discountType === "monto"
                            ? "bg-[var(--color-primary)] text-white font-circular-bold"
                            : "text-[var(--color-muted-foreground)] font-circular-regular",
                        )}
                        aria-label="Descuento por monto"
                      >
                        S/
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountValue("");
                          setIsDiscountEditorOpen(false);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-background)]"
                        aria-label="Quitar descuento"
                      >
                        <XIcon size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDiscountEditorOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--color-primary)] text-white transition-colors hover:opacity-90"
                        aria-label="Guardar descuento"
                      >
                        <CheckIcon size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsNoteEditorOpen(false);
                    setIsDiscountEditorOpen(true);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-regular text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-button-hover)]"
                >
                  <TicketIcon size={18} />
                  {hasDiscountApplied
                    ? `Descuento ${formatPrice(discountAmount)}`
                    : "Descuento"}
                </button>
              )}
            </div>
            <div
              className={cn(
                "min-w-0 overflow-hidden rounded-[14px] transition-colors duration-300 ease-out",
                isNoteEditorOpen
                  ? "flex-1 bg-[var(--color-input-bg)]"
                  : isDiscountEditorOpen
                    ? "w-0 flex-none opacity-0 pointer-events-none"
                    : "flex-1 bg-transparent",
              )}
            >
              {isNoteEditorOpen ? (
                <div className="animate-in fade-in zoom-in-95 duration-200 p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex shrink-0 items-center gap-2 px-1 text-sm font-circular-bold text-[var(--color-text)]">
                      <NotepadIcon size={18} />
                      <span>Nota</span>
                    </div>
                    <input
                      ref={noteInputRef}
                      value={quotationNote}
                      onChange={(event) => setQuotationNote(event.target.value)}
                      placeholder="Agregar observacion..."
                      aria-label="Agregar observacion..."
                      maxLength={240}
                      className="h-10 min-w-0 flex-1 rounded-[12px] border-none bg-[var(--color-input-bg)] px-3 text-sm font-circular-regular text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-0"
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setQuotationNote("");
                          setIsNoteEditorOpen(false);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-background)]"
                        aria-label="Quitar nota"
                      >
                        <XIcon size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNoteEditorOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--color-primary)] text-white transition-colors hover:opacity-90"
                        aria-label="Guardar nota"
                      >
                        <CheckIcon size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsDiscountEditorOpen(false);
                    setIsNoteEditorOpen(true);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-regular text-[var(--color-text)] transition-colors duration-200 hover:bg-[var(--color-button-hover)]"
                >
                  <NotepadIcon size={18} />
                  {quotationNote.trim() ? "Nota agregada" : "Nota"}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveQuotation}
            disabled={cartItems.length === 0 || isSavingQuotation}
            className="mt-4 mb-4 h-12 w-full rounded-[14px] bg-[#ff7417] text-sm font-black text-white shadow-[0_8px_18px_rgba(255,116,23,0.3)] transition-colors hover:bg-[#f2670a] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isSavingQuotation ? "Guardando..." : "Guardar cotizacion"}
          </button>
        </aside>
      </div>

      <ClientCreateModal
        isOpen={isClientCreateModalOpen}
        onClose={() => setIsClientCreateModalOpen(false)}
        onCreated={(client) => {
          setSelectedClient(client);
          setClients((current) =>
            current.some((item) => item.id === client.id)
              ? current
              : [client, ...current],
          );
          setClientSearch("");
        }}
      />
    </DashboardShell>
  );
}

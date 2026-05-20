"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  BuildingsIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  SquaresFourIcon,
  StorefrontIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { cn } from "@/lib/utils";

const categories = [
  { label: "Polos", value: "polos" },
  { label: "Camisas", value: "camisas" },
  { label: "Pantalones", value: "pantalones" },
  { label: "Casacas", value: "casacas" },
  { label: "Accesorios", value: "accesorios" },
  { label: "Calzado", value: "calzado" },
  { label: "Blusas", value: "blusas" },
];

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "U"];

const colors = [
  { label: "Rosa", value: "bg-[#ec4899]" },
  { label: "Negro", value: "bg-[#1f2937]" },
  { label: "Blanco", value: "bg-[#e5e7eb]" },
  { label: "Azul", value: "bg-[#3b82f6]" },
  { label: "Rojo", value: "bg-[#ef4444]" },
  { label: "Verde", value: "bg-[#10b981]" },
  { label: "Amarillo", value: "bg-[#f59e0b]" },
  { label: "Morado", value: "bg-[#8b5cf6]" },
  { label: "Naranja", value: "bg-[#f97316]" },
  { label: "Cyan", value: "bg-[#06b6d4]" },
  { label: "Indigo", value: "bg-[#6366f1]" },
  { label: "Lima", value: "bg-[#84cc16]" },
];

const stockScopes = [
  { label: "Todos", value: "all", icon: SquaresFourIcon },
  { label: "Sucursal Central", value: "central", icon: BuildingsIcon },
  { label: "Sucursal Centro", value: "centro", icon: StorefrontIcon },
];

const productPlaceholderImage =
  "/Logo/ChatGPT Image 24 abr 2026, 19_10_40.png";

type ProductVariant = {
  id: string;
  size: string;
  color: (typeof colors)[number];
};

type VariantMotionState = "enter" | "visible" | "exit";

type PendingColorImage = {
  colorLabel: string;
  colorValue: string;
  image: string;
};

export default function CrearProductoPage() {
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    description: "",
  });
  const [autoSku, setAutoSku] = useState(true);
  const [autoBarcode, setAutoBarcode] = useState(true);
  const [stockScope, setStockScope] = useState("all");
  const [colorImages, setColorImages] = useState<Record<string, string>>({});
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showSizes, setShowSizes] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showSizeSearch, setShowSizeSearch] = useState(false);
  const [showColorSearch, setShowColorSearch] = useState(false);
  const [sizeSearch, setSizeSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const [colorImagePage, setColorImagePage] = useState(0);
  const [productPanelCollapsed, setProductPanelCollapsed] = useState(false);
  const [pendingColorImage, setPendingColorImage] = useState<PendingColorImage | null>(null);
  const [renderedVariants, setRenderedVariants] = useState<ProductVariant[]>([]);
  const [variantMotion, setVariantMotion] = useState<Record<string, VariantMotionState>>({});
  const sizeSearchInputRef = useRef<HTMLInputElement>(null);
  const colorSearchInputRef = useRef<HTMLInputElement>(null);
  const variantExitTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!showSizeSearch) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      sizeSearchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [showSizeSearch]);

  useEffect(() => {
    if (!showColorSearch) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      colorSearchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [showColorSearch]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleColorImageUpload = (
    color: (typeof colors)[number],
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingColorImage({
        colorLabel: color.label,
        colorValue: color.value,
        image: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const acceptPendingColorImage = () => {
    if (!pendingColorImage) {
      return;
    }

    setColorImages((prev) => ({
      ...prev,
      [pendingColorImage.colorValue]: pendingColorImage.image,
    }));
    setPendingColorImage(null);
  };

  const cancelPendingColorImage = () => {
    setPendingColorImage(null);
  };

  const removeColorImage = (colorValue: string) => {
    setColorImages((prev) => {
      const nextImages = { ...prev };
      delete nextImages[colorValue];
      return nextImages;
    });
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((item) => item !== size) : [...prev, size],
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((item) => item !== color) : [...prev, color],
    );
  };

  const toggleSizesList = () => {
    setShowSizes((prev) => {
      if (prev) {
        setShowSizeSearch(false);
        setSizeSearch("");
      }

      return !prev;
    });
  };

  const toggleColorsList = () => {
    setShowColors((prev) => {
      if (prev) {
        setShowColorSearch(false);
        setColorSearch("");
      }

      return !prev;
    });
  };

  const toggleSizeSearch = () => {
    setShowSizeSearch((prev) => {
      if (prev) {
        setSizeSearch("");
      }

      return !prev;
    });
  };

  const toggleColorSearch = () => {
    setShowColorSearch((prev) => {
      if (prev) {
        setColorSearch("");
      }

      return !prev;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", {
      ...formData,
      sizes: selectedSizes,
      colors: selectedColors,
      colorImages,
    });
  };

  const availableSizes = sizes.filter(
    (size) =>
      !selectedSizes.includes(size) &&
    size.toLowerCase().includes(sizeSearch.trim().toLowerCase()),
  );

  const availableColors = colors.filter(
    (color) =>
      !selectedColors.includes(color.value) &&
    color.label.toLowerCase().includes(colorSearch.trim().toLowerCase()),
  );

  const selectedColorItems = useMemo(
    () => colors.filter((color) => selectedColors.includes(color.value)),
    [selectedColors],
  );
  const colorImagesPerPage = 4;
  const colorImagePageCount = Math.max(1, Math.ceil(selectedColorItems.length / colorImagesPerPage));
  const safeColorImagePage = Math.min(colorImagePage, colorImagePageCount - 1);
  const visibleColorImageItems = selectedColorItems.slice(
    safeColorImagePage * colorImagesPerPage,
    safeColorImagePage * colorImagesPerPage + colorImagesPerPage,
  );
  const showColorImageControls = selectedColorItems.length > colorImagesPerPage;
  const productVariants = useMemo<ProductVariant[]>(
    () => selectedSizes.flatMap((size) =>
    selectedColorItems.map((color) => ({
      id: `${size}-${color.value}`,
      size,
      color,
    })),
    ),
    [selectedColorItems, selectedSizes],
  );
  const stockBranchLabels =
    stockScope === "all"
      ? ["Sucursal Central", "Sucursal Centro"]
      : [stockScopes.find((scope) => scope.value === stockScope)?.label ?? "Sucursal Central"];
  const shouldCollapseAutoCodes = autoSku && autoBarcode;
  const renderedVariantSizeGroups = useMemo(() => {
    const sizeOrder = [
      ...selectedSizes,
      ...renderedVariants
        .map((variant) => variant.size)
        .filter((size) => !selectedSizes.includes(size)),
    ];

    return Array.from(new Set(sizeOrder))
      .map((size) => ({
        size,
        variants: renderedVariants.filter((variant) => variant.size === size),
      }))
      .filter((group) => group.variants.length > 0);
  }, [renderedVariants, selectedSizes]);

  useEffect(() => {
    const nextById = new Map(productVariants.map((variant) => [variant.id, variant]));
    const nextIds = new Set(nextById.keys());

    let visibleFrame: number | null = null;

    const animationFrame = requestAnimationFrame(() => {
      setRenderedVariants((current) => {
        const currentIds = new Set(current.map((variant) => variant.id));
        const updatedCurrent = current.map((variant) => nextById.get(variant.id) ?? variant);
        const additions = productVariants.filter((variant) => !currentIds.has(variant.id));

        return [...updatedCurrent, ...additions];
      });

      setVariantMotion((current) => {
        const nextMotion = { ...current };

        nextIds.forEach((id) => {
          const exitTimer = variantExitTimersRef.current[id];

          if (exitTimer) {
            clearTimeout(exitTimer);
            delete variantExitTimersRef.current[id];
          }

          if (!nextMotion[id] || nextMotion[id] === "exit") {
            nextMotion[id] = "enter";
          }
        });

        Object.keys(nextMotion).forEach((id) => {
          if (nextIds.has(id) || nextMotion[id] === "exit") {
            return;
          }

          nextMotion[id] = "exit";
          variantExitTimersRef.current[id] = setTimeout(() => {
            setRenderedVariants((current) => current.filter((variant) => variant.id !== id));
            setVariantMotion((current) => {
              const nextMotion = { ...current };
              delete nextMotion[id];
              return nextMotion;
            });
            delete variantExitTimersRef.current[id];
          }, 260);
        });

        return nextMotion;
      });

      visibleFrame = requestAnimationFrame(() => {
        setVariantMotion((current) => {
          let changed = false;
          const nextMotion = { ...current };

          nextIds.forEach((id) => {
            if (nextMotion[id] === "enter") {
              nextMotion[id] = "visible";
              changed = true;
            }
          });

          return changed ? nextMotion : current;
        });
      });
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      if (visibleFrame !== null) {
        cancelAnimationFrame(visibleFrame);
      }
    };
  }, [productVariants]);

  useEffect(() => {
    const exitTimers = variantExitTimersRef.current;

    return () => {
      Object.values(exitTimers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <DashboardShell
      headerTitle={
        <nav className="flex min-w-0 items-center gap-2" aria-label="Ruta actual">
          <Link
            href="/catalogo/productos"
            className="truncate text-sm font-semibold text-[var(--color-text)]/70 transition-colors hover:text-[var(--color-primary)]"
          >
            Productos
          </Link>
          <CaretRightIcon
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <span className="truncate text-sm font-bold text-[var(--color-text)]">
            Crear Producto
          </span>
        </nav>
      }
    >
      <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-hidden bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <form
          onSubmit={handleSubmit}
          className={cn(
            "grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 pb-2 transition-[grid-template-columns] duration-300",
            productPanelCollapsed
              ? "lg:grid-cols-[76px_minmax(240px,1fr)] lg:gap-5"
              : "lg:grid-cols-[minmax(320px,560px)_minmax(240px,1fr)] lg:gap-6",
          )}
        >
          <section
            className={cn(
              "min-w-0 transition-all duration-300",
              productPanelCollapsed
                ? "sticky top-0 flex h-fit w-[76px] shrink-0 flex-col items-center gap-4 rounded-[18px] bg-[#F4F4F4] px-2 py-3 shadow-sm dark:bg-[var(--color-input-bg)]"
                : "flex w-full max-w-[520px] flex-col gap-5",
            )}
          >
            {productPanelCollapsed ? (
              <>
                <button
                  type="button"
                  onClick={() => setProductPanelCollapsed(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--color-muted-foreground)] shadow-sm transition-colors hover:text-[var(--color-primary)] dark:bg-[var(--color-background)]"
                  aria-label="Expandir panel de producto"
                >
                  <CaretRightIcon size={15} weight="bold" />
                </button>

                <div className="flex w-full flex-col items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Tallas
                  </span>
                  <div className="flex max-h-44 flex-col items-center gap-2 overflow-y-auto pr-0.5">
                    {selectedSizes.length > 0 ? (
                      selectedSizes.map((size) => (
                        <span
                          key={size}
                          className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs font-black text-white"
                        >
                          {size}
                        </span>
                      ))
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black text-[var(--color-muted-foreground)] dark:bg-[var(--color-background)]">
                        -
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-px w-9 bg-[var(--color-border)]/70" />

                <div className="flex w-full flex-col items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Colores
                  </span>
                  <div className="flex max-h-56 flex-col items-center gap-2 overflow-y-auto pr-0.5">
                    {selectedColorItems.length > 0 ? (
                      selectedColorItems.map((color) => (
                        <span
                          key={color.value}
                          className={cn(
                            "h-9 w-9 rounded-full shadow-[0_0_0_3px_#fff] dark:shadow-[0_0_0_3px_var(--color-input-bg)]",
                            color.value,
                          )}
                          aria-label={color.label}
                        />
                      ))
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black text-[var(--color-muted-foreground)] dark:bg-[var(--color-background)]">
                        -
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setProductPanelCollapsed(true)}
                    className="flex h-9 items-center gap-2 rounded-full bg-[var(--color-input-bg)] px-3 text-xs font-bold text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-primary)]"
                    aria-label="Colapsar panel de producto"
                  >
                    <CaretRightIcon size={14} weight="bold" className="rotate-180" />
                    Colapsar
                  </button>
                </div>
            <div className="flex flex-col gap-5">
              <div className="w-full min-w-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    Imagenes por color
                  </label>
                  {showColorImageControls ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setColorImagePage((page) => Math.max(0, page - 1))}
                        disabled={safeColorImagePage === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Ver imagenes anteriores"
                      >
                        <CaretRightIcon size={14} weight="bold" className="rotate-180" />
                      </button>
                      <span className="min-w-7 text-center text-[10px] font-bold text-[var(--color-muted-foreground)]">
                        {safeColorImagePage + 1}/{colorImagePageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setColorImagePage((page) => Math.min(colorImagePageCount - 1, page + 1))
                        }
                        disabled={safeColorImagePage >= colorImagePageCount - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Ver imagenes siguientes"
                      >
                        <CaretRightIcon size={14} weight="bold" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {selectedColorItems.length > 0 ? (
                  <div className="relative">
                    <div key={safeColorImagePage} className="grid grid-cols-4 gap-2">
                      {visibleColorImageItems.map((color, index) => (
                        <div
                          key={`${safeColorImagePage}-${color.value}`}
                          className="group color-image-card-motion relative"
                          style={{ animationDelay: `${index * 45}ms` }}
                        >
                          <label
                            className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border border-[var(--color-border)]/70 bg-[var(--color-card)] px-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)] transition-all hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-input-bg)] dark:shadow-none"
                            aria-label={`Imagen para color ${color.label}`}
                          >
                            {colorImages[color.value] ? (
                              <Image
                                src={colorImages[color.value]}
                                alt={`Imagen color ${color.label}`}
                                fill
                                className="object-contain p-2"
                              />
                            ) : (
                              <>
                                <UploadSimpleIcon
                                  size={24}
                                  weight="light"
                                  className="text-[var(--color-muted-foreground)]"
                                />
                                <span className="mt-1.5 text-xs font-bold text-[var(--color-text)]">
                                  Subir imagen
                                </span>
                                <span className="mt-0.5 max-w-full truncate text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                                  {color.label}
                                </span>
                              </>
                            )}
                            <span
                              className={cn(
                                "absolute top-2 left-2 h-5 w-5 rounded-full shadow-[0_0_0_2px_#fff] dark:shadow-[0_0_0_2px_var(--color-card)]",
                                color.value,
                              )}
                            />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleColorImageUpload(color, event)}
                              className="hidden"
                            />
                          </label>
                          {colorImages[color.value] ? (
                            <button
                              type="button"
                              onClick={() => removeColorImage(color.value)}
                              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ef4444] text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                              aria-label={`Quitar imagen de ${color.label}`}
                            >
                              <XIcon size={12} weight="bold" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[var(--color-card)] px-4 py-6 text-center text-xs font-semibold text-[var(--color-muted-foreground)]">
                    Selecciona un color para agregar su imagen.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-5">
                <div>
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                      Tallas
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSizesList}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#d9dde5] text-[#1f2937] shadow-[0_6px_18px_rgba(17,37,58,0.10)] transition-transform duration-300 hover:scale-105 hover:bg-[#cfd5df]"
                      aria-label={showSizes ? "Cerrar tallas" : "Abrir tallas"}
                      aria-expanded={showSizes}
                    >
                      <PlusIcon
                        size={18}
                        weight="bold"
                        className={cn("transition-transform duration-300", showSizes && "rotate-45")}
                      />
                    </button>
                    {selectedSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className="selected-choice-pop flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] px-3 text-xs font-black text-white transition-transform hover:scale-105"
                      >
                        {size}
                      </button>
                    ))}
                    {!showSizes && selectedSizes.length === 0 ? (
                      <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                        Sin tallas seleccionadas
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out",
                      showSizes
                        ? "mt-3 grid-rows-[1fr] opacity-100 translate-y-0"
                        : "mt-0 grid-rows-[0fr] opacity-0 -translate-y-1",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden px-0.5 py-1">
                      <div className="-m-0.5 flex flex-wrap items-center gap-2 p-0.5">
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={toggleSizeSearch}
                            className="flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-input-bg)] px-3 text-[var(--color-muted-foreground)] transition-transform hover:scale-105"
                            aria-label="Buscar talla"
                            aria-expanded={showSizeSearch}
                          >
                            <MagnifyingGlassIcon size={17} weight="bold" />
                          </button>
                          <button
                            type="button"
                            className="ml-2 flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)]/45 bg-transparent px-3 text-[var(--color-muted-foreground)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-input-bg)] hover:text-[var(--color-primary)]"
                            aria-label="Crear nueva talla"
                          >
                            <PlusIcon size={17} weight="bold" />
                          </button>
                          <label
                            className={cn(
                              "overflow-visible transition-[max-width,opacity,margin-left,transform] duration-300 ease-out",
                              showSizeSearch
                                ? "ml-2 max-w-[170px] translate-x-0 opacity-100"
                                : "ml-0 max-w-0 -translate-x-1 opacity-0 pointer-events-none",
                            )}
                          >
                            <span className="sr-only">Buscar talla</span>
                            <input
                              ref={sizeSearchInputRef}
                              type="text"
                              value={sizeSearch}
                              onChange={(event) => setSizeSearch(event.target.value)}
                              placeholder="Buscar"
                              tabIndex={showSizeSearch ? 0 : -1}
                              className="h-10 w-[170px] rounded-full bg-[var(--color-input-bg)] px-4 text-xs font-semibold text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25"
                            />
                          </label>
                        </div>
                        {availableSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={cn(
                              "flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-black transition-all duration-200",
                              selectedSizes.includes(size)
                                ? "bg-[var(--color-primary)] text-white shadow-[0_6px_14px_rgba(17,37,58,0.14)]"
                                : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                      Colores
                    </p>
                  </div>

                  <div className="-m-1 flex flex-wrap items-center gap-2.5 p-1">
                    <button
                      type="button"
                      onClick={toggleColorsList}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#d9dde5] text-[#1f2937] shadow-[0_6px_18px_rgba(17,37,58,0.10)] transition-transform duration-300 hover:scale-105 hover:bg-[#cfd5df]"
                      aria-label={showColors ? "Cerrar colores" : "Abrir colores"}
                      aria-expanded={showColors}
                    >
                      <PlusIcon
                        size={18}
                        weight="bold"
                        className={cn("transition-transform duration-300", showColors && "rotate-45")}
                      />
                    </button>
                    {selectedColors.map((selectedColor) => {
                      const color = colors.find((item) => item.value === selectedColor);

                      if (!color) {
                        return null;
                      }

                      return (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => toggleColor(color.value)}
                          className={cn(
                            "group relative z-40 selected-choice-pop h-8 w-8 cursor-pointer overflow-visible rounded-full ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)] transition-transform hover:scale-105 hover:z-[80] focus-visible:z-[80]",
                            color.value,
                          )}
                          aria-label={color.label}
                        >
                          <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-full bg-[var(--color-text)] px-3 py-1.5 text-[11px] font-bold leading-none text-white opacity-0 shadow-[0_8px_20px_rgba(17,37,58,0.14)] transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 dark:bg-[var(--color-input-text)] dark:text-[var(--color-background)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                            {color.label}
                          </span>
                        </button>
                      );
                    })}
                    {!showColors && selectedColors.length === 0 ? (
                      <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                        Sin colores seleccionados
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out",
                      showColors
                        ? "mt-3 grid-rows-[1fr] opacity-100 translate-y-0 overflow-visible"
                        : "mt-0 grid-rows-[0fr] opacity-0 -translate-y-1 overflow-hidden",
                    )}
                  >
                    <div
                      className={cn(
                        "min-h-0 px-0.5 pb-1",
                        showColors ? "overflow-visible pt-1" : "overflow-hidden pt-1",
                      )}
                    >
                      <div className="-m-1 flex flex-wrap items-center gap-2.5 p-1">
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={toggleColorSearch}
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-transform hover:scale-105"
                            aria-label="Buscar color"
                            aria-expanded={showColorSearch}
                          >
                            <MagnifyingGlassIcon size={17} weight="bold" />
                          </button>
                          <button
                            type="button"
                            className="ml-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)]/45 bg-transparent text-[var(--color-muted-foreground)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-input-bg)] hover:text-[var(--color-primary)]"
                            aria-label="Crear nuevo color"
                          >
                            <PlusIcon size={17} weight="bold" />
                          </button>
                          <label
                            className={cn(
                              "overflow-visible transition-[max-width,opacity,margin-left,transform] duration-300 ease-out",
                              showColorSearch
                                ? "ml-2 max-w-[170px] translate-x-0 opacity-100"
                                : "ml-0 max-w-0 -translate-x-1 opacity-0 pointer-events-none",
                            )}
                          >
                            <span className="sr-only">Buscar color</span>
                            <input
                              ref={colorSearchInputRef}
                              type="text"
                              value={colorSearch}
                              onChange={(event) => setColorSearch(event.target.value)}
                              placeholder="Buscar"
                              tabIndex={showColorSearch ? 0 : -1}
                              className="h-9 w-[170px] rounded-full bg-[var(--color-input-bg)] px-4 text-xs font-semibold text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25"
                            />
                          </label>
                        </div>
                        {availableColors.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => toggleColor(color.value)}
                            className={cn(
                              "group relative h-8 w-8 cursor-pointer overflow-visible rounded-full transition-all duration-200",
                              color.value,
                              selectedColors.includes(color.value)
                                ? "ring-2 ring-offset-2 ring-offset-[var(--color-background)]"
                                : "",
                            )}
                            aria-label={color.label}
                          >
                            <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-full bg-[var(--color-text)] px-3 py-1.5 text-[11px] font-bold leading-none text-white opacity-0 shadow-[0_8px_20px_rgba(17,37,58,0.14)] transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 dark:bg-[var(--color-input-text)] dark:text-[var(--color-background)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                              {color.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted-foreground)]">
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej: Polo rosado"
                    className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted-foreground)]">
                      Marca
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="Ej: Novitex"
                      className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted-foreground)]">
                      Categoria
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      required
                    >
                      <option value="">Seleccionar</option>
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--color-muted-foreground)]">
                    Descripcion
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detalle del producto..."
                    rows={5}
                    className="w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <Link
                href="/catalogo/productos"
                className="flex h-11 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] px-6 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
              >
                <PackageIcon size={18} weight="bold" />
                Guardar producto
              </button>
            </div>
              </>
            )}
          </section>

          <aside className="flex min-h-[240px] flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAutoSku(!autoSku)}
                className={cn(
                  "flex h-11 items-center justify-between rounded-[16px] bg-[#F4F4F4] px-3 text-xs font-bold shadow-sm transition-all dark:bg-[var(--color-input-bg)]",
                  autoSku
                    ? "text-[var(--color-primary)] dark:text-[var(--color-input-text)]"
                    : "text-[var(--color-muted-foreground)] dark:text-[var(--color-input-text)]",
                )}
              >
                SKU AUTO
                <div className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  autoSku ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
                )}>
                  <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: autoSku ? 'translateX(16px)' : 'translateX(2px)' }}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAutoBarcode(!autoBarcode)}
                className={cn(
                  "flex h-11 items-center justify-between rounded-[16px] bg-[#F4F4F4] px-3 text-xs font-bold shadow-sm transition-all dark:bg-[var(--color-input-bg)]",
                  autoBarcode
                    ? "text-[var(--color-primary)] dark:text-[var(--color-input-text)]"
                    : "text-[var(--color-muted-foreground)] dark:text-[var(--color-input-text)]",
                )}
              >
                COD. BARRAS AUTO
                <div className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  autoBarcode ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
                )}>
                  <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: autoBarcode ? 'translateX(16px)' : 'translateX(2px)' }}
                  />
                </div>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                APLICAR STOCK:
              </p>
              <div className="flex flex-wrap gap-2">
                {stockScopes.map((scope) => {
                  const Icon = scope.icon;
                  const isSelected = stockScope === scope.value;

                  return (
                    <button
                      key={scope.value}
                      type="button"
                      onClick={() => setStockScope(scope.value)}
                      className={cn(
                        "flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-[16px] bg-[#F4F4F4] px-3 text-left text-xs font-bold shadow-sm transition-colors dark:bg-[var(--color-input-bg)]",
                        isSelected
                          ? "text-[var(--color-primary)] dark:text-[var(--color-input-text)]"
                          : "text-[var(--color-muted-foreground)] dark:text-[var(--color-input-text)]/70 hover:text-[var(--color-primary)] dark:hover:text-[var(--color-input-text)]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
                          isSelected
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-white text-[var(--color-muted-foreground)] dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]",
                        )}
                      >
                        <Icon size={15} weight={isSelected ? "fill" : "bold"} />
                      </span>
                      <span className="truncate">{scope.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                PRODUCTOS VARIANTES
              </p>

              {renderedVariants.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {renderedVariantSizeGroups.map((group) => (
                    <section key={group.size} className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs font-black text-white">
                          {group.size}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                          {group.variants.length} colores
                        </span>
                        <span className="h-px flex-1 bg-[var(--color-border)]/60" />
                      </div>

                      <div
                        className={cn(
                          "grid grid-cols-1 gap-3",
                          productPanelCollapsed
                            ? "xl:grid-cols-3 2xl:grid-cols-4"
                            : "xl:grid-cols-2",
                        )}
                      >
                  {group.variants.map((variant) => {
                    const motionState = variantMotion[variant.id] ?? "visible";
                    const variantImage = colorImages[variant.color.value];

                    return (
                    <div
                      key={variant.id}
                      className={cn(
                        "rounded-[18px] bg-[#F4F4F4] p-3 shadow-sm transition-all duration-300 ease-out will-change-transform motion-reduce:transition-none dark:bg-[var(--color-input-bg)]",
                        motionState === "enter" && "translate-y-3 scale-[0.98] opacity-0",
                        motionState === "visible" && "translate-y-0 scale-100 opacity-100",
                        motionState === "exit" && "-translate-y-2 scale-[0.97] opacity-0",
                      )}
                    >
                      <div className="mb-3 flex min-w-0 items-center gap-2">
                        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs font-black text-white">
                          {variant.size}
                        </span>
                        <span
                          className={cn(
                            "h-8 w-8 shrink-0 rounded-full",
                            variant.color.value,
                          )}
                          aria-label={variant.color.label}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-[var(--color-text)] dark:text-[var(--color-input-text)]">
                            Variante {variant.size}
                          </p>
                          <p className="truncate text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                            {variant.color.label}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                        <div className="relative flex aspect-square min-h-24 items-center justify-center overflow-hidden rounded-[16px] bg-white dark:bg-[var(--color-background)]">
                          {variantImage ? (
                            <Image
                              src={variantImage}
                              alt={`Producto variante ${variant.size} ${variant.color.label}`}
                              fill
                              className="object-contain p-2"
                            />
                          ) : (
                            <Image
                              src={productPlaceholderImage}
                              width={76}
                              height={76}
                              alt="Producto sin imagen"
                              className="object-contain brightness-0 opacity-25"
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          {shouldCollapseAutoCodes ? (
                            <details className="group rounded-[14px] bg-white px-3 py-2 dark:bg-[var(--color-background)]">
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)] marker:hidden">
                                SKU y codigo automaticos
                                <CaretRightIcon
                                  size={14}
                                  weight="bold"
                                  className="shrink-0 transition-transform group-open:rotate-90"
                                />
                              </summary>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <label className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                                    SKU
                                  </span>
                                  <input
                                    type="text"
                                    disabled
                                    placeholder="Automatico"
                                    className="h-9 rounded-[12px] bg-[#F4F4F4] px-3 text-xs font-bold text-[var(--color-muted-foreground)] outline-none disabled:cursor-not-allowed [font-family:var(--font-circular-x-sub)] dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70"
                                  />
                                </label>

                                <label className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                                    Cod. barras
                                  </span>
                                  <input
                                    type="text"
                                    disabled
                                    placeholder="Automatico"
                                    className="h-9 rounded-[12px] bg-[#F4F4F4] px-3 text-xs font-bold text-[var(--color-muted-foreground)] outline-none disabled:cursor-not-allowed [font-family:var(--font-circular-x-sub)] dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70"
                                  />
                                </label>
                              </div>
                            </details>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                                  SKU
                                </span>
                                <input
                                  type="text"
                                  disabled
                                  placeholder="Automatico"
                                  className="h-9 rounded-[12px] bg-[#F4F4F4] px-3 text-xs font-bold text-[var(--color-muted-foreground)] outline-none disabled:cursor-not-allowed [font-family:var(--font-circular-x-sub)] dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70"
                                />
                              </label>

                              <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                                  Cod. barras
                                </span>
                                <input
                                  type="text"
                                  disabled
                                  placeholder="Automatico"
                                  className="h-9 rounded-[12px] bg-white px-3 text-xs font-bold text-[var(--color-muted-foreground)] outline-none disabled:cursor-not-allowed [font-family:var(--font-circular-x-sub)] dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]/70"
                                />
                              </label>
                            </div>
                          )}

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {stockBranchLabels.map((branch) => (
                              <label key={`${variant.id}-${branch}`} className="flex min-w-0 flex-col gap-1">
                                <span
                                  className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]"
                                  style={{ fontFamily: "var(--font-circular-x-sub)" }}
                                >
                                  Stock {branch}
                                </span>
                                <div className="relative min-w-0">
                                  <PackageIcon
                                    size={15}
                                    weight="fill"
                                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-primary)]"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="h-9 w-full min-w-0 rounded-[12px] bg-white pr-3 pl-8 text-base font-bold leading-none text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]"
                                    style={{ fontFamily: "var(--font-circular-x-sub)" }}
                                  />
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex flex-col gap-1">
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]"
                              style={{ fontFamily: "var(--font-circular-x-sub)" }}
                            >
                              Compra
                            </span>
                            <div className="relative min-w-0">
                              <span
                                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-bold leading-none text-[var(--color-input-text)]"
                                style={{ fontFamily: "var(--font-circular-x-sub)" }}
                              >
                                S/
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="h-9 w-full min-w-0 rounded-[12px] bg-white pr-2 pl-8 text-base font-bold leading-none text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]"
                                style={{ fontFamily: "var(--font-circular-x-sub)" }}
                              />
                            </div>
                          </label>

                          <label className="flex flex-col gap-1">
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]"
                              style={{ fontFamily: "var(--font-circular-x-sub)" }}
                            >
                              Venta
                            </span>
                            <div className="relative min-w-0">
                              <span
                                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-bold leading-none text-[var(--color-input-text)]"
                                style={{ fontFamily: "var(--font-circular-x-sub)" }}
                              >
                                S/
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="h-9 w-full min-w-0 rounded-[12px] bg-white pr-2 pl-8 text-base font-bold leading-none text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]"
                                style={{ fontFamily: "var(--font-circular-x-sub)" }}
                              />
                            </div>
                          </label>

                          <label className="flex flex-col gap-1">
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted-foreground)]"
                              style={{ fontFamily: "var(--font-circular-x-sub)" }}
                            >
                              Mayor
                            </span>
                            <div className="relative min-w-0">
                              <span
                                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-bold leading-none text-[var(--color-input-text)]"
                                style={{ fontFamily: "var(--font-circular-x-sub)" }}
                              >
                                S/
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="h-9 w-full min-w-0 rounded-[12px] bg-white pr-2 pl-8 text-base font-bold leading-none text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25 dark:bg-[var(--color-background)] dark:text-[var(--color-input-text)]"
                                style={{ fontFamily: "var(--font-circular-x-sub)" }}
                              />
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="rounded-[18px] bg-[#F4F4F4] px-3 py-4 text-xs font-semibold text-[var(--color-muted-foreground)] dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70">
                  Selecciona una talla y un color para formar variantes.
                </div>
              )}
            </div>
          </aside>
        </form>
      </div>

      {pendingColorImage ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/60 px-4 py-8 backdrop-blur-sm">
          <button
            type="button"
            onClick={cancelPendingColorImage}
            className="absolute top-5 right-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[var(--color-muted-foreground)] shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-colors hover:text-[#ef4444] dark:bg-[var(--color-background)]"
            aria-label="Cerrar vista previa"
          >
            <XIcon size={18} weight="bold" />
          </button>

          <div className="relative">
            <span
              className={cn(
                "absolute top-4 left-4 z-10 h-9 w-9 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.92),0_10px_24px_rgba(0,0,0,0.24)]",
                pendingColorImage.colorValue,
              )}
              aria-label={pendingColorImage.colorLabel}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingColorImage.image}
              alt={`Vista previa ${pendingColorImage.colorLabel}`}
              className="max-h-[72dvh] max-w-[92vw] rounded-[24px] object-contain"
            />
          </div>

          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={cancelPendingColorImage}
              className="h-11 min-w-[112px] rounded-[14px] bg-white/90 px-4 text-sm font-bold text-[var(--color-muted-foreground)] shadow-[0_10px_26px_rgba(0,0,0,0.16)] transition-colors hover:text-[var(--color-text)] dark:bg-[var(--color-background)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={acceptPendingColorImage}
              className="h-11 min-w-[112px] rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.18)] transition-opacity hover:opacity-90"
            >
              Aceptar
            </button>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

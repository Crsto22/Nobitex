"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BuildingsIcon,
  CaretRightIcon,
  PackageIcon,
  SquaresFourIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { CatalogSelector } from "@/components/ProductCreate/catalog-selector";
import { ColorButton } from "@/components/ProductCreate/color-button";
import { ImagePreviewModal } from "@/components/ProductCreate/image-preview-modal";
import { ProductColorImagesCarousel } from "@/components/ProductCreate/product-color-images-carousel";
import { QuickColorModal } from "@/components/ProductCreate/quick-color-modal";
import { QuickSizeModal } from "@/components/ProductCreate/quick-size-modal";
import { StockScopeSelector } from "@/components/ProductCreate/stock-scope-selector";
import { ToggleButton } from "@/components/ProductCreate/toggle-button";
import type {
  CatalogColor,
  PendingColorImage,
  ProductColorImage,
  ProductVariant,
  VariantMotionState,
} from "@/components/ProductCreate/types";
import {
  getFormString,
  getOptionalFormString,
  isValidHex,
  mergeById,
  normalizeHex,
  toCatalogColor,
} from "@/components/ProductCreate/utils";
import {
  PriceInput,
  VariantCard,
} from "@/components/ProductCreate/variant-card";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Select } from "@/components/ui/select";
import { brandsApi, type Brand } from "@/lib/api/brands";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { categoriesApi, type Category } from "@/lib/api/categories";
import { colorsApi, type Color } from "@/lib/api/colors";
import { productsApi } from "@/lib/api/products";
import { sizesApi, type Size } from "@/lib/api/sizes";
import { sunatUnitOptions } from "@/lib/sunat-unit-codes";

const productPlaceholderImage = "/Logo/Nuvex.png";
const selectorPageSize = 24;
const normalColor: CatalogColor = {
  id: "normal",
  label: "Producto normal",
  hex: "#11253A",
};
const normalSize: Size = {
  id: "normal",
  empresaId: "",
  nombre: "Normal",
  activo: true,
  createdAt: "",
  updatedAt: "",
};
const normalVariant: ProductVariant = {
  id: "normal",
  color: normalColor,
  size: normalSize,
};

function CrearProductoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const isOnboarding = searchParams.get("onboarding") === "1" && !productId;
  const { showToast } = useSystemToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [productType, setProductType] = useState<"normal" | "variantes">(
    "normal",
  );
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    unitCode: "NIU",
    description: "",
    globalPurchasePrice: "",
    globalSalePrice: "",
    globalWholesalePrice: "",
  });
  const [catalogSizes, setCatalogSizes] = useState<Size[]>([]);
  const [catalogColors, setCatalogColors] = useState<Color[]>([]);
  const [catalogBrands, setCatalogBrands] = useState<Brand[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<Category[]>([]);
  const [catalogBranches, setCatalogBranches] = useState<Branch[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [sizeSearch, setSizeSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const [sizePage, setSizePage] = useState(1);
  const [colorPage, setColorPage] = useState(1);
  const [sizeTotalPages, setSizeTotalPages] = useState(1);
  const [colorTotalPages, setColorTotalPages] = useState(1);
  const [showSizes, setShowSizes] = useState(true);
  const [showColors, setShowColors] = useState(true);
  const [showSizeSearch, setShowSizeSearch] = useState(false);
  const [showColorSearch, setShowColorSearch] = useState(false);
  const [isLoadingSizes, setIsLoadingSizes] = useState(false);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isCreatingSize, setIsCreatingSize] = useState(false);
  const [isCreatingColor, setIsCreatingColor] = useState(false);
  const [quickCreateError, setQuickCreateError] = useState("");
  const [newSizeName, setNewSizeName] = useState("");
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#111827");
  const [autoSku, setAutoSku] = useState(true);
  const [autoBarcode, setAutoBarcode] = useState(true);
  const [stockScope, setStockScope] = useState("all");
  const [colorImages, setColorImages] = useState<
    Record<string, ProductColorImage>
  >({});
  const [pendingColorImage, setPendingColorImage] =
    useState<PendingColorImage | null>(null);
  const [colorImagePage, setColorImagePage] = useState(0);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [renderedVariants, setRenderedVariants] = useState<ProductVariant[]>(
    [],
  );
  const [variantMotion, setVariantMotion] = useState<
    Record<string, VariantMotionState>
  >({});
  const [loadedVariantData, setLoadedVariantData] = useState<
    Record<
      string,
      {
        sku: string | null;
        codigoBarras: string | null;
        precioCompra: string | null;
        precioVenta: string;
        precioMayorista: string | null;
        stocks: Record<string, number>;
      }
    >
  >({});
  const sizeSearchInputRef = useRef<HTMLInputElement>(null);
  const colorSearchInputRef = useRef<HTMLInputElement>(null);
  const variantExitTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const colorImagesRef = useRef<Record<string, ProductColorImage>>({});
  const pendingColorImageRef = useRef<PendingColorImage | null>(null);

  const loadSizes = useCallback(
    async (targetPage = 1, append = false) => {
      setIsLoadingSizes(true);

      try {
        const response = await sizesApi.findAll({
          page: targetPage,
          limit: selectorPageSize,
          search: sizeSearch,
          status: "active",
        });

        setCatalogSizes((currentSizes) =>
          append ? mergeById(currentSizes, response.data) : response.data,
        );
        setSizePage(response.meta.page);
        setSizeTotalPages(response.meta.totalPages);
      } catch (error) {
        showToast({
          title: "No se pudieron cargar tallas",
          description:
            error instanceof Error ? error.message : "Intentalo nuevamente.",
          variant: "error",
        });
      } finally {
        setIsLoadingSizes(false);
      }
    },
    [showToast, sizeSearch],
  );

  const loadColors = useCallback(
    async (targetPage = 1, append = false) => {
      setIsLoadingColors(true);

      try {
        const response = await colorsApi.findAll({
          page: targetPage,
          limit: selectorPageSize,
          search: colorSearch,
          status: "active",
        });

        setCatalogColors((currentColors) =>
          append ? mergeById(currentColors, response.data) : response.data,
        );
        setColorPage(response.meta.page);
        setColorTotalPages(response.meta.totalPages);
      } catch (error) {
        showToast({
          title: "No se pudieron cargar colores",
          description:
            error instanceof Error ? error.message : "Intentalo nuevamente.",
          variant: "error",
        });
      } finally {
        setIsLoadingColors(false);
      }
    },
    [colorSearch, showToast],
  );

  const loadBranches = useCallback(async () => {
    setIsLoadingBranches(true);

    try {
      const response = await branchesApi.findAll({
        page: 1,
        limit: 100,
        estado: "activo",
      });

      setCatalogBranches(response.data);
      setStockScope((currentScope) =>
        currentScope === "all" ||
        response.data.some((branch) => branch.id === currentScope)
          ? currentScope
          : "all",
      );
    } catch (error) {
      showToast({
        title: "No se pudieron cargar sucursales",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoadingBranches(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!showSizeSearch) {
      return;
    }

    if (!window.matchMedia("(min-width: 768px)").matches) return;

    const animationFrame = requestAnimationFrame(() => {
      sizeSearchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [showSizeSearch]);

  useEffect(() => {
    if (!showColorSearch) {
      return;
    }

    if (!window.matchMedia("(min-width: 768px)").matches) return;

    const animationFrame = requestAnimationFrame(() => {
      colorSearchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [showColorSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSizes(1, false);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadSizes]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadColors(1, false);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadColors]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBranches();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  useEffect(() => {
    let isMounted = true;

    brandsApi
      .findAll({ limit: 50, status: "active" })
      .then((response) => {
        if (isMounted) {
          setCatalogBrands(response.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    categoriesApi
      .findAll({ limit: 50, status: "active" })
      .then((response) => {
        if (isMounted) {
          setCatalogCategories(response.data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!productId) {
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingProduct(true);

      productsApi
        .findById(productId)
        .then((product) => {
          if (!isMounted) {
            return;
          }

          setIsEditMode(true);
          setProductType(product.tipo);
          const firstVariant = product.variantes[0];
          setFormData({
            name: product.nombre,
            brand: product.marca?.id ?? "",
            category: product.categoria?.id ?? "",
            unitCode: product.unidadMedida.codigo,
            description: product.descripcion ?? "",
            globalPurchasePrice: firstVariant?.precioCompra ?? "",
            globalSalePrice: firstVariant?.precioVenta ?? "",
            globalWholesalePrice: firstVariant?.precioMayorista ?? "",
          });

          const isNormalProduct = product.tipo === "normal";
          const colorIds = product.colores.flatMap((color) =>
            color.activo ? [color.color.id] : [],
          );
          setSelectedColorIds(isNormalProduct ? [] : colorIds);

          const sizeIds = Array.from(
            new Set(product.variantes.map((v) => v.talla.id)),
          );
          setSelectedSizeIds(isNormalProduct ? [] : sizeIds);

          const imagesByColor: Record<string, ProductColorImage> = {};
          for (const colorGroup of product.colores) {
            const principalImage =
              colorGroup.imagenes.find((img) => img.esPrincipal) ??
              colorGroup.imagenes[0];
            if (principalImage) {
              const imageKey = isNormalProduct
                ? normalColor.id
                : colorGroup.color.id;
              imagesByColor[imageKey] = {
                colorId: imageKey,
                file: null,
                preview: principalImage.urlWebp || principalImage.urlOriginal,
                serverId: principalImage.id,
              };
            }
          }
          setColorImages(imagesByColor);

          const variantDataMap: Record<
            string,
            {
              sku: string | null;
              codigoBarras: string | null;
              precioCompra: string | null;
              precioVenta: string;
              precioMayorista: string | null;
              stocks: Record<string, number>;
            }
          > = {};
          for (const variant of product.variantes) {
            const variantKey = isNormalProduct
              ? normalVariant.id
              : `${variant.talla.id}-${variant.color.id}`;
            const stocks: Record<string, number> = {};
            for (const inv of variant.inventarios) {
              stocks[inv.sucursal.id] = inv.stockActual;
            }
            variantDataMap[variantKey] = {
              sku: variant.sku,
              codigoBarras: variant.codigoBarras,
              precioCompra: variant.precioCompra,
              precioVenta: variant.precioVenta,
              precioMayorista: variant.precioMayorista,
              stocks,
            };
          }
          setLoadedVariantData(variantDataMap);
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          showToast({
            title: "No se pudo cargar el producto",
            description: "Intentalo nuevamente.",
            variant: "error",
          });
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingProduct(false);
          }
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [productId, showToast]);

  const selectedSizeItems = useMemo(
    () =>
      selectedSizeIds
        .map((sizeId) => catalogSizes.find((size) => size.id === sizeId))
        .filter((size): size is Size => Boolean(size)),
    [catalogSizes, selectedSizeIds],
  );

  const selectedColorItems = useMemo(() => {
    const catalogColorItems = catalogColors.map(toCatalogColor);

    return selectedColorIds
      .map((colorId) => catalogColorItems.find((color) => color.id === colorId))
      .filter((color): color is CatalogColor => Boolean(color));
  }, [catalogColors, selectedColorIds]);
  const imageColorItems =
    productType === "normal" ? [normalColor] : selectedColorItems;

  const selectedSizeIdSet = new Set(selectedSizeIds);
  const selectedColorIdSet = new Set(selectedColorIds);
  const availableSizes = catalogSizes.filter(
    (size) => !selectedSizeIdSet.has(size.id),
  );
  const availableColors = catalogColors.flatMap((color) =>
    selectedColorIdSet.has(color.id) ? [] : [toCatalogColor(color)],
  );
  const colorImagesPerPage = 4;
  const colorImagePageCount = Math.max(
    1,
    Math.ceil(imageColorItems.length / colorImagesPerPage),
  );
  const safeColorImagePage = Math.min(colorImagePage, colorImagePageCount - 1);
  const visibleColorImageItems = imageColorItems.slice(
    safeColorImagePage * colorImagesPerPage,
    safeColorImagePage * colorImagesPerPage + colorImagesPerPage,
  );
  const showColorImageControls = imageColorItems.length > colorImagesPerPage;
  const productVariants = useMemo<ProductVariant[]>(
    () =>
      productType === "normal"
        ? [normalVariant]
        : selectedSizeItems.flatMap((size) =>
            selectedColorItems.map((color) => ({
              id: `${size.id}-${color.id}`,
              size,
              color,
            })),
          ),
    [productType, selectedColorItems, selectedSizeItems],
  );
  const stockScopes = useMemo(
    () => [
      { label: "Todos", value: "all", icon: SquaresFourIcon },
      ...catalogBranches.map((branch) => ({
        label: branch.nombre,
        value: branch.id,
        icon: branch.tipo === "tienda" ? StorefrontIcon : BuildingsIcon,
      })),
    ],
    [catalogBranches],
  );
  const stockBranches = useMemo(
    () =>
      stockScope === "all"
        ? catalogBranches
        : catalogBranches.filter((branch) => branch.id === stockScope),
    [catalogBranches, stockScope],
  );
  const shouldCollapseAutoCodes = autoSku && autoBarcode;
  const renderedVariantSizeGroups = useMemo(() => {
    const groupsBySize = new Map<
      string,
      { size: Size; variants: ProductVariant[] }
    >();

    for (const size of selectedSizeItems) {
      groupsBySize.set(size.id, { size, variants: [] });
    }

    for (const variant of renderedVariants) {
      const group = groupsBySize.get(variant.size.id) ?? {
        size: variant.size,
        variants: [],
      };
      group.variants.push(variant);
      groupsBySize.set(variant.size.id, group);
    }

    return Array.from(groupsBySize.values()).filter(
      (group) => group.variants.length > 0,
    );
  }, [renderedVariants, selectedSizeItems]);

  useEffect(() => {
    const nextById = new Map(
      productVariants.map((variant) => [variant.id, variant]),
    );
    const nextIds = new Set(nextById.keys());
    let visibleFrame: number | null = null;

    const animationFrame = requestAnimationFrame(() => {
      setRenderedVariants((current) => {
        const currentIds = new Set(current.map((variant) => variant.id));
        const updatedCurrent = current.map(
          (variant) => nextById.get(variant.id) ?? variant,
        );
        const additions = productVariants.filter(
          (variant) => !currentIds.has(variant.id),
        );

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
            setRenderedVariants((current) =>
              current.filter((variant) => variant.id !== id),
            );
            setVariantMotion((current) => {
              const nextMotionState = { ...current };
              delete nextMotionState[id];
              return nextMotionState;
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setColorImagePage((currentPage) =>
        Math.min(currentPage, colorImagePageCount - 1),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [colorImagePageCount]);

  useEffect(() => {
    colorImagesRef.current = colorImages;
  }, [colorImages]);

  useEffect(() => {
    pendingColorImageRef.current = pendingColorImage;
  }, [pendingColorImage]);

  useEffect(() => {
    return () => {
      Object.values(colorImagesRef.current).forEach((image) => {
        URL.revokeObjectURL(image.preview);
      });

      if (pendingColorImageRef.current) {
        URL.revokeObjectURL(pendingColorImageRef.current.preview);
      }
    };
  }, []);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSize = (sizeId: string) => {
    setSelectedSizeIds((currentSizes) =>
      currentSizes.includes(sizeId)
        ? currentSizes.filter((item) => item !== sizeId)
        : [...currentSizes, sizeId],
    );
  };

  const toggleColor = (colorId: string) => {
    setSelectedColorIds((currentColors) =>
      currentColors.includes(colorId)
        ? currentColors.filter((item) => item !== colorId)
        : [...currentColors, colorId],
    );
  };

  const handleColorImageUpload = (
    color: CatalogColor,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast({
        title: "Archivo no valido",
        description: "Selecciona una imagen del producto.",
        variant: "error",
      });
      return;
    }

    setPendingColorImage((currentPendingImage) => {
      if (currentPendingImage) {
        URL.revokeObjectURL(currentPendingImage.preview);
      }

      return {
        colorId: color.id,
        colorLabel: color.label,
        colorHex: color.hex,
        file,
        preview: URL.createObjectURL(file),
      };
    });
  };

  const acceptPendingColorImage = () => {
    if (!pendingColorImage) {
      return;
    }

    setColorImages((currentImages) => {
      const currentColorImage = currentImages[pendingColorImage.colorId];

      if (currentColorImage) {
        URL.revokeObjectURL(currentColorImage.preview);
      }

      return {
        ...currentImages,
        [pendingColorImage.colorId]: {
          colorId: pendingColorImage.colorId,
          file: pendingColorImage.file,
          preview: pendingColorImage.preview,
        },
      };
    });
    setPendingColorImage(null);
  };

  const cancelPendingColorImage = () => {
    setPendingColorImage((currentPendingImage) => {
      if (currentPendingImage) {
        URL.revokeObjectURL(currentPendingImage.preview);
      }

      return null;
    });
  };

  const removeColorImage = (colorId: string) => {
    setColorImages((currentImages) => {
      const currentColorImage = currentImages[colorId];

      if (!currentColorImage) {
        return currentImages;
      }

      URL.revokeObjectURL(currentColorImage.preview);

      const nextImages = { ...currentImages };
      delete nextImages[colorId];
      return nextImages;
    });
  };

  const openSizeModal = () => {
    setNewSizeName("");
    setQuickCreateError("");
    setIsSizeModalOpen(true);
  };

  const openColorModal = () => {
    setNewColorName("");
    setNewColorHex("#111827");
    setQuickCreateError("");
    setIsColorModalOpen(true);
  };

  const createSize = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuickCreateError("");

    const nombre = newSizeName.trim();

    if (!nombre) {
      setQuickCreateError("Ingresa el nombre de la talla.");
      return;
    }

    setIsCreatingSize(true);

    try {
      const size = await sizesApi.create({ nombre, activo: true });
      setCatalogSizes((currentSizes) => mergeById([size], currentSizes));
      setSelectedSizeIds((currentSizes) =>
        currentSizes.includes(size.id)
          ? currentSizes
          : [...currentSizes, size.id],
      );
      setIsSizeModalOpen(false);
      showToast({
        title: "Talla creada",
        description: `${size.nombre} quedo agregada al producto.`,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la talla.";
      setQuickCreateError(message);
    } finally {
      setIsCreatingSize(false);
    }
  };

  const createColor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuickCreateError("");

    const nombre = newColorName.trim();
    const hex = normalizeHex(newColorHex);

    if (!nombre) {
      setQuickCreateError("Ingresa el nombre del color.");
      return;
    }

    if (!isValidHex(hex)) {
      setQuickCreateError("Ingresa un hexadecimal valido. Ejemplo: #FF7417.");
      return;
    }

    setIsCreatingColor(true);

    try {
      const color = await colorsApi.create({ nombre, hex, activo: true });
      setCatalogColors((currentColors) => mergeById([color], currentColors));
      setSelectedColorIds((currentColors) =>
        currentColors.includes(color.id)
          ? currentColors
          : [...currentColors, color.id],
      );
      setIsColorModalOpen(false);
      showToast({
        title: "Color creado",
        description: `${color.nombre} quedo agregado al producto.`,
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el color.";
      setQuickCreateError(message);
    } finally {
      setIsCreatingColor(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSavingProduct) {
      return;
    }

    const productName = formData.name.trim();

    if (!productName) {
      showToast({
        title: "Ingresa el nombre",
        description: "El producto necesita un nombre para guardarse.",
        variant: "error",
      });
      return;
    }

    if (!formData.category) {
      showToast({
        title: "Selecciona una categoria",
        description: "La categoria es obligatoria para crear el producto.",
        variant: "error",
      });
      return;
    }

    if (
      productType === "variantes" &&
      (selectedSizeItems.length === 0 || selectedColorItems.length === 0)
    ) {
      showToast({
        title: "Completa las variantes",
        description: "Selecciona al menos una talla y un color.",
        variant: "error",
      });
      return;
    }

    const formElement = event.currentTarget;
    const submitForm = new FormData(formElement);
    let variantsPayload: Array<Record<string, unknown>>;

    try {
      variantsPayload = productVariants.map((variant) => {
        const useGlobalPrices =
          productType === "variantes" &&
          getOptionalFormString(submitForm, `priceOverride-${variant.id}`) !==
            "true";
        const pricePrefix = useGlobalPrices ? "global" : variant.id;
        const precioVenta = getFormString(
          submitForm,
          useGlobalPrices ? "globalSalePrice" : `precioVenta-${pricePrefix}`,
        );

        if (!precioVenta) {
          throw new Error(
            useGlobalPrices
              ? "Ingresa el precio de venta global."
              : `Ingresa precio de venta para ${variant.color.label} ${variant.size.nombre}.`,
          );
        }

        return {
          colorId: variant.color.id,
          tallaId: variant.size.id,
          sku: getOptionalFormString(submitForm, `sku-${variant.id}`),
          codigoBarras: getOptionalFormString(
            submitForm,
            `codigoBarras-${variant.id}`,
          ),
          precioCompra: getOptionalFormString(
            submitForm,
            useGlobalPrices
              ? "globalPurchasePrice"
              : `precioCompra-${pricePrefix}`,
          ),
          precioVenta,
          precioMayorista: getOptionalFormString(
            submitForm,
            useGlobalPrices
              ? "globalWholesalePrice"
              : `precioMayorista-${pricePrefix}`,
          ),
          stocks: stockBranches.map((branch) => ({
            sucursalId: branch.id,
            stockActual:
              getOptionalFormString(
                submitForm,
                `stock-${variant.id}-${branch.id}`,
              ) ?? "0",
            stockMinimo: 0,
          })),
          activo: true,
        };
      });
    } catch (error) {
      showToast({
        title: "Completa los precios",
        description:
          error instanceof Error
            ? error.message
            : "Revisa los precios de venta.",
        variant: "error",
      });
      return;
    }

    const productPayload = new FormData();
    productPayload.append("nombre", productName);
    productPayload.append("tipo", productType);
    productPayload.append("categoriaId", formData.category);
    productPayload.append("unidadMedidaCodigo", formData.unitCode);
    productPayload.append("tipoAfectacionIgvCodigo", "10");
    productPayload.append("activo", "true");

    if (formData.brand) {
      productPayload.append("marcaId", formData.brand);
    }

    if (formData.description.trim()) {
      productPayload.append("descripcion", formData.description.trim());
    }

    if (productType === "normal") {
      const simple = { ...variantsPayload[0] };
      delete simple.colorId;
      delete simple.tallaId;
      productPayload.append("simple", JSON.stringify(simple));
    } else {
      productPayload.append(
        "colores",
        JSON.stringify(
          selectedColorItems.map((color) => ({
            colorId: color.id,
            activo: true,
          })),
        ),
      );
      productPayload.append("variantes", JSON.stringify(variantsPayload));
    }

    const selectedColorIdSet = new Set(
      imageColorItems.map((color) => color.id),
    );
    const allImageEntries = Object.values(colorImages).filter((image) =>
      selectedColorIdSet.has(image.colorId),
    );

    const newImageFiles = allImageEntries.filter((image) => image.file);

    productPayload.append(
      "imagenes",
      JSON.stringify(
        allImageEntries.map((image, index) => ({
          ...(productType === "variantes" ? { colorId: image.colorId } : {}),
          orden: index,
          esPrincipal: index === 0,
          ...(image.serverId ? { serverId: image.serverId } : {}),
        })),
      ),
    );

    newImageFiles.forEach((image) => {
      productPayload.append("images", image.file!);
    });

    setIsSavingProduct(true);

    try {
      if (isEditMode && productId) {
        await productsApi.update(productId, productPayload);
        showToast({
          title: "Producto actualizado",
          description: "El producto se actualizo correctamente.",
          variant: "success",
        });
      } else {
        await productsApi.create(productPayload);
        showToast({
          title: "Producto creado",
          description: "El producto se guardo correctamente.",
          variant: "success",
        });
      }
      router.push(isOnboarding ? "/dashboard" : "/catalogo/productos");
    } catch (error) {
      showToast({
        title: isEditMode
          ? "No se pudo actualizar el producto"
          : "No se pudo crear el producto",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  return (
    <DashboardShell
      headerTitle={
        <nav
          className="flex min-w-0 items-center gap-2"
          aria-label="Ruta actual"
        >
          <Link
            href={isOnboarding ? "/onboarding" : "/catalogo/productos"}
            className="truncate text-sm font-circular-regular text-[var(--color-text)]/70 transition-colors hover:text-[var(--color-primary)]"
          >
            {isOnboarding ? "Configuracion inicial" : "Productos"}
          </Link>
          <CaretRightIcon
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {isEditMode ? "Editar Producto" : "Crear Producto"}
          </span>
        </nav>
      }
    >
      <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-hidden bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        {isLoadingProduct && <ClothingLoader />}
        {isLoadingProduct ? null : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 pb-2"
          >
            <div className="inline-flex w-fit rounded-[14px] bg-[var(--color-input-bg)] p-1">
              {(["normal", "variantes"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={isEditMode}
                  onClick={() => setProductType(type)}
                  className={`h-9 rounded-[11px] px-4 text-xs font-circular-bold transition-colors disabled:cursor-not-allowed ${
                    productType === type
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {type === "normal" ? "Producto normal" : "Con variantes"}
                </button>
              ))}
            </div>
            <section className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="flex flex-col gap-5">
                <ProductColorImagesCarousel
                  colors={imageColorItems}
                  colorImages={colorImages}
                  page={safeColorImagePage}
                  pageCount={colorImagePageCount}
                  visibleColors={visibleColorImageItems}
                  showControls={showColorImageControls}
                  simple={productType === "normal"}
                  onPageChange={setColorImagePage}
                  onImageChange={handleColorImageUpload}
                  onImageRemove={removeColorImage}
                />

                {productType === "variantes" ? (
                  <>
                    <CatalogSelector
                      title="Tallas"
                      emptyText="Sin tallas seleccionadas"
                      showList={showSizes}
                      showSearch={showSizeSearch}
                      searchValue={sizeSearch}
                      searchRef={sizeSearchInputRef}
                      onToggleList={() => {
                        setShowSizes((current) => !current);
                        setShowSizeSearch(false);
                        setSizeSearch("");
                      }}
                      onToggleSearch={() =>
                        setShowSizeSearch((current) => !current)
                      }
                      onSearchChange={setSizeSearch}
                      onCreate={openSizeModal}
                    >
                      {selectedSizeItems.map((size) => (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => toggleSize(size.id)}
                          className="selected-choice-pop flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] px-3 text-xs font-black text-white transition-transform hover:scale-105"
                        >
                          {size.nombre}
                        </button>
                      ))}
                      {showSizes
                        ? availableSizes.map((size) => (
                            <button
                              key={size.id}
                              type="button"
                              onClick={() => toggleSize(size.id)}
                              className="flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full bg-[var(--color-input-bg)] px-3 text-xs font-black text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                            >
                              {size.nombre}
                            </button>
                          ))
                        : null}
                      {showSizes && sizePage < sizeTotalPages ? (
                        <button
                          type="button"
                          onClick={() => void loadSizes(sizePage + 1, true)}
                          disabled={isLoadingSizes}
                          className="flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-full bg-[var(--color-input-bg)] px-3 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Cargar mas tallas"
                        >
                          <CaretRightIcon size={17} weight="bold" />
                        </button>
                      ) : null}
                      {!showSizes && selectedSizeItems.length === 0 ? (
                        <span className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                          Sin tallas seleccionadas
                        </span>
                      ) : null}
                    </CatalogSelector>

                    <CatalogSelector
                      title="Colores"
                      emptyText="Sin colores seleccionados"
                      showList={showColors}
                      showSearch={showColorSearch}
                      searchValue={colorSearch}
                      searchRef={colorSearchInputRef}
                      onToggleList={() => {
                        setShowColors((current) => !current);
                        setShowColorSearch(false);
                        setColorSearch("");
                      }}
                      onToggleSearch={() =>
                        setShowColorSearch((current) => !current)
                      }
                      onSearchChange={setColorSearch}
                      onCreate={openColorModal}
                    >
                      {selectedColorItems.map((color) => (
                        <ColorButton
                          key={color.id}
                          color={color}
                          selected
                          onClick={() => toggleColor(color.id)}
                        />
                      ))}
                      {showColors
                        ? availableColors.map((color) => (
                            <ColorButton
                              key={color.id}
                              color={color}
                              onClick={() => toggleColor(color.id)}
                            />
                          ))
                        : null}
                      {showColors && colorPage < colorTotalPages ? (
                        <button
                          type="button"
                          onClick={() => void loadColors(colorPage + 1, true)}
                          disabled={isLoadingColors}
                          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Cargar mas colores"
                        >
                          <CaretRightIcon size={16} weight="bold" />
                        </button>
                      ) : null}
                      {!showColors && selectedColorItems.length === 0 ? (
                        <span className="text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                          Sin colores seleccionados
                        </span>
                      ) : null}
                    </CatalogSelector>
                  </>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <div>
                  <label
                    htmlFor="product-name"
                    className="mb-1.5 block text-xs font-circular-regular text-[var(--color-muted-foreground)]"
                  >
                    Nombre del producto
                  </label>
                  <input
                    id="product-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej: Polo oversize basico"
                    className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    options={catalogBrands.map((brand) => ({
                      label: brand.nombre,
                      value: brand.id,
                    }))}
                    value={formData.brand}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, brand: value }))
                    }
                    placeholder="Seleccionar"
                    label="Marca"
                    searchable
                  />
                  <Select
                    options={catalogCategories.map((category) => ({
                      label: category.nombre,
                      value: category.id,
                    }))}
                    value={formData.category}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                    placeholder="Seleccionar"
                    label="Categoria"
                    searchable
                    required
                  />
                  <Select
                    options={sunatUnitOptions}
                    value={formData.unitCode}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, unitCode: value }))
                    }
                    placeholder="NIU - Unidad"
                    label="Unidad SUNAT"
                    searchable
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-description"
                    className="mb-1.5 block text-xs font-circular-regular text-[var(--color-muted-foreground)]"
                  >
                    Descripcion
                  </label>
                  <textarea
                    id="product-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detalle del producto..."
                    rows={5}
                    className="w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>

                {productType === "variantes" ? (
                  <div className="grid grid-cols-3 gap-3">
                    <PriceInput
                      name="globalPurchasePrice"
                      label="Compra"
                      initialValue={formData.globalPurchasePrice}
                      surface="page"
                    />
                    <PriceInput
                      name="globalSalePrice"
                      label="Venta"
                      required
                      initialValue={formData.globalSalePrice}
                      surface="page"
                    />
                    <PriceInput
                      name="globalWholesalePrice"
                      label="Mayor"
                      initialValue={formData.globalWholesalePrice}
                      surface="page"
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton
                    active={autoSku}
                    onClick={() => setAutoSku(!autoSku)}
                  >
                    SKU AUTO
                  </ToggleButton>
                  <ToggleButton
                    active={autoBarcode}
                    onClick={() => setAutoBarcode(!autoBarcode)}
                  >
                    COD. BARRAS AUTO
                  </ToggleButton>
                </div>
              </div>
            </section>

            <div className="h-px bg-[var(--color-border)]" />

            <aside className="flex flex-col gap-4">
              <StockScopeSelector
                scopes={stockScopes}
                selectedScope={stockScope}
                isLoading={isLoadingBranches}
                hasBranches={catalogBranches.length > 0}
                onScopeChange={setStockScope}
              />

              <div className="flex flex-col gap-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  {productType === "normal"
                    ? "DATOS"
                    : "PRODUCTOS VARIANTES"}
                </p>

                {productType === "normal" ? (
                  <VariantCard
                    variant={normalVariant}
                    motionState="visible"
                    imagePreview={colorImages[normalColor.id]?.preview ?? ""}
                    placeholderImage={productPlaceholderImage}
                    branches={stockBranches}
                    shouldCollapseAutoCodes={shouldCollapseAutoCodes}
                    autoSku={autoSku}
                    autoBarcode={autoBarcode}
                    simple
                    initialValues={loadedVariantData[normalVariant.id]}
                  />
                ) : renderedVariants.length > 0 ? (
                  <div className="flex flex-col gap-5">
                    {renderedVariantSizeGroups.map((group) => (
                      <section
                        key={group.size.id}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs font-black text-white">
                            {group.size.nombre}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                            {group.variants.length} colores
                          </span>
                          <span className="h-px flex-1 bg-[var(--color-border)]/60" />
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {group.variants.map((variant) => {
                            const motionState =
                              variantMotion[variant.id] ?? "visible";
                            const initialValues = loadedVariantData[variant.id];
                            const hasCustomPrices =
                              initialValues &&
                              ((initialValues.precioCompra ?? "") !==
                                formData.globalPurchasePrice ||
                                initialValues.precioVenta !==
                                  formData.globalSalePrice ||
                                (initialValues.precioMayorista ?? "") !==
                                  formData.globalWholesalePrice);

                            return (
                              <VariantCard
                                key={variant.id}
                                variant={variant}
                                motionState={motionState}
                                imagePreview={
                                  colorImages[variant.color.id]?.preview ?? ""
                                }
                                placeholderImage={productPlaceholderImage}
                                branches={stockBranches}
                                shouldCollapseAutoCodes={
                                  shouldCollapseAutoCodes
                                }
                                autoSku={autoSku}
                                autoBarcode={autoBarcode}
                                allowPriceEdit
                                defaultPriceEditorOpen={hasCustomPrices}
                                initialValues={initialValues}
                              />
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[18px] bg-[#F4F4F4] px-3 py-4 text-xs font-circular-regular text-[var(--color-muted-foreground)] dark:bg-[var(--color-input-bg)] dark:text-[var(--color-input-text)]/70">
                    Selecciona una talla y un color para formar variantes.
                  </div>
                )}
              </div>
            </aside>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href={isOnboarding ? "/dashboard" : "/catalogo/productos"}
                className="flex h-11 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] px-6 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                {isOnboarding ? "Omitir por ahora" : "Cancelar"}
              </Link>
              <button
                type="submit"
                disabled={isSavingProduct}
                className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-65"
              >
                <PackageIcon size={18} weight="bold" />
                {isSavingProduct ? "Guardando..." : "Guardar producto"}
              </button>
            </div>
          </form>
        )}
        {isSavingProduct && <ClothingLoader />}
      </div>

      <QuickSizeModal
        isOpen={isSizeModalOpen}
        isSaving={isCreatingSize}
        value={newSizeName}
        error={quickCreateError}
        onChange={setNewSizeName}
        onClose={() => setIsSizeModalOpen(false)}
        onSubmit={createSize}
      />
      <QuickColorModal
        isOpen={isColorModalOpen}
        isSaving={isCreatingColor}
        name={newColorName}
        hex={newColorHex}
        error={quickCreateError}
        onNameChange={setNewColorName}
        onHexChange={setNewColorHex}
        onClose={() => setIsColorModalOpen(false)}
        onSubmit={createColor}
      />
      <ImagePreviewModal
        pendingImage={pendingColorImage}
        onCancel={cancelPendingColorImage}
        onAccept={acceptPendingColorImage}
      />
    </DashboardShell>
  );
}

function ClothingLoader() {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-background)]/60 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <Image
        src="/svg/loader/Loader.svg"
        alt="Cargando"
        width={140}
        height={140}
        className="h-[140px] w-[140px]"
      />
    </div>
  );
}

export default function CrearProductoPage() {
  return (
    <Suspense>
      <CrearProductoPageContent />
    </Suspense>
  );
}

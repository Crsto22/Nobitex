"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsClockwiseIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  CheckSquareIcon,
  ClockIcon,
  ColumnsIcon,
  FunnelIcon,
  HouseIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MinusIcon,
  MotorcycleIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptIcon,
  RowsIcon,
  SpinnerGapIcon,
  StorefrontIcon,
  TruckIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { CalendarInput } from "@/components/ui/calendar-input";
import { EmptyIllustration } from "@/components/ui/empty-illustration";
import { Select } from "@/components/ui/select";
import { ShippingLinkModal } from "@/components/Ventas/shipping-link-modal";
import { useAuth } from "@/lib/auth/auth-provider";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  GenericClientAvatar,
  UserAvatar,
} from "@/components/UserAvatar/user-avatar";
import {
  salesApi,
  type DeliveryCounts,
  type DeliveryPrintable,
  type DeliveryStatusQuery,
  type SaleShippingDetails,
  type SaleShippingLogisticsStatus,
  type VentaResponse,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";

type PageTab = "pendiente" | "enviado" | "entregada";
type ViewMode = "pickup" | "courier";
type DateFilterType = "" | "venta" | "envio";
type DateRangePreset =
  | ""
  | "today"
  | "yesterday"
  | "tomorrow"
  | "week"
  | "month"
  | "next7"
  | "custom";

const pageSize = 20;
const MAX_SELECTED_LABELS = 100;

const emptyDeliveryCounts: DeliveryCounts = {
  todos: 0,
  shalom: 0,
  olva: 0,
  motorizado: 0,
  domicilio: 0,
  recojo: 0,
};
const courierTabConfig: Array<{ label: string; value: PageTab }> = [
  { label: "Pendientes", value: "pendiente" },
  { label: "Enviados", value: "enviado" },
];
const pickupTabConfig: Array<{ label: string; value: PageTab }> = [
  { label: "Pendientes", value: "pendiente" },
  { label: "Entregados", value: "entregada" },
];

type ServiceTab = "" | "SHALOM" | "OLVA" | "MOTORIZADO" | "DOMICILIO";

const serviceTabConfig: Array<{
  label: string;
  value: ServiceTab;
  activeClass: string;
}> = [
  {
    label: "Todos",
    value: "",
    activeClass: "bg-[var(--color-primary)] text-white shadow-sm",
  },
  {
    label: "Shalom",
    value: "SHALOM",
    activeClass: "bg-[#dc2626] text-white shadow-sm hover:bg-[#b91c1c]",
  },
  {
    label: "Olva",
    value: "OLVA",
    activeClass: "bg-[#facc15] text-black shadow-sm hover:bg-[#eab308]",
  },
  {
    label: "Motorizado",
    value: "MOTORIZADO",
    activeClass: "bg-[#10b981] text-white shadow-sm hover:bg-[#059669]",
  },
  {
    label: "Domicilio",
    value: "DOMICILIO",
    activeClass: "bg-[#7c3aed] text-white shadow-sm hover:bg-[#6d28d9]",
  },
];

const logisticsLabels: Record<
  SaleShippingLogisticsStatus,
  { label: string; className: string }
> = {
  POR_PREPARAR: {
    label: "Pendiente",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  POR_DESPACHAR: {
    label: "Pendiente",
    className: "bg-[#7c3aed]/10 text-[#6d28d9]",
  },
  EN_TRANSITO: {
    label: "Enviado",
    className: "bg-[#3b82f6]/10 text-[#1d4ed8]",
  },
  ENTREGADO: {
    label: "Enviado",
    className: "bg-[#10b981]/10 text-[#047857]",
  },
  INCIDENCIA: {
    label: "Enviado",
    className: "bg-[#ef4444]/10 text-[#b91c1c]",
  },
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function limaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysToIso(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatFechaEnvio(value: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function logisticsStatus(sale: VentaResponse): SaleShippingLogisticsStatus {
  if (sale.envio) return sale.envio.estadoLogistico;
  return sale.estadoEntrega === "entregada" ? "ENTREGADO" : "POR_PREPARAR";
}

function customerName(sale: VentaResponse) {
  return sale.cliente?.nombre || "Cliente genérico";
}

function canMarkShipped(sale: VentaResponse) {
  if (sale.envio?.estado !== "recibido") return false;
  if (sale.envio.metodoEnvio === "RECOJO") return false;
  if (
    sale.envio.estadoLogistico !== "POR_PREPARAR" &&
    sale.envio.estadoLogistico !== "POR_DESPACHAR"
  ) {
    return false;
  }
  return sale.detalles.some(
    (detail) => detail.cantidad - detail.cantidadEntregada > 0,
  );
}

function isLocalDeliveryMethod(sale: VentaResponse) {
  return (
    sale.envio?.metodoEnvio === "MOTORIZADO" ||
    sale.envio?.metodoEnvio === "DOMICILIO"
  );
}

function canPrintLabel(sale: VentaResponse) {
  if (!sale.envio || sale.envio.estado !== "recibido") return false;
  if (isPickupDelivery(sale)) return true;
  if (isLocalDeliveryMethod(sale)) return true;
  return Boolean(sale.envio.agencia);
}

function isPickupDelivery(sale: VentaResponse) {
  return (
    sale.envio?.metodoEnvio === "RECOJO" ||
    (!sale.envio && sale.recojoPosterior)
  );
}

function hasPendingUnits(sale: VentaResponse) {
  return sale.detalles.some(
    (detail) => detail.cantidad - detail.cantidadEntregada > 0,
  );
}

function canDeliverToClient(sale: VentaResponse) {
  if (logisticsStatus(sale) === "ENTREGADO") return false;
  if (sale.envio && sale.envio.estado !== "recibido") return false;
  return hasPendingUnits(sale);
}

function serviceLabel(sale: VentaResponse) {
  if (sale.envio?.metodoEnvio === "MOTORIZADO") return "Motorizado";
  if (sale.envio?.metodoEnvio === "DOMICILIO") return "Envío a domicilio";
  return sale.envio?.agencia === "OLVA" ? "Olva" : "Shalom";
}

function serviceDestination(sale: VentaResponse) {
  if (isLocalDeliveryMethod(sale)) {
    return sale.envio?.direccionEntrega || "Sin dirección";
  }
  return sale.envio?.agenciaNombre || "Agencia seleccionada";
}

export default function DeliveriesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("courier");
  const [activeTab, setActiveTab] = useState<PageTab>("pendiente");
  const [sales, setSales] = useState<VentaResponse[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    counts: emptyDeliveryCounts,
  });
  const [isLoadingPrintAll, setIsLoadingPrintAll] = useState(false);
  const [printAllSales, setPrintAllSales] = useState<DeliveryPrintable[] | null>(
    null,
  );
  const [printAllTotal, setPrintAllTotal] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [servicio, setServicio] = useState<ServiceTab>("");
  const [dateFilterType, setDateFilterType] =
    useState<DateFilterType>("envio");
  const [datePreset, setDatePreset] = useState<DateRangePreset>("");
  const [customDate, setCustomDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fulfillment, setFulfillment] = useState<VentaResponse | null>(null);
  const [shippingLinkSale, setShippingLinkSale] =
    useState<VentaResponse | null>(null);
  const [selectedShippingSales, setSelectedShippingSales] = useState<
    VentaResponse[]
  >([]);
  const [labelSales, setLabelSales] = useState<VentaResponse[] | null>(null);
  const [bulkShipSales, setBulkShipSales] = useState<VentaResponse[] | null>(
    null,
  );
  const [bulkDeliverySales, setBulkDeliverySales] = useState<
    VentaResponse[] | null
  >(null);
  const toast = useSystemToast();
  const { user } = useAuth();
  const canUseShipping =
    user?.moduleKeys?.includes("envios-config") ?? false;

  const dateFilter = useMemo(() => {
    const empty = {
      period: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      fechaEnvioDesde: undefined,
      fechaEnvioHasta: undefined,
    };
    if (!dateFilterType || !datePreset) return empty;

    if (dateFilterType === "venta") {
      if (datePreset === "custom") {
        if (!customDate) return empty;
        return {
          ...empty,
          period: "custom" as const,
          dateFrom: customDate,
          dateTo: customDate,
        };
      }
      if (
        datePreset === "today" ||
        datePreset === "yesterday" ||
        datePreset === "week" ||
        datePreset === "month"
      ) {
        return { ...empty, period: datePreset };
      }
      return empty;
    }

    if (!datePreset) return empty;

    let desde: string | undefined;
    let hasta: string | undefined;
    if (datePreset === "custom") {
      desde = customDate || undefined;
      hasta = customDate || undefined;
    } else {
      const today = limaToday();
      if (datePreset === "today") {
        desde = today;
        hasta = today;
      } else if (datePreset === "tomorrow") {
        const tomorrow = addDaysToIso(today, 1);
        desde = tomorrow;
        hasta = tomorrow;
      } else if (datePreset === "next7") {
        desde = today;
        hasta = addDaysToIso(today, 6);
      } else {
        const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
        const daysToSunday = (7 - weekday) % 7;
        desde = today;
        hasta = addDaysToIso(today, daysToSunday);
      }
    }

    return { ...empty, fechaEnvioDesde: desde, fechaEnvioHasta: hasta };
  }, [dateFilterType, datePreset, customDate]);

  const loadDeliveries = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const response = await salesApi.findDeliveries({
        mode: viewMode,
        estado: activeTab as DeliveryStatusQuery,
        page,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        servicio: viewMode === "courier" ? servicio || undefined : undefined,
        period: dateFilter.period,
        dateFrom: dateFilter.dateFrom,
        dateTo: dateFilter.dateTo,
        fechaEnvioDesde: dateFilter.fechaEnvioDesde,
        fechaEnvioHasta: dateFilter.fechaEnvioHasta,
      });
      if (requestId !== requestIdRef.current) return;
      const readySales = response.data.filter(
        (sale) => !sale.envio || sale.envio.estado === "recibido",
      );
      setSales((current) => {
        if (page === 1) return readySales;
        const seen = new Set(current.map((sale) => sale.publicId));
        return [
          ...current,
          ...readySales.filter((sale) => !seen.has(sale.publicId)),
        ];
      });
      setMeta(
        response.meta
          ? {
              ...response.meta,
              counts: response.meta.counts ?? emptyDeliveryCounts,
            }
          : {
              page,
              limit: pageSize,
              total: readySales.length,
              totalPages: 1,
              counts: emptyDeliveryCounts,
            },
      );
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      toast.showToast({
        title: "No se pudieron cargar las entregas",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    activeTab,
    servicio,
    dateFilter,
    debouncedSearchTerm,
    page,
    toast,
    viewMode,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    // La carga remota sincroniza la vista cada vez que cambian filtros o página.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDeliveries();
  }, [loadDeliveries]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || isLoading) return;
        setPage((current) =>
          current < meta.totalPages ? current + 1 : current,
        );
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isLoading, meta.totalPages]);

  const refreshDeliveries = useCallback(() => {
    setSelectedShippingSales([]);
    setSales([]);
    if (page === 1) {
      void loadDeliveries();
    } else {
      setPage(1);
    }
  }, [loadDeliveries, page]);

  const updateShippingLocally = useCallback(
    (saleId: string, shipping: SaleShippingDetails) => {
      setSales((current) =>
        current.map((sale) =>
          sale.publicId === saleId ? { ...sale, envio: shipping } : sale,
        ),
      );
      setShippingLinkSale((current) =>
        current?.publicId === saleId ? { ...current, envio: shipping } : current,
      );
    },
    [],
  );

  const visibleTabs =
    viewMode === "pickup"
      ? pickupTabConfig.map((tab) => ({
          ...tab,
          label:
            tab.value === "pendiente"
              ? `${tab.label} (${meta.counts.recojo})`
              : tab.label,
        }))
      : courierTabConfig;

  const serviceCount = (value: ServiceTab) => {
    switch (value) {
      case "SHALOM":
        return meta.counts.shalom;
      case "OLVA":
        return meta.counts.olva;
      case "MOTORIZADO":
        return meta.counts.motorizado;
      case "DOMICILIO":
        return meta.counts.domicilio;
      default:
        return meta.counts.todos;
    }
  };

  const openPrintAll = async () => {
    if (isLoadingPrintAll) return;
    setIsLoadingPrintAll(true);
    try {
      const response = await salesApi.findDeliveryPrintables({
        mode: viewMode,
        estado: "pendiente",
        search: debouncedSearchTerm || undefined,
        servicio: viewMode === "courier" ? servicio || undefined : undefined,
        period: dateFilter.period,
        dateFrom: dateFilter.dateFrom,
        dateTo: dateFilter.dateTo,
        fechaEnvioDesde: dateFilter.fechaEnvioDesde,
        fechaEnvioHasta: dateFilter.fechaEnvioHasta,
      });
      if (!response.data.length) {
        toast.showToast({
          title: "No hay pendientes para imprimir",
          description: "Ajusta los filtros o actualiza la lista.",
          variant: "info",
        });
        return;
      }
      setPrintAllSales(response.data);
      setPrintAllTotal(response.meta.total);
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudieron preparar las etiquetas",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoadingPrintAll(false);
    }
  };

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setActiveTab("pendiente");
    if (mode === "pickup") {
      setServicio("");
    }
    setSelectedShippingSales([]);
    setPage(1);
  };

  const toggleShippingSale = (sale: VentaResponse, selected: boolean) => {
    if (selected) {
      const alreadySelected = selectedShippingSales.some(
        (item) => item.publicId === sale.publicId,
      );
      if (
        !alreadySelected &&
        selectedShippingSales.length >= MAX_SELECTED_LABELS
      ) {
        toast.showToast({
          title: `Máximo ${MAX_SELECTED_LABELS} ventas por impresión`,
          description:
            "Imprime este bloque y continúa con el siguiente grupo de pendientes.",
          variant: "info",
        });
        return;
      }
    }

    setSelectedShippingSales((current) =>
      selected
        ? current.some((item) => item.publicId === sale.publicId)
          ? current
          : [...current, sale]
        : current.filter((item) => item.publicId !== sale.publicId),
    );
  };

  const selectableSales = useMemo(
    () =>
      viewMode === "courier"
        ? sales.filter((sale) => sale.envio?.estado === "recibido")
        : sales.filter(
            (sale) => canPrintLabel(sale) || canDeliverToClient(sale),
          ),
    [sales, viewMode],
  );
  const markableSelected = useMemo(
    () => selectedShippingSales.filter((sale) => canMarkShipped(sale)),
    [selectedShippingSales],
  );
  const deliverableSelected = useMemo(
    () => selectedShippingSales.filter((sale) => canDeliverToClient(sale)),
    [selectedShippingSales],
  );
  const printableSelected = useMemo(
    () => selectedShippingSales.filter((sale) => canPrintLabel(sale)),
    [selectedShippingSales],
  );
  const allSelectableSelected =
    selectableSales.length > 0 &&
    selectableSales.every((sale) =>
      selectedShippingSales.some((item) => item.publicId === sale.publicId),
    );

  const toggleSelectAll = () => {
    if (
      !allSelectableSelected &&
      selectedShippingSales.length >= MAX_SELECTED_LABELS
    ) {
      toast.showToast({
        title: `Máximo ${MAX_SELECTED_LABELS} ventas por impresión`,
        description:
          "Imprime este bloque y continúa con el siguiente grupo de pendientes.",
        variant: "info",
      });
      return;
    }

    setSelectedShippingSales((current) => {
      if (allSelectableSelected) {
        return current.filter(
          (item) =>
            !selectableSales.some((sale) => sale.publicId === item.publicId),
        );
      }
      const next = new Map(current.map((item) => [item.publicId, item]));
      for (const sale of selectableSales) {
        if (next.size >= MAX_SELECTED_LABELS) break;
        next.set(sale.publicId, sale);
      }
      return Array.from(next.values());
    });
  };

  const showBulkShip = viewMode === "courier" && markableSelected.length > 0;
  const showBulkDelivery =
    viewMode === "pickup" && deliverableSelected.length > 0;
  const showBulkPrint = printableSelected.length > 0;
  const mobileBulkActionsClassName = cn(
    "grid gap-2 lg:hidden",
    (showBulkShip || showBulkDelivery) && showBulkPrint
      ? "grid-cols-2"
      : "grid-cols-1",
  );

  return (
    <DashboardShell
      headerTitle="Entregas y envíos"
      headerContent={
        <div className="flex items-center gap-2">
          <ViewModeSwitch
            viewMode={viewMode}
            onChange={changeViewMode}
            className="w-auto"
          />
          {viewMode === "courier" && markableSelected.length > 0 ? (
            <button
              type="button"
              onClick={() => setBulkShipSales(markableSelected)}
              className="hidden h-10 items-center gap-2 rounded-[14px] bg-[#10b981] px-4 text-xs font-bold text-white hover:bg-[#059669] dark:bg-[#059669] dark:hover:bg-[#047857] lg:inline-flex"
            >
              <TruckIcon size={17} weight="bold" />
              Enviar ({markableSelected.length})
            </button>
          ) : null}
          {viewMode === "pickup" && deliverableSelected.length > 0 ? (
            <button
              type="button"
              onClick={() => setBulkDeliverySales(deliverableSelected)}
              className="hidden h-10 items-center gap-2 rounded-[14px] bg-[#10b981] px-4 text-xs font-bold text-white hover:bg-[#059669] dark:bg-[#059669] dark:hover:bg-[#047857] lg:inline-flex"
            >
              <PackageIcon size={17} weight="bold" />
              Entregar ({deliverableSelected.length})
            </button>
          ) : null}
          {printableSelected.length > 0 ? (
            <button
              type="button"
              onClick={() => setLabelSales(printableSelected)}
              className="hidden h-10 items-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-xs font-bold text-white lg:inline-flex"
            >
              <PrinterIcon size={17} weight="bold" />
              Imprimir ({printableSelected.length})
            </button>
          ) : null}
        </div>
      }
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6">
        <div className="lg:hidden">
          <ViewModeSwitch
            viewMode={viewMode}
            onChange={changeViewMode}
            className="w-full sm:w-auto"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-3 space-y-3 bg-[var(--color-background)] px-3 py-2 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
          {showBulkShip || showBulkDelivery || showBulkPrint ? (
            <div className={mobileBulkActionsClassName}>
              {showBulkShip ? (
                <button
                  type="button"
                  onClick={() => setBulkShipSales(markableSelected)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-[#10b981] px-3 text-xs font-bold text-white hover:bg-[#059669] dark:bg-[#059669] dark:hover:bg-[#047857] lg:hidden"
                >
                  <TruckIcon size={17} weight="bold" />
                  Enviar ({markableSelected.length})
                </button>
              ) : null}
              {showBulkDelivery ? (
                <button
                  type="button"
                  onClick={() => setBulkDeliverySales(deliverableSelected)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-[#10b981] px-3 text-xs font-bold text-white hover:bg-[#059669] dark:bg-[#059669] dark:hover:bg-[#047857] lg:hidden"
                >
                  <PackageIcon size={17} weight="bold" />
                  Entregar ({deliverableSelected.length})
                </button>
              ) : null}
              {showBulkPrint ? (
                <button
                  type="button"
                  onClick={() => setLabelSales(printableSelected)}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-3 text-xs font-bold text-white lg:hidden"
                >
                  <PrinterIcon size={17} weight="bold" />
                  Imprimir ({printableSelected.length})
                </button>
              ) : null}
            </div>
          ) : null}

          {viewMode === "courier" ? (
            <div
              role="tablist"
              aria-label="Servicio de envío"
              className="flex w-full gap-1 overflow-x-auto rounded-[16px] bg-[var(--color-input-bg)] p-1 sm:max-w-2xl"
            >
              {serviceTabConfig.map((tab) => (
                <button
                  key={tab.value || "todos"}
                  type="button"
                  role="tab"
                  aria-selected={servicio === tab.value}
                  onClick={() => {
                    setServicio(tab.value);
                    setPage(1);
                  }}
                  className={cn(
                    "h-10 min-w-fit flex-1 rounded-[14px] px-4 text-xs font-circular-bold whitespace-nowrap transition-colors sm:text-sm",
                    servicio === tab.value
                      ? tab.activeClass
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]",
                  )}
                  aria-label={`${tab.label} (${serviceCount(tab.value)} pendientes)`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {tab.label}
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] leading-none dark:bg-white/15">
                      {serviceCount(tab.value)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-wrap">
            <label className="relative w-full min-w-0 sm:flex-1">
              <MagnifyingGlassIcon
                size={18}
                weight="bold"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar venta, cliente o DNI"
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>
            <div
              className={cn(
                "grid w-full gap-2 sm:w-auto sm:flex-1 sm:grid-cols-2 lg:flex lg:flex-none lg:items-center",
                showFilters ? "" : "hidden lg:flex",
              )}
            >
              <FilterSelect
                className="lg:w-40"
                value={activeTab}
                onChange={(value) => {
                  setActiveTab(value as PageTab);
                  setSelectedShippingSales([]);
                  setPage(1);
                }}
                options={visibleTabs}
              />
              <FilterSelect
                className="lg:w-44"
                value={dateFilterType}
                onChange={(value) => {
                  setDateFilterType(value as DateFilterType);
                  setDatePreset("");
                  setCustomDate("");
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Sin filtro de fecha" },
                  { value: "venta", label: "Fecha de venta" },
                  { value: "envio", label: "Fecha de envío" },
                ]}
              />
              {dateFilterType ? (
                <FilterSelect
                  className="lg:w-44"
                  value={datePreset}
                  onChange={(value) => {
                    setDatePreset(value as DateRangePreset);
                    setPage(1);
                  }}
                  options={
                    dateFilterType === "venta"
                      ? [
                          { value: "", label: "Todas" },
                          { value: "today", label: "Hoy" },
                          { value: "yesterday", label: "Ayer" },
                          { value: "week", label: "Esta semana" },
                          { value: "month", label: "Este mes" },
                          { value: "custom", label: "Personalizado" },
                        ]
                      : [
                          { value: "", label: "Todas" },
                          { value: "today", label: "Hoy" },
                          { value: "tomorrow", label: "Mañana" },
                          { value: "week", label: "Esta semana" },
                          { value: "next7", label: "Próximos 7 días" },
                          { value: "custom", label: "Personalizado" },
                        ]
                  }
                />
              ) : null}
              {dateFilterType && datePreset === "custom" ? (
                <CalendarInput
                  className="lg:w-44"
                  value={customDate}
                  onChange={(value) => {
                    setCustomDate(value);
                    setPage(1);
                  }}
                  labelInline="Fecha"
                  clearable
                  popoverFixed
                />
              ) : null}
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                aria-expanded={showFilters}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-circular-bold transition-colors lg:hidden",
                  showFilters
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                <FunnelIcon size={16} weight="bold" />
                Filtros
              </button>
              {selectableSales.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label={
                    allSelectableSelected
                      ? "Deseleccionar todo"
                      : "Seleccionar todo"
                  }
                  title={
                    allSelectableSelected
                      ? "Deseleccionar todo"
                      : "Seleccionar todo"
                  }
                  aria-pressed={allSelectableSelected}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-colors",
                    allSelectableSelected
                      ? "bg-[var(--color-primary)] text-white hover:opacity-90"
                      : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                  )}
                >
                  <CheckSquareIcon
                    size={19}
                    weight={allSelectableSelected ? "fill" : "bold"}
                  />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void openPrintAll()}
                disabled={isLoading || isLoadingPrintAll}
                aria-label="Imprimir todo"
                title="Imprimir todo"
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-3 text-[11px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
              >
                {isLoadingPrintAll ? (
                  <SpinnerGapIcon size={17} className="animate-spin" />
                ) : (
                  <PrinterIcon size={17} weight="bold" />
                )}
                <span className="whitespace-nowrap">Imprimir todo</span>
              </button>
              <button
                type="button"
                onClick={refreshDeliveries}
                aria-label="Actualizar"
                title="Actualizar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
              >
                <ArrowsClockwiseIcon
                  size={18}
                  weight="bold"
                  className={cn(isLoading && "animate-spin")}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-2">
          {isLoading && sales.length === 0 ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[16px] bg-[var(--color-card)] shadow-sm"
              />
            ))
          ) : sales.length === 0 ? (
            <EmptyState tab={activeTab} mode={viewMode} />
          ) : (
            sales.map((sale) => (
              <DeliveryRow
                key={sale.publicId}
                sale={sale}
                canManageLink={canUseShipping}
                onClientDelivery={() => setFulfillment(sale)}
                onManageLink={() => setShippingLinkSale(sale)}
                onMarkShipped={refreshDeliveries}
                selectable={
                  viewMode === "courier"
                    ? sale.envio?.estado === "recibido"
                    : canPrintLabel(sale) || canDeliverToClient(sale)
                }
                selected={selectedShippingSales.some(
                  (item) => item.publicId === sale.publicId,
                )}
                onSelectedChange={(selected) =>
                  toggleShippingSale(sale, selected)
                }
                onPrintLabel={() => setLabelSales([sale])}
                dateField={dateFilterType}
              />
            ))
          )}
        </div>

        <div
          ref={loadMoreRef}
          className="flex h-12 items-center justify-center text-xs text-[var(--color-muted-foreground)]"
        >
          {isLoading && sales.length > 0 ? (
            <span className="inline-flex items-center gap-2">
              <SpinnerGapIcon size={16} className="animate-spin" />
              Cargando más...
            </span>
          ) : page < meta.totalPages ? (
            "Desliza para cargar más"
          ) : sales.length > 0 ? (
            "No hay más resultados"
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {sales.length} de {meta.total}{" "}
            {viewMode === "pickup" ? "entregas" : "envíos"}
          </p>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {isLoading
              ? "Actualizando..."
              : page >= meta.totalPages
                ? "Fin de la lista"
                : `Página ${page} de ${meta.totalPages}`}
          </span>
        </div>
      </div>

      {fulfillment ? (
        <FulfillmentModal
          sale={fulfillment}
          onClose={() => setFulfillment(null)}
          onCompleted={() => {
            setSelectedShippingSales((current) =>
              current.filter((item) => item.publicId !== fulfillment.publicId),
            );
            setFulfillment(null);
            refreshDeliveries();
          }}
        />
      ) : null}
      <ShippingLinkModal
        isOpen={Boolean(shippingLinkSale)}
        sale={shippingLinkSale}
        onClose={() => setShippingLinkSale(null)}
        onUpdated={(shipping) => {
          if (shippingLinkSale) {
            updateShippingLocally(shippingLinkSale.publicId, shipping);
          }
          refreshDeliveries();
        }}
      />
      {labelSales ? (
        <ShippingLabelModal
          sales={labelSales}
          onClose={() => setLabelSales(null)}
          onPrinted={(printed) =>
            setSelectedShippingSales((current) =>
              current.filter(
                (item) =>
                  !printed.some((sale) => sale.publicId === item.publicId),
              ),
            )
          }
        />
      ) : null}
      {bulkShipSales ? (
        <BulkShipModal
          sales={bulkShipSales}
          onClose={() => setBulkShipSales(null)}
          onCompleted={() => {
            setBulkShipSales(null);
            setSelectedShippingSales([]);
            refreshDeliveries();
          }}
        />
      ) : null}
      {bulkDeliverySales ? (
        <BulkDeliverModal
          sales={bulkDeliverySales}
          onClose={() => setBulkDeliverySales(null)}
          onCompleted={() => {
            setBulkDeliverySales(null);
            setSelectedShippingSales([]);
            refreshDeliveries();
          }}
        />
      ) : null}
      {printAllSales ? (
        <PrintAllLabelsModal
          sales={printAllSales}
          total={printAllTotal}
          onClose={() => setPrintAllSales(null)}
        />
      ) : null}
    </DashboardShell>
  );
}

function ViewModeSwitch({
  viewMode,
  onChange,
  className,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  const options: Array<{
    value: ViewMode;
    label: string;
    icon: typeof StorefrontIcon;
  }> = [
    { value: "courier", label: "Envíos", icon: TruckIcon },
    { value: "pickup", label: "Recojo", icon: StorefrontIcon },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[16px] bg-[var(--color-input-bg)] p-1",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === viewMode;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-2 rounded-[13px] px-3 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]",
            )}
          >
            <Icon
              size={17}
              weight={active ? "fill" : "regular"}
              className="shrink-0"
            />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={options[0]?.label ?? "Filtro"}
      className={className}
      fixedMenu
    />
  );
}

function DeliveryRow({
  sale,
  canManageLink,
  onClientDelivery,
  onManageLink,
  onMarkShipped,
  selectable,
  selected,
  onSelectedChange,
  onPrintLabel,
  dateField,
}: {
  sale: VentaResponse;
  canManageLink: boolean;
  onClientDelivery: () => void;
  onManageLink: () => void;
  onMarkShipped: () => void;
  selectable: boolean;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onPrintLabel: () => void;
  dateField: DateFilterType;
}) {
  const [isMarkingShipped, setIsMarkingShipped] = useState(false);
  const toast = useSystemToast();
  const status = logisticsStatus(sale);
  const statusConfig = logisticsLabels[status];
  const isRecojoMetodo =
    sale.envio?.metodoEnvio === "RECOJO" || !sale.envio;
  const isDomicilioMetodo =
    sale.envio?.metodoEnvio === "MOTORIZADO" ||
    sale.envio?.metodoEnvio === "DOMICILIO";
  const isCourier = Boolean(sale.envio) && !isRecojoMetodo;
  const documentLabel =
    sale.cliente?.tipoDocumento === "ruc"
      ? "RUC"
      : sale.cliente?.tipoDocumento === "dni"
        ? "DNI"
        : "";
  const contactName =
    sale.envio?.nombreCompleto?.trim() || sale.cliente?.nombre || "Cliente";
  const contactPhone =
    sale.envio?.celular?.trim() || sale.cliente?.telefono || null;
  const contactDocument = sale.envio?.dni?.trim()
    ? `${sale.envio.tipoDocumento ?? "DNI"} ${sale.envio.dni}`
    : sale.cliente?.numeroDocumento
      ? `${documentLabel || "DOC"} ${sale.cliente.numeroDocumento}`
      : null;

  const markShipped = async () => {
    if (isMarkingShipped) return;
    const detalles = sale.detalles
      .map((detail) => ({
        ventaDetalleId: detail.id,
        cantidad: Math.max(0, detail.cantidad - detail.cantidadEntregada),
      }))
      .filter((item) => item.cantidad > 0);
    if (detalles.length === 0) return;
    setIsMarkingShipped(true);
    try {
      await salesApi.dispatchToCourier(sale.publicId, { detalles });
      toast.showToast({
        title: "Envío marcado como enviado",
        description: sale.correlativo,
        variant: "success",
      });
      onMarkShipped();
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudo marcar el envío",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsMarkingShipped(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-[16px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.10)]">
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-[220px_minmax(240px,1fr)_170px_150px_170px_auto] lg:items-center lg:gap-x-8">
        <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
          {selectable ? (
            <label className="group relative inline-flex shrink-0 cursor-pointer select-none items-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onSelectedChange(event.target.checked)}
                aria-label={`Seleccionar ${sale.correlativo}`}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex size-[22px] items-center justify-center rounded-[7px] border-2 transition-all duration-200 ease-out",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)]/35 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-card)]",
                  selected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                    : "border-[var(--color-border)] bg-[var(--color-input-bg)] group-hover:border-[var(--color-primary)]/60 group-hover:bg-[var(--color-primary)]/5",
                )}
              >
                <CheckIcon
                  size={14}
                  weight="bold"
                  className={cn(
                    "text-white transition-all duration-200 ease-out",
                    selected ? "scale-100 opacity-100" : "scale-50 opacity-0",
                  )}
                />
              </span>
            </label>
          ) : null}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <ReceiptIcon size={20} weight="fill" className="text-[var(--color-primary)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--color-text)]">
              {sale.correlativo}
            </p>
            <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
              {sale.codigoInterno}
            </p>
          </div>
        </div>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-3 lg:col-span-1">
          {sale.cliente ? (
            <UserAvatar
              seed={sale.cliente.id}
              name={sale.cliente.nombre}
              size={40}
              className="size-10"
            />
          ) : (
            <GenericClientAvatar size={40} />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--color-text)]">
              {customerName(sale)}
            </p>
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
              {documentLabel && sale.cliente?.numeroDocumento
                ? `${documentLabel} ${sale.cliente.numeroDocumento}`
                : "Sin documento"}
            </p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            Datos de la persona
          </p>
          <p
            className="truncate text-xs font-bold text-[var(--color-text)]"
            title={contactName}
          >
            {contactName}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-[var(--color-muted-foreground)]">
            <PhoneIcon size={12} className="shrink-0" />
            {contactPhone || "Sin celular"}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {contactDocument || "Sin documento"}
          </p>
        </div>
        {dateField === "venta" ? (
          <InfoItem
            icon={CalendarIcon}
            label="Fecha de venta"
            value={formatDateTime(sale.createdAt)}
          />
        ) : dateField === "envio" ? (
          <InfoItem
            icon={CalendarIcon}
            label={isRecojoMetodo ? "Fecha de recojo" : "Fecha de envío"}
            value={formatFechaEnvio(sale.envio?.fechaEnvio ?? null)}
          />
        ) : null}
        {status === "ENTREGADO" ? (
          <InfoItem
            icon={ClockIcon}
            label="Entregado"
            value={formatDate(sale.envio?.entregadoAt ?? sale.fechaEntrega)}
          />
        ) : null}
        <div className="min-w-0">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            Productos
          </p>
          {sale.detalles.length > 0 ? (
            <ul className="mt-0.5 space-y-0.5">
              {sale.detalles.map((detail) => {
                const productName =
                  detail.descripcion ??
                  detail.productoVariante.producto.nombre;
                return (
                  <li
                    key={detail.id}
                    className="truncate text-xs font-medium text-[var(--color-text)]"
                    title={`${detail.cantidad}× ${productName}`}
                  >
                    <span className="font-black text-[var(--color-primary)]">
                      {detail.cantidad}×
                    </span>{" "}
                    {productName}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Sin productos
            </p>
          )}
        </div>
        <span
          className={cn(
            "w-fit rounded-full px-3 py-1.5 text-xs font-bold",
            statusConfig.className,
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="grid gap-4 border-t border-[var(--color-border)] px-4 py-3 lg:grid-cols-[minmax(300px,1.3fr)_auto] lg:items-center">
        <div className="min-w-0">
          {isCourier && sale.envio ? (
            isDomicilioMetodo ? (
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {sale.envio.metodoEnvio === "MOTORIZADO" ? (
                    <MotorcycleIcon size={20} weight="fill" />
                  ) : (
                    <HouseIcon size={20} weight="fill" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--color-text)]">
                    {sale.envio.metodoEnvio === "MOTORIZADO"
                      ? "Motorizado"
                      : "Envío a domicilio"}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-[var(--color-muted-foreground)]">
                    <MapPinIcon size={13} />
                    {sale.envio.estado === "recibido"
                      ? sale.envio.direccionEntrega || "Sin dirección"
                      : "Esperando datos del cliente"}
                  </p>
                  {sale.envio.estado === "recibido" &&
                  sale.envio.referenciaEntrega ? (
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      Ref: {sale.envio.referenciaEntrega}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 items-start gap-3">
                {sale.envio.estado === "recibido" ? (
                  <span
                    className={cn(
                      "mt-0.5 rounded-md px-2 py-1 text-[10px] font-black",
                      sale.envio.agencia === "OLVA"
                        ? "bg-[#eab308] text-black"
                        : "bg-[#dc2626] text-white",
                    )}
                  >
                    {sale.envio.agencia === "OLVA" ? "OLVA" : "SHALOM"}
                  </span>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-white">
                    <ClockIcon size={20} weight="fill" />
                  </span>
                )}
                <div className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-text)]">
                      {sale.envio.estado === "recibido"
                        ? sale.envio.agenciaNombre || "Agencia seleccionada"
                        : "Esperando datos del cliente"}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-[var(--color-muted-foreground)]">
                      <MapPinIcon size={13} />
                      {sale.envio.estado === "recibido"
                        ? [
                            sale.envio.agenciaDistrito,
                            sale.envio.agenciaProvincia,
                            sale.envio.agenciaDepartamento,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : canManageLink
                          ? "Comparte o revisa el enlace de envío"
                          : "Esperando datos del cliente"}
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <StorefrontIcon size={18} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--color-text)]">
                  Recojo en tienda
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Entrega directa al cliente o autorizado
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {canPrintLabel(sale) ? (
            <button
              type="button"
              onClick={onPrintLabel}
              aria-label="Imprimir etiqueta"
              title="Imprimir etiqueta"
              className="inline-flex size-10 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
            >
              <PrinterIcon size={17} weight="bold" />
            </button>
          ) : null}
          {!isCourier ? (
            status === "ENTREGADO" ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[#10b981]/10 px-4 text-xs font-bold text-[#047857]">
                <CheckCircleIcon size={17} weight="fill" /> Entregado
              </span>
            ) : (
              <PrimaryButton
                onClick={onClientDelivery}
                icon={PackageIcon}
                tone="success"
              >
                Entregar
              </PrimaryButton>
            )
          ) : canManageLink && sale.envio?.estado !== "recibido" ? (
            <PrimaryButton onClick={onManageLink} icon={LinkIcon}>
              Gestionar enlace
            </PrimaryButton>
          ) : status === "POR_PREPARAR" || status === "POR_DESPACHAR" ? (
            <button
              type="button"
              onClick={() => void markShipped()}
              disabled={isMarkingShipped}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[#10b981] px-4 text-xs font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] hover:bg-[#059669] dark:bg-[#059669] dark:hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMarkingShipped ? (
                <SpinnerGapIcon size={17} className="animate-spin" />
              ) : (
                <TruckIcon size={17} weight="bold" />
              )}
              Enviar
            </button>
          ) : (
            <span className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[#3b82f6]/10 px-4 text-xs font-bold text-[#1d4ed8]">
              <TruckIcon size={17} weight="fill" /> Enviado
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className="mt-0.5 text-[var(--color-muted-foreground)]" />
      <div>
        <p className="text-[10px] text-[var(--color-muted-foreground)]">{label}</p>
        <p className="text-xs text-[var(--color-text)]">{value}</p>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  icon: Icon,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: typeof TruckIcon;
  tone?: "primary" | "success";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-[14px] px-4 text-xs font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)]",
        tone === "success"
          ? "bg-[#10b981] hover:bg-[#059669] dark:bg-[#059669] dark:hover:bg-[#047857]"
          : "bg-[var(--color-primary)] hover:opacity-90",
      )}
    >
      <Icon size={17} weight="bold" />
      {children}
    </button>
  );
}

function EmptyState({ tab, mode }: { tab: PageTab; mode: ViewMode }) {
  const labels: Record<PageTab, string> = {
    pendiente:
      mode === "pickup"
        ? "No hay recojos pendientes"
        : "No hay envíos pendientes",
    enviado: "No hay envíos enviados",
    entregada: "No hay entregas registradas",
  };
  return (
    <div className="flex min-h-72 items-center justify-center rounded-[16px] bg-[var(--color-card)]">
      <EmptyIllustration
        image="deliveryTruck"
        title={labels[tab]}
        description="Cambia los filtros o actualiza la lista."
      />
    </div>
  );
}

function ShippingLabelModal({
  sales,
  onClose,
  onPrinted,
}: {
  sales: VentaResponse[];
  onClose: () => void;
  onPrinted: (sales: VentaResponse[]) => void;
}) {
  const [packageCounts, setPackageCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(sales.map((sale) => [sale.publicId, 1])),
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [columns, setColumns] = useState<1 | 2>(2);
  const toast = useSystemToast();
  const totalLabels = sales.reduce(
    (total, sale) => total + (packageCounts[sale.publicId] ?? 1),
    0,
  );
  const isBatch = sales.length > 1;
  const isValid =
    totalLabels >= 1 &&
    totalLabels <= 100 &&
    sales.every((sale) => {
      const quantity = packageCounts[sale.publicId];
      return Number.isInteger(quantity) && quantity >= 1 && quantity <= 50;
    });

  const updatePackageCount = (publicId: string, value: string) => {
    const parsed = Number(value);
    setPackageCounts((current) => ({
      ...current,
      [publicId]: Number.isFinite(parsed) ? Math.trunc(parsed) : 0,
    }));
  };

  const adjustPackageCount = (publicId: string, delta: number) => {
    setPackageCounts((current) => {
      const next = Math.min(
        50,
        Math.max(1, (current[publicId] ?? 1) + delta),
      );
      return { ...current, [publicId]: next };
    });
  };

  const print = async () => {
    if (!isValid || isPrinting) return;

    const previewWindow = window.open("", "_blank");
    setIsPrinting(true);
    try {
      const blob = isBatch
        ? await salesApi.printShippingLabelBatch(
            sales.map((sale) => ({
              publicId: sale.publicId,
              packageCount: packageCounts[sale.publicId],
            })),
            { columns },
          )
        : await salesApi.printShippingLabels(sales[0].publicId, {
            packageCount: packageCounts[sales[0].publicId],
            columns,
          });
      const url = URL.createObjectURL(blob);

      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = isBatch
          ? "etiquetas-envios.pdf"
          : `etiquetas-${sales[0].correlativo}.pdf`;
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.showToast({
        title: isBatch ? "Etiquetas generadas" : "Etiqueta generada",
        description: `${totalLabels} etiqueta${totalLabels === 1 ? "" : "s"} lista${totalLabels === 1 ? "" : "s"} para imprimir.`,
        variant: "success",
      });
      onPrinted(sales);
      onClose();
    } catch (error: unknown) {
      previewWindow?.close();
      toast.showToast({
        title: "No se pudieron generar las etiquetas",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-in fade-in bg-black/45 duration-200" />
      <div className="relative flex max-h-[90dvh] w-full max-w-xl animate-in flex-col overflow-hidden rounded-[20px] bg-[var(--color-card)] shadow-2xl fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-[var(--color-text)]">
              {isBatch ? "Imprimir etiquetas por cantidad" : "Imprimir etiqueta"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            aria-label="Cerrar"
            className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="content-scrollbar space-y-4 overflow-y-auto p-5">
          <section className="rounded-[16px] p-4">
            <p className="text-sm font-black text-[var(--color-text)]">
              Distribución en hoja A4
            </p>
            <div className="mt-3 max-w-sm">
              <div className="grid grid-cols-2 gap-2">
                {([1, 2] as const).map((option) => {
                  const active = columns === option;
                  const Icon = option === 1 ? RowsIcon : ColumnsIcon;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColumns(option)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 px-3 py-3 transition-colors",
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-button-hover)]",
                      )}
                    >
                      <Icon size={26} weight={active ? "fill" : "regular"} />
                      <span className="text-xs font-bold">
                        {option === 1 ? "1 columna" : "2 columnas"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
          {sales.map((sale) => (
            <div
              key={sale.publicId}
              className="grid gap-3 rounded-[16px] bg-[var(--color-input-bg)] p-4 sm:grid-cols-[1fr_164px] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--color-text)]">
                  {sale.correlativo} · {customerName(sale)}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">
                  {serviceLabel(sale)} · {serviceDestination(sale)}
                </p>
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                  Cantidad impresión
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustPackageCount(sale.publicId, -1)}
                    disabled={(packageCounts[sale.publicId] ?? 1) <= 1}
                    aria-label={`Quitar impresión a ${sale.correlativo}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MinusIcon size={15} weight="bold" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={packageCounts[sale.publicId] ?? 1}
                    onChange={(event) =>
                      updatePackageCount(sale.publicId, event.target.value)
                    }
                    aria-label={`Cantidad de impresiones para ${sale.correlativo}`}
                    className="h-9 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-center text-sm font-bold text-[var(--color-text)] outline-none [-moz-appearance:textfield] focus:ring-2 focus:ring-[var(--color-primary)]/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustPackageCount(sale.publicId, 1)}
                    disabled={(packageCounts[sale.publicId] ?? 1) >= 50}
                    aria-label={`Agregar impresión a ${sale.correlativo}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PlusIcon size={15} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-border)] p-5">
          <div className="mb-3 flex items-center justify-end text-xs">
            <strong className="text-[var(--color-text)]">
              {totalLabels}/100 etiquetas
            </strong>
          </div>
          {totalLabels > 100 ? (
            <p className="mb-3 text-xs font-medium text-[#b91c1c]">
              El máximo por impresión es de 100 etiquetas.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPrinting}
              className="h-11 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-bold text-[var(--color-text)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void print()}
              disabled={!isValid || isPrinting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPrinting ? (
                <SpinnerGapIcon size={18} className="animate-spin" />
              ) : (
                <PrinterIcon size={18} weight="bold" />
              )}
              {isPrinting ? "Generando..." : "Generar PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintAllLabelsModal({
  sales,
  total,
  onClose,
}: {
  sales: DeliveryPrintable[];
  total: number;
  onClose: () => void;
}) {
  const [columns, setColumns] = useState<1 | 2>(2);
  const [isPrinting, setIsPrinting] = useState(false);
  const toast = useSystemToast();
  const remaining = Math.max(0, total - sales.length);

  const print = async () => {
    if (isPrinting || sales.length === 0) return;
    const previewWindow = window.open("", "_blank");
    setIsPrinting(true);
    try {
      const blob = await salesApi.printShippingLabelBatch(
        sales.map((sale) => ({ publicId: sale.publicId, packageCount: 1 })),
        { columns },
      );
      const url = URL.createObjectURL(blob);

      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = "etiquetas-envios.pdf";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.showToast({
        title: "Etiquetas generadas",
        description: `${sales.length} etiqueta${sales.length === 1 ? "" : "s"} lista${sales.length === 1 ? "" : "s"} para imprimir.`,
        variant: "success",
      });
      onClose();
    } catch (error: unknown) {
      previewWindow?.close();
      toast.showToast({
        title: "No se pudieron generar las etiquetas",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-in fade-in bg-black/45 duration-200" />
      <div className="relative flex max-h-[90dvh] w-full max-w-lg animate-in flex-col overflow-hidden rounded-[20px] bg-[var(--color-card)] shadow-2xl fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-lg font-black text-[var(--color-text)]">
            Imprimir todo
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            aria-label="Cerrar"
            className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="content-scrollbar space-y-4 overflow-y-auto p-5">
          <div className="rounded-[16px] bg-[var(--color-input-bg)] p-4">
            <p className="text-sm font-black text-[var(--color-text)]">
              {sales.length} etiquetas (1 por venta)
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Se incluyen las ventas pendientes con los filtros actuales.
            </p>
          </div>

          {remaining > 0 ? (
            <p className="rounded-[14px] bg-[#f59e0b]/10 p-3 text-xs font-medium text-[#b45309]">
              Hay {remaining} pendientes más. Se imprimirán los primeros{" "}
              {sales.length}. Después de despacharlos, vuelve a usar “Imprimir
              todo” para el siguiente bloque.
            </p>
          ) : null}

          <section className="rounded-[16px] p-4">
            <p className="text-sm font-black text-[var(--color-text)]">
              Distribución en hoja A4
            </p>
            <div className="mt-3 max-w-sm">
              <div className="grid grid-cols-2 gap-2">
                {([1, 2] as const).map((option) => {
                  const active = columns === option;
                  const Icon = option === 1 ? RowsIcon : ColumnsIcon;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColumns(option)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 px-3 py-3 transition-colors",
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-button-hover)]",
                      )}
                    >
                      <Icon size={26} weight={active ? "fill" : "regular"} />
                      <span className="text-xs font-bold">
                        {option === 1 ? "1 columna" : "2 columnas"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)] p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            className="h-11 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-bold text-[var(--color-text)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void print()}
            disabled={isPrinting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPrinting ? (
              <SpinnerGapIcon size={18} className="animate-spin" />
            ) : (
              <PrinterIcon size={18} weight="bold" />
            )}
            {isPrinting ? "Generando..." : "Generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FulfillmentModal({
  sale,
  onClose,
  onCompleted,
}: {
  sale: VentaResponse;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const initialQuantities = useMemo(
    () =>
      Object.fromEntries(
        sale.detalles.map((detail) => [
          detail.id,
          Math.max(0, detail.cantidad - detail.cantidadEntregada),
        ]),
      ),
    [sale.detalles],
  );
  const [quantities, setQuantities] =
    useState<Record<string, number>>(initialQuantities);
  const [retiranteDni, setRetiranteDni] = useState("");
  const [retiranteNombre, setRetiranteNombre] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();
  const details = sale.detalles.map((detail) => {
    const pending = Math.max(0, detail.cantidad - detail.cantidadEntregada);
    return {
      detail,
      pending,
      quantity: Math.min(quantities[detail.id] ?? 0, pending),
    };
  });
  const total = details.reduce((sum, item) => sum + item.quantity, 0);

  const submit = async () => {
    if (total <= 0 || isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      detalles: details
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          ventaDetalleId: item.detail.id,
          cantidad: item.quantity,
        })),
      notas: notes.trim() || undefined,
    };
    try {
      await salesApi.deliver(sale.publicId, {
        ...payload,
        retiranteDni: retiranteDni.trim() || undefined,
        retiranteNombre: retiranteNombre.trim() || undefined,
      });
      toast.showToast({
        title: "Entrega al cliente registrada",
        description: sale.correlativo,
        variant: "success",
      });
      onCompleted();
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudo registrar la entrega",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalFrame
      title="Entregar al cliente"
      description={`${sale.correlativo} · ${customerName(sale)}`}
      onClose={onClose}
      disabled={isSubmitting}
    >
      <div className="space-y-2">
        {details.map(({ detail, pending, quantity }) => (
          <div
            key={detail.id}
            className="grid grid-cols-[1fr_100px] gap-3 rounded-[14px] bg-[var(--color-input-bg)] p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--color-text)]">
                {detail.descripcion ?? detail.productoVariante.producto.nombre}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Total {detail.cantidad} · Entregado {detail.cantidadEntregada} · Pendiente {pending}
              </p>
            </div>
            <input
              type="number"
              min={0}
              max={pending}
              value={quantity}
              onChange={(event) => {
                const value = Number(event.target.value);
                setQuantities((current) => ({
                  ...current,
                  [detail.id]: Number.isFinite(value)
                    ? Math.max(0, Math.min(pending, value))
                    : 0,
                }));
              }}
              className="h-10 rounded-[12px] bg-[var(--color-card)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          value={retiranteDni}
          onChange={setRetiranteDni}
          placeholder="DNI de quien retira (opcional)"
        />
        <TextInput
          value={retiranteNombre}
          onChange={setRetiranteNombre}
          placeholder="Nombre de quien retira (opcional)"
        />
      </div>
      <TextArea
        value={notes}
        onChange={setNotes}
        placeholder="Observaciones (opcional)"
      />
      <ModalActions
        onCancel={onClose}
        onConfirm={() => void submit()}
        confirmLabel="Entregar al cliente"
        disabled={total <= 0 || isSubmitting}
        loading={isSubmitting}
      />
    </ModalFrame>
  );
}

function BulkShipModal({
  sales,
  onClose,
  onCompleted,
}: {
  sales: VentaResponse[];
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();

  const submit = async () => {
    if (isSubmitting || sales.length === 0) return;
    setIsSubmitting(true);
    const results = await Promise.allSettled(
      sales.map((sale) =>
        salesApi.dispatchToCourier(sale.publicId, {
          detalles: sale.detalles
            .map((detail) => ({
              ventaDetalleId: detail.id,
              cantidad: Math.max(
                0,
                detail.cantidad - detail.cantidadEntregada,
              ),
            }))
            .filter((item) => item.cantidad > 0),
        }),
      ),
    );
    setIsSubmitting(false);
    const failed = results.filter(
      (result) => result.status === "rejected",
    ).length;
    const succeeded = sales.length - failed;
    if (failed > 0) {
      toast.showToast({
        title:
          succeeded > 0
            ? `${succeeded} envío${succeeded === 1 ? "" : "s"} marcado${succeeded === 1 ? "" : "s"} como enviado${succeeded === 1 ? "" : "s"}`
            : "No se pudieron marcar los envíos",
        description: `${failed} envío${failed === 1 ? "" : "s"} no se pudo marcar. Revisa los pendientes.`,
        variant: "error",
      });
    } else {
      toast.showToast({
        title: "Envíos marcados como enviados",
        description: `${succeeded} envío${succeeded === 1 ? "" : "s"} despachado${succeeded === 1 ? "" : "s"} al courier.`,
        variant: "success",
      });
    }
    onCompleted();
  };

  return (
    <ModalFrame
      title="Marcar envíos como enviados"
      description={`Se despacharán ${sales.length} envío${sales.length === 1 ? "" : "s"} al courier con todas las cantidades pendientes.`}
      onClose={onClose}
      disabled={isSubmitting}
    >
      <div className="rounded-[14px] bg-[#3b82f6]/10 p-4 text-sm text-[#1d4ed8]">
        Esta acción enviará los productos al courier. Asegúrate de haber
        empacado y despachado todo correctamente.
      </div>
      <div className="content-scrollbar max-h-56 space-y-2 overflow-y-auto">
        {sales.map((sale) => (
          <div
            key={sale.publicId}
            className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--color-input-bg)] px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[var(--color-text)]">
                {sale.correlativo}
              </p>
              <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                {serviceLabel(sale)} · {serviceDestination(sale)}
              </p>
            </div>
            <span className="shrink-0 truncate text-xs text-[var(--color-muted-foreground)]">
              {customerName(sale)}
            </span>
          </div>
        ))}
      </div>
      <ModalActions
        onCancel={onClose}
        onConfirm={() => void submit()}
        confirmLabel={`Confirmar ${sales.length} envío${sales.length === 1 ? "" : "s"}`}
        disabled={isSubmitting}
        loading={isSubmitting}
      />
    </ModalFrame>
  );
}

function BulkDeliverModal({
  sales,
  onClose,
  onCompleted,
}: {
  sales: VentaResponse[];
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [retiranteDni, setRetiranteDni] = useState("");
  const [retiranteNombre, setRetiranteNombre] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();

  const pendingSales = useMemo(
    () =>
      sales
        .map((sale) => {
          const details = sale.detalles
            .map((detail) => ({
              ventaDetalleId: detail.id,
              cantidad: Math.max(
                0,
                detail.cantidad - detail.cantidadEntregada,
              ),
            }))
            .filter((item) => item.cantidad > 0);
          return {
            sale,
            details,
            units: details.reduce((total, item) => total + item.cantidad, 0),
          };
        })
        .filter((item) => item.details.length > 0),
    [sales],
  );

  const submit = async () => {
    if (isSubmitting || pendingSales.length === 0) return;
    setIsSubmitting(true);
    const payload = {
      retiranteDni: retiranteDni.trim() || undefined,
      retiranteNombre: retiranteNombre.trim() || undefined,
      notas: notes.trim() || undefined,
    };
    const results = await Promise.allSettled(
      pendingSales.map(({ sale, details }) =>
        salesApi.deliver(sale.publicId, { ...payload, detalles: details }),
      ),
    );
    setIsSubmitting(false);
    const failed = results.filter(
      (result) => result.status === "rejected",
    ).length;
    const succeeded = pendingSales.length - failed;
    if (failed > 0) {
      toast.showToast({
        title:
          succeeded > 0
            ? `${succeeded} entrega${succeeded === 1 ? "" : "s"} registrada${succeeded === 1 ? "" : "s"}`
            : "No se pudieron registrar las entregas",
        description: `${failed} entrega${failed === 1 ? "" : "s"} no se pudo registrar. Revisa los pendientes.`,
        variant: "error",
      });
    } else {
      toast.showToast({
        title: "Entregas al cliente registradas",
        description: `${succeeded} venta${succeeded === 1 ? "" : "s"} entregada${succeeded === 1 ? "" : "s"} al cliente.`,
        variant: "success",
      });
    }
    onCompleted();
  };

  return (
    <ModalFrame
      title="Entregar al cliente"
      description={`Se entregarán ${pendingSales.length} venta${pendingSales.length === 1 ? "" : "s"} con todas las cantidades pendientes.`}
      onClose={onClose}
      disabled={isSubmitting}
    >
      <div className="rounded-[14px] bg-[#10b981]/10 p-4 text-sm text-[#047857]">
        Confirma que el cliente o su autorizado retira todos los productos
        pendientes de las ventas seleccionadas.
      </div>
      <div className="content-scrollbar max-h-56 space-y-2 overflow-y-auto">
        {pendingSales.map(({ sale, units }) => (
          <div
            key={sale.publicId}
            className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--color-input-bg)] px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[var(--color-text)]">
                {sale.correlativo}
              </p>
              <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                {customerName(sale)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold text-[var(--color-muted-foreground)]">
              {units} und.
            </span>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          value={retiranteDni}
          onChange={setRetiranteDni}
          placeholder="DNI de quien retira (opcional)"
        />
        <TextInput
          value={retiranteNombre}
          onChange={setRetiranteNombre}
          placeholder="Nombre de quien retira (opcional)"
        />
      </div>
      <TextArea
        value={notes}
        onChange={setNotes}
        placeholder="Observaciones (opcional)"
      />
      <ModalActions
        onCancel={onClose}
        onConfirm={() => void submit()}
        confirmLabel={`Entregar ${pendingSales.length} venta${pendingSales.length === 1 ? "" : "s"}`}
        disabled={pendingSales.length === 0 || isSubmitting}
        loading={isSubmitting}
      />
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  description,
  children,
  onClose,
  disabled,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className="fixed inset-0 animate-in fade-in bg-black/35 duration-200" />
      <div className="relative w-full max-w-2xl animate-in rounded-[16px] bg-[var(--color-card)] shadow-[0_22px_70px_rgba(15,23,42,0.28)] fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-5">
          <div>
            <h2 className="text-lg font-black text-[var(--color-text)]">{title}</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="flex size-9 items-center justify-center rounded-[12px] bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] disabled:opacity-50"
            aria-label="Cerrar"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
      </div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
    />
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  loading,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="h-11 flex-1 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-bold text-[var(--color-text)] disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] text-sm font-bold text-white disabled:opacity-50"
      >
        {loading ? <SpinnerGapIcon size={18} className="animate-spin" /> : null}
        {confirmLabel}
      </button>
    </div>
  );
}

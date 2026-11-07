"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowsClockwiseIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  FunnelIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MinusIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptIcon,
  SpinnerGapIcon,
  StorefrontIcon,
  TruckIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Select } from "@/components/ui/select";
import { ShippingLinkModal } from "@/components/Ventas/shipping-link-modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  GenericClientAvatar,
  UserAvatar,
} from "@/components/UserAvatar/user-avatar";
import { branchesApi, type Branch } from "@/lib/api/branches";
import {
  salesApi,
  type DeliveryStatusQuery,
  type SaleShippingDetails,
  type SaleShippingLogisticsStatus,
  type VentaResponse,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";

type PageTab = "pendiente" | "en_transito" | "entregada" | "incidencia";
type ViewMode = "pickup" | "courier";
type FulfillmentMode = "CLIENTE" | "COURIER";

const pageSize = 10;
const courierTabConfig: Array<{ label: string; value: PageTab }> = [
  { label: "Pendientes", value: "pendiente" },
  { label: "En tránsito", value: "en_transito" },
  { label: "Entregados", value: "entregada" },
  { label: "Incidencias", value: "incidencia" },
];
const pickupTabConfig: Array<{ label: string; value: PageTab }> = [
  { label: "Pendientes", value: "pendiente" },
  { label: "Entregados", value: "entregada" },
];

const emptySummary = {
  porPreparar: 0,
  porDespachar: 0,
  enTransito: 0,
  entregados: 0,
  incidencias: 0,
  recojoParciales: 0,
  productosPendientes: 0,
};

const logisticsLabels: Record<
  SaleShippingLogisticsStatus,
  { label: string; className: string }
> = {
  POR_PREPARAR: {
    label: "Por preparar",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  POR_DESPACHAR: {
    label: "Por despachar",
    className: "bg-[#7c3aed]/10 text-[#6d28d9]",
  },
  EN_TRANSITO: {
    label: "En tránsito",
    className: "bg-[#3b82f6]/10 text-[#1d4ed8]",
  },
  ENTREGADO: {
    label: "Entregado",
    className: "bg-[#10b981]/10 text-[#047857]",
  },
  INCIDENCIA: {
    label: "Incidencia",
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

function pendingQuantity(sale: VentaResponse) {
  return sale.detalles.reduce(
    (sum, detail) =>
      sum + Math.max(0, detail.cantidad - detail.cantidadEntregada),
    0,
  );
}

function logisticsStatus(sale: VentaResponse): SaleShippingLogisticsStatus {
  if (sale.envio) return sale.envio.estadoLogistico;
  return sale.estadoEntrega === "entregada" ? "ENTREGADO" : "POR_PREPARAR";
}

function customerName(sale: VentaResponse) {
  return sale.cliente?.nombre || "Cliente genérico";
}

export default function DeliveriesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("pickup");
  const [activeTab, setActiveTab] = useState<PageTab>("pendiente");
  const [sales, setSales] = useState<VentaResponse[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [courier, setCourier] = useState<"" | "SHALOM" | "OLVA">("");
  const [branchId, setBranchId] = useState("");
  const [period, setPeriod] = useState<"" | "today" | "week" | "month">("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [fulfillment, setFulfillment] = useState<{
    sale: VentaResponse;
    mode: FulfillmentMode;
  } | null>(null);
  const [statusSale, setStatusSale] = useState<VentaResponse | null>(null);
  const [incidentSale, setIncidentSale] = useState<VentaResponse | null>(null);
  const [shippingLinkSale, setShippingLinkSale] =
    useState<VentaResponse | null>(null);
  const [selectedShippingSales, setSelectedShippingSales] = useState<
    VentaResponse[]
  >([]);
  const [labelSales, setLabelSales] = useState<VentaResponse[] | null>(null);
  const toast = useSystemToast();

  const loadDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await salesApi.findDeliveries({
        mode: viewMode,
        estado: activeTab as DeliveryStatusQuery,
        page,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        courier: viewMode === "courier" ? courier || undefined : undefined,
        sucursalId: branchId || undefined,
        period: period || undefined,
      });
      setSales(response.data);
      setSummary(response.summary ?? emptySummary);
      setMeta(
        response.meta ?? {
          page,
          limit: pageSize,
          total: response.data.length,
          totalPages: 1,
        },
      );
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudieron cargar las entregas",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    activeTab,
    branchId,
    courier,
    debouncedSearchTerm,
    page,
    period,
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
    void branchesApi
      .findAll({ estado: "activo", tipo: "tienda", limit: 100 })
      .then((response) => setBranches(response.data))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    // La carga remota sincroniza la vista cada vez que cambian filtros o página.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDeliveries();
  }, [loadDeliveries]);

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

  const cards =
    viewMode === "pickup"
      ? [
          {
            label: "Por entregar",
            value: summary.porPreparar,
            icon: StorefrontIcon,
            color: "text-[#f59e0b]",
            background: "bg-[#f59e0b]/10",
          },
          {
            label: "Entregas parciales",
            value: summary.recojoParciales,
            icon: PackageIcon,
            color: "text-[#7c3aed]",
            background: "bg-[#7c3aed]/10",
          },
          {
            label: "Entregados",
            value: summary.entregados,
            icon: CheckCircleIcon,
            color: "text-[#10b981]",
            background: "bg-[#10b981]/10",
          },
          {
            label: "Productos pendientes",
            value: summary.productosPendientes,
            icon: PackageIcon,
            color: "text-[#3b82f6]",
            background: "bg-[#3b82f6]/10",
          },
        ]
      : [
          {
            label: "Por preparar",
            value: summary.porPreparar,
            icon: PackageIcon,
            color: "text-[#f59e0b]",
            background: "bg-[#f59e0b]/10",
          },
          {
            label: "Por despachar",
            value: summary.porDespachar,
            icon: TruckIcon,
            color: "text-[#7c3aed]",
            background: "bg-[#7c3aed]/10",
          },
          {
            label: "En tránsito",
            value: summary.enTransito,
            icon: TruckIcon,
            color: "text-[#3b82f6]",
            background: "bg-[#3b82f6]/10",
          },
          {
            label: "Entregados",
            value: summary.entregados,
            icon: CheckCircleIcon,
            color: "text-[#10b981]",
            background: "bg-[#10b981]/10",
          },
        ];
  const visibleTabs =
    viewMode === "pickup" ? pickupTabConfig : courierTabConfig;

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setActiveTab("pendiente");
    if (mode === "pickup") {
      setCourier("");
      setSelectedShippingSales([]);
    }
    setPage(1);
  };

  const toggleShippingSale = (sale: VentaResponse, selected: boolean) => {
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
        : [],
    [sales, viewMode],
  );
  const allSelectableSelected =
    selectableSales.length > 0 &&
    selectableSales.every((sale) =>
      selectedShippingSales.some((item) => item.publicId === sale.publicId),
    );

  const toggleSelectAll = () => {
    setSelectedShippingSales((current) => {
      if (allSelectableSelected) {
        return current.filter(
          (item) =>
            !selectableSales.some((sale) => sale.publicId === item.publicId),
        );
      }
      const next = new Map(current.map((item) => [item.publicId, item]));
      selectableSales.forEach((sale) => next.set(sale.publicId, sale));
      return Array.from(next.values());
    });
  };

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
          {viewMode === "courier" && selectedShippingSales.length > 0 ? (
            <button
              type="button"
              onClick={() => setLabelSales(selectedShippingSales)}
              className="hidden h-10 items-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-xs font-bold text-white lg:inline-flex"
            >
              <PrinterIcon size={17} weight="bold" />
              Imprimir ({selectedShippingSales.length})
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

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="flex items-center gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm sm:p-5"
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    card.background,
                  )}
                >
                  <Icon size={22} weight="fill" className={card.color} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                    {card.label}
                  </p>
                  <p className="text-2xl font-black leading-none text-[var(--color-text)]">
                    {card.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky -top-4 z-30 -mx-3 space-y-3 bg-[var(--color-background)] px-3 py-2 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
          <div className="flex w-full overflow-x-auto rounded-[16px] bg-[var(--color-input-bg)] p-1 sm:max-w-3xl">
            {visibleTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveTab(tab.value);
                  setPage(1);
                }}
                className={cn(
                  "h-10 min-w-32 flex-1 rounded-[14px] px-3 text-sm font-circular-bold transition-colors",
                  activeTab === tab.value
                    ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]",
                )}
              >
                {tab.label}
                {tab.value === "incidencia" && summary.incidencias > 0
                  ? ` (${summary.incidencias})`
                  : ""}
              </button>
            ))}
          </div>

          {viewMode === "courier" && selectedShippingSales.length > 0 ? (
            <button
              type="button"
              onClick={() => setLabelSales(selectedShippingSales)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-xs font-bold text-white lg:hidden"
            >
              <PrinterIcon size={17} weight="bold" />
              Imprimir seleccionados ({selectedShippingSales.length})
            </button>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
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
                "grid w-full gap-2 sm:w-auto sm:flex-1 lg:flex lg:flex-none lg:items-center",
                viewMode === "courier" ? "sm:grid-cols-3" : "sm:grid-cols-2",
                showFilters ? "" : "hidden lg:flex",
              )}
            >
              {viewMode === "courier" ? (
                <FilterSelect
                  className="lg:w-40"
                  value={courier}
                  onChange={(value) => {
                    setCourier(value as "" | "SHALOM" | "OLVA");
                    setPage(1);
                  }}
                  options={[
                    { value: "", label: "Todos los couriers" },
                    { value: "SHALOM", label: "Shalom" },
                    { value: "OLVA", label: "Olva" },
                  ]}
                />
              ) : null}
              <FilterSelect
                className="lg:w-44"
                value={branchId}
                onChange={(value) => {
                  setBranchId(value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Todas las sucursales" },
                  ...branches.map((branch) => ({
                    value: branch.id,
                    label: branch.nombre,
                  })),
                ]}
              />
              <FilterSelect
                className="lg:w-36"
                value={period}
                onChange={(value) => {
                  setPeriod(value as "" | "today" | "week" | "month");
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Todas las fechas" },
                  { value: "today", label: "Hoy" },
                  { value: "week", label: "Esta semana" },
                  { value: "month", label: "Este mes" },
                ]}
              />
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                aria-expanded={showFilters}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-circular-bold transition-colors lg:hidden",
                  showFilters
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                <FunnelIcon size={16} weight="bold" />
                Filtros
              </button>
              <button
                type="button"
                onClick={() => void loadDeliveries()}
                className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-5 text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
              >
                <ArrowsClockwiseIcon
                  size={16}
                  weight="bold"
                  className={cn(isLoading && "animate-spin")}
                />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-2">
          {viewMode === "courier" && selectableSales.length > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--color-card)] px-4 py-2.5 shadow-[0_2px_10px_rgba(21,25,34,0.10)]">
              <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
                {selectedShippingSales.length > 0
                  ? `${selectedShippingSales.length} seleccionado${selectedShippingSales.length === 1 ? "" : "s"}`
                  : `${selectableSales.length} por seleccionar`}
              </p>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex shrink-0 items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-xs font-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
              >
                <CheckIcon size={14} weight="bold" />
                {allSelectableSelected ? "Deseleccionar todo" : "Seleccionar todo"}
              </button>
            </div>
          ) : null}
          {isLoading ? (
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
                onClientDelivery={() =>
                  setFulfillment({ sale, mode: "CLIENTE" })
                }
                onCourierDispatch={() =>
                  setFulfillment({ sale, mode: "COURIER" })
                }
                onManageLink={() => setShippingLinkSale(sale)}
                onUpdateStatus={() => setStatusSale(sale)}
                onIncident={() => setIncidentSale(sale)}
                selectable={
                  viewMode === "courier" && sale.envio?.estado === "recibido"
                }
                selected={selectedShippingSales.some(
                  (item) => item.publicId === sale.publicId,
                )}
                onSelectedChange={(selected) =>
                  toggleShippingSale(sale, selected)
                }
                onPrintLabel={() => setLabelSales([sale])}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {sales.length} de {meta.total}{" "}
            {viewMode === "pickup" ? "entregas" : "envíos"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={isLoading || page <= 1}
              className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] px-2 text-xs font-bold text-white">
              {meta.page}/{meta.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
              disabled={isLoading || page >= meta.totalPages}
              className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {fulfillment ? (
        <FulfillmentModal
          sale={fulfillment.sale}
          mode={fulfillment.mode}
          onClose={() => setFulfillment(null)}
          onCompleted={() => {
            setFulfillment(null);
            void loadDeliveries();
          }}
        />
      ) : null}
      {statusSale ? (
        <ShippingStatusModal
          sale={statusSale}
          onClose={() => setStatusSale(null)}
          onCompleted={() => {
            setStatusSale(null);
            void loadDeliveries();
          }}
        />
      ) : null}
      {incidentSale ? (
        <IncidentModal
          sale={incidentSale}
          onClose={() => setIncidentSale(null)}
          onCompleted={() => {
            setIncidentSale(null);
            void loadDeliveries();
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
          void loadDeliveries();
        }}
      />
      {labelSales ? (
        <ShippingLabelModal
          sales={labelSales}
          onClose={() => setLabelSales(null)}
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
    { value: "pickup", label: "Recojo", icon: StorefrontIcon },
    { value: "courier", label: "Envíos", icon: TruckIcon },
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
  onClientDelivery,
  onCourierDispatch,
  onManageLink,
  onUpdateStatus,
  onIncident,
  selectable,
  selected,
  onSelectedChange,
  onPrintLabel,
}: {
  sale: VentaResponse;
  onClientDelivery: () => void;
  onCourierDispatch: () => void;
  onManageLink: () => void;
  onUpdateStatus: () => void;
  onIncident: () => void;
  selectable: boolean;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  onPrintLabel: () => void;
}) {
  const status = logisticsStatus(sale);
  const statusConfig = logisticsLabels[status];
  const pending = pendingQuantity(sale);
  const isCourier = Boolean(sale.envio);
  const activeIncident = sale.envio?.incidencias.find(
    (incident) => incident.estado === "ABIERTA",
  );
  const documentLabel =
    sale.cliente?.tipoDocumento === "ruc"
      ? "RUC"
      : sale.cliente?.tipoDocumento === "dni"
        ? "DNI"
        : "";

  return (
    <article className="overflow-hidden rounded-[16px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.10)]">
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-[220px_minmax(240px,1fr)_150px_150px_170px_auto] lg:items-center lg:gap-x-8">
        <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
          {selectable ? (
            <label className="group relative inline-flex shrink-0 cursor-pointer select-none items-center">
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onSelectedChange(event.target.checked)}
                aria-label={`Seleccionar ${sale.correlativo} para imprimir etiqueta`}
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
          {sale.envio &&
          sale.envio.estado === "recibido" &&
          (sale.envio.nombreCompleto ||
            sale.envio.celular ||
            sale.envio.dni) ? (
            <div className="min-w-0 space-y-1 rounded-xl border border-dashed border-[var(--color-primary)] bg-white p-2 text-xs">
              {sale.envio.nombreCompleto ? (
                <p className="max-w-full truncate font-semibold text-[var(--color-text)]">
                  {sale.envio.nombreCompleto}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--color-muted-foreground)]">
                {sale.envio.celular ? (
                  <span className="flex items-center gap-1">
                    <PhoneIcon size={12} className="shrink-0" />
                    {sale.envio.celular}
                  </span>
                ) : null}
                {sale.envio.dni ? <span>DNI {sale.envio.dni}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
        <InfoItem
          icon={CalendarIcon}
          label="Venta"
          value={formatDateTime(sale.createdAt)}
        />
        <InfoItem
          icon={ClockIcon}
          label={status === "ENTREGADO" ? "Entregado" : "Recojo hasta"}
          value={formatDate(
            status === "ENTREGADO"
              ? sale.envio?.entregadoAt ?? sale.fechaEntrega
              : sale.recojoHasta,
          )}
        />
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
                      : "Comparte o revisa el enlace de envío"}
                  </p>
                  {activeIncident ? (
                    <p className="mt-1 text-xs font-medium text-[#b91c1c]">
                      {activeIncident.motivo}: {activeIncident.descripcion}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
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
          {isCourier && sale.envio?.estado === "recibido" ? (
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
          {status === "INCIDENCIA" ? (
            <PrimaryButton onClick={onIncident} icon={WarningCircleIcon}>
              Gestionar incidencia
            </PrimaryButton>
          ) : status === "ENTREGADO" ? (
            <span className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[#10b981]/10 px-4 text-xs font-bold text-[#047857]">
              <CheckCircleIcon size={17} weight="fill" /> Entregado
            </span>
          ) : !isCourier ? (
            <PrimaryButton onClick={onClientDelivery} icon={PackageIcon}>
              Entregar al cliente
            </PrimaryButton>
          ) : sale.envio?.estado !== "recibido" ? (
            <PrimaryButton onClick={onManageLink} icon={LinkIcon}>
              Gestionar enlace
            </PrimaryButton>
          ) : status === "POR_DESPACHAR" ? (
            <>
              <SecondaryButton onClick={onIncident} icon={WarningCircleIcon}>Incidencia</SecondaryButton>
              <PrimaryButton onClick={onCourierDispatch} icon={TruckIcon}>
                Entregar al courier
              </PrimaryButton>
            </>
          ) : status === "EN_TRANSITO" ? (
            <>
              {pending > 0 ? (
                <SecondaryButton onClick={onCourierDispatch}>
                  Despachar restantes
                </SecondaryButton>
              ) : null}
              <SecondaryButton onClick={onIncident} icon={WarningCircleIcon}>Incidencia</SecondaryButton>
              <PrimaryButton onClick={onUpdateStatus} icon={TruckIcon}>
                Actualizar estado
              </PrimaryButton>
            </>
          ) : null}
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: typeof TruckIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-xs font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] hover:opacity-90"
    >
      <Icon size={17} weight="bold" />
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: typeof TruckIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-4 text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
    >
      {Icon ? <Icon size={17} weight="bold" /> : null}
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
    en_transito: "No hay envíos en tránsito",
    entregada: "No hay entregas registradas",
    incidencia: "No hay incidencias abiertas",
  };
  return (
    <div className="flex min-h-72 items-center justify-center rounded-[16px] bg-[var(--color-card)]">
      <div className="text-center">
        <PackageIcon
          size={48}
          weight="light"
          className="mx-auto text-[var(--color-muted-foreground)]"
        />
        <p className="mt-3 text-sm font-black text-[var(--color-text)]">
          {labels[tab]}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Cambia los filtros o actualiza la lista.
        </p>
      </div>
    </div>
  );
}

function ShippingLabelModal({
  sales,
  onClose,
}: {
  sales: VentaResponse[];
  onClose: () => void;
}) {
  const [packageCounts, setPackageCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(sales.map((sale) => [sale.publicId, 1])),
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperFormat, setPaperFormat] = useState<"THERMAL" | "A4">("A4");
  const [labelsPerPage, setLabelsPerPage] = useState<1 | 2 | 4>(1);
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">(
    "PORTRAIT",
  );
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
            { paperFormat, labelsPerPage, orientation },
          )
        : await salesApi.printShippingLabels(
            sales[0].publicId,
            {
              packageCount: packageCounts[sales[0].publicId],
              paperFormat,
              labelsPerPage,
              orientation,
            },
          );
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
          <section className="rounded-[16px] border border-[var(--color-border)] p-4">
            <p className="text-sm font-black text-[var(--color-text)]">
              Formato de impresión
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                  Papel
                </span>
                <Select
                  value={paperFormat}
                  onChange={(value) =>
                    setPaperFormat(value as "THERMAL" | "A4")
                  }
                  ariaLabel="Papel"
                  options={[
                    { value: "A4", label: "Hoja A4" },
                    { value: "THERMAL", label: "Térmico 100 × 150 mm" },
                  ]}
                  fixedMenu
                />
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                  Rótulos por hoja
                </span>
                <Select
                  value={String(paperFormat === "THERMAL" ? 1 : labelsPerPage)}
                  onChange={(value) =>
                    setLabelsPerPage(Number(value) as 1 | 2 | 4)
                  }
                  disabled={paperFormat === "THERMAL"}
                  ariaLabel="Rótulos por hoja"
                  options={[
                    { value: "1", label: "1 rótulo" },
                    { value: "2", label: "2 rótulos" },
                    { value: "4", label: "4 rótulos" },
                  ]}
                  fixedMenu
                />
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                  Orientación
                </span>
                <Select
                  value={orientation}
                  onChange={(value) =>
                    setOrientation(value as "PORTRAIT" | "LANDSCAPE")
                  }
                  disabled={paperFormat === "THERMAL"}
                  ariaLabel="Orientación"
                  options={[
                    { value: "PORTRAIT", label: "Vertical" },
                    { value: "LANDSCAPE", label: "Horizontal" },
                  ]}
                  fixedMenu
                />
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
                  {sale.envio?.agencia === "OLVA" ? "Olva" : "Shalom"} ·{" "}
                  {sale.envio?.agenciaNombre || "Agencia seleccionada"}
                </p>
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                  N.º de bultos
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustPackageCount(sale.publicId, -1)}
                    disabled={(packageCounts[sale.publicId] ?? 1) <= 1}
                    aria-label={`Quitar bulto a ${sale.correlativo}`}
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
                    aria-label={`Cantidad de bultos para ${sale.correlativo}`}
                    className="h-9 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-center text-sm font-bold text-[var(--color-text)] outline-none [-moz-appearance:textfield] focus:ring-2 focus:ring-[var(--color-primary)]/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustPackageCount(sale.publicId, 1)}
                    disabled={(packageCounts[sale.publicId] ?? 1) >= 50}
                    aria-label={`Agregar bulto a ${sale.correlativo}`}
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

function FulfillmentModal({
  sale,
  mode,
  onClose,
  onCompleted,
}: {
  sale: VentaResponse;
  mode: FulfillmentMode;
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
  const [numeroConstancia, setNumeroConstancia] = useState("");
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
      if (mode === "CLIENTE") {
        await salesApi.deliver(sale.publicId, {
          ...payload,
          retiranteDni: retiranteDni.trim() || undefined,
          retiranteNombre: retiranteNombre.trim() || undefined,
        });
      } else {
        await salesApi.dispatchToCourier(sale.publicId, {
          ...payload,
          numeroConstancia: numeroConstancia.trim() || undefined,
        });
      }
      toast.showToast({
        title:
          mode === "CLIENTE"
            ? "Entrega al cliente registrada"
            : "Despacho al courier registrado",
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
      title={mode === "CLIENTE" ? "Entregar al cliente" : "Entregar al courier"}
      description={`${sale.correlativo} · ${customerName(sale)}`}
      onClose={onClose}
      disabled={isSubmitting}
    >
      {mode === "COURIER" && sale.envio ? (
        <div className="rounded-[14px] bg-[var(--color-input-bg)] p-4 text-sm">
          <p className="font-black text-[var(--color-text)]">
            {sale.envio.agencia === "OLVA" ? "Olva" : "Shalom"} · {sale.envio.agenciaNombre}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {[sale.envio.agenciaDireccion, sale.envio.agenciaDistrito]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : null}

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

      {mode === "CLIENTE" ? (
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
      ) : (
        <TextInput
          value={numeroConstancia}
          onChange={setNumeroConstancia}
          placeholder="N.º de guía o constancia (opcional)"
        />
      )}
      <TextArea
        value={notes}
        onChange={setNotes}
        placeholder="Observaciones (opcional)"
      />
      <ModalActions
        onCancel={onClose}
        onConfirm={() => void submit()}
        confirmLabel={mode === "CLIENTE" ? "Entregar al cliente" : "Confirmar despacho"}
        disabled={total <= 0 || isSubmitting}
        loading={isSubmitting}
      />
    </ModalFrame>
  );
}

function ShippingStatusModal({
  sale,
  onClose,
  onCompleted,
}: {
  sale: VentaResponse;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();

  const submit = async () => {
    setIsSubmitting(true);
    try {
      await salesApi.updateShippingStatus(sale.publicId, {
        estado: "ENTREGADO",
        notas: notes.trim() || undefined,
      });
      toast.showToast({
        title: "Envío marcado como entregado",
        description: sale.correlativo,
        variant: "success",
      });
      onCompleted();
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudo actualizar el estado",
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
      title="Actualizar estado del envío"
      description={`${sale.correlativo} · ${sale.envio?.agencia === "OLVA" ? "Olva" : "Shalom"}`}
      onClose={onClose}
      disabled={isSubmitting}
    >
      <div className="rounded-[14px] bg-[#3b82f6]/10 p-4 text-sm text-[#1d4ed8]">
        Confirma únicamente cuando el cliente haya recibido todo el pedido.
      </div>
      <TextArea
        value={notes}
        onChange={setNotes}
        placeholder="Observaciones de la entrega (opcional)"
      />
      <ModalActions
        onCancel={onClose}
        onConfirm={() => void submit()}
        confirmLabel="Confirmar entrega final"
        disabled={isSubmitting}
        loading={isSubmitting}
      />
    </ModalFrame>
  );
}

function IncidentModal({
  sale,
  onClose,
  onCompleted,
}: {
  sale: VentaResponse;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const activeIncident = sale.envio?.incidencias.find(
    (incident) => incident.estado === "ABIERTA",
  );
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [solution, setSolution] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useSystemToast();

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (activeIncident) {
        await salesApi.resolveShippingIncident(
          sale.publicId,
          activeIncident.publicId,
          solution.trim(),
        );
      } else {
        await salesApi.createShippingIncident(sale.publicId, {
          motivo: reason.trim(),
          descripcion: description.trim(),
        });
      }
      toast.showToast({
        title: activeIncident ? "Incidencia resuelta" : "Incidencia registrada",
        variant: "success",
      });
      onCompleted();
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudo guardar la incidencia",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const invalid = activeIncident
    ? solution.trim().length < 3
    : reason.trim().length < 3 || description.trim().length < 3;

  return (
    <ModalFrame
      title={activeIncident ? "Gestionar incidencia" : "Registrar incidencia"}
      description={`${sale.correlativo} · ${sale.envio?.agencia === "OLVA" ? "Olva" : "Shalom"}`}
      onClose={onClose}
      disabled={isSubmitting}
    >
      {activeIncident ? (
        <>
          <div className="rounded-[14px] bg-[#ef4444]/10 p-4">
            <p className="text-sm font-black text-[#b91c1c]">
              {activeIncident.motivo}
            </p>
            <p className="mt-1 text-sm text-[#991b1b]">
              {activeIncident.descripcion}
            </p>
          </div>
          <TextArea
            value={solution}
            onChange={setSolution}
            placeholder="Describe cómo se resolvió la incidencia"
          />
        </>
      ) : (
        <>
          <TextInput
            value={reason}
            onChange={setReason}
            placeholder="Motivo de la incidencia"
          />
          <TextArea
            value={description}
            onChange={setDescription}
            placeholder="Describe lo ocurrido"
          />
        </>
      )}
      <ModalActions
        onCancel={onClose}
        onConfirm={() => void submit()}
        confirmLabel={activeIncident ? "Resolver incidencia" : "Registrar incidencia"}
        disabled={invalid || isSubmitting}
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

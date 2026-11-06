"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  IdentificationBadgeIcon,
  IdentificationCardIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PackageIcon,
  PhoneIcon,
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

function totalQuantity(sale: VentaResponse) {
  return sale.detalles.reduce((sum, detail) => sum + detail.cantidad, 0);
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

  return (
    <DashboardShell headerTitle="Entregas y envíos">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6">
        <div className="grid w-full grid-cols-2 rounded-[18px] bg-[var(--color-input-bg)] p-1 sm:max-w-xl">
          <ViewModeButton
            active={viewMode === "pickup"}
            icon={StorefrontIcon}
            label="Recojo en tienda"
            onClick={() => {
              setViewMode("pickup");
              setActiveTab("pendiente");
              setCourier("");
              setPage(1);
            }}
          />
          <ViewModeButton
            active={viewMode === "courier"}
            icon={TruckIcon}
            label="Envíos por courier"
            onClick={() => {
              setViewMode("courier");
              setActiveTab("pendiente");
              setPage(1);
            }}
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
                <SpinnerGapIcon
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
    </DashboardShell>
  );
}

function ViewModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof StorefrontIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center justify-center gap-2 rounded-[15px] px-3 text-sm font-black transition-colors",
        active
          ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-text)]",
      )}
    >
      <Icon size={19} weight={active ? "fill" : "regular"} />
      {label}
    </button>
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
}: {
  sale: VentaResponse;
  onClientDelivery: () => void;
  onCourierDispatch: () => void;
  onManageLink: () => void;
  onUpdateStatus: () => void;
  onIncident: () => void;
}) {
  const status = logisticsStatus(sale);
  const statusConfig = logisticsLabels[status];
  const pending = pendingQuantity(sale);
  const total = totalQuantity(sale);
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
      <div className="grid gap-3 p-4 lg:grid-cols-[170px_minmax(190px,1fr)_150px_150px_120px_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
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
        <div className="flex min-w-0 items-center gap-3">
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
        <div>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            Productos
          </p>
          <p className="text-sm font-black text-[var(--color-text)]">
            {pending > 0 ? `${pending} pendientes` : `${total} entregados`}
          </p>
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
                    "mt-0.5 rounded-md px-2 py-1 text-[10px] font-black text-white",
                    sale.envio.agencia === "OLVA"
                      ? "bg-[#eab308]"
                      : "bg-[#dc2626]",
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
                {sale.envio.estado === "recibido" &&
                (sale.envio.nombreCompleto ||
                  sale.envio.celular ||
                  sale.envio.dni) ? (
                  <div className="flex items-center gap-2">
                    <IdentificationBadgeIcon
                      size={34}
                      weight="duotone"
                      className="shrink-0 text-[var(--color-primary)]"
                    />
                    <div className="min-w-0 space-y-0.5 text-xs">
                      {sale.envio.nombreCompleto ? (
                        <p className="truncate font-semibold text-[var(--color-text)]">
                          {sale.envio.nombreCompleto}
                        </p>
                      ) : null}
                      <p className="flex flex-wrap items-center gap-x-2 text-[var(--color-muted-foreground)]">
                        {sale.envio.celular ? (
                          <span className="flex items-center gap-1">
                            <PhoneIcon size={12} className="shrink-0" />
                            {sale.envio.celular}
                          </span>
                        ) : null}
                        {sale.envio.dni ? (
                          <span className="flex items-center gap-1">
                            <IdentificationCardIcon
                              size={12}
                              className="shrink-0"
                            />
                            DNI {sale.envio.dni}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ) : null}
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
              <SecondaryButton onClick={onIncident}>Incidencia</SecondaryButton>
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
              <SecondaryButton onClick={onIncident}>Incidencia</SecondaryButton>
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
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-[14px] bg-[var(--color-input-bg)] px-4 text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
    >
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-6">
      <div className="w-full max-w-2xl rounded-[16px] bg-[var(--color-card)] shadow-[0_22px_70px_rgba(15,23,42,0.28)]">
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

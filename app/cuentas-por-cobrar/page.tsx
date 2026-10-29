"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowClockwiseIcon,
  CalendarIcon,
  ClockCountdownIcon,
  CreditCardIcon,
  CurrencyCircleDollarIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ReceiptIcon,
  UserCircleIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { UserAvatar } from "@/components/UserAvatar/user-avatar";
import { CalendarInput } from "@/components/ui/calendar-input";
import { Select } from "@/components/ui/select";
import {
  accountsReceivableApi,
  type Receivable,
  type ReceivableStatus,
  type ReceivableSummary,
} from "@/lib/api/accounts-receivable";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { clientsApi, type Client } from "@/lib/api/clients";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const emptySummary: ReceivableSummary = {
  totalPendiente: "0.00",
  totalVencido: "0.00",
  totalPorVencer: "0.00",
  cobradoMes: "0.00",
  clientesConDeuda: 0,
};

const statusOptions = [
  { label: "Todos los estados", value: "" },
  { label: "Pendiente", value: "pendiente" },
  { label: "Pago parcial", value: "parcial" },
  { label: "Pagada", value: "pagada" },
  { label: "Anulación pendiente", value: "anulacion_pendiente" },
  { label: "Anulada", value: "anulada" },
];

const situationOptions = [
  { label: "Todas", value: "" },
  { label: "Vencidas", value: "vencida" },
  { label: "Vigentes", value: "vigente" },
];

function money(value: string | number) {
  return `S/ ${Number(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function clientName(account: Receivable) {
  return account.cliente.razonSocial || account.cliente.nombre || "Cliente";
}

function status(account: Receivable) {
  if (account.vencida && !["pagada", "anulada"].includes(account.estado)) {
    return { label: "Vencida", className: "bg-[#ef4444]/10 text-[#dc2626]" };
  }
  const values: Record<ReceivableStatus, { label: string; className: string }> =
    {
      pendiente: {
        label: "Pendiente",
        className: "bg-[#f59e0b]/10 text-[#b45309]",
      },
      parcial: {
        label: "Pago parcial",
        className: "bg-[#3b82f6]/10 text-[#1d4ed8]",
      },
      pagada: { label: "Pagada", className: "bg-[#10b981]/10 text-[#047857]" },
      anulacion_pendiente: {
        label: "Anulación pendiente",
        className: "bg-[#8b5cf6]/10 text-[#6d28d9]",
      },
      anulada: {
        label: "Anulada",
        className: "bg-[#6b7280]/10 text-[#4b5563]",
      },
    };
  return values[account.estado];
}

export default function AccountsReceivablePage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [items, setItems] = useState<Receivable[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [clientId, setClientId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [situation, setSituation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: defaultPageSize,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      branchesApi.findAll({ estado: "activo", tipo: "tienda", limit: 100 }),
      clientsApi.findAll({ estado: "activo", limit: 100 }),
    ])
      .then(([branchResponse, clientResponse]) => {
        setBranches(branchResponse.data);
        setClients(clientResponse.data);
      })
      .catch(() => undefined);
  }, []);

  const load = useCallback(
    async (_refreshToken: number) => {
      void _refreshToken;
      setLoading(true);
      try {
        const [summaryResponse, response] = await Promise.all([
          accountsReceivableApi.summary(),
          accountsReceivableApi.findAll({
            page,
            limit: defaultPageSize,
            search: search.trim() || undefined,
            clienteId: clientId || undefined,
            sucursalId: branchId || undefined,
            estado: (selectedStatus || undefined) as
              ReceivableStatus | undefined,
            situacion: (situation || undefined) as
              "vencida" | "vigente" | undefined,
            desde: from || undefined,
            hasta: to || undefined,
          }),
        ]);
        setSummary(summaryResponse);
        setItems(response.data);
        setMeta(response.meta);
      } catch (error) {
        showToast({
          title: "No se pudieron cargar las cuentas",
          description:
            error instanceof Error ? error.message : "Intenta nuevamente.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      branchId,
      clientId,
      from,
      page,
      search,
      selectedStatus,
      showToast,
      situation,
      to,
    ],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(refreshKey), 250);
    return () => window.clearTimeout(timeout);
  }, [load, refreshKey]);

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  };

  const openAccount = (publicId: string) => {
    router.push(`/cuentas-por-cobrar/${publicId}`);
  };

  const activeFilters = [
    clientId,
    branchId,
    selectedStatus,
    situation,
    from,
    to,
  ].filter(Boolean).length;

  const cards = [
    {
      label: "Saldo pendiente",
      value: money(summary.totalPendiente),
      icon: WalletIcon,
      iconColor: "text-[#f59e0b]",
      iconBackground: "bg-[#f59e0b]/10",
    },
    {
      label: "Saldo vencido",
      value: money(summary.totalVencido),
      icon: ClockCountdownIcon,
      iconColor: "text-[#ef4444]",
      iconBackground: "bg-[#ef4444]/10",
    },
    {
      label: "Por vencer",
      value: money(summary.totalPorVencer),
      icon: CurrencyCircleDollarIcon,
      iconColor: "text-[#3b82f6]",
      iconBackground: "bg-[#3b82f6]/10",
    },
    {
      label: "Cobrado este mes",
      value: money(summary.cobradoMes),
      icon: CreditCardIcon,
      iconColor: "text-[#10b981]",
      iconBackground: "bg-[#10b981]/10",
    },
    {
      label: "Clientes con deuda",
      value: String(summary.clientesConDeuda),
      icon: UserCircleIcon,
      iconColor: "text-[var(--color-primary)]",
      iconBackground: "bg-[var(--color-primary)]/10",
    },
  ];

  return (
    <DashboardShell headerTitle="Cuentas por cobrar">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="flex min-h-24 items-center gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm"
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  card.iconBackground,
                )}
              >
                <card.icon size={22} weight="fill" className={card.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
                  {card.label}
                </p>
                <p className="mt-1 truncate text-xl font-circular-bold leading-none text-[var(--color-text)]">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky -top-3 z-30 -mx-3 flex flex-col gap-3 bg-white px-3 py-2 sm:-top-4 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative w-full sm:max-w-md">
              <MagnifyingGlassIcon
                size={18}
                weight="bold"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  updateFilter(setSearch, event.target.value)
                }
                placeholder="Buscar cliente, documento o comprobante"
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none transition-colors focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-circular-bold transition-colors lg:hidden",
                  showFilters || activeFilters > 0
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
                aria-expanded={showFilters}
              >
                <FunnelIcon size={16} weight="bold" />
                Filtros{activeFilters > 0 ? ` (${activeFilters})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-5 text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                <ArrowClockwiseIcon
                  size={16}
                  weight="bold"
                  className={cn(loading && "animate-spin")}
                />
                Actualizar
              </button>
            </div>
          </div>
          <div
            className={cn(
              "gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4",
              showFilters ? "grid" : "hidden",
            )}
          >
            <Select
              value={clientId}
              onChange={(value) => updateFilter(setClientId, value)}
              options={[
                { label: "Todos los clientes", value: "" },
                ...clients.map((client) => ({
                  label: client.displayName,
                  value: client.id,
                })),
              ]}
              searchable
              fixedMenu
            />
            <Select
              value={branchId}
              onChange={(value) => updateFilter(setBranchId, value)}
              options={[
                { label: "Todas las sucursales", value: "" },
                ...branches.map((branch) => ({
                  label: branch.nombre,
                  value: branch.id,
                })),
              ]}
              fixedMenu
            />
            <Select
              value={selectedStatus}
              onChange={(value) => updateFilter(setSelectedStatus, value)}
              options={statusOptions}
              fixedMenu
            />
            <Select
              value={situation}
              onChange={(value) => updateFilter(setSituation, value)}
              options={situationOptions}
              fixedMenu
            />
            <CalendarInput
              value={from}
              onChange={(value) => updateFilter(setFrom, value)}
              labelInline="Desde"
              clearable
            />
            <CalendarInput
              value={to}
              onChange={(value) => updateFilter(setTo, value)}
              labelInline="Hasta"
              clearable
            />
          </div>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[var(--color-input-bg)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded bg-[var(--color-input-bg)]" />
                    <div className="h-3 w-40 rounded bg-[var(--color-input-bg)]" />
                  </div>
                  <div className="h-4 w-20 rounded bg-[var(--color-input-bg)]" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <WalletIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron cuentas por cobrar
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Cambia los filtros, busca otro dato o actualiza la lista
                </p>
              </div>
            </div>
          ) : (
            items.map((account) => {
              const currentStatus = status(account);
              return (
                <div
                  key={account.publicId}
                  className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(130px,0.9fr)_minmax(190px,1.45fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_minmax(110px,0.8fr)_120px] md:items-center md:gap-3 md:gap-y-0 xl:grid-cols-[170px_minmax(240px,1.5fr)_140px_120px_140px_120px] xl:gap-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <ReceiptIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {account.venta.correlativo}
                      </p>
                      <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                        {account.venta.codigoInterno}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      seed={account.cliente.id}
                      name={clientName(account)}
                      size={40}
                      className="size-10 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {clientName(account)}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {account.cliente.tipoDocumento.toUpperCase()}{" "}
                        {account.cliente.numeroDocumento || "Sin documento"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarIcon
                      size={14}
                      className="shrink-0 text-[var(--color-muted-foreground)]"
                    />
                    <div>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">
                        Vence
                      </p>
                      <p className="text-xs text-[var(--color-text)]">
                        {displayDate(account.primerVencimiento)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Total
                    </p>
                    <p className="text-sm text-[var(--color-text)]">
                      {money(account.totalVenta)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Saldo
                    </p>
                    <p className="text-sm font-circular-bold text-[var(--color-text)]">
                      {money(account.saldoPendiente)}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-circular-bold",
                        currentStatus.className,
                      )}
                    >
                      {currentStatus.label}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end md:col-span-1">
                    <button
                      type="button"
                      onClick={() => openAccount(account.publicId)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-xs font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-opacity hover:opacity-90"
                    >
                      <EyeIcon size={16} weight="bold" />
                      Ver detalle
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {items.length} de {meta.total} cuentas
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-2 text-xs font-circular-bold text-white">
              {meta.page} / {Math.max(1, meta.totalPages)}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
              disabled={loading || page >= meta.totalPages}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

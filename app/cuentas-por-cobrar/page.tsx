"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ClockCountdownIcon,
  CreditCardIcon,
  CurrencyCircleDollarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon,
  UserCircleIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";

import { ReceivableDrawer } from "@/components/AccountsReceivable/receivable-drawer";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
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
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const readAccount = () => {
      setSelectedAccountId(
        new URLSearchParams(window.location.search).get("account"),
      );
    };
    readAccount();
    window.addEventListener("popstate", readAccount);
    return () => window.removeEventListener("popstate", readAccount);
  }, []);

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
    const url = new URL(window.location.href);
    url.searchParams.set("account", publicId);
    window.history.pushState(null, "", url);
    setSelectedAccountId(publicId);
  };

  const closeAccount = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("account");
    window.history.pushState(null, "", url);
    setSelectedAccountId(null);
  };

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
                <card.icon
                  size={22}
                  weight="fill"
                  className={card.iconColor}
                />
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

        <div className="space-y-3 rounded-[18px] bg-[var(--color-card)] p-4 shadow-sm ring-1 ring-[var(--color-border)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              />
              <input
                value={search}
                onChange={(event) =>
                  updateFilter(setSearch, event.target.value)
                }
                placeholder="Buscar cliente, documento o comprobante"
                className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] pl-10 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-input-bg)] px-5 text-sm font-circular-bold transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <ArrowClockwiseIcon
                size={16}
                className={cn(loading && "animate-spin")}
              />
              Actualizar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="overflow-hidden rounded-[18px] bg-[var(--color-card)] shadow-sm ring-1 ring-[var(--color-border)]">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerGapIcon
                size={30}
                className="animate-spin text-[var(--color-primary)]"
              />
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <WalletIcon
                size={36}
                className="mx-auto text-[var(--color-muted-foreground)]"
              />
              <p className="mt-3 font-black">
                No se encontraron cuentas por cobrar
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Las ventas al crédito aparecerán aquí.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--color-input-bg)] text-[11px] uppercase text-[var(--color-muted-foreground)]">
                    <tr>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Comprobante</th>
                      <th className="p-4">Vencimiento</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Saldo</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((account) => {
                      const currentStatus = status(account);
                      return (
                        <tr
                          key={account.publicId}
                          className="border-t border-[var(--color-border)]"
                        >
                          <td className="p-4">
                            <p className="font-circular-bold text-[var(--color-text)]">
                              {clientName(account)}
                            </p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {account.cliente.numeroDocumento}
                            </p>
                          </td>
                          <td className="p-4 font-circular-bold">
                            {account.venta.correlativo}
                          </td>
                          <td className="p-4">
                            {displayDate(account.primerVencimiento)}
                          </td>
                          <td className="p-4">{money(account.totalVenta)}</td>
                          <td className="p-4 font-black">
                            {money(account.saldoPendiente)}
                          </td>
                          <td className="p-4">
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-circular-bold",
                                currentStatus.className,
                              )}
                            >
                              {currentStatus.label}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => openAccount(account.publicId)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-input-bg)]"
                              aria-label="Ver cuenta"
                            >
                              <EyeIcon size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-[var(--color-border)] md:hidden">
                {items.map((account) => {
                  const currentStatus = status(account);
                  return (
                    <button
                      key={account.publicId}
                      type="button"
                      onClick={() => openAccount(account.publicId)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[var(--color-text)]">
                            {clientName(account)}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {account.venta.correlativo} · vence{" "}
                            {displayDate(account.primerVencimiento)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-circular-bold",
                            currentStatus.className,
                          )}
                        >
                          {currentStatus.label}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          Total {money(account.totalVenta)}
                        </p>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-[var(--color-muted-foreground)]">
                            Saldo
                          </p>
                          <p className="font-black">
                            {money(account.saldoPendiente)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {meta.total} cuentas · Página {meta.page} de{" "}
              {Math.max(1, meta.totalPages)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-input-bg)] disabled:opacity-40"
              >
                <CaretLeftIcon size={16} />
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-input-bg)] disabled:opacity-40"
              >
                <CaretRightIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReceivableDrawer
        publicId={selectedAccountId}
        onClose={closeAccount}
        onChanged={() => setRefreshKey((value) => value + 1)}
      />
    </DashboardShell>
  );
}

"use client";

import { NativeSelect } from "@/components/ui/select";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowClockwiseIcon,
  CalendarIcon,
  ClockIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReceiptIcon,
  StorefrontIcon,
  UserIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { formatDate, formatTime } from "@/lib/intl";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformCompany,
  type PlatformSubscriptionPaymentMethod,
} from "@/lib/api/platform-admin";
import {
  downloadBlob,
  platformBillingApi,
  type PlatformReceipt,
  type PlatformReceiptStatus,
  type PlatformReceiptType,
} from "@/lib/api/platform-billing";
import { cn } from "@/lib/utils";

const pageSize = 10;
const inputClassName =
  "h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]";

const receiptTypes = [
  { value: "nota_venta", label: "Nota de venta" },
  { value: "boleta", label: "Boleta" },
  { value: "factura", label: "Factura" },
] as const;

const typeLabels: Record<PlatformReceiptType, string> = {
  nota_venta: "NOTA",
  boleta: "BOLETA",
  factura: "FACTURA",
  nota_credito: "N/C",
};

const statusConfig: Record<
  PlatformReceiptStatus,
  { label: string; className: string }
> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  aceptado: {
    label: "Aceptado",
    className: "bg-[#10b981] text-white",
  },
  rechazado: {
    label: "Rechazado",
    className: "bg-[#ef4444] text-white",
  },
  error: {
    label: "Con error",
    className: "bg-[#ef4444]/10 text-[#dc2626]",
  },
  anulacion_pendiente: {
    label: "Anulacion pendiente",
    className: "bg-[#f59e0b]/10 text-[#b45309]",
  },
  anulado: {
    label: "Anulado",
    className: "bg-[#64748b]/10 text-[#475569]",
  },
};

const methods: PlatformSubscriptionPaymentMethod[] = [
  "yape",
  "plin",
  "transferencia",
  "deposito",
  "efectivo",
  "otro",
];

export default function PlatformReceiptsPage() {
  const { showToast } = useSystemToast();
  const [rows, setRows] = useState<PlatformReceipt[]>([]);
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<PlatformReceiptType | "">("");
  const [status, setStatus] = useState<PlatformReceiptStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCharge, setShowCharge] = useState(false);
  const [receiptToCancel, setReceiptToCancel] =
    useState<PlatformReceipt | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await platformBillingApi.findReceipts({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        type: type || undefined,
        status: status || undefined,
      });
      setRows(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, status, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReceipts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReceipts]);

  useEffect(() => {
    platformAdminApi
      .findCompanies({ limit: 100 })
      .then((response) => setCompanies(response.data))
      .catch(() => setCompanies([]));
  }, []);

  const summary = useMemo(
    () => ({
      accepted: rows.filter((row) => row.status === "aceptado").length,
      cancelled: rows.filter((row) => row.status === "anulado").length,
      total: rows
        .filter((row) => row.status === "aceptado")
        .reduce((sum, row) => sum + Number(row.total), 0),
    }),
    [rows],
  );

  const download = async (
    row: PlatformReceipt,
    kind: "pdf" | "xml" | "cdr",
  ) => {
    setOpenMenuId(null);
    try {
      downloadBlob(
        await platformBillingApi.download(row.id, kind),
        `${row.correlativo}.${kind === "cdr" ? "zip" : kind}`,
      );
    } catch (requestError) {
      showToast({
        title: "Descarga no disponible",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    }
  };

  const downloadCancellation = async (
    row: PlatformReceipt,
    kind: "xml" | "cdr",
  ) => {
    setOpenMenuId(null);
    try {
      downloadBlob(
        await platformBillingApi.downloadCancellation(row.id, kind),
        `baja-${row.correlativo}.${kind === "cdr" ? "zip" : "xml"}`,
      );
    } catch (requestError) {
      showToast({
        title: "Descarga no disponible",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    }
  };

  const retry = async (row: PlatformReceipt) => {
    setOpenMenuId(null);
    try {
      await platformBillingApi.retry(row.id);
      await loadReceipts();
      showToast({
        title: "Reintento en cola",
        description: row.correlativo,
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudo reintentar",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    }
  };

  const requestCancellation = (row: PlatformReceipt) => {
    setOpenMenuId(null);
    setReceiptToCancel(row);
  };

  const cancelReceipt = async (reason: string) => {
    if (!receiptToCancel) return;
    try {
      const isInternal = receiptToCancel.type === "nota_venta";
      await platformBillingApi.cancel(receiptToCancel.id, reason);
      setReceiptToCancel(null);
      await loadReceipts();
      showToast({
        title: isInternal ? "Nota de venta anulada" : "Baja SUNAT solicitada",
        description: isInternal
          ? "La operacion fue anulada internamente."
          : "La solicitud RA/RC quedo en cola para SUNAT.",
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudo anular",
        description: getErrorMessage(requestError),
        variant: "error",
      });
    }
  };

  return (
    <DashboardShell headerTitle="Comprobantes de Nuvex">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            label="Total emitido"
            value={formatMoney(summary.total)}
            color="#ffffff"
            featured
          />
          <MetricCard
            label="Comprobantes aceptados"
            value={summary.accepted.toLocaleString("es-PE")}
            color="#10b981"
          />
          <MetricCard
            label="Comprobantes anulados"
            value={summary.cancelled.toLocaleString("es-PE")}
            color="#ef4444"
          />
        </section>

        <section className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="search"
              placeholder="Buscar por correlativo, empresa o documento..."
              aria-label="Buscar por correlativo, empresa o documento..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <NativeSelect
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PlatformReceiptStatus | "");
              setPage(1);
            }}
            className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text)] outline-none sm:w-[180px]"
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusConfig).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Filtrar por tipo"
            value={type}
            onChange={(event) => {
              setType(event.target.value as PlatformReceiptType | "");
              setPage(1);
            }}
            className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text)] outline-none sm:w-[170px]"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <button
            type="button"
            onClick={() => setShowCharge(true)}
            className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white"
          >
            <PlusIcon size={17} weight="bold" />
            Cobro adicional
          </button>
          <button
            type="button"
            onClick={() => void loadReceipts()}
            title="Actualizar"
            aria-label="Actualizar comprobantes"
            className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-[var(--color-input-bg)] text-[var(--color-text)]"
          >
            <ArrowClockwiseIcon
              size={18}
              weight="bold"
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </section>

        {error ? (
          <div className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 pb-2 pr-1">
          {loading && rows.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => (
              <ReceiptSkeleton key={index} />
            ))
          ) : rows.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <ReceiptIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-circular-bold text-[var(--color-text)]">
                  No se encontraron comprobantes
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            rows.map((row) => (
              <ReceiptRow
                key={row.id}
                row={row}
                menuOpen={openMenuId === row.id}
                onToggleMenu={() =>
                  setOpenMenuId(openMenuId === row.id ? null : row.id)
                }
                onDownload={download}
                onDownloadCancellation={downloadCancellation}
                onRetry={retry}
                onCredit={requestCancellation}
              />
            ))
          )}
        </section>

        <footer className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {rows.length} de {meta.total} comprobantes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={loading || page <= 1}
              className="flex h-8 items-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="grid size-8 place-items-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {page}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(meta.totalPages, value + 1))
              }
              disabled={loading || page >= meta.totalPages}
              className="flex h-8 items-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </div>

      {showCharge ? (
        <ExtraChargeModal
          companies={companies}
          onClose={() => setShowCharge(false)}
          onSaved={async () => {
            setShowCharge(false);
            await loadReceipts();
          }}
        />
      ) : null}
      {receiptToCancel ? (
        <CancelReceiptModal
          receipt={receiptToCancel}
          onClose={() => setReceiptToCancel(null)}
          onConfirm={cancelReceipt}
        />
      ) : null}
    </DashboardShell>
  );
}

function MetricCard({
  label,
  value,
  color,
  featured = false,
}: {
  label: string;
  value: string;
  color: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.12)]",
        featured
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[var(--color-card)] text-[var(--color-text)]",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: featured ? "rgba(255,255,255,0.18)" : `${color}1a`,
            color,
          }}
        >
          <ReceiptIcon size={22} weight="fill" />
        </div>
        <div>
          <p
            className={cn(
              "text-sm",
              featured
                ? "text-white/75"
                : "text-[var(--color-muted-foreground)]",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-2xl font-circular-bold leading-none",
              featured ? "text-white" : "text-[var(--color-text)]",
            )}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({
  row,
  menuOpen,
  onToggleMenu,
  onDownload,
  onDownloadCancellation,
  onRetry,
  onCredit,
}: {
  row: PlatformReceipt;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onDownload: (
    row: PlatformReceipt,
    kind: "pdf" | "xml" | "cdr",
  ) => Promise<void>;
  onDownloadCancellation: (
    row: PlatformReceipt,
    kind: "xml" | "cdr",
  ) => Promise<void>;
  onRetry: (row: PlatformReceipt) => Promise<void>;
  onCredit: (row: PlatformReceipt) => void;
}) {
  const status = statusConfig[row.status];

  return (
    <article className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(125px,0.9fr)_minmax(170px,1.3fr)_minmax(110px,0.85fr)_minmax(150px,1.2fr)_minmax(120px,0.85fr)_minmax(100px,0.8fr)_32px] md:items-center md:gap-3 xl:gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <ReceiptIcon size={20} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {row.correlativo}
          </p>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            {typeLabels[row.type]}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
          <StorefrontIcon size={22} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {row.company.name}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {sourceLabel(row.source.type)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <CalendarIcon
            size={14}
            className="text-[var(--color-muted-foreground)]"
          />
          {formatDate(row.issuedAt)}
        </span>
        <span className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <ClockIcon
            size={14}
            className="text-[var(--color-muted-foreground)]"
          />
          {formatTime(row.issuedAt)}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]">
          <UserIcon size={20} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {row.receiver.name}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {row.receiver.document ?? "Sin documento"}
          </p>
        </div>
      </div>

      <div className="flex md:justify-center">
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-xs font-circular-bold",
            status.className,
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="md:text-right">
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Total
        </p>
        <p className="text-sm font-circular-bold text-[var(--color-text)]">
          {formatMoney(Number(row.total))}
        </p>
      </div>

      <div className="relative flex md:justify-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Mas opciones"
          className="grid size-8 place-items-center rounded-[8px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
        >
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
            <MenuAction
              icon={<DownloadSimpleIcon size={16} weight="bold" />}
              label="Descargar PDF"
              onClick={() => void onDownload(row, "pdf")}
            />
            {row.downloads.xml ? (
              <MenuAction
                icon={<FileTextIcon size={16} weight="bold" />}
                label="Descargar XML"
                onClick={() => void onDownload(row, "xml")}
              />
            ) : null}
            {row.downloads.cdr ? (
              <MenuAction
                icon={<FileTextIcon size={16} weight="bold" />}
                label="Descargar CDR"
                onClick={() => void onDownload(row, "cdr")}
              />
            ) : null}
            {row.downloads.cancellationXml ? (
              <MenuAction
                icon={<FileTextIcon size={16} weight="bold" />}
                label="Descargar XML de baja"
                onClick={() => void onDownloadCancellation(row, "xml")}
              />
            ) : null}
            {row.downloads.cancellationCdr ? (
              <MenuAction
                icon={<FileTextIcon size={16} weight="bold" />}
                label="Descargar CDR de baja"
                onClick={() => void onDownloadCancellation(row, "cdr")}
              />
            ) : null}
            {row.status === "error" ||
            row.cancellation?.state === "error_transitorio" ||
            row.cancellation?.state === "error_definitivo" ? (
              <MenuAction
                icon={<ArrowClockwiseIcon size={16} weight="bold" />}
                label="Reintentar envio"
                onClick={() => void onRetry(row)}
              />
            ) : null}
            {row.status === "aceptado" && row.type !== "nota_credito" ? (
              <MenuAction
                icon={<XCircleIcon size={16} weight="bold" />}
                label={
                  row.type === "nota_venta"
                    ? "Anular nota de venta"
                    : "Dar de baja en SUNAT"
                }
                danger
                onClick={() => void onCredit(row)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ReceiptSkeleton() {
  return (
    <div className="animate-pulse rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]">
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-xl bg-[var(--color-input-bg)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-[var(--color-input-bg)]" />
          <div className="h-3 w-40 rounded bg-[var(--color-input-bg)]" />
        </div>
        <div className="h-4 w-20 rounded bg-[var(--color-input-bg)]" />
      </div>
    </div>
  );
}

function MenuAction({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-button-hover)]",
        danger ? "text-[#ef4444]" : "text-[var(--color-text)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CancelReceiptModal({
  receipt,
  onClose,
  onConfirm,
}: {
  receipt: PlatformReceipt;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const isInternal = receipt.type === "nota_venta";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/45 p-4 animate-in fade-in duration-200">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_12px_36px_rgba(21,25,34,0.24)] animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ef4444]/10 text-[#ef4444]">
              <XCircleIcon size={22} weight="fill" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-circular-bold text-[var(--color-text)]">
                {isInternal ? "Anular nota de venta" : "Dar de baja en SUNAT"}
              </h2>
              <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                {receipt.correlativo} · {receipt.company.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-[var(--color-button-hover)]"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text)]">
          {isInternal
            ? "La nota de venta se anulara internamente y no se enviara a SUNAT."
            : "Se enviara una comunicacion de baja RA/RC. La operacion solo se anulara cuando SUNAT la acepte."}
        </div>

        <label className="mt-4 grid gap-1.5 text-sm">
          <span className="font-circular-bold text-[var(--color-text)]">
            Motivo de anulacion
          </span>
          <textarea
            required
            minLength={5}
            maxLength={300}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full resize-none rounded-xl bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            placeholder="Ingresa el motivo"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || reason.trim().length < 5}
            className="h-10 rounded-lg bg-[#ef4444] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
          >
            {saving
              ? "Procesando..."
              : isInternal
                ? "Anular venta"
                : "Solicitar baja"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ExtraChargeModal({
  companies,
  onClose,
  onSaved,
}: {
  companies: PlatformCompany[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [method, setMethod] =
    useState<PlatformSubscriptionPaymentMethod>("yape");
  const [other, setOther] = useState("");
  const [receiptType, setReceiptType] = useState<
    "nota_venta" | "boleta" | "factura"
  >("nota_venta");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await platformBillingApi.createExtraCharge({
        requestId: crypto.randomUUID(),
        companyId,
        description,
        quantity: Number(quantity),
        unitPrice: Number(price),
        paymentMethod: method,
        paymentMethodOther: method === "otro" ? other : undefined,
        receiptType,
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 animate-in fade-in duration-200">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-xl animate-in zoom-in-95 duration-200"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-circular-bold">Cobro adicional</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Concepto libre con IGV incluido.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <XIcon size={20} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa">
            <NativeSelect
              required
              className={inputClassName}
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Comprobante">
            <NativeSelect
              className={inputClassName}
              value={receiptType}
              onChange={(event) =>
                setReceiptType(event.target.value as typeof receiptType)
              }
            >
              {receiptTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Descripcion" wide>
            <input
              required
              minLength={3}
              className={inputClassName}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label="Cantidad">
            <input
              required
              type="number"
              min="0.001"
              step="0.001"
              className={inputClassName}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label="Precio final unitario">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className={inputClassName}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </Field>
          <Field label="Metodo de pago">
            <NativeSelect
              className={inputClassName}
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target.value as PlatformSubscriptionPaymentMethod,
                )
              }
            >
              {methods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </NativeSelect>
          </Field>
          {method === "otro" ? (
            <Field label="Descripcion del metodo">
              <input
                required
                className={inputClassName}
                value={other}
                onChange={(event) => setOther(event.target.value)}
              />
            </Field>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !companyId}
            className="h-10 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
          >
            {saving ? "Registrando..." : "Registrar y emitir"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm", wide && "sm:col-span-2")}>
      <span className="font-circular-bold">{label}</span>
      {children}
    </label>
  );
}

const moneyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function sourceLabel(source: PlatformReceipt["source"]["type"]) {
  return {
    subscription: "Suscripcion",
    overage: "Excedente",
    extra: "Cobro adicional",
    "credit-note": "Nota de credito",
  }[source];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intenta nuevamente";
}

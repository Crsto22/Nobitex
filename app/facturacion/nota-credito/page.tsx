"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import {
  CalendarIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DotsThreeVerticalIcon,
  FileCodeIcon,
  FilePdfIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  ReceiptIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { formatDate } from "@/lib/intl";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  creditNotesApi,
  type CreditNoteResponse,
  type CreditNoteSunatEstado,
  type CreditNotesResponse,
} from "@/lib/api/credit-notes";
import { cn } from "@/lib/utils";
import { HistoryPeriodFilter } from "@/components/History/history-period-filter";
import { defaultHistoryPeriod } from "@/lib/history-period";
import { documentFileName } from "@/lib/document-file-name";

type StatusFilter = CreditNoteSunatEstado | "todos";
type TypeFilter = "nota_credito_factura" | "nota_credito_boleta" | "todos";

const defaultSummary: CreditNotesResponse["summary"] = {
  aceptados: 0,
  porEnviar: 0,
  observados: 0,
  rechazados: 0,
  errores: 0,
  montoAceptado: "0",
};

const statusConfig: Record<
  CreditNoteSunatEstado,
  { label: string; bg: string; text: string; icon: typeof CheckCircleIcon }
> = {
  pendiente_envio: {
    label: "Por enviar",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
    icon: CloudArrowUpIcon,
  },
  enviando: {
    label: "Enviando",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
    icon: CloudArrowUpIcon,
  },
  pendiente_cdr: {
    label: "Pendiente CDR",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
    icon: WarningCircleIcon,
  },
  aceptado: {
    label: "Aceptado",
    bg: "bg-[#10b981]",
    text: "text-white",
    icon: CheckCircleIcon,
  },
  observado: {
    label: "Observado",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
    icon: WarningCircleIcon,
  },
  rechazado: {
    label: "Rechazado",
    bg: "bg-[#ef4444]",
    text: "text-white",
    icon: XCircleIcon,
  },
  error_transitorio: {
    label: "Error transitorio",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
    icon: WarningCircleIcon,
  },
  error_definitivo: {
    label: "Error definitivo",
    bg: "bg-[#ef4444]",
    text: "text-white",
    icon: XCircleIcon,
  },
};

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Aceptado", value: "aceptado" },
  { label: "Por enviar", value: "pendiente_envio" },
  { label: "Observado", value: "observado" },
  { label: "Rechazado", value: "rechazado" },
  { label: "Error", value: "error_definitivo" },
];

const typeOptions: { label: string; value: TypeFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "N/C Factura", value: "nota_credito_factura" },
  { label: "N/C Boleta", value: "nota_credito_boleta" },
];

function formatMoney(amount: string) {
  const value = Number(amount);
  return `S/${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intentalo nuevamente";
}

export default function NotaCreditoPage() {
  const router = useRouter();
  const toast = useSystemToast();
  const statusRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<CreditNoteResponse[]>([]);
  const [summary, setSummary] =
    useState<CreditNotesResponse["summary"]>(defaultSummary);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState(defaultHistoryPeriod);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [selectedType, setSelectedType] = useState<TypeFilter>("todos");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadData = useCallback(() => {
    setIsLoading(true);
    creditNotesApi
      .findAll({
        page,
        limit: 10,
        ...historyPeriod,
        search: debouncedSearchTerm || undefined,
        sunatEstado: selectedStatus === "todos" ? undefined : selectedStatus,
        tipoComprobante: selectedType === "todos" ? undefined : selectedType,
      })
      .then((response) => {
        setItems(response.data);
        setSummary(response.summary);
        setMeta(response.meta);
      })
      .catch((error) =>
        toast.showToast({
          title: "No se pudieron cargar las notas",
          description: getErrorMessage(error),
          variant: "error",
        }),
      )
      .finally(() => setIsLoading(false));
  }, [
    debouncedSearchTerm,
    page,
    selectedStatus,
    selectedType,
    historyPeriod,
    toast,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const handleDownload = async (
    note: CreditNoteResponse,
    kind: "pdf" | "xml" | "cdr",
  ) => {
    const { publicId } = note;
    setBusyId(publicId);
    try {
      const blob =
        kind === "pdf"
          ? await creditNotesApi.downloadPdf(publicId)
          : kind === "xml"
            ? await creditNotesApi.downloadSunatXml(publicId)
            : await creditNotesApi.downloadSunatCdr(publicId);
      downloadBlob(
        blob,
        documentFileName(note.correlativo, kind === "cdr" ? "zip" : kind),
      );
      setOpenMenuId(null);
    } catch (error) {
      toast.showToast({
        title: "No se pudo descargar",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = async (publicId: string) => {
    setBusyId(publicId);
    try {
      await creditNotesApi.retrySunat(publicId);
      toast.showToast({ title: "Envio programado", variant: "success" });
      loadData();
      setOpenMenuId(null);
    } catch (error) {
      toast.showToast({
        title: "No se pudo reenviar",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell headerTitle="Notas de Credito">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={CheckCircleIcon}
            label="Aceptadas SUNAT"
            value={summary.aceptados}
            color="text-[#10b981]"
          />
          <SummaryCard
            icon={CloudArrowUpIcon}
            label="Por enviar"
            value={summary.porEnviar}
            color="text-[#3b82f6]"
          />
          <SummaryCard
            icon={WarningCircleIcon}
            label="Observadas/Error"
            value={summary.observados + summary.errores}
            color="text-[#f59e0b]"
          />
          <SummaryCard
            icon={ReceiptIcon}
            label="Monto aceptado"
            value={formatMoney(summary.montoAceptado)}
            color="text-[var(--color-primary)]"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por nota, comprobante ref., cliente o documento..."
              aria-label="Buscar por nota, comprobante ref., cliente o documento..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <FilterSelect
            refEl={statusRef}
            open={isStatusOpen}
            onToggle={() => {
              setIsStatusOpen((value) => !value);
              setIsTypeOpen(false);
            }}
            label={
              selectedStatus === "todos"
                ? "Estado SUNAT"
                : statusConfig[selectedStatus].label
            }
            options={statusOptions}
            selected={selectedStatus}
            onSelect={(value) => {
              setSelectedStatus(value as StatusFilter);
              setPage(1);
              setIsStatusOpen(false);
            }}
          />
          <FilterSelect
            refEl={typeRef}
            open={isTypeOpen}
            onToggle={() => {
              setIsTypeOpen((value) => !value);
              setIsStatusOpen(false);
            }}
            label={
              typeOptions.find((item) => item.value === selectedType)?.label ??
              "Tipo"
            }
            options={typeOptions}
            selected={selectedType}
            onSelect={(value) => {
              setSelectedType(value as TypeFilter);
              setPage(1);
              setIsTypeOpen(false);
            }}
          />

          <button
            type="button"
            onClick={() => router.push("/facturacion/nota-credito/nuevo")}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-colors hover:bg-[var(--color-primary)]/90"
          >
            Nueva Nota de Credito
          </button>
        </div>

        <HistoryPeriodFilter
          value={historyPeriod}
          onChange={(value) => {
            setHistoryPeriod(value);
            setPage(1);
          }}
        />

        <div className="space-y-3 pr-1 pb-2">
          {isLoading ? (
            <EmptyState text="Cargando notas de credito..." />
          ) : items.length === 0 ? (
            <EmptyState text="No se encontraron notas de credito" />
          ) : (
            items.map((note) => {
              const status = statusConfig[note.sunat.estado];
              const StatusIcon = status.icon;
              return (
                <div
                  key={note.publicId}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[155px_minmax(220px,1.4fr)_125px_135px_135px_40px] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                      {note.correlativo}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Ref: {note.ventaReferencia.correlativo}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-text)]">
                      {note.cliente?.nombre ?? "Cliente"}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {note.cliente?.tipoDocumento?.toUpperCase() ?? "DOC"}:{" "}
                      {note.cliente?.numeroDocumento ?? "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text)]">
                    <CalendarIcon
                      size={14}
                      className="text-[var(--color-muted-foreground)]"
                    />
                    {formatDate(note.createdAt)}
                  </div>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-circular-bold",
                      status.bg,
                      status.text,
                    )}
                  >
                    <StatusIcon size={14} weight="fill" />
                    {status.label}
                  </span>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Total
                    </p>
                    <p className="text-sm font-circular-bold text-[var(--color-text)]">
                      {formatMoney(note.total)}
                    </p>
                  </div>
                  <div className="relative flex md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === note.publicId ? null : note.publicId,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === note.publicId ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <MenuButton
                          icon={EyeIcon}
                          label="Ver detalle"
                          onClick={() =>
                            router.push(
                              `/facturacion/nota-credito/${note.publicId}`,
                            )
                          }
                        />
                        <MenuButton
                          icon={PaperPlaneTiltIcon}
                          label="Enviar a SUNAT"
                          disabled={busyId === note.publicId}
                          onClick={() => handleRetry(note.publicId)}
                        />
                        <MenuButton
                          icon={FilePdfIcon}
                          label="Descargar PDF"
                          disabled={busyId === note.publicId}
                          onClick={() => handleDownload(note, "pdf")}
                        />
                        <MenuButton
                          icon={FileCodeIcon}
                          label="Descargar XML"
                          disabled={
                            busyId === note.publicId ||
                            !note.sunat.xmlDisponible
                          }
                          onClick={() => handleDownload(note, "xml")}
                        />
                        <MenuButton
                          icon={FileCodeIcon}
                          label="Descargar CDR"
                          disabled={
                            busyId === note.publicId ||
                            !note.sunat.cdrDisponible
                          }
                          onClick={() => handleDownload(note, "cdr")}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {items.length} de {meta.total} notas de credito
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-2 text-xs font-circular-bold text-white">
              {page}
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof CheckCircleIcon;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-input-bg)]">
          <Icon size={22} weight="fill" className={color} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-2xl leading-none text-[var(--color-text)] font-circular-bold">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  refEl,
  open,
  onToggle,
  label,
  options,
  selected,
  onSelect,
}: {
  refEl: RefObject<HTMLDivElement | null>;
  open: boolean;
  onToggle: () => void;
  label: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div ref={refEl} className="relative w-full sm:w-[170px]">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
      >
        <span className="truncate">{label}</span>
        <CaretDownIcon
          size={16}
          className="shrink-0 text-[var(--color-muted-foreground)]"
        />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                selected === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof FilePdfIcon;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={16} weight="bold" />
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
      <div className="text-center">
        <ReceiptIcon
          size={48}
          weight="light"
          className="mx-auto text-[var(--color-muted-foreground)]"
        />
        <p className="mt-3 text-sm font-black text-[var(--color-text)]">
          {text}
        </p>
      </div>
    </div>
  );
}

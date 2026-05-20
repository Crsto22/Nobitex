"use client";

import { useMemo, useState } from "react";
import {
  CalendarIcon,
  CaretDownIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudArrowUpIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  FileCodeIcon,
  FilePdfIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  PrinterIcon,
  ReceiptIcon,
  UserIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { cn } from "@/lib/utils";

const comprobantes = [
  {
    id: "B001-000184",
    saleId: "VNT-001",
    type: "boleta",
    client: "Maria Garcia Lopez",
    document: "72345678",
    docType: "dni",
    date: "17/05/2026",
    time: "10:36 AM",
    items: 3,
    total: "S/185.00",
    totalValue: 185,
    sunatStatus: "accepted",
    sendStatus: "sent",
    ticket: "SUNAT-88241",
    hash: "D8F2A9",
  },
  {
    id: "F001-000067",
    saleId: "VNT-002",
    type: "factura",
    client: "Textiles Rodriguez S.A.C.",
    document: "20456789012",
    docType: "ruc",
    date: "17/05/2026",
    time: "11:19 AM",
    items: 2,
    total: "S/130.00",
    totalValue: 130,
    sunatStatus: "accepted",
    sendStatus: "sent",
    ticket: "SUNAT-88246",
    hash: "A19C77",
  },
  {
    id: "F001-000068",
    saleId: "VNT-004",
    type: "factura",
    client: "Distribuidora Sanchez E.I.R.L.",
    document: "20670123451",
    docType: "ruc",
    date: "16/05/2026",
    time: "02:27 PM",
    items: 1,
    total: "S/320.00",
    totalValue: 320,
    sunatStatus: "observed",
    sendStatus: "sent",
    ticket: "SUNAT-88114",
    hash: "C03B21",
  },
  {
    id: "B001-000185",
    saleId: "VNT-006",
    type: "boleta",
    client: "Diego Morales Castro",
    document: "34567890",
    docType: "dni",
    date: "15/05/2026",
    time: "05:01 PM",
    items: 2,
    total: "S/95.00",
    totalValue: 95,
    sunatStatus: "pending",
    sendStatus: "queued",
    ticket: "Pendiente",
    hash: "Sin hash",
  },
  {
    id: "F001-000069",
    saleId: "VNT-007",
    type: "factura",
    client: "Vargas Mendoza Import S.A.C.",
    document: "20567890128",
    docType: "ruc",
    date: "14/05/2026",
    time: "12:38 PM",
    items: 6,
    total: "S/580.00",
    totalValue: 580,
    sunatStatus: "rejected",
    sendStatus: "error",
    ticket: "SUNAT-87990",
    hash: "7AE419",
  },
  {
    id: "B001-000186",
    saleId: "VNT-008",
    type: "boleta",
    client: "Roberto Diaz Flores",
    document: "78901234",
    docType: "dni",
    date: "14/05/2026",
    time: "06:23 PM",
    items: 1,
    total: "S/50.00",
    totalValue: 50,
    sunatStatus: "accepted",
    sendStatus: "sent",
    ticket: "SUNAT-87952",
    hash: "E7210D",
  },
];

const sunatStatusConfig = {
  accepted: {
    label: "Aceptado",
    bg: "bg-[#10b981]",
    text: "text-white",
    sunatBg: "bg-[#10b981]/12 ring-[#10b981]/25",
    sunatLabel: "text-[#047857]",
    icon: CheckCircleIcon,
  },
  observed: {
    label: "Observado",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#d97706]",
    sunatBg: "bg-[#f59e0b]/14 ring-[#f59e0b]/30",
    sunatLabel: "text-[#b45309]",
    icon: WarningCircleIcon,
  },
  pending: {
    label: "Por enviar",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#2563eb]",
    sunatBg: "bg-[#3b82f6]/12 ring-[#3b82f6]/25",
    sunatLabel: "text-[#1d4ed8]",
    icon: CloudArrowUpIcon,
  },
  rejected: {
    label: "Rechazado",
    bg: "bg-[#ef4444]",
    text: "text-white",
    sunatBg: "bg-[#ef4444]/12 ring-[#ef4444]/25",
    sunatLabel: "text-[#dc2626]",
    icon: XCircleIcon,
  },
};

const sendStatusConfig = {
  sent: { label: "Enviado", dot: "bg-[#10b981]" },
  queued: { label: "En cola", dot: "bg-[#3b82f6]" },
  error: { label: "Error envio", dot: "bg-[#ef4444]" },
};

export default function ComprobantesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [selectedType, setSelectedType] = useState("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredComprobantes = comprobantes.filter((comprobante) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      comprobante.id.toLowerCase().includes(normalizedSearch) ||
      comprobante.saleId.toLowerCase().includes(normalizedSearch) ||
      comprobante.client.toLowerCase().includes(normalizedSearch) ||
      comprobante.document.includes(searchTerm);

    const matchesStatus =
      selectedStatus === "todos" || comprobante.sunatStatus === selectedStatus;
    const matchesType =
      selectedType === "todos" || comprobante.type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const summary = useMemo(() => {
    const accepted = filteredComprobantes.filter(
      (item) => item.sunatStatus === "accepted",
    ).length;
    const pending = filteredComprobantes.filter(
      (item) => item.sunatStatus === "pending",
    ).length;
    const observed = filteredComprobantes.filter((item) =>
      ["observed", "rejected"].includes(item.sunatStatus),
    ).length;
    const total = filteredComprobantes
      .filter((item) => item.sunatStatus === "accepted")
      .reduce((sum, item) => sum + item.totalValue, 0);

    return { accepted, pending, observed, total };
  }, [filteredComprobantes]);

  return (
    <DashboardShell headerTitle="Comprobantes">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <CheckCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Aceptados SUNAT
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.accepted}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <CloudArrowUpIcon
                  size={22}
                  weight="fill"
                  className="text-[#3b82f6]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Por enviar
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.pending}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef4444]/10">
                <WarningCircleIcon
                  size={22}
                  weight="fill"
                  className="text-[#ef4444]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Observados
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.observed}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#101d69]/10 dark:bg-[#fd741a]/10">
                <ReceiptIcon
                  size={22}
                  weight="fill"
                  className="text-[var(--color-primary)]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Monto aceptado
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  S/{summary.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por comprobante, venta, cliente o documento..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-full sm:w-[170px]">
            <button
              type="button"
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsTypeOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedStatus === "todos"
                  ? "Estado SUNAT"
                  : sunatStatusConfig[
                      selectedStatus as keyof typeof sunatStatusConfig
                    ]?.label}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isStatusOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Aceptado", value: "accepted" },
                  { label: "Por enviar", value: "pending" },
                  { label: "Observado", value: "observed" },
                  { label: "Rechazado", value: "rejected" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setIsStatusOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedStatus === option.value
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

          <div className="relative w-full sm:w-[160px]">
            <button
              type="button"
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsStatusOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedType === "todos"
                  ? "Tipo"
                  : selectedType === "boleta"
                    ? "Boleta"
                    : "Factura"}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isTypeOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Boleta", value: "boleta" },
                  { label: "Factura", value: "factura" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedType(option.value);
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedType === option.value
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
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {filteredComprobantes.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <ReceiptIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron comprobantes
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            filteredComprobantes.map((comprobante) => {
              const status =
                sunatStatusConfig[
                  comprobante.sunatStatus as keyof typeof sunatStatusConfig
                ];
              const StatusIcon = status.icon;
              const sendStatus =
                sendStatusConfig[
                  comprobante.sendStatus as keyof typeof sendStatusConfig
                ];
              const typeLabel =
                comprobante.type === "boleta" ? "BOLETA" : "FACTURA";

              return (
                <div
                  key={comprobante.id}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(126px,0.9fr)_minmax(180px,1.45fr)_minmax(118px,0.9fr)_minmax(104px,0.75fr)_minmax(112px,0.85fr)_minmax(108px,0.85fr)_28px] md:items-center md:gap-3 xl:grid-cols-[155px_minmax(220px,1.35fr)_132px_112px_136px_136px_40px] xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <ReceiptIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {comprobante.id}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        {typeLabel} / {comprobante.saleId}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
                      <UserIcon size={28} weight="fill" className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {comprobante.client}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {comprobante.docType === "ruc" ? "RUC" : "DNI"}:{" "}
                        {comprobante.document}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center md:justify-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {comprobante.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {comprobante.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Items
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {comprobante.items}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Hash
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {comprobante.hash}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                        status.bg,
                        status.text,
                      )}
                    >
                      <StatusIcon size={14} weight="fill" />
                      {status.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                      <span
                        className={cn("h-2 w-2 rounded-full", sendStatus.dot)}
                      />
                      {sendStatus.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Total
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {comprobante.total}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        {comprobante.ticket}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === comprobante.id ? null : comprobante.id,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === comprobante.id ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <EyeIcon size={16} weight="bold" />
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <PaperPlaneTiltIcon size={16} weight="bold" />
                          Enviar a SUNAT
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <PrinterIcon size={16} weight="bold" />
                          Imprimir
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <FilePdfIcon size={16} weight="bold" />
                          Descargar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <FileCodeIcon size={16} weight="bold" />
                          Descargar XML/CDR
                        </button>
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
            Mostrando {filteredComprobantes.length} de {comprobantes.length}{" "}
            comprobantes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled
            >
              Anterior
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-bold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

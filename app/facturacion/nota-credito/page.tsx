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

const notasCredito = [
  {
    id: "FC01-000012",
    refComprobante: "F001-000045",
    type: "factura",
    client: "Textiles Rodriguez S.A.C.",
    document: "20456789012",
    docType: "ruc",
    date: "17/05/2026",
    time: "09:15 AM",
    items: 2,
    total: "S/75.00",
    totalValue: 75,
    sunatStatus: "accepted",
    sendStatus: "sent",
    ticket: "SUNAT-88230",
    hash: "F9A2C1",
    reason: "Anulacion de la operacion",
  },
  {
    id: "BC01-000034",
    refComprobante: "B001-000170",
    type: "boleta",
    client: "Carlos Mendoza Ruiz",
    document: "45678901",
    docType: "dni",
    date: "16/05/2026",
    time: "03:42 PM",
    items: 1,
    total: "S/42.50",
    totalValue: 42.5,
    sunatStatus: "accepted",
    sendStatus: "sent",
    ticket: "SUNAT-88105",
    hash: "B3D7E8",
    reason: "Devolucion por item dañado",
  },
  {
    id: "FC01-000013",
    refComprobante: "F001-000052",
    type: "factura",
    client: "Distribuidora Sanchez E.I.R.L.",
    document: "20670123451",
    docType: "ruc",
    date: "15/05/2026",
    time: "11:28 AM",
    items: 3,
    total: "S/120.00",
    totalValue: 120,
    sunatStatus: "observed",
    sendStatus: "sent",
    ticket: "SUNAT-87980",
    hash: "C1F4A9",
    reason: "Descuento aplicado post-venta",
  },
  {
    id: "BC01-000035",
    refComprobante: "B001-000175",
    type: "boleta",
    client: "Ana Lucia Torres Vega",
    document: "78901234",
    docType: "dni",
    date: "14/05/2026",
    time: "04:55 PM",
    items: 1,
    total: "S/28.00",
    totalValue: 28,
    sunatStatus: "pending",
    sendStatus: "queued",
    ticket: "Pendiente",
    hash: "Sin hash",
    reason: "Error en el precio facturado",
  },
  {
    id: "FC01-000014",
    refComprobante: "F001-000060",
    type: "factura",
    client: "Vargas Mendoza Import S.A.C.",
    document: "20567890128",
    docType: "ruc",
    date: "13/05/2026",
    time: "10:07 AM",
    items: 4,
    total: "S/210.00",
    totalValue: 210,
    sunatStatus: "rejected",
    sendStatus: "error",
    ticket: "SUNAT-87850",
    hash: "E2A8D3",
    reason: "Correccion de datos del cliente",
  },
  {
    id: "BC01-000036",
    refComprobante: "B001-000180",
    type: "boleta",
    client: "Roberto Diaz Flores",
    document: "23456789",
    docType: "dni",
    date: "12/05/2026",
    time: "02:33 PM",
    items: 2,
    total: "S/55.00",
    totalValue: 55,
    sunatStatus: "accepted",
    sendStatus: "sent",
    ticket: "SUNAT-87720",
    hash: "A7B1F4",
    reason: "Devolucion total del pedido",
  },
];

const sunatStatusConfig = {
  accepted: {
    label: "Aceptado",
    bg: "bg-[#10b981]",
    text: "text-white",
    icon: CheckCircleIcon,
  },
  observed: {
    label: "Observado",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#d97706]",
    icon: WarningCircleIcon,
  },
  pending: {
    label: "Por enviar",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#2563eb]",
    icon: CloudArrowUpIcon,
  },
  rejected: {
    label: "Rechazado",
    bg: "bg-[#ef4444]",
    text: "text-white",
    icon: XCircleIcon,
  },
};

const sendStatusConfig = {
  sent: { label: "Enviado", dot: "bg-[#10b981]" },
  queued: { label: "En cola", dot: "bg-[#3b82f6]" },
  error: { label: "Error envio", dot: "bg-[#ef4444]" },
};

export default function NotaCreditoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [selectedType, setSelectedType] = useState("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredNotas = notasCredito.filter((nota) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      nota.id.toLowerCase().includes(normalizedSearch) ||
      nota.refComprobante.toLowerCase().includes(normalizedSearch) ||
      nota.client.toLowerCase().includes(normalizedSearch) ||
      nota.document.includes(searchTerm);

    const matchesStatus =
      selectedStatus === "todos" || nota.sunatStatus === selectedStatus;
    const matchesType =
      selectedType === "todos" || nota.type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const summary = useMemo(() => {
    const accepted = filteredNotas.filter(
      (item) => item.sunatStatus === "accepted",
    ).length;
    const pending = filteredNotas.filter(
      (item) => item.sunatStatus === "pending",
    ).length;
    const observed = filteredNotas.filter((item) =>
      ["observed", "rejected"].includes(item.sunatStatus),
    ).length;
    const total = filteredNotas
      .filter((item) => item.sunatStatus === "accepted")
      .reduce((sum, item) => sum + item.totalValue, 0);

    return { accepted, pending, observed, total };
  }, [filteredNotas]);

  return (
    <DashboardShell headerTitle="Notas de Credito">
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
              placeholder="Buscar por nota de credito, comprobante ref., cliente o documento..."
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

          <button
            type="button"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary)]/90"
          >
            Nueva Nota de Credito
          </button>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {filteredNotas.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <ReceiptIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron notas de credito
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            filteredNotas.map((nota) => {
              const status =
                sunatStatusConfig[
                  nota.sunatStatus as keyof typeof sunatStatusConfig
                ];
              const StatusIcon = status.icon;
              const sendStatus =
                sendStatusConfig[
                  nota.sendStatus as keyof typeof sendStatusConfig
                ];
              const typeLabel =
                nota.type === "boleta" ? "N/C BOLETA" : "N/C FACTURA";

              return (
                <div
                  key={nota.id}
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
                        {nota.id}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        {typeLabel} / Ref: {nota.refComprobante}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
                      <UserIcon size={28} weight="fill" className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {nota.client}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {nota.docType === "ruc" ? "RUC" : "DNI"}:{" "}
                        {nota.document}
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
                          {nota.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {nota.time}
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
                        {nota.items}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Hash
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {nota.hash}
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
                        {nota.total}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        {nota.ticket}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === nota.id ? null : nota.id,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === nota.id ? (
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
            Mostrando {filteredNotas.length} de {notasCredito.length} notas de credito
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

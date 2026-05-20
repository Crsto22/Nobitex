"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  CaretDownIcon,
  ReceiptIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  PrinterIcon,
  DownloadSimpleIcon,
  DotsThreeVerticalIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

const salesHistory = [
  {
    id: "VNT-001",
    type: "boleta",
    client: "María García López",
    dni: "72345678",
    docType: "dni",
    date: "17/05/2026",
    time: "10:32 AM",
    items: 3,
    total: "S/185.00",
    totalValue: 185.0,
    status: "completed",
    payment: "efectivo",
  },
  {
    id: "VNT-002",
    type: "factura",
    client: "Carlos Rodríguez Pérez",
    dni: "45678901",
    docType: "dni",
    date: "17/05/2026",
    time: "11:15 AM",
    items: 2,
    total: "S/130.00",
    totalValue: 130.0,
    status: "completed",
    payment: "yape",
  },
  {
    id: "VNT-004",
    type: "factura",
    client: "Pedro Sánchez Torres",
    dni: "89012345",
    docType: "ruc",
    date: "16/05/2026",
    time: "02:20 PM",
    items: 1,
    total: "S/320.00",
    totalValue: 320.0,
    status: "cancelled",
    payment: "efectivo",
  },
  {
    id: "VNT-005",
    type: "nota",
    client: "Laura Fernández Ruiz",
    dni: "12345678",
    docType: "dni",
    date: "15/05/2026",
    time: "09:10 AM",
    items: 4,
    total: "S/275.00",
    totalValue: 275.0,
    status: "completed",
    payment: ["plin", "efectivo"],
  },
  {
    id: "VNT-006",
    type: "boleta",
    client: "Diego Morales Castro",
    dni: "34567890",
    docType: "ruc",
    date: "15/05/2026",
    time: "04:55 PM",
    items: 2,
    total: "S/95.00",
    totalValue: 95.0,
    status: "completed",
    payment: "plin",
  },
  {
    id: "VNT-007",
    type: "factura",
    client: "Sofía Vargas Mendoza",
    dni: "56789012",
    docType: "dni",
    date: "14/05/2026",
    time: "12:30 PM",
    items: 6,
    total: "S/580.00",
    totalValue: 580.0,
    status: "completed",
    payment: "transferencia",
  },
  {
    id: "VNT-008",
    type: "boleta",
    client: "Roberto Díaz Flores",
    dni: "78901234",
    docType: "ruc",
    date: "14/05/2026",
    time: "06:18 PM",
    items: 1,
    total: "S/50.00",
    totalValue: 50.0,
    status: "cancelled",
    payment: "efectivo",
  },
];

const statusConfig = {
  completed: { label: "Completado", bg: "bg-[#10b981]", text: "text-white" },
  cancelled: { label: "Anulado", bg: "bg-[#ef4444]", text: "text-white" },
  pending: { label: "Pendiente", bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" },
};

const paymentConfig: Record<string, { type: "icon" | "svg"; icon?: React.ReactNode; src?: string; label: string; bgColor: string }> = {
  efectivo: { type: "svg", src: "/svg/metodo-pago/efectivo.png", label: "Efectivo", bgColor: "bg-[#10b981]" },
  yape: { type: "svg", src: "/svg/metodo-pago/Yape.svg", label: "Yape", bgColor: "bg-[#a221af]" },
  plin: { type: "svg", src: "/svg/metodo-pago/Plin.svg", label: "Plin", bgColor: "bg-[#00E2CE]" },
  transferencia: { type: "svg", src: "/svg/metodo-pago/transferencia.png", label: "Transferencia", bgColor: "bg-[#3b82f6]" },
};

export default function HistorialVentasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [selectedType, setSelectedType] = useState("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredSales = salesHistory.filter((sale) => {
    const matchesSearch =
      searchTerm === "" ||
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.dni.includes(searchTerm);

    const matchesStatus = selectedStatus === "todos" || sale.status === selectedStatus;
    const matchesType = selectedType === "todos" || sale.type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalSales = filteredSales
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.totalValue, 0);

  const completedCount = filteredSales.filter((s) => s.status === "completed").length;
  const cancelledCount = filteredSales.filter((s) => s.status === "cancelled").length;

  return (
    <DashboardShell headerTitle="Historial de Ventas">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <ReceiptIcon size={22} weight="fill" className="text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Ventas Completadas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {completedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef4444]/10">
                <ReceiptIcon size={22} weight="fill" className="text-[#ef4444]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Ventas Anuladas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {cancelledCount}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <ReceiptIcon size={22} weight="fill" className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Vendido
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  S/{totalSales.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por N° venta, cliente o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-[160px]">
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
                  ? "Todos"
                  : statusConfig[selectedStatus as keyof typeof statusConfig]?.label}
              </span>
              <CaretDownIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
            {isStatusOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Completado", value: "completed" },
                  { label: "Anulado", value: "cancelled" },
                  { label: "Pendiente", value: "pending" },
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
            )}
          </div>

          <div className="relative w-[160px]">
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
                    : selectedType === "factura"
                      ? "Factura"
                      : "Nota"}
              </span>
              <CaretDownIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
            {isTypeOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Boleta", value: "boleta" },
                  { label: "Factura", value: "factura" },
                  { label: "Nota", value: "nota" },
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
            )}
          </div>
        </div>

        {/* Sales List */}
        <div className="space-y-3 pr-1 pb-2">
          {filteredSales.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <ReceiptIcon size={48} weight="light" className="mx-auto text-[var(--color-muted-foreground)]" />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron ventas
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de búsqueda
                </p>
              </div>
            </div>
          ) : (
            filteredSales.map((sale) => {
              const status = statusConfig[sale.status as keyof typeof statusConfig];
              const typeLabel = sale.type === "boleta" ? "BOLETA" : sale.type === "factura" ? "FACTURA" : "NOTA";

              return (
                <div
                  key={sale.id}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(112px,0.8fr)_minmax(170px,1.45fr)_minmax(108px,0.9fr)_minmax(88px,0.75fr)_minmax(96px,0.85fr)_minmax(96px,0.85fr)_28px] md:items-center md:gap-3 xl:grid-cols-[150px_minmax(220px,1.4fr)_140px_140px_130px_140px_40px] xl:gap-5"
                >
                  {/* ID + Type */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <ReceiptIcon size={20} weight="fill" className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {sale.id}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        {typeLabel}
                      </p>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="flex items-center gap-3 sm:w-56">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]">
                      <UserIcon size={28} weight="fill" className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {sale.client}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {sale.docType === "ruc" ? (
                          <>
                            RUC: {sale.dni}
                          </>
                        ) : (
                          <>
                            DNI: {sale.dni}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Date + Time */}
                  <div className="flex items-center md:justify-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon size={14} className="text-[var(--color-muted-foreground)]" />
                        <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {sale.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon size={14} className="text-[var(--color-muted-foreground)]" />
                        <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {sale.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items + Payment */}
                  <div className="flex items-center gap-4 sm:w-36">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Items
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {sale.items}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(Array.isArray(sale.payment) ? sale.payment : [sale.payment]).map((p, i) => (
                        <div key={i} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", paymentConfig[p]?.bgColor)}>
                          {paymentConfig[p] ? (
                            paymentConfig[p].type === "svg" ? (
                              <Image
                                src={paymentConfig[p].src!}
                                width={32}
                                height={32}
                                alt={paymentConfig[p].label}
                                className="h-6 w-6 object-contain"
                              />
                            ) : (
                              paymentConfig[p].icon
                            )
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex md:justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                        status.bg,
                        status.text,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex items-center gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Total
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {sale.total}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === sale.id ? null : sale.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Más opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === sale.id && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
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
                          <PrinterIcon size={16} weight="bold" />
                          Imprimir
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <DownloadSimpleIcon size={16} weight="bold" />
                          Descargar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filteredSales.length} de {salesHistory.length} ventas
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

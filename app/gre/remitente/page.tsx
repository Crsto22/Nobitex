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
  FilePdfIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PackageIcon,
  PaperPlaneTiltIcon,
  PrinterIcon,
  TruckIcon,
  UserIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { cn } from "@/lib/utils";

const guiasRemision = [
  {
    id: "T001-000045",
    type: "remitente",
    client: "Textiles Rodriguez S.A.C.",
    document: "20456789012",
    docType: "ruc",
    date: "17/05/2026",
    time: "08:30 AM",
    destino: "Arequipa - Calle Mercaderes 456",
    transportista: "TransPeru Logistics",
    items: 12,
    peso: "45.5 kg",
    estado: "en_transito",
    sunatStatus: "accepted",
    ticket: "SUNAT-88250",
  },
  {
    id: "T001-000046",
    type: "remitente",
    client: "Distribuidora Sanchez E.I.R.L.",
    document: "20670123451",
    docType: "ruc",
    date: "16/05/2026",
    time: "02:15 PM",
    destino: "Trujillo - Av. America 789",
    transportista: "Cargo Express SAC",
    items: 8,
    peso: "32.0 kg",
    estado: "entregada",
    sunatStatus: "accepted",
    ticket: "SUNAT-88120",
  },
  {
    id: "T001-000047",
    type: "remitente",
    client: "Vargas Mendoza Import S.A.C.",
    document: "20567890128",
    docType: "ruc",
    date: "15/05/2026",
    time: "10:45 AM",
    destino: "Chiclayo - Jr. Balta 234",
    transportista: "RapidCargo Peru",
    items: 20,
    peso: "78.2 kg",
    estado: "por_enviar",
    sunatStatus: "pending",
    ticket: "Pendiente",
  },
  {
    id: "T001-000048",
    type: "remitente",
    client: "Maria Garcia Lopez",
    document: "72345678",
    docType: "dni",
    date: "14/05/2026",
    time: "04:20 PM",
    destino: "Lima - Av. Javier Prado 1200",
    transportista: "Envios Rapidos SRL",
    items: 3,
    peso: "5.8 kg",
    estado: "anulada",
    sunatStatus: "rejected",
    ticket: "SUNAT-87900",
  },
  {
    id: "T001-000049",
    type: "remitente",
    client: "Roberto Diaz Flores",
    document: "78901234",
    docType: "dni",
    date: "13/05/2026",
    time: "09:00 AM",
    destino: "Piura - Calle Tacna 567",
    transportista: "Norte Transportes",
    items: 6,
    peso: "18.4 kg",
    estado: "en_transito",
    sunatStatus: "accepted",
    ticket: "SUNAT-87750",
  },
  {
    id: "T001-000050",
    type: "remitente",
    client: "Ana Lucia Torres Vega",
    document: "45678901",
    docType: "dni",
    date: "12/05/2026",
    time: "11:30 AM",
    destino: "Cusco - Av. El Sol 890",
    transportista: "Sur Cargo Logistics",
    items: 15,
    peso: "52.1 kg",
    estado: "entregada",
    sunatStatus: "accepted",
    ticket: "SUNAT-87600",
  },
];

const estadoGuiaConfig = {
  en_transito: {
    label: "En transito",
    bg: "bg-[#3b82f6]",
    text: "text-white",
    icon: TruckIcon,
  },
  entregada: {
    label: "Entregada",
    bg: "bg-[#10b981]",
    text: "text-white",
    icon: CheckCircleIcon,
  },
  por_enviar: {
    label: "Por enviar",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#d97706]",
    icon: CloudArrowUpIcon,
  },
  anulada: {
    label: "Anulada",
    bg: "bg-[#ef4444]",
    text: "text-white",
    icon: XCircleIcon,
  },
};

const sunatStatusConfig = {
  accepted: { label: "Aceptado", dot: "bg-[#10b981]" },
  pending: { label: "Pendiente", dot: "bg-[#3b82f6]" },
  rejected: { label: "Rechazado", dot: "bg-[#ef4444]" },
};

export default function GuiasRemisionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [selectedSunat, setSelectedSunat] = useState("todos");
  const [isEstadoOpen, setIsEstadoOpen] = useState(false);
  const [isSunatOpen, setIsSunatOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredGuias = guiasRemision.filter((guia) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      guia.id.toLowerCase().includes(normalizedSearch) ||
      guia.client.toLowerCase().includes(normalizedSearch) ||
      guia.document.includes(searchTerm) ||
      guia.destino.toLowerCase().includes(normalizedSearch);

    const matchesEstado =
      selectedEstado === "todos" || guia.estado === selectedEstado;
    const matchesSunat =
      selectedSunat === "todos" || guia.sunatStatus === selectedSunat;

    return matchesSearch && matchesEstado && matchesSunat;
  });

  const summary = useMemo(() => {
    const enTransito = filteredGuias.filter(
      (item) => item.estado === "en_transito",
    ).length;
    const entregadas = filteredGuias.filter(
      (item) => item.estado === "entregada",
    ).length;
    const porEnviar = filteredGuias.filter(
      (item) => item.estado === "por_enviar",
    ).length;
    const totalItems = filteredGuias.reduce((sum, item) => sum + item.items, 0);

    return { enTransito, entregadas, porEnviar, totalItems };
  }, [filteredGuias]);

  return (
    <DashboardShell headerTitle="Guias de Remision">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <TruckIcon
                  size={22}
                  weight="fill"
                  className="text-[#3b82f6]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  En transito
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.enTransito}
                </p>
              </div>
            </div>
          </div>

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
                  Entregadas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.entregadas}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                <CloudArrowUpIcon
                  size={22}
                  weight="fill"
                  className="text-[#f59e0b]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Por enviar
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.porEnviar}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#101d69]/10 dark:bg-[#fd741a]/10">
                <PackageIcon
                  size={22}
                  weight="fill"
                  className="text-[var(--color-primary)]"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total items
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.totalItems}
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
              placeholder="Buscar por guia, cliente, documento o destino..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-full sm:w-[160px]">
            <button
              type="button"
              onClick={() => {
                setIsEstadoOpen(!isEstadoOpen);
                setIsSunatOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedEstado === "todos"
                  ? "Estado guia"
                  : estadoGuiaConfig[
                      selectedEstado as keyof typeof estadoGuiaConfig
                    ]?.label}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isEstadoOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "En transito", value: "en_transito" },
                  { label: "Entregada", value: "entregada" },
                  { label: "Por enviar", value: "por_enviar" },
                  { label: "Anulada", value: "anulada" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedEstado(option.value);
                      setIsEstadoOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedEstado === option.value
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
                setIsSunatOpen(!isSunatOpen);
                setIsEstadoOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedSunat === "todos"
                  ? "Estado SUNAT"
                  : selectedSunat === "accepted"
                    ? "Aceptado"
                    : selectedSunat === "pending"
                      ? "Pendiente"
                      : "Rechazado"}
              </span>
              <CaretDownIcon
                size={16}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
            </button>
            {isSunatOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Aceptado", value: "accepted" },
                  { label: "Pendiente", value: "pending" },
                  { label: "Rechazado", value: "rejected" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedSunat(option.value);
                      setIsSunatOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedSunat === option.value
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
            Nueva Guia
          </button>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {filteredGuias.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <PackageIcon
                  size={48}
                  weight="light"
                  className="mx-auto text-[var(--color-muted-foreground)]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron guias de remision
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            filteredGuias.map((guia) => {
              const estadoGuia =
                estadoGuiaConfig[guia.estado as keyof typeof estadoGuiaConfig];
              const EstadoGuiaIcon = estadoGuia.icon;
              const sunatStatus =
                sunatStatusConfig[guia.sunatStatus as keyof typeof sunatStatusConfig];

              return (
                <div
                  key={guia.id}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[1.1fr_1fr_1fr_0.8fr_0.8fr_0.9fr_40px] md:items-center md:gap-3 xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <PackageIcon
                        size={20}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {guia.id}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        GRE Remitente
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
                      <UserIcon size={28} weight="fill" className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {guia.client}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {guia.docType === "ruc" ? "RUC" : "DNI"}:{" "}
                        {guia.document}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <MapPinIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="truncate text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {guia.destino}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--color-muted-foreground)]">
                        {guia.transportista}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {guia.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon
                          size={14}
                          className="text-[var(--color-muted-foreground)]"
                        />
                        <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                          {guia.time}
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
                        {guia.items}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Peso
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {guia.peso}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                        estadoGuia.bg,
                        estadoGuia.text,
                      )}
                    >
                      <EstadoGuiaIcon size={14} weight="fill" />
                      {estadoGuia.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                      <span
                        className={cn("h-2 w-2 rounded-full", sunatStatus.dot)}
                      />
                      {sunatStatus.label}
                    </span>
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === guia.id ? null : guia.id,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === guia.id ? (
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
            Mostrando {filteredGuias.length} de {guiasRemision.length} guias de remision
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

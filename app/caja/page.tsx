"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  ClockIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  LockKeyIcon,
  PlusIcon,
  ReceiptIcon,
  StorefrontIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/ssr";

import {
  CashMovementModal,
  CloseCashRegisterModal,
  OpenCashRegisterModal,
} from "@/components/CashRegister/cash-register-modals";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { CalendarInput } from "@/components/ui/calendar-input";
import { branchesApi, type Branch } from "@/lib/api/branches";
import {
  cashRegisterApi,
  type CashMovement,
  type CashRegisterSession,
  type CashRegisterStatus,
} from "@/lib/api/cash-register";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type StatusFilter = "todos" | CashRegisterStatus;

type FilterOption = {
  label: string;
  value: string;
};

const statusConfig = {
  abierta: { label: "Abierta", bg: "bg-[#10b981]", text: "text-white" },
  cerrada: { label: "Cerrada", bg: "bg-[#6b7280]", text: "text-white" },
};

const movementConfig = {
  apertura: {
    label: "Apertura",
    icon: LockKeyIcon,
    tone: "text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  },
  venta: {
    label: "Venta",
    icon: ReceiptIcon,
    tone: "text-[#10b981] bg-[#10b981]/10",
  },
  ingreso: {
    label: "Ingreso",
    icon: ArrowUpIcon,
    tone: "text-[#3b82f6] bg-[#3b82f6]/10",
  },
  retiro: {
    label: "Retiro",
    icon: ArrowDownIcon,
    tone: "text-[#f59e0b] bg-[#f59e0b]/10",
  },
  anulacion_venta: {
    label: "Anulacion",
    icon: ArrowDownIcon,
    tone: "text-[#ef4444] bg-[#ef4444]/10",
  },
};

const statusFilterOptions: FilterOption[] = [
  { label: "Todos", value: "todos" },
  { label: "Abierta", value: "abierta" },
  { label: "Cerrada", value: "cerrada" },
];
const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `S/${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Pendiente";
  const date = new Date(value);
  return dateTimeFormatter.format(date);
}

export default function CajaPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: defaultPageSize,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState("todos");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isBranchFilterOpen, setIsBranchFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detailSession, setDetailSession] =
    useState<CashRegisterSession | null>(null);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const cashBranches = useMemo(
    () =>
      branches.filter(
        (branch) =>
          branch.estado === "activo" &&
          branch.tipo === "tienda" &&
          branch.modoCajaHabilitado,
      ),
    [branches],
  );
  const activeBranch =
    cashBranches.find((branch) => branch.id === selectedBranch) ??
    cashBranches[0] ??
    null;
  const openedCount = sessions.filter((session) => session.estado === "abierta").length;
  const closedCount = sessions.filter((session) => session.estado === "cerrada").length;
  const expectedTotal = sessions.reduce(
    (sum, session) =>
      sum + Number(session.montoEsperadoActual ?? session.montoEsperado ?? 0),
    0,
  );
  const branchFilterOptions = useMemo<FilterOption[]>(
    () => [
      { label: "Todas las sucursales", value: "todos" },
      ...cashBranches.map((branch) => ({
        label: branch.nombre,
        value: branch.id,
      })),
    ],
    [cashBranches],
  );

  useEffect(() => {
    branchesApi
      .findAll({ limit: 100, estado: "activo", tipo: "tienda" })
      .then((response) => setBranches(response.data))
      .catch(() => setBranches([]));
  }, []);

  const loadSessions = useCallback(() => {
    setIsLoading(true);
    cashRegisterApi
      .findAll({
        page,
        limit: defaultPageSize,
        sucursalId: selectedBranch === "todos" ? undefined : selectedBranch,
        estado: selectedStatus === "todos" ? undefined : selectedStatus,
        from: from || undefined,
        to: to || undefined,
      })
      .then((response) => {
        setSessions(response.data);
        setMeta(response.meta);
      })
      .catch((error) => {
        setSessions([]);
        setMeta({ page: 1, limit: defaultPageSize, total: 0, totalPages: 1 });
        showToast({
          title: "No se pudo cargar caja",
          description:
            error instanceof Error ? error.message : "Intentalo nuevamente.",
          variant: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [from, page, selectedBranch, selectedStatus, showToast, to]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadSessions, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSessions]);

  const handleSessionUpdated = (session: CashRegisterSession) => {
    setDetailSession(session);
    loadSessions();
  };

  return (
    <DashboardShell headerTitle="Caja">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            icon={<ReceiptIcon size={22} weight="fill" />}
            label="Sesiones"
            value={meta.total}
            tone="primary"
          />
          <MetricCard
            icon={<LockKeyIcon size={22} weight="fill" />}
            label="Abiertas"
            value={openedCount}
            tone="success"
          />
          <MetricCard
            icon={<CalendarBlankIcon size={22} weight="fill" />}
            label="Cerradas"
            value={closedCount}
            tone="muted"
          />
          <MetricCard
            icon={<ReceiptIcon size={22} weight="fill" />}
            label="Esperado"
            value={formatMoney(expectedTotal)}
            tone="info"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:px-6 xl:flex-row xl:items-center xl:justify-between dark:bg-[var(--color-background)]">
          <div className="grid w-full max-w-5xl grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[minmax(180px,260px)_minmax(140px,160px)_minmax(150px,170px)_minmax(150px,170px)]">
            <FilterSelect
              value={selectedBranch}
              options={branchFilterOptions}
              isOpen={isBranchFilterOpen}
              onOpenChange={(isOpen) => {
                setIsBranchFilterOpen(isOpen);
                if (isOpen) {
                  setIsStatusFilterOpen(false);
                }
              }}
              onChange={(value) => {
                setSelectedBranch(value);
                setPage(1);
              }}
              placeholder="Sucursal"
            />

            <FilterSelect
              value={selectedStatus}
              options={statusFilterOptions}
              isOpen={isStatusFilterOpen}
              onOpenChange={(isOpen) => {
                setIsStatusFilterOpen(isOpen);
                if (isOpen) {
                  setIsBranchFilterOpen(false);
                }
              }}
              onChange={(value) => {
                setSelectedStatus(value as StatusFilter);
                setPage(1);
              }}
              placeholder="Estado"
            />

            <CalendarInput
              value={from}
              onChange={(value) => {
                setFrom(value);
                setPage(1);
              }}
              labelInline="Desde"
              clearable
              max={to || undefined}
              className="min-w-0"
            />
            <CalendarInput
              value={to}
              onChange={(value) => {
                setTo(value);
                setPage(1);
              }}
              labelInline="Hasta"
              clearable
              min={from || undefined}
              className="min-w-0"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsOpenModalOpen(true)}
            disabled={!activeBranch}
            className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <PlusIcon size={16} weight="bold" />
            Abrir caja
          </button>
        </div>

        <div className="space-y-3 pb-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))
          ) : sessions.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] p-8 text-center shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
              <ReceiptIcon
                size={46}
                weight="light"
                className="text-[var(--color-muted-foreground)]"
              />
              <h2 className="mt-3 text-base font-black text-[var(--color-text)]">
                No hay cajas para mostrar
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Ajusta filtros o abre caja en una tienda habilitada.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const status = statusConfig[session.estado];
              return (
                <div
                  key={session.publicId}
                  className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[minmax(170px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_110px_120px_40px] md:items-center md:gap-4 md:gap-y-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      <StorefrontIcon size={22} weight="fill" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {session.sucursal.nombre}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {session.publicId}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <UserCircleIcon
                      size={18}
                      className="text-[var(--color-muted-foreground)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {session.usuario.nombre} {session.usuario.apellido ?? ""}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {session.usuario.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <span className="flex items-center gap-2">
                      <ClockIcon size={14} />
                      {formatDateTime(session.openedAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarBlankIcon size={14} />
                      {formatDateTime(session.closedAt)}
                    </span>
                  </div>

                  <div className="flex justify-end md:justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-circular-bold",
                        status.bg,
                        status.text,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Esperado
                    </p>
                    <p className="text-sm font-circular-bold text-[var(--color-text)]">
                      {formatMoney(
                        session.montoEsperadoActual ?? session.montoEsperado,
                      )}
                    </p>
                    {session.diferencia ? (
                      <p className="text-[10px] font-circular-bold text-[#f59e0b]">
                        Dif. {formatMoney(session.diferencia)}
                      </p>
                    ) : null}
                  </div>

                  <div className="relative flex items-center justify-end md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === session.publicId
                            ? null
                            : session.publicId,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === session.publicId ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            router.push(`/caja/${session.publicId}`);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                        >
                          <EyeIcon size={16} weight="bold" />
                          Ver mas
                        </button>
                        {session.estado === "abierta" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setDetailSession(session);
                              setIsMovementModalOpen(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                          >
                            <PlusIcon size={16} weight="bold" />
                            Movimiento
                          </button>
                        ) : null}
                        {session.estado === "abierta" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              setDetailSession(session);
                              setIsCloseModalOpen(true);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10"
                          >
                            <LockKeyIcon size={16} weight="bold" />
                            Cerrar caja
                          </button>
                        ) : null}
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
            Mostrando {sessions.length} de {meta.total} cajas
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] transition hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {meta.page}
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] transition hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <OpenCashRegisterModal
        isOpen={isOpenModalOpen}
        onClose={() => setIsOpenModalOpen(false)}
        sucursalId={activeBranch?.id ?? ""}
        sucursalNombre={activeBranch?.nombre}
        branchOptions={cashBranches.map((branch) => ({
          id: branch.id,
          nombre: branch.nombre,
        }))}
        onSuccess={(session) => {
          setSelectedBranch(session.sucursal.id);
          handleSessionUpdated(session);
        }}
      />

      <CashMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        sucursalId={detailSession?.sucursal.id ?? activeBranch?.id ?? ""}
        sucursalNombre={detailSession?.sucursal.nombre ?? activeBranch?.nombre}
        onSuccess={handleSessionUpdated}
      />

      <CloseCashRegisterModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        sucursalId={detailSession?.sucursal.id ?? activeBranch?.id ?? ""}
        sucursalNombre={detailSession?.sucursal.nombre ?? activeBranch?.nombre}
        session={detailSession}
        onSuccess={handleSessionUpdated}
      />

      <CashRegisterDetailModal
        session={null}
        isLoading={false}
        onClose={() => {}}
      />
    </DashboardShell>
  );
}

function CashRegisterDetailModal({
  session,
  isLoading,
  onClose,
}: {
  session: CashRegisterSession | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={session !== null}
      onClose={onClose}
      title="Detalle de caja"
      description={session?.sucursal.nombre}
      size="lg"
    >
      {!session || isLoading ? (
        <div className="h-32 animate-pulse rounded-[14px] bg-[var(--color-input-bg)]" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailPill label="Inicial" value={formatMoney(session.montoInicial)} />
            <DetailPill
              label="Esperado"
              value={formatMoney(session.montoEsperadoActual ?? session.montoEsperado)}
            />
            <DetailPill
              label="Diferencia"
              value={formatMoney(session.diferencia)}
              tone={session.diferencia ? "warning" : "default"}
            />
          </div>

          {session.totalesPorMetodoPago?.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {session.totalesPorMetodoPago.map((item) => (
                <div
                  key={item.metodoPago?.id ?? "sin-metodo"}
                  className="rounded-[12px] bg-[var(--color-input-bg)] px-3 py-2"
                >
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {item.metodoPago?.nombre ?? "Sin metodo"}
                  </p>
                  <p className="text-sm font-circular-bold text-[var(--color-text)]">
                    {formatMoney(item.monto)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            {(session.movimientos ?? []).map((movement) => (
              <MovementRow key={movement.publicId} movement={movement} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function MovementRow({ movement }: { movement: CashMovement }) {
  const config = movementConfig[movement.tipo];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--color-input-bg)] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            config.tone,
          )}
        >
          <Icon size={17} weight="bold" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {config.label}
            {movement.venta ? ` ${movement.venta.correlativo}` : ""}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {movement.metodoPago?.nombre ?? "Sin metodo"} ·{" "}
            {formatDateTime(movement.createdAt)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-circular-bold",
          Number(movement.monto) < 0 ? "text-[#ef4444]" : "text-[#10b981]",
        )}
      >
        {formatMoney(movement.monto)}
      </span>
    </div>
  );
}

function FilterSelect({
  value,
  options,
  isOpen,
  placeholder,
  onChange,
  onOpenChange,
}: {
  value: string;
  options: FilterOption[];
  isOpen: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const closeSelect = useEffectEvent(() => onOpenChange(false));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeSelect();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <CaretDownIcon
          size={16}
          className={cn(
            "shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full min-w-[180px] overflow-y-auto rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                onOpenChange(false);
              }}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                value === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "success" | "info" | "muted";
}) {
  const toneClass = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    info: "bg-[#3b82f6]/10 text-[#3b82f6]",
    muted: "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
  }[tone];

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneClass)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-[14px] bg-[var(--color-input-bg)] p-3">
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-circular-bold",
          tone === "warning" ? "text-[#f59e0b]" : "text-[var(--color-text)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

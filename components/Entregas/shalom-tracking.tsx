"use client";

import { Fragment, useState } from "react";
import {
  ArrowsClockwiseIcon,
  BarcodeIcon,
  CheckIcon,
  HashIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  salesApi,
  type SaleShippingDetails,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";

/** Estados reales del rastreo (mismos que shalom-service). */
const DEFAULT_STAGES = [
  "En origen",
  "En tránsito",
  "En destino",
  "Entregado",
] as const;

type ShalomMiniProgressProps = {
  publicId: string;
  correlativo: string;
  envio: SaleShippingDetails;
  onRefreshed: () => void;
};

/**
 * Avance compacto del envio Shalom al costado de la agencia de destino.
 * Los pasos salen del timeline real de Shalom (o de nuestros estados).
 */
export function ShalomMiniProgress({
  publicId,
  correlativo,
  envio,
  onRefreshed,
}: ShalomMiniProgressProps) {
  const toast = useSystemToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const stages = resolveStages(envio);
  const progress = resolveProgress(envio);
  const current = resolveCurrentIndex(envio, stages, progress);
  const currentLabel = resolveCurrentLabel(envio, stages, current);
  const isCanceled = envio.shalomEstado === "ANULADO";
  const isIncident = envio.shalomEstado === "INCIDENCIA";
  // Guia creada pero el paquete aun no fue recepcionado en la agencia.
  const notConfirmed = progress === 0 && !isIncident && !isCanceled;

  const refresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await salesApi.trackShalom(publicId);
      toast.showToast({
        title: "Estado actualizado",
        description:
          result.estadoLabel ??
          (result.estado ? traducirEstado(result.estado) : undefined),
        variant: "success",
      });
      onRefreshed();
    } catch (error) {
      toast.showToast({
        title: "No se pudo actualizar el rastreo",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshButton = (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={isRefreshing}
      aria-label="Actualizar estado de Shalom"
      title="Actualizar estado en Shalom"
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
    >
      <ArrowsClockwiseIcon
        size={13}
        weight="bold"
        className={cn(isRefreshing && "animate-spin")}
      />
    </button>
  );

  const verify = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const result = await salesApi.syncShalom(publicId);
      const failed =
        result.estado === "DEAD" ||
        result.estado === "FAILED" ||
        result.estado === "ERROR";

      if (result.orden) {
        toast.showToast({
          title: "Guía registrada en Shalom",
          description: `Orden ${result.orden}${
            result.codigo ? ` · Código ${result.codigo}` : ""
          }`,
          variant: "success",
        });
      } else if (failed) {
        toast.showToast({
          title: "El registro falló en Shalom",
          description: result.error ?? "Revisa e intenta de nuevo.",
          variant: "error",
        });
      } else {
        toast.showToast({
          title: "Shalom aún está procesando",
          description: "Vuelve a verificar en unos minutos.",
          variant: "info",
        });
      }
      onRefreshed();
    } catch (error) {
      toast.showToast({
        title: "No se pudo verificar el registro",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyButton = (
    <button
      type="button"
      onClick={() => void verify()}
      disabled={isVerifying}
      className="flex h-6 shrink-0 items-center gap-1 rounded-full bg-[var(--color-card)] px-2 text-[9px] font-circular-bold text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
    >
      <ArrowsClockwiseIcon
        size={11}
        weight="bold"
        className={cn(isVerifying && "animate-spin")}
      />
      Verificar
    </button>
  );

  const renderStepper = (activeIndex: number) => (
    <>
      {stages.map((label, index) => {
        const done = activeIndex >= 0 && index <= activeIndex;

        return (
          <Fragment key={`${label}-${index}`}>
            {index > 0 ? (
              <span
                className={cn(
                  "mx-1 mt-[5px] h-0.5 min-w-3 flex-1 sm:mt-[7px] sm:min-w-8",
                  activeIndex >= 0 && index <= activeIndex
                    ? "bg-[#dc2626]"
                    : "bg-[var(--color-border)]",
                )}
              />
            ) : null}
            <span className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "size-3 rounded-full border-2 transition-colors sm:size-4",
                  done
                    ? "border-[#dc2626] bg-[#dc2626]"
                    : "border-[var(--color-border)] bg-transparent",
                  index === activeIndex
                    ? "ring-2 ring-[#dc2626]/15 sm:ring-4"
                    : "",
                )}
              />
              <span
                className={cn(
                  "hidden max-w-20 truncate text-[10px] leading-none sm:block",
                  done
                    ? "font-circular-bold text-[#dc2626]"
                    : "text-[var(--color-muted-foreground)]",
                )}
                title={label}
              >
                {label}
              </span>
            </span>
          </Fragment>
        );
      })}
    </>
  );

  const waitingJob = !envio.shalomOrden && isShalomWaiting(envio.shalomEstado);
  if (!envio.shalomOrden && !waitingJob) return null;

  if (notConfirmed) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative flex min-w-0 items-start rounded-lg px-1 py-0.5">
          <div
            className="flex pointer-events-none select-none items-start opacity-50 blur-[1.5px]"
            aria-hidden="true"
          >
            {renderStepper(-1)}
          </div>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#f59e0b]/10 px-2 py-1 text-[9px] font-circular-bold text-[#b45309] shadow-sm ring-1 ring-[#f59e0b]/20">
              {isShalomWaiting(envio.shalomEstado) ? (
                <SpinnerGapIcon size={10} className="animate-spin" />
              ) : (
                <WarningCircleIcon size={11} weight="fill" />
              )}
              Llevar a la agencia
            </span>
          </span>
        </div>
        {envio.shalomOrden
          ? refreshButton
          : envio.shalomJobId
            ? verifyButton
            : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {isIncident || isCanceled ? (
          <button
            type="button"
            onClick={() => setTimelineOpen(true)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-circular-bold hover:opacity-80",
              isIncident
                ? "bg-[#dc2626]/10 text-[#b91c1c]"
                : "bg-[#b45309]/10 text-[#b45309]",
            )}
            title="Ver timeline de Shalom"
          >
            <WarningOctagonIcon size={12} weight="fill" />
            {isIncident ? "Incidencia" : "Anulado"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setTimelineOpen(true)}
              title={
                envio.shalomEstadoLabel
                  ? `Shalom: ${envio.shalomEstadoLabel}`
                  : "Ver timeline de Shalom"
              }
              className="flex min-w-0 items-start rounded-lg px-1 py-0.5 hover:bg-[var(--color-button-hover)]"
            >
              {renderStepper(current)}
            </button>
            <span
              className={cn(
                "max-w-24 truncate text-[10px] leading-none sm:hidden",
                isCanceled
                  ? "text-[#b45309]"
                  : "font-circular-bold text-[#dc2626]",
              )}
              title={envio.shalomEstadoLabel ?? undefined}
            >
              {currentLabel}
            </span>
          </>
        )}

        {refreshButton}
      </div>

      <ShalomTimelineModal
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        correlativo={correlativo}
        envio={envio}
        stages={stages}
        current={current}
        currentLabel={currentLabel}
        isIncident={isIncident}
        isCanceled={isCanceled}
      />
    </>
  );
}

function ShalomTimelineModal({
  isOpen,
  onClose,
  correlativo,
  envio,
  stages,
  current,
  currentLabel,
  isIncident,
  isCanceled,
}: {
  isOpen: boolean;
  onClose: () => void;
  correlativo: string;
  envio: SaleShippingDetails;
  stages: string[];
  current: number;
  currentLabel: string;
  isIncident: boolean;
  isCanceled: boolean;
}) {
  const label = currentLabel;

  const events = [...envio.historial]
    .filter((item) => /shalom/i.test(item.detalle ?? ""))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rastreo de Shalom"
      description={correlativo}
      size="xl"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {envio.shalomCodigo ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-[#dc2626]/10 px-3 py-1.5 text-xs font-circular-bold text-[#b91c1c] ring-1 ring-[#dc2626]/20"
            title={`Código de seguimiento ${envio.shalomCodigo}`}
          >
            <BarcodeIcon size={15} weight="bold" className="shrink-0" />
            Código {envio.shalomCodigo}
          </span>
        ) : null}
        {envio.shalomOrden ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-input-bg)] px-3 py-1.5 text-xs font-circular-bold text-[var(--color-text)] ring-1 ring-[var(--color-border)]"
            title={`Número de orden ${envio.shalomOrden}`}
          >
            <HashIcon
              size={15}
              weight="bold"
              className="shrink-0 text-[var(--color-muted-foreground)]"
            />
            Orden {envio.shalomOrden}
          </span>
        ) : null}
        {envio.shalomMonto ? (
          <span className="inline-flex items-center rounded-full bg-[var(--color-input-bg)] px-3 py-1.5 text-xs font-circular-bold text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]">
            S/ {Number(envio.shalomMonto).toFixed(2)}
          </span>
        ) : null}
      </div>

      <div className="mb-5 grid gap-2 rounded-[14px] bg-[var(--color-input-bg)] p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Origen
          </p>
          <p
            className="truncate text-sm font-circular-bold text-[var(--color-text)]"
            title={envio.shalomOrigen ?? undefined}
          >
            {envio.shalomOrigen ?? "No registrado"}
          </p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <span className="size-2 rounded-full border-2 border-[#dc2626]" />
          <span className="h-0 w-6 border-t-2 border-dashed border-[#dc2626]/40" />
          <span className="size-2 rounded-full bg-[#dc2626]" />
        </div>
        <div className="min-w-0 sm:text-right">
          <p className="text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Destino
          </p>
          <p
            className="truncate text-sm font-circular-bold text-[var(--color-text)]"
            title={envio.agenciaNombre ?? undefined}
          >
            {envio.agenciaNombre ?? "Agencia seleccionada"}
          </p>
          <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
            {[envio.agenciaDistrito, envio.agenciaProvincia, envio.agenciaDepartamento]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-3 text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Recorrido
          </p>
          <div className="mb-5 flex items-start">
            {stages.map((stage, index) => {
              const done = index <= current;

              return (
                <Fragment key={`${stage}-${index}`}>
                  {index > 0 ? (
                    <span
                      className={cn(
                        "mx-1.5 mt-2 h-1 flex-1 rounded-full",
                        index <= current
                          ? "bg-[#dc2626]"
                          : "bg-[var(--color-border)]",
                      )}
                    />
                  ) : null}
                  <span className="flex flex-col items-center gap-2">
                    <span
                      className={cn(
                        "size-5 rounded-full border-2",
                        done
                          ? "border-[#dc2626] bg-[#dc2626]"
                          : "border-[var(--color-border)] bg-[var(--color-card)]",
                      )}
                    />
                    <span
                      className={cn(
                        "hidden max-w-24 truncate text-xs sm:block",
                        index <= current
                          ? "font-circular-bold text-[#dc2626]"
                          : "text-[var(--color-muted-foreground)]",
                      )}
                      title={stage}
                    >
                      {stage}
                    </span>
                  </span>
                </Fragment>
              );
            })}
          </div>
          <p className="mb-5 -mt-2 text-center text-xs font-circular-bold text-[#dc2626] sm:hidden">
            {label}
          </p>

          {isIncident || isCanceled ? (
            <div
              className={cn(
                "mb-4 flex items-start gap-2 rounded-[12px] p-2.5 text-xs",
                isIncident
                  ? "bg-[#dc2626]/10 text-[#b91c1c]"
                  : "bg-[#b45309]/10 text-[#b45309]",
              )}
            >
              <WarningOctagonIcon
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-circular-bold">
                  {isIncident ? "Incidencia en el envío" : "Envío anulado"}
                </p>
                <p className="truncate text-[11px]">{label}</p>
              </div>
            </div>
          ) : null}

          <p className="mb-3 text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Etapas de Shalom
          </p>
          <ol className="space-y-0">
            {stages.map((stage, index) => {
              const done = index < current;
              const isCurrent = index === current;
              const pending = index > current;

              return (
                <li key={`${stage}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                        done
                          ? "border-[#dc2626] bg-[#dc2626] text-white"
                          : isCurrent
                            ? "border-[#dc2626] bg-[var(--color-card)] text-[#dc2626] ring-4 ring-[#dc2626]/10"
                            : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]",
                      )}
                    >
                      {done ? <CheckIcon size={14} weight="bold" /> : index + 1}
                    </span>
                    {index < stages.length - 1 ? (
                      <span
                        className={cn(
                          "my-1 w-0 flex-1 border-l-2",
                          done
                            ? "border-[#dc2626]"
                            : "border-dashed border-[var(--color-border)]",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-4">
                    <p
                      className={cn(
                        "text-[15px]",
                        isCurrent
                          ? "font-circular-bold text-[#dc2626]"
                          : done
                            ? "font-circular-bold text-[var(--color-text)]"
                            : "text-[var(--color-muted-foreground)]",
                      )}
                    >
                      {stage}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {pending ? "Pendiente" : isCurrent ? label : "Completado"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-w-0">
          <p className="mb-3 text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Movimientos
          </p>
          {events.length === 0 ? (
            <p className="rounded-[12px] bg-[var(--color-input-bg)] p-3 text-xs text-[var(--color-muted-foreground)]">
              Todavía no hay movimientos registrados. Pulsa actualizar para
              consultar el estado en Shalom.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {events.map((event, index) => (
                <li
                  key={`${event.createdAt}-${index}`}
                  className="rounded-[12px] bg-[var(--color-input-bg)] p-2.5"
                >
                  <p className="text-[11px] font-circular-bold text-[var(--color-text)]">
                    {event.detalle}
                  </p>
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">
                    {formatDateTime(event.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Estados intermedios mientras Shalom procesa el registro. */
const WAITING_STATES = new Set([
  "QUEUED",
  "PENDING",
  "PROCESSING",
  "RUNNING",
  "RETRYING",
  "RETRY",
]);

function isShalomWaiting(estado: string | null) {
  return Boolean(estado && WAITING_STATES.has(estado));
}

/** Nombres reales del timeline de Shalom o nuestras etapas por defecto. */
function resolveStages(envio: SaleShippingDetails): string[] {
  const timeline = envio.shalomTimeline;
  if (timeline && timeline.length > 0) {
    return timeline.map((step) => step.nombre).slice(0, 4);
  }
  return [...DEFAULT_STAGES];
}

/** Indice de la etapa actual (0-based). */
function resolveCurrentIndex(
  envio: SaleShippingDetails,
  stages: string[],
  progress: number,
) {
  const timeline = envio.shalomTimeline;
  if (timeline && timeline.length > 0) {
    const lastActive = timeline.reduce(
      (acc, step, index) => (step.activo ? index : acc),
      -1,
    );
    if (lastActive >= 0) {
      return Math.min(lastActive, stages.length - 1);
    }
  }

  if (envio.shalomEstado === "ENTREGADO") return stages.length - 1;

  const label = (envio.shalomEstadoLabel ?? "").toLowerCase();
  if (label.includes("entregad")) return stages.length - 1;
  if (label.includes("destino")) return Math.min(2, stages.length - 1);
  if (label.includes("origen")) return 0;

  if (progress <= 0) return 0;
  return Math.min(progress - 1, stages.length - 1);
}

/** Texto del estado actual mostrado bajo la etapa. */
function resolveCurrentLabel(
  envio: SaleShippingDetails,
  stages: string[],
  current: number,
) {
  return (
    envio.shalomEstadoLabel ??
    stages[Math.min(current, stages.length - 1)] ??
    "Registrado"
  );
}

/** 0..3 segun el progreso real de Shalom. */
function resolveProgress(envio: SaleShippingDetails) {
  if (typeof envio.shalomProgreso === "number" && envio.shalomProgreso >= 0) {
    return Math.min(3, envio.shalomProgreso);
  }

  switch (envio.shalomEstado) {
    case "ENTREGADO":
      return 3;
    case "EN_TRANSITO":
      return envio.estadoLogistico === "EN_TRANSITO" ? 2 : 1;
    case "EN_ORIGEN":
      return 1;
    default:
      return 0;
  }
}

function traducirEstado(estado: string) {
  switch (estado) {
    case "REGISTRADO":
      return "Registrado en Shalom";
    case "EN_ORIGEN":
      return "En agencia origen";
    case "EN_TRANSITO":
      return "En tránsito";
    case "ENTREGADO":
      return "Entregado";
    case "INCIDENCIA":
      return "Incidencia";
    case "ANULADO":
      return "Anulado";
    default:
      return estado;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

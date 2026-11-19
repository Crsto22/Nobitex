"use client";

import { Fragment, useState } from "react";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  salesApi,
  type SaleShippingDetails,
  type ShalomTrackingStep,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";

/** Estados reales del rastreo (mismos que shalom-service). */
const DEFAULT_STAGES = [
  "Registrado",
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
  const [timelineOpen, setTimelineOpen] = useState(false);

  const stages = resolveStages(envio);
  const progress = resolveProgress(envio);
  const isCanceled = envio.shalomEstado === "ANULADO";
  const isIncident = envio.shalomEstado === "INCIDENCIA";

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
          <button
            type="button"
            onClick={() => setTimelineOpen(true)}
            title={
              envio.shalomEstadoLabel
                ? `Shalom: ${envio.shalomEstadoLabel}`
                : "Ver timeline de Shalom"
            }
            className="flex items-start rounded-lg px-1 py-0.5 hover:bg-[var(--color-button-hover)]"
          >
            {stages.map((label, index) => {
              const done = index <= progress;

              return (
                <Fragment key={`${label}-${index}`}>
                  {index > 0 ? (
                    <span
                      className={cn(
                        "mx-1 mt-[7px] h-0.5 min-w-5 flex-1 sm:min-w-8",
                        index <= progress
                          ? "bg-[#dc2626]"
                          : "bg-[var(--color-border)]",
                      )}
                    />
                  ) : null}
                  <span className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        "size-4 rounded-full border-2 transition-colors",
                        done
                          ? "border-[#dc2626] bg-[#dc2626]"
                          : "border-[var(--color-border)] bg-transparent",
                        index === progress
                          ? "ring-4 ring-[#dc2626]/15"
                          : "",
                      )}
                    />
                    <span
                      className={cn(
                        "max-w-20 truncate text-[10px] leading-none sm:text-[11px]",
                        index <= progress
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
          </button>
        )}

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
      </div>

      <ShalomTimelineModal
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        correlativo={correlativo}
        envio={envio}
        stages={stages}
        progress={progress}
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
  progress,
  isIncident,
  isCanceled,
}: {
  isOpen: boolean;
  onClose: () => void;
  correlativo: string;
  envio: SaleShippingDetails;
  stages: string[];
  progress: number;
  isIncident: boolean;
  isCanceled: boolean;
}) {
  const label =
    envio.shalomEstadoLabel ??
    stages[Math.min(progress, stages.length - 1)] ??
    "Registrado";

  const events = [...envio.historial]
    .filter((item) => /shalom/i.test(item.detalle ?? ""))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rastreo de Shalom"
      description={`${correlativo} · ${envio.shalomOrden ?? "Sin orden"}${
        envio.shalomCodigo ? ` · Código ${envio.shalomCodigo}` : ""
      }`}
      size="xl"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-3 text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Recorrido
          </p>
          <div className="mb-5 flex items-start">
            {stages.map((stage, index) => {
              const done = index <= progress;

              return (
                <Fragment key={`${stage}-${index}`}>
                  {index > 0 ? (
                    <span
                      className={cn(
                        "mx-1.5 mt-2 h-1 flex-1 rounded-full",
                        index <= progress
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
                        "max-w-24 truncate text-xs",
                        index <= progress
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
              const done = index < progress;
              const current = index === progress;
              const pending = index > progress;

              return (
                <li key={`${stage}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                        done
                          ? "border-[#dc2626] bg-[#dc2626] text-white"
                          : current
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
                        current
                          ? "font-circular-bold text-[#dc2626]"
                          : done
                            ? "font-circular-bold text-[var(--color-text)]"
                            : "text-[var(--color-muted-foreground)]",
                      )}
                    >
                      {stage}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {pending ? "Pendiente" : current ? label : "Completado"}
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

/** Nombres reales del timeline de Shalom o nuestros estados por defecto. */
function resolveStages(envio: SaleShippingDetails): string[] {
  const timeline: ShalomTrackingStep[] | null = envio.shalomTimeline;
  if (timeline && timeline.length > 0) {
    return timeline.map((step) => step.nombre).slice(0, 4);
  }
  return [...DEFAULT_STAGES];
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

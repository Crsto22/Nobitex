"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
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

const DEFAULT_STEPS: ShalomTrackingStep[] = [
  { nombre: "Registrado", activo: true },
  { nombre: "En tránsito", activo: false },
  { nombre: "En destino", activo: false },
  { nombre: "Entregado", activo: false },
];

type ShalomTrackingCardProps = {
  publicId: string;
  correlativo: string;
  envio: SaleShippingDetails;
  onRefreshed: () => void;
};

export function ShalomTrackingCard({
  publicId,
  correlativo,
  envio,
  onRefreshed,
}: ShalomTrackingCardProps) {
  const toast = useSystemToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const steps =
    envio.shalomTimeline && envio.shalomTimeline.length > 0
      ? envio.shalomTimeline
      : DEFAULT_STEPS;
  const progress = resolveProgress(envio);
  const label =
    envio.shalomEstadoLabel ??
    steps[Math.min(progress, steps.length - 1)]?.nombre ??
    "Registrado";
  const isCanceled = envio.shalomEstado === "ANULADO";
  const isIncident = envio.shalomEstado === "INCIDENCIA";
  const isDelivered = progress >= 3 || envio.shalomEstado === "ENTREGADO";

  const accent = isIncident
    ? "text-[#dc2626]"
    : isCanceled
      ? "text-[#b45309]"
      : isDelivered
        ? "text-[#059669]"
        : "text-[#dc2626]";
  const accentBorder = isIncident
    ? "border-[#dc2626]"
    : isCanceled
      ? "border-[#b45309]"
      : isDelivered
        ? "border-[#059669]"
        : "border-[#dc2626]";
  const accentBg = isIncident
    ? "bg-[#dc2626]"
    : isCanceled
      ? "bg-[#b45309]"
      : isDelivered
        ? "bg-[#059669]"
        : "bg-[#dc2626]";

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
      <div className="rounded-[14px] bg-[var(--color-input-bg)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#dc2626] px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white">
            SHALOM
          </span>
          <span className="truncate text-xs font-circular-bold text-[var(--color-text)]">
            {envio.shalomOrden}
          </span>
          {envio.shalomCodigo ? (
            <span className="rounded-full bg-[var(--color-card)] px-2 py-0.5 text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
              Código {envio.shalomCodigo}
            </span>
          ) : null}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--color-muted-foreground)]">
            <ClockIcon size={12} />
            {timeAgo(envio.shalomSyncAt) ?? "sin actualizar"}
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            aria-label="Actualizar estado"
            title="Consultar el estado actual en Shalom"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
          >
            <ArrowsClockwiseIcon
              size={15}
              weight="bold"
              className={cn(isRefreshing && "animate-spin")}
            />
          </button>
          <button
            type="button"
            onClick={() => setTimelineOpen(true)}
            className="shrink-0 text-[10px] font-circular-bold text-[var(--color-primary)] hover:underline"
          >
            Ver timeline
          </button>
        </div>

        {isIncident || isCanceled ? (
          <div
            className={cn(
              "mt-3 flex items-start gap-2 rounded-[12px] p-2.5 text-xs",
              isIncident
                ? "bg-[#dc2626]/10 text-[#b91c1c]"
                : "bg-[#b45309]/10 text-[#b45309]",
            )}
          >
            <WarningOctagonIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-circular-bold">
                {isIncident ? "Incidencia en el envío" : "Envío anulado"}
              </p>
              <p className="truncate text-[11px]">{label}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-start justify-between gap-1">
              {steps.map((step, index) => {
                const done = index < progress || isDelivered;
                const current = index === progress && !isDelivered;

                return (
                  <div
                    key={`${step.nombre}-${index}`}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex w-full items-center">
                      <span
                        className={cn(
                          "h-0 flex-1 border-t-2",
                          index === 0
                            ? "border-transparent"
                            : index <= progress
                              ? accentBorder
                              : "border-dashed border-[var(--color-border)]",
                        )}
                      />
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                          done
                            ? cn(accentBorder, accentBg, "text-white")
                            : current
                              ? cn(accentBorder, "bg-[var(--color-card)] ring-4 ring-[#dc2626]/15", accent)
                              : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]",
                        )}
                      >
                        {done ? (
                          <CheckIcon size={12} weight="bold" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={cn(
                          "h-0 flex-1 border-t-2",
                          index === steps.length - 1
                            ? "border-transparent"
                            : index < progress
                              ? accentBorder
                              : "border-dashed border-[var(--color-border)]",
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "w-full truncate text-center text-[9px] leading-tight",
                        index === progress
                          ? cn("font-circular-bold", accent)
                          : "text-[var(--color-muted-foreground)]",
                      )}
                      title={step.nombre}
                    >
                      {step.nombre}
                    </span>
                  </div>
                );
              })}
            </div>

            <p
              className={cn(
                "mt-2 flex items-center gap-1.5 text-xs font-circular-bold",
                accent,
              )}
            >
              <MapPinIcon size={13} weight="fill" className="shrink-0" />
              <span className="truncate">{label}</span>
            </p>
          </>
        )}
      </div>

      <ShalomTimelineModal
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        correlativo={correlativo}
        envio={envio}
        steps={steps}
        progress={progress}
        label={label}
      />
    </>
  );
}

function ShalomTimelineModal({
  isOpen,
  onClose,
  correlativo,
  envio,
  steps,
  progress,
  label,
}: {
  isOpen: boolean;
  onClose: () => void;
  correlativo: string;
  envio: SaleShippingDetails;
  steps: ShalomTrackingStep[];
  progress: number;
  label: string;
}) {
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
          <ol className="space-y-0">
            {steps.map((step, index) => {
              const done = index < progress;
              const current = index === progress;
              const pending = index > progress;

              return (
                <li key={`${step.nombre}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                        done
                          ? "border-[#dc2626] bg-[#dc2626] text-white"
                          : current
                            ? "border-[#dc2626] bg-[var(--color-card)] text-[#dc2626] ring-4 ring-[#dc2626]/10"
                            : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]",
                      )}
                    >
                      {done ? <CheckIcon size={13} weight="bold" /> : index + 1}
                    </span>
                    {index < steps.length - 1 ? (
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
                        "text-sm",
                        current
                          ? "font-circular-bold text-[#dc2626]"
                          : done
                            ? "font-circular-bold text-[var(--color-text)]"
                            : "text-[var(--color-muted-foreground)]",
                      )}
                    >
                      {step.nombre}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      {pending
                        ? "Pendiente"
                        : current
                          ? label
                          : "Completado"}
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

function timeAgo(value: string | null) {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;

  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  return `hace ${days} d`;
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

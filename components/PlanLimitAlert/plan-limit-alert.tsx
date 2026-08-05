"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowRightIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import {
  planLimitReachedEventName,
  type PlanLimitReachedDetail,
} from "@/lib/api/auth-fetch";

const resourceLabels: Record<string, string> = {
  users: "usuarios",
  branches: "sucursales",
  warehouses: "almacenes",
  products: "productos",
  variants: "variantes",
  documents: "comprobantes",
  documentQueries: "consultas DNI/RUC",
  storageBytes: "almacenamiento de imágenes",
};

export function PlanLimitAlert() {
  const router = useRouter();
  const actionRef = useRef<HTMLButtonElement>(null);
  const [detail, setDetail] = useState<PlanLimitReachedDetail | null>(null);

  useEffect(() => {
    const handleLimit = (event: Event) => {
      setDetail((event as CustomEvent<PlanLimitReachedDetail>).detail);
    };
    window.addEventListener(planLimitReachedEventName, handleLimit);
    return () => window.removeEventListener(planLimitReachedEventName, handleLimit);
  }, []);

  useEffect(() => {
    if (!detail) return;
    actionRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detail]);

  if (!detail) return null;

  const resource = detail.resource
    ? resourceLabels[detail.resource] ?? detail.resource
    : null;
  const hasUsage =
    typeof detail.used === "number" && typeof detail.limit === "number";

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="plan-limit-title"
        aria-describedby="plan-limit-description"
        className="w-full max-w-md rounded-t-[18px] bg-[var(--color-card)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.3)] sm:rounded-[18px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#fff7ed] text-[#f59e0b]">
            <WarningCircleIcon size={25} weight="fill" />
          </span>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]"
            aria-label="Cerrar alerta"
            title="Cerrar"
          >
            <XIcon size={17} weight="bold" />
          </button>
        </div>

        <h2
          id="plan-limit-title"
          className="mt-5 text-xl font-circular-bold text-[var(--color-text)]"
        >
          Límite del plan alcanzado
        </h2>
        <p
          id="plan-limit-description"
          className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]"
        >
          {resource
            ? `Alcanzaste el límite de ${resource} incluido en tu plan.`
            : detail.message}
        </p>

        {hasUsage ? (
          <div className="mt-5 rounded-[12px] bg-[var(--color-input-bg)] p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--color-muted-foreground)]">Uso actual</span>
              <strong className="font-circular-bold text-[var(--color-text)]">
                {formatValue(detail.used!, detail.resource)} de{" "}
                {formatValue(detail.limit!, detail.resource)}
              </strong>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-card)]">
              <div className="h-full w-full rounded-full bg-[#f59e0b]" />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="h-11 rounded-[14px] bg-[var(--color-input-bg)] px-5 text-sm font-circular-bold text-[var(--color-text)]"
          >
            Ahora no
          </button>
          <button
            ref={actionRef}
            type="button"
            onClick={() => {
              setDetail(null);
              router.push("/configuracion/plan");
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white"
          >
            Actualizar plan
            <ArrowRightIcon size={16} weight="bold" />
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function formatValue(value: number, resource?: string) {
  if (resource !== "storageBytes") return value.toLocaleString("es-PE");
  const megabytes = value / (1024 * 1024);
  return megabytes >= 1024
    ? `${(megabytes / 1024).toLocaleString("es-PE")} GB`
    : `${megabytes.toLocaleString("es-PE")} MB`;
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { TruckIcon } from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  enviosConfigApi,
  type EnvioMetodoConfig,
} from "@/lib/api/envios-config";
import { cn } from "@/lib/utils";

const metodosCatalog = [
  {
    metodo: "SHALOM",
    nombre: "Shalom",
    image: "/envios/shalom.svg",
    descripcion: "Entrega a agencias Shalom",
    bg: "bg-[#e52421]/10",
  },
  {
    metodo: "OLVA",
    nombre: "Olva",
    image: "/envios/olva.webp",
    descripcion: "Entrega a agencias Olva",
    bg: "bg-[#f5c518]/15",
  },
];

export default function EnviosConfigPage() {
  const [configs, setConfigs] = useState<EnvioMetodoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const { showToast } = useSystemToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setConfigs(await enviosConfigApi.findAll());
    } catch (error: unknown) {
      showToast({
        title: "No se pudieron cargar los métodos de envío",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const toggle = async (metodo: string, activo: boolean) => {
    if (toggling) return;
    setToggling(metodo);
    const previous = configs;
    setConfigs((current) =>
      current.map((config) =>
        config.metodo === metodo ? { ...config, activo } : config,
      ),
    );
    try {
      const updated = await enviosConfigApi.toggle(metodo, activo);
      setConfigs((current) =>
        current.map((config) =>
          config.metodo === updated.metodo ? updated : config,
        ),
      );
      showToast({
        title: activo ? "Método de envío activado" : "Método de envío desactivado",
        description: updated.nombre,
        variant: "success",
      });
    } catch (error: unknown) {
      setConfigs(previous);
      showToast({
        title: "No se pudo actualizar el método de envío",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setToggling(null);
    }
  };

  return (
    <DashboardShell headerTitle="Envíos">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6">
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4 shadow-sm sm:p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
            <TruckIcon
              size={22}
              weight="fill"
              className="text-[var(--color-primary)]"
            />
          </div>
          <div>
            <h2 className="text-base font-black text-[var(--color-text)]">
              Métodos de envío
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Activa o desactiva los métodos de envío que tus clientes podrán
              elegir al completar sus datos.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {metodosCatalog.map((metodo) => (
              <div
                key={metodo.metodo}
                className="h-40 animate-pulse rounded-2xl bg-[var(--color-card)] shadow-sm"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {metodosCatalog.map((metodo) => {
              const config = configs.find(
                (item) => item.metodo === metodo.metodo,
              );
              const activo = config?.activo ?? true;
              const isToggling = toggling === metodo.metodo;
              return (
                <article
                  key={metodo.metodo}
                  className={cn(
                    "rounded-2xl bg-[var(--color-card)] p-5 shadow-sm transition-opacity",
                    !activo && "opacity-70",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={cn(
                        "flex h-20 w-32 items-center justify-center overflow-hidden rounded-xl p-2",
                        metodo.bg,
                      )}
                    >
                      <Image
                        src={metodo.image}
                        alt={metodo.nombre}
                        width={160}
                        height={80}
                        unoptimized
                        className="h-full w-auto max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={activo}
                      aria-label={`${activo ? "Desactivar" : "Activar"} ${metodo.nombre}`}
                      disabled={isToggling}
                      onClick={() => void toggle(metodo.metodo, !activo)}
                      className={cn(
                        "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        activo ? "bg-[#10b981]" : "bg-[var(--color-input-bg)]",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
                          activo ? "left-6" : "left-1",
                        )}
                      />
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-black text-[var(--color-text)]">
                      {metodo.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      {metodo.descripcion}
                    </p>
                    <span
                      className={cn(
                        "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold",
                        activo
                          ? "bg-[#10b981]/10 text-[#047857]"
                          : "bg-[#6b7280]/10 text-[#4b5563]",
                      )}
                    >
                      {activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

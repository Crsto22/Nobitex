"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { ListChecksIcon, StorefrontIcon } from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformCompanyModules,
} from "@/lib/api/platform-admin";
import { assignableSidebarModules } from "@/lib/navigation/sidebar-modules";

const moduleByKey = new Map(
  assignableSidebarModules.map((moduleItem) => [moduleItem.key, moduleItem]),
);

const moduleGroups = [
  {
    label: "POS / Ventas",
    keys: [
      "dashboard",
      "ventas-pos",
      "caja",
      "cotizaciones",
      "entregas-pendientes",
      "clientes",
      "historial-ventas",
      "historial-cotizaciones",
      "comprobantes",
      "nota-credito",
      "series",
    ],
  },
  {
    label: "Inventario",
    keys: [
      "productos",
      "categorias",
      "marcas",
      "tallas",
      "colores",
      "stock-movimientos",
      "stock-traspasos",
      "stock-kardex",
    ],
  },
  {
    label: "Compras / GRE",
    keys: [
      "compras-ordenes",
      "compras-proveedores",
      "gre-remitente",
      "conductores",
    ],
  },
  {
    label: "Reportes",
    keys: [
      "reportes-ventas",
      "reportes-productos",
      "reportes-clientes",
      "reportes-usuarios",
    ],
  },
  {
    label: "Configuración",
    keys: ["sucursales", "usuarios", "empresa", "metodos-pago", "mi-cuenta"],
  },
  {
    label: "Asistencias",
    keys: [
      "asistencias-dashboard",
      "asistencias-personal",
      "asistencias-marcajes",
      "asistencias-historial-marcaciones",
      "asistencias-turnos",
      "asistencias-puntos-qr",
      "asistencias-reportes",
      "asistencias-configuracion",
    ],
  },
];

export default function CustomizeCompanyModulesPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useSystemToast();
  const [data, setData] = useState<PlatformCompanyModules | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdminApi.getCompanyModules(params.id);
      setData(result);
      setSelected(new Set(result.effectiveModuleKeys));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los módulos",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await platformAdminApi.updateCompanyModules(
        params.id,
        Array.from(selected),
      );
      setData(updated);
      setSelected(new Set(updated.effectiveModuleKeys));
      showToast({
        title: "Módulos actualizados",
        description: `Los módulos de ${updated.company.name} ya están vigentes.`,
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudo actualizar",
        description:
          requestError instanceof Error
            ? requestError.message
            : "Revisa los módulos.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      headerTitle="Personalizar módulos"
      headerParent={{
        label: "Directorio de empresas",
        href: "/superadmin/empresas",
      }}
    >
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:p-6">
        <section className="mb-4 flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white">
              <StorefrontIcon size={21} weight="fill" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-circular-bold text-[var(--color-text)]">
                {data?.company.name ?? "Empresa"}
              </h1>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {selected.size} módulos disponibles
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[14px] bg-[#ef4444]/10 p-4 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : loading ? (
          <div className="h-96 animate-pulse rounded-[14px] bg-[var(--color-card)]" />
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
          >
            <div className="flex flex-col gap-3 rounded-xl bg-[var(--color-input-bg)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <ListChecksIcon size={20} weight="fill" />
                </span>
                <div>
                  <p className="text-sm font-circular-bold text-[var(--color-text)]">
                    Módulos del cliente
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    El plan base aporta {data?.baseModuleKeys.length ?? 0}; aquí
                    puedes ajustar esta empresa.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      new Set(assignableSidebarModules.map((item) => item.key)),
                    )
                  }
                  className="h-9 rounded-xl bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-primary)]"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="h-9 rounded-xl bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-muted-foreground)]"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {moduleGroups.map((group) => {
                const modules = group.keys.flatMap((key) => {
                  const moduleItem = moduleByKey.get(key);
                  return moduleItem ? [moduleItem] : [];
                });
                return (
                  <section
                    key={group.label}
                    className="rounded-xl bg-[var(--color-input-bg)] p-3"
                  >
                    <h2 className="mb-3 text-sm font-circular-bold text-[var(--color-text)]">
                      {group.label}
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {modules.map((moduleItem) => (
                        <label
                          key={moduleItem.key}
                          className="flex min-h-11 items-center gap-3 rounded-lg bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)]"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(moduleItem.key)}
                            onChange={(event) => {
                              setSelected((current) => {
                                const next = new Set(current);
                                if (event.target.checked)
                                  next.add(moduleItem.key);
                                else next.delete(moduleItem.key);
                                return next;
                              });
                            }}
                            className="size-4 accent-[var(--color-primary)]"
                          />
                          <span className="min-w-0 truncate">
                            {moduleItem.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar módulos"}
              </button>
            </div>
          </form>
        )}
      </main>
    </DashboardShell>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BuildingsIcon,
  CubeIcon,
  DatabaseIcon,
  FileTextIcon,
  FloppyDiskIcon,
  ImageIcon,
  QrCodeIcon,
  StorefrontIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type PlatformCompanyLimits,
  type PlatformPlanLimits,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";

const emptyLimits: PlatformPlanLimits = {
  users: 0,
  branches: 0,
  warehouses: 0,
  products: 0,
  variants: 0,
  documents: 0,
  documentQueries: 0,
  storageBytes: 0,
  attendanceEmployees: 0,
  attendanceQrPoints: 0,
};

const resources: Array<{
  key: keyof PlatformPlanLimits;
  label: string;
  icon: typeof UsersThreeIcon;
  tone: "navy" | "blue" | "green" | "cyan" | "orange" | "violet";
}> = [
  { key: "users", label: "Usuarios", icon: UsersThreeIcon, tone: "navy" },
  { key: "branches", label: "Tiendas", icon: BuildingsIcon, tone: "blue" },
  { key: "warehouses", label: "Almacenes", icon: StorefrontIcon, tone: "navy" },
  { key: "products", label: "Productos", icon: CubeIcon, tone: "green" },
  { key: "variants", label: "Variantes", icon: DatabaseIcon, tone: "cyan" },
  {
    key: "documents",
    label: "Comprobantes",
    icon: FileTextIcon,
    tone: "orange",
  },
  {
    key: "documentQueries",
    label: "Consultas DNI/RUC",
    icon: FileTextIcon,
    tone: "blue",
  },
  { key: "storageBytes", label: "Imágenes", icon: ImageIcon, tone: "violet" },
];

const resourceTones = {
  navy: {
    card: "bg-[var(--color-card)]",
    icon: "bg-[#3b82f6]/10 text-[#2563eb]",
    light: false,
  },
  blue: {
    card: "bg-[var(--color-card)]",
    icon: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    light: false,
  },
  green: {
    card: "bg-[var(--color-card)]",
    icon: "bg-[#10b981]/10 text-[#059669]",
    light: false,
  },
  cyan: {
    card: "bg-[var(--color-card)]",
    icon: "bg-[#06b6d4]/10 text-[#0891b2]",
    light: false,
  },
  orange: {
    card: "bg-[var(--color-card)]",
    icon: "bg-[#f59e0b]/10 text-[#d97706]",
    light: false,
  },
  violet: {
    card: "bg-[var(--color-card)]",
    icon: "bg-[#8b5cf6]/10 text-[#7c3aed]",
    light: false,
  },
} as const;

export default function CustomizeCompanyLimitsPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useSystemToast();
  const [company, setCompany] = useState<PlatformCompanyLimits | null>(null);
  const [values, setValues] = useState<PlatformPlanLimits>(emptyLimits);
  const [attendanceCapacity, setAttendanceCapacity] = useState({
    employeesLimit: 0,
    qrPointsLimit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdminApi.getCompanyLimits(params.id);
      setCompany(result);
      setValues(result.additionalLimits);
      setAttendanceCapacity({
        employeesLimit:
          result.attendance?.effectiveEmployeesLimit ??
          result.attendance?.employeesLimit ??
          0,
        qrPointsLimit:
          result.attendance?.effectiveQrPointsLimit ??
          result.attendance?.qrPointsLimit ??
          0,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los limites",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const update = (key: keyof PlatformPlanLimits, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: Math.max(0, Math.trunc(Number(value) || 0)),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await platformAdminApi.updateCompanyLimits(
        params.id,
        values,
      );
      setCompany(updated);
      setValues(updated.additionalLimits);
      showToast({
        title: "Limites actualizados",
        description: `La capacidad adicional de ${updated.company.name} ya esta activa.`,
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudieron actualizar",
        description:
          requestError instanceof Error
            ? requestError.message
            : "Revisa los valores.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitAttendanceCapacity = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await platformAdminApi.updateCompanyAttendanceCapacity(
        params.id,
        attendanceCapacity,
      );
      setCompany((current) =>
        current ? { ...current, attendance: updated } : current,
      );
      setAttendanceCapacity({
        employeesLimit: updated.effectiveEmployeesLimit,
        qrPointsLimit: updated.effectiveQrPointsLimit,
      });
      showToast({
        title: "Asistencias actualizada",
        description: "La nueva capacidad contratada quedó activa.",
        variant: "success",
      });
    } catch (requestError) {
      showToast({
        title: "No se pudo ampliar",
        description:
          requestError instanceof Error
            ? requestError.message
            : "Revisa los limites contratados.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      headerTitle="Personalizar limites"
      headerParent={{
        label: "Consumo y límites",
        href: "/superadmin/empresas/consumos",
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
                {company?.company.name ?? "Personalizar límites"}
              </h1>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Límites personalizados
              </p>
            </div>
          </div>
          {company?.updatedAt ? (
            <span className="rounded-lg bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
              Actualizado {new Date(company.updatedAt).toLocaleString("es-PE")}
            </span>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : loading || !company ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <div
                key={resource.key}
                className="h-56 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-sm"
              />
            ))}
          </div>
        ) : (
          <>
            <form onSubmit={submit}>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resources.map((resource) => {
                const Icon = resource.icon;
                const formatter =
                  resource.key === "storageBytes" ? formatBytes : formatNumber;
                const base = company.baseLimits[resource.key];
                const unlimited = base === null;
                const additional = values[resource.key] ?? 0;
                const effective = unlimited ? null : base + additional;
                const tone = resourceTones[resource.tone];
                return (
                  <article
                    key={resource.key}
                    className={cn(
                      "rounded-[14px] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]",
                      tone.card,
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl",
                          tone.icon,
                        )}
                      >
                        <Icon size={19} weight="fill" />
                      </span>
                      <h2
                        className={cn(
                          "font-circular-bold",
                          tone.light
                            ? "text-white"
                            : "text-[var(--color-text)]",
                        )}
                      >
                        {resource.label}
                      </h2>
                    </div>
                    <div
                      className={cn(
                        "mt-4 grid grid-cols-3 gap-2 rounded-xl p-3 text-sm",
                        tone.light
                          ? "bg-white/10 text-white"
                          : "bg-[var(--color-background)] text-[var(--color-text)]",
                      )}
                    >
                      <div>
                        <p
                          className={cn(
                            "text-[10px]",
                            tone.light
                              ? "text-white/65"
                              : "text-[var(--color-muted-foreground)]",
                          )}
                        >
                          Base
                        </p>
                        <strong>
                          {unlimited ? "Ilimitado" : formatter(base)}
                        </strong>
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-[10px]",
                            tone.light
                              ? "text-white/65"
                              : "text-[var(--color-muted-foreground)]",
                          )}
                        >
                          Adicional
                        </p>
                        <strong>
                          {unlimited ? "-" : formatter(additional)}
                        </strong>
                      </div>
                      <div>
                        <p
                          className={cn(
                            "text-[10px]",
                            tone.light
                              ? "text-white/65"
                              : "text-[var(--color-muted-foreground)]",
                          )}
                        >
                          Total
                        </p>
                        <strong
                          className={
                            tone.light ? "text-white" : "text-[#059669]"
                          }
                        >
                          {unlimited ? "Ilimitado" : formatter(effective ?? 0)}
                        </strong>
                      </div>
                    </div>
                    <label className="mt-4 grid gap-1.5 text-sm">
                      <span
                        className={cn(
                          "text-xs font-circular-bold",
                          tone.light
                            ? "text-white/80"
                            : "text-[var(--color-text)]",
                        )}
                      >
                        Bonificación
                        {resource.key === "storageBytes" ? " (bytes)" : ""}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        disabled={unlimited}
                        value={unlimited ? "" : additional}
                        placeholder={unlimited ? "Ilimitado" : undefined}
                        onChange={(event) =>
                          update(resource.key, event.target.value)
                        }
                        className={cn(
                          "h-10 rounded-xl border px-3 outline-none",
                          tone.light
                            ? "border-white/15 bg-white/10 text-white focus:border-white/40"
                            : "border-[var(--color-border)] bg-[var(--color-input-bg)] text-[var(--color-text)] focus:border-[var(--color-primary)]",
                        )}
                      />
                    </label>
                  </article>
                );
              })}
              </section>
              <div className="mt-4 flex flex-col-reverse gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setValues(emptyLimits)}
                className="h-10 rounded-xl bg-red-500/10 px-4 text-sm font-circular-bold text-red-600"
              >
                Restablecer bonificaciones
              </button>
              <div className="flex gap-3">
                <Link
                  href="/superadmin/empresas/consumos"
                  className="grid h-10 place-items-center rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
                >
                  <FloppyDiskIcon size={16} />{" "}
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
              </div>
            </form>
            <form
              onSubmit={submitAttendanceCapacity}
              className="mt-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-circular-bold text-[var(--color-text)]">
                    Ampliar Asistencias
                  </h2>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Ajusta solo la capacidad contratada vigente.
                  </p>
                </div>
                <span className="rounded-lg bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
                  {company.attendance?.effectiveActive
                    ? "Suscripción vigente"
                    : "Sin suscripción vigente"}
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <AttendanceCapacityCard
                  icon={<UsersThreeIcon size={18} weight="fill" />}
                  label="Trabajadores"
                  used={company.attendance?.usage?.employees ?? 0}
                  value={attendanceCapacity.employeesLimit}
                  disabled={!company.attendance?.effectiveActive}
                  onChange={(value) =>
                    setAttendanceCapacity((current) => ({
                      ...current,
                      employeesLimit: Math.max(
                        company.attendance?.usage?.employees ?? 0,
                        Math.trunc(Number(value) || 0),
                      ),
                    }))
                  }
                />
                <AttendanceCapacityCard
                  icon={<QrCodeIcon size={18} weight="fill" />}
                  label="Puntos QR"
                  used={company.attendance?.usage?.qrPoints ?? 0}
                  value={attendanceCapacity.qrPointsLimit}
                  disabled={!company.attendance?.effectiveActive}
                  onChange={(value) =>
                    setAttendanceCapacity((current) => ({
                      ...current,
                      qrPointsLimit: Math.max(
                        company.attendance?.usage?.qrPoints ?? 0,
                        Math.trunc(Number(value) || 0),
                      ),
                    }))
                  }
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !company.attendance?.effectiveActive}
                  className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
                >
                  <FloppyDiskIcon size={16} />{" "}
                  {saving ? "Guardando..." : "Guardar capacidad"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </DashboardShell>
  );
}

function AttendanceCapacityCard({
  icon,
  label,
  used,
  value,
  disabled,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  used: number;
  value: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <article className="rounded-xl bg-[var(--color-background)] p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-[#10b981]/10 text-[#059669]">
          {icon}
        </span>
        <div>
          <p className="text-sm font-circular-bold text-[var(--color-text)]">
            {label}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Usado {used.toLocaleString("es-PE")}
          </p>
        </div>
      </div>
      <label className="mt-4 grid gap-1.5 text-sm">
        <span className="text-xs font-circular-bold text-[var(--color-text)]">
          Contratado
        </span>
        <input
          type="number"
          min={used}
          step="1"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
        />
      </label>
    </article>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("es-PE");
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

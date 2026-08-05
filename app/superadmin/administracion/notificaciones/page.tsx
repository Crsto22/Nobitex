"use client";

import { NativeSelect } from "@/components/ui/select";
import { DateTimeInput } from "@/components/ui/calendar-input";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArchiveIcon,
  ArrowClockwiseIcon,
  BellIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  notificationsApi,
  type ManualNotificationsResponse,
  type NotificationAudience,
  type NotificationLevel,
} from "@/lib/api/notifications";
import {
  platformAdminApi,
  type PlatformCompany,
  type PlatformPlanCode,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";

const emptyResult: ManualNotificationsResponse = {
  data: [],
  meta: { page: 1, limit: 12, total: 0, totalPages: 1 },
};
const planOptions: Array<{ code: PlatformPlanCode; label: string }> = [
  { code: "prueba", label: "Prueba" },
  { code: "basico", label: "Básico" },
  { code: "emprendedor", label: "Emprende" },
  { code: "crecimiento", label: "Crece" },
  { code: "empresarial", label: "Escala" },
];

export default function PlatformNotificationsPage() {
  const [result, setResult] = useState(emptyResult);
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    level: "informacion" as NotificationLevel,
    audience: "todos" as NotificationAudience,
    planCodes: [] as PlatformPlanCode[],
    companyId: "",
    userId: "",
    expiresAt: "",
  });

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await notificationsApi.findManual(page, search));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los avisos.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    let active = true;
    void notificationsApi
      .findManual(page, search)
      .then((response) => {
        if (active) setResult(response);
      })
      .catch((loadError: unknown) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los avisos.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, search]);

  useEffect(() => {
    void platformAdminApi
      .findCompanies({ page: 1, limit: 100, state: "activa" })
      .then((response) => setCompanies(response.data))
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (form.audience !== "usuario" || !form.companyId) return;
    void notificationsApi
      .findCompanyUsers(form.companyId, "", 1, 100)
      .then((response) => setUsers(response.data))
      .catch(() => setUsers([]));
  }, [form.audience, form.companyId]);

  const activeCount = useMemo(
    () => result.data.filter((item) => !item.archivedAt).length,
    [result.data],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await notificationsApi.publish({
        title: form.title,
        message: form.message,
        level: form.level,
        audience: form.audience,
        planCodes: form.audience === "planes" ? form.planCodes : undefined,
        companyId: ["empresa", "usuario"].includes(form.audience)
          ? form.companyId
          : undefined,
        userId: form.audience === "usuario" ? form.userId : undefined,
        expiresAt: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : undefined,
      });
      setMessage(`Aviso enviado a ${response.recipients} usuario(s).`);
      setForm({
        title: "",
        message: "",
        level: "informacion",
        audience: "todos",
        planCodes: [],
        companyId: "",
        userId: "",
        expiresAt: "",
      });
      setPage(1);
      await loadHistory();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo publicar el aviso.",
      );
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    if (!window.confirm("¿Deseas archivar este aviso?")) return;
    try {
      await notificationsApi.archive(id);
      await loadHistory();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "No se pudo archivar el aviso.",
      );
    }
  };

  return (
    <DashboardShell headerTitle="Notificaciones">
      <div className="mx-auto w-full max-w-[1500px] space-y-4 p-4 lg:p-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<BellIcon size={21} weight="fill" />}
            label="Avisos publicados"
            value={result.meta.total}
            color="#172273"
            strong
          />
          <StatCard
            icon={<CheckCircleIcon size={21} weight="fill" />}
            label="Activos en pantalla"
            value={activeCount}
            color="#10b981"
          />
          <StatCard
            icon={<UsersThreeIcon size={21} weight="fill" />}
            label="Empresas disponibles"
            value={companies.length}
            color="#3b82f6"
          />
        </section>

        {message ? (
          <div className="rounded-xl bg-[#10b981]/10 px-4 py-3 text-sm text-[#059669]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={submit}
            className="h-fit rounded-[14px] bg-[var(--color-card)] p-5 shadow-[0_2px_10px_rgba(21,25,34,0.10)]"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <PaperPlaneTiltIcon size={20} weight="fill" />
              </span>
              <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                Publicar aviso
              </h2>
            </div>

            <Field label="Titulo">
              <input
                required
                minLength={3}
                maxLength={120}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Mensaje">
              <textarea
                required
                minLength={3}
                maxLength={700}
                rows={4}
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                className={cn(inputClass, "h-auto resize-none py-3")}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Tipo">
                <NativeSelect
                  value={form.level}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      level: event.target.value as NotificationLevel,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="informacion">Informacion</option>
                  <option value="exito">Exito</option>
                  <option value="advertencia">Advertencia</option>
                  <option value="error">Importante</option>
                </NativeSelect>
              </Field>
              <Field label="Destinatarios">
                <NativeSelect
                  value={form.audience}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      audience: event.target.value as NotificationAudience,
                      companyId: "",
                      userId: "",
                    }))
                  }
                  className={inputClass}
                >
                  <option value="todos">Todos los usuarios</option>
                  <option value="planes">Por plan</option>
                  <option value="empresa">Una empresa</option>
                  <option value="usuario">Un usuario</option>
                </NativeSelect>
              </Field>
            </div>

            {form.audience === "planes" ? (
              <div className="mb-4 grid grid-cols-2 gap-2">
                {planOptions.map((plan) => (
                  <label
                    key={plan.code}
                    className="flex items-center gap-2 rounded-xl bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
                  >
                    <input
                      type="checkbox"
                      checked={form.planCodes.includes(plan.code)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          planCodes: current.planCodes.includes(plan.code)
                            ? current.planCodes.filter(
                                (code) => code !== plan.code,
                              )
                            : [...current.planCodes, plan.code],
                        }))
                      }
                    />
                    {plan.label}
                  </label>
                ))}
              </div>
            ) : null}

            {["empresa", "usuario"].includes(form.audience) ? (
              <Field label="Empresa">
                <NativeSelect
                  required
                  value={form.companyId}
                  onChange={(event) => {
                    setUsers([]);
                    setForm((current) => ({
                      ...current,
                      companyId: event.target.value,
                      userId: "",
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Seleccionar empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}

            {form.audience === "usuario" ? (
              <Field label="Usuario">
                <NativeSelect
                  required
                  disabled={!form.companyId}
                  value={form.userId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      userId: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Seleccionar usuario</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.email}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}

            <DateTimeInput
              label="Visible hasta (opcional)"
              value={form.expiresAt}
              clearable
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  expiresAt: value,
                }))
              }
            />

            <button
              type="submit"
              disabled={
                saving || (form.audience === "planes" && !form.planCodes.length)
              }
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-sm font-circular-bold text-white disabled:opacity-50"
            >
              <PaperPlaneTiltIcon size={17} weight="bold" />
              {saving ? "Publicando..." : "Publicar aviso"}
            </button>
          </form>

          <section className="min-w-0 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.10)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <MagnifyingGlassIcon
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                    setLoading(true);
                  }}
                  placeholder="Buscar aviso..."
                  aria-label="Buscar aviso..."
                  className={cn(inputClass, "pl-10")}
                />
              </div>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="grid size-11 place-items-center rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text)]"
                title="Actualizar"
              >
                <ArrowClockwiseIcon size={18} />
              </button>
            </div>

            {loading && result.data.length === 0 ? (
              <Empty text="Cargando avisos..." />
            ) : result.data.length === 0 ? (
              <Empty text="Todavia no hay avisos publicados" />
            ) : (
              <div className="space-y-2">
                {result.data.map((item) => (
                  <article
                    key={item.id}
                    className="flex gap-3 rounded-xl bg-[var(--color-input-bg)] p-3"
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg",
                        levelStyle[item.level],
                      )}
                    >
                      {item.level === "advertencia" ||
                      item.level === "error" ? (
                        <WarningCircleIcon size={18} weight="fill" />
                      ) : (
                        <BellIcon size={18} weight="fill" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-circular-bold text-[var(--color-text)]">
                            {item.title}
                          </h3>
                          <p className="mt-0.5 text-xs leading-5 text-[var(--color-text)]/65">
                            {item.message}
                          </p>
                        </div>
                        {!item.archivedAt ? (
                          <button
                            type="button"
                            onClick={() => void archive(item.id)}
                            title="Archivar"
                            className="grid size-8 place-items-center rounded-lg bg-[var(--color-card)] text-[var(--color-text)]/60 hover:text-[#ef4444]"
                          >
                            <ArchiveIcon size={16} />
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-text)]/50">
                        <span>{audienceLabel[item.audience]}</span>
                        <span>{item.recipients} destinatarios</span>
                        <span>
                          {new Date(item.createdAt).toLocaleString("es-PE")}
                        </span>
                        {item.archivedAt ? (
                          <span className="text-[#ef4444]">Archivado</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text)]/55">
              <span>
                Pagina {result.meta.page} de {result.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= result.meta.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";
const levelStyle: Record<NotificationLevel, string> = {
  informacion: "bg-[#3b82f6]/10 text-[#3b82f6]",
  exito: "bg-[#10b981]/10 text-[#10b981]",
  advertencia: "bg-[#f59e0b]/10 text-[#f59e0b]",
  error: "bg-[#ef4444]/10 text-[#ef4444]",
};
const audienceLabel: Record<NotificationAudience, string> = {
  todos: "Todos los usuarios",
  planes: "Por plan",
  empresa: "Empresa",
  usuario: "Usuario",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-xs font-circular-bold text-[var(--color-text)]/65">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  strong,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  strong?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-[14px] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.10)]",
        strong
          ? "bg-[#172273] text-white"
          : "bg-[var(--color-card)] text-[var(--color-text)]",
      )}
    >
      <span
        className="grid size-9 place-items-center rounded-xl"
        style={{
          backgroundColor: strong ? "rgba(255,255,255,.14)" : `${color}18`,
          color: strong ? "white" : color,
        }}
      >
        {icon}
      </span>
      <p
        className={cn(
          "mt-3 text-xs",
          strong ? "text-white/75" : "text-[var(--color-text)]/55",
        )}
      >
        {label}
      </p>
      <strong className="mt-1 block text-xl font-circular-bold">{value}</strong>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid min-h-64 place-items-center text-sm text-[var(--color-text)]/50">
      {text}
    </div>
  );
}

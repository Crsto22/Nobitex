"use client";

import { NativeSelect } from "@/components/ui/select";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowClockwiseIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PowerIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { UserAvatar } from "@/components/UserAvatar/user-avatar";
import {
  platformAdminApi,
  type CreatePlatformAdminResponse,
  type PlatformAdminUser,
  type PlatformAdminUsersResponse,
  type PlatformAdminUserStatus,
} from "@/lib/api/platform-admin";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

const pageSize = 12;
const emptyResult: PlatformAdminUsersResponse = {
  data: [],
  meta: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
  summary: { total: 0, active: 0, inactive: 0 },
};
const emptyForm = { nombre: "", apellido: "", email: "", telefono: "" };

export default function PlatformUsersPage() {
  const { user: currentUser } = useAuth();
  const [result, setResult] = useState<PlatformAdminUsersResponse>(emptyResult);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"activo" | "inactivo" | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [credentials, setCredentials] =
    useState<CreatePlatformAdminResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setResult(
        await platformAdminApi.findUsers({
          page,
          limit: pageSize,
          search,
          status: status || undefined,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los usuarios",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUsers(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await platformAdminApi.createUser({
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        telefono: form.telefono || undefined,
      });
      setCredentials(response);
      setShowCreate(false);
      setForm(emptyForm);
      await loadUsers();
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear el usuario",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    currentStatus: PlatformAdminUserStatus,
  ) => {
    if (id === currentUser?.id) return;
    setOpenMenuId(null);

    const nextStatus = currentStatus === "activo" ? "inactivo" : "activo";
    const action = nextStatus === "activo" ? "activar" : "desactivar";
    if (!window.confirm(`¿Deseas ${action} este superadministrador?`)) return;

    setChangingId(id);
    setError(null);
    setMessage(null);
    try {
      await platformAdminApi.updateUserStatus(id, nextStatus);
      setMessage(
        `Usuario ${nextStatus === "activo" ? "activado" : "desactivado"} correctamente.`,
      );
      await loadUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar el usuario",
      );
    } finally {
      setChangingId(null);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(
      `Correo: ${credentials.user.email}\nContraseña temporal: ${credentials.temporaryPassword}`,
    );
    setCopied(true);
  };

  return (
    <DashboardShell headerTitle="Usuarios administradores">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            icon={<UsersThreeIcon size={22} weight="fill" />}
            label="Superadministradores"
            value={result.summary.total}
            color="#3b82f6"
          />
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Usuarios activos"
            value={result.summary.active}
            color="#10b981"
          />
          <MetricCard
            icon={<ProhibitIcon size={22} weight="fill" />}
            label="Usuarios sin acceso"
            value={result.summary.inactive}
            color="#ef4444"
          />
        </section>

        <section className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre o correo..."
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <NativeSelect
            value={status}
            aria-label="Filtrar por estado"
            onChange={(event) => {
              setStatus(event.target.value as "activo" | "inactivo" | "");
              setPage(1);
            }}
            className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-text)] outline-none sm:w-[180px]"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Sin acceso</option>
          </NativeSelect>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreate(true);
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white"
          >
            <UserPlusIcon size={17} weight="bold" />
            Nuevo usuario
          </button>
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={isLoading}
            title="Actualizar"
            aria-label="Actualizar usuarios"
            className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-[var(--color-input-bg)] text-[var(--color-text)] disabled:opacity-50"
          >
            <ArrowClockwiseIcon
              size={18}
              weight="bold"
              className={cn(isLoading && "animate-spin")}
            />
          </button>
        </section>

        {error ? (
          <div className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-xl bg-[#10b981]/10 px-4 py-3 text-sm text-[#059669]">
            {message}
          </div>
        ) : null}

        <section className="space-y-3 pb-2 pr-1">
          {isLoading && result.data.length === 0 ? (
            <LoadingRows />
          ) : result.data.length === 0 ? (
            <EmptyUsers />
          ) : (
            result.data.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === currentUser?.id}
                isChanging={changingId === user.id}
                menuOpen={openMenuId === user.id}
                onToggleMenu={() =>
                  setOpenMenuId(openMenuId === user.id ? null : user.id)
                }
                onStatusChange={() =>
                  void handleStatusChange(user.id, user.status)
                }
              />
            ))
          )}
        </section>

        <footer className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {result.data.length} de {result.meta.total} usuarios
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={isLoading || page <= 1}
              className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="grid size-8 place-items-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {page}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(result.meta.totalPages, value + 1))
              }
              disabled={isLoading || page >= result.meta.totalPages}
              className="h-8 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs text-[var(--color-text)] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-4 py-6 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-admin-title"
            className="w-full max-w-lg rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="create-admin-title"
                  className="text-lg font-circular-bold text-[var(--color-text)]"
                >
                  Nuevo superadministrador
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Tendrá acceso completo a la administración de la plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                title="Cerrar"
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]"
              >
                <XIcon size={17} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombres"
                  value={form.nombre}
                  onChange={(value) => setForm({ ...form, nombre: value })}
                  autoComplete="given-name"
                />
                <Field
                  label="Apellidos"
                  value={form.apellido}
                  onChange={(value) => setForm({ ...form, apellido: value })}
                  autoComplete="family-name"
                />
              </div>
              <Field
                label="Correo"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
                autoComplete="email"
              />
              <Field
                label="Celular (opcional)"
                type="tel"
                required={false}
                value={form.telefono}
                onChange={(value) => setForm({ ...form, telefono: value })}
                autoComplete="tel"
              />

              {createError ? (
                <p className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#ef4444]">
                  {createError}
                </p>
              ) : null}

              <div className="mt-1 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="h-10 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {credentials ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="credentials-title"
            className="w-full max-w-lg rounded-2xl bg-[var(--color-sidebar-bg)] p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#059669]">
              <CheckCircleIcon size={24} weight="fill" />
            </span>
            <h2
              id="credentials-title"
              className="mt-4 text-lg font-circular-bold text-[var(--color-text)]"
            >
              Usuario creado correctamente
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Comparte estas credenciales de forma segura. La contraseña se
              muestra solo en este momento.
            </p>

            <div className="mt-5 space-y-3 rounded-xl bg-[var(--color-input-bg)] p-4">
              <Credential label="Correo" value={credentials.user.email} />
              <Credential
                label="Contraseña temporal"
                value={credentials.temporaryPassword}
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void copyCredentials()}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold text-[var(--color-text)]"
              >
                <CopyIcon size={16} weight="bold" />
                {copied ? "Credenciales copiadas" : "Copiar credenciales"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCredentials(null);
                  setCopied(false);
                }}
                className="h-10 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">
            {value.toLocaleString("es-PE")}
          </p>
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  isChanging,
  menuOpen,
  onToggleMenu,
  onStatusChange,
}: {
  user: PlatformAdminUser;
  isSelf: boolean;
  isChanging: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onStatusChange: () => void;
}) {
  return (
    <article className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-shadow hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(180px,1.3fr)_minmax(200px,1.35fr)_minmax(115px,0.8fr)_minmax(150px,0.9fr)_minmax(100px,0.7fr)_32px] md:items-center md:gap-4 xl:gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar
          seed={user.id}
          name={user.name}
          size={40}
          className="size-10 ring-1 ring-[var(--color-border)]"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
            {user.name}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {isSelf ? "Tu cuenta" : "Administrador"}
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        <p className="flex min-w-0 items-center gap-2 text-xs text-[var(--color-text)]">
          <EnvelopeSimpleIcon
            size={14}
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <span className="truncate">{user.email}</span>
        </p>
        <p className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <PhoneIcon
            size={14}
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          {user.phone || "Sin telefono"}
        </p>
      </div>

      <div className="space-y-1">
        <p className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <CalendarIcon
            size={14}
            className="text-[var(--color-muted-foreground)]"
          />
          {formatDate(user.createdAt)}
        </p>
        <p className="flex items-center gap-2 text-xs text-[var(--color-text)]">
          <ClockIcon
            size={14}
            className="text-[var(--color-muted-foreground)]"
          />
          {formatTime(user.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs font-circular-bold text-[var(--color-text)]">
        <span className="grid size-8 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <ShieldCheckIcon size={17} weight="fill" />
        </span>
        Superadministrador
      </div>

      <div className="flex md:justify-center">
        <StatusBadge status={user.status} />
      </div>

      <div className="relative flex md:justify-end">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Mas opciones"
          className="grid size-8 place-items-center rounded-[8px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:opacity-35"
          disabled={isChanging}
        >
          <DotsThreeVerticalIcon
            size={20}
            weight="bold"
            className={cn(isChanging && "animate-pulse")}
          />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
            <button
              type="button"
              onClick={onStatusChange}
              disabled={isSelf || isChanging}
              title={
                isSelf ? "No puedes desactivar tu propia cuenta" : undefined
              }
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40",
                user.status === "activo" ? "text-[#ef4444]" : "text-[#10b981]",
              )}
            >
              <PowerIcon size={16} weight="bold" />
              {user.status === "activo"
                ? "Desactivar acceso"
                : "Activar acceso"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel";
  required?: boolean;
  autoComplete: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm text-[var(--color-text)]">
      <span className="font-circular-bold">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        minLength={required ? 2 : undefined}
        maxLength={type === "email" ? 180 : type === "tel" ? 30 : 100}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: PlatformAdminUserStatus }) {
  const values = {
    activo: ["Activo", "bg-[#10b981]/10 text-[#059669]"],
    inactivo: ["Sin acceso", "bg-[#ef4444]/10 text-[#ef4444]"],
    bloqueado: ["Bloqueado", "bg-[#f59e0b]/10 text-[#d97706]"],
  } as const;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-circular-bold",
        values[status][1],
      )}
    >
      {values[status][0]}
    </span>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-[var(--color-text)]">
        {value}
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)]"
        >
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-[var(--color-input-bg)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-[var(--color-input-bg)]" />
              <div className="h-3 w-48 rounded bg-[var(--color-input-bg)]" />
            </div>
            <div className="h-4 w-20 rounded bg-[var(--color-input-bg)]" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyUsers() {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
      <div className="text-center">
        <UsersThreeIcon
          size={48}
          weight="light"
          className="mx-auto text-[var(--color-muted-foreground)]"
        />
        <p className="mt-3 text-sm font-circular-bold text-[var(--color-text)]">
          No se encontraron usuarios
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Ajusta los filtros o crea un nuevo superadministrador
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

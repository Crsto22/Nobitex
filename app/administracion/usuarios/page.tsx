"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserCircleIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  BuildingsIcon,
  EyeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { UserAvatar } from "@/components/UserAvatar/user-avatar";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import {
  usersApi,
  type CompanyUser,
  type UserStatus,
} from "@/lib/api/users";

const pageSize = defaultPageSize;

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
  bloqueado: { label: "Bloqueado", bg: "bg-[#ef4444]", text: "text-white" },
};

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
  { label: "Bloqueado", value: "bloqueado" },
];

type StatusFilter = "todos" | UserStatus;

export default function UsuariosPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
    adminTotal: 0,
    salesTotal: 0,
    warehouseTotal: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workingUserId, setWorkingUserId] = useState("");
  const [deleteUser, setDeleteUser] = useState<CompanyUser | null>(null);

  const loadUsers = useCallback(async () => {
    return usersApi.findAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      estado: selectedStatus === "todos" ? undefined : selectedStatus,
    });
  }, [currentPage, searchTerm, selectedStatus]);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      loadUsers()
        .then((response) => {
          if (!isMounted) return;
          setUsers(response.data);
          setMeta(response.meta);
        })
        .catch((error) => {
          if (!isMounted) return;
          showToast({
            title: "Error al cargar usuarios",
            description:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar usuarios.",
            variant: "error",
          });
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadUsers, showToast]);

  const handleStatusToggle = async (user: CompanyUser) => {
    if (user.isOwner || workingUserId) return;

    const nextStatus = user.estado === "activo" ? "inactivo" : "activo";
    setWorkingUserId(user.empresaUsuarioId);

    try {
      await usersApi.updateStatus(user.empresaUsuarioId, nextStatus);
      const response = await loadUsers();
      setUsers(response.data);
      setMeta(response.meta);
      showToast({
        title: nextStatus === "activo" ? "Usuario activado" : "Usuario desactivado",
        description: `${user.nombre} fue actualizado.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setWorkingUserId("");
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUser || deleteUser.isOwner || workingUserId) return;

    setWorkingUserId(deleteUser.empresaUsuarioId);

    try {
      await usersApi.remove(deleteUser.empresaUsuarioId);
      const response = await loadUsers();
      setUsers(response.data);
      setMeta(response.meta);
      showToast({
        title: "Usuario eliminado",
        description: `${deleteUser.nombre} fue eliminado.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo eliminar",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setWorkingUserId("");
      setDeleteUser(null);
    }
  };

  return (
    <DashboardShell headerTitle="Usuarios del Sistema">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<UserCircleIcon size={22} weight="fill" />} label="Total Usuarios" value={meta.total} tone="primary" />
          <MetricCard icon={<CheckCircleIcon size={22} weight="fill" />} label="Activos" value={meta.activeTotal} tone="success" />
          <MetricCard icon={<WarningCircleIcon size={22} weight="fill" />} label="Inactivos" value={meta.inactiveTotal} tone="warning" />
          <MetricCard icon={<ShieldCheckIcon size={22} weight="fill" />} label="Superadmins" value={users.filter((user) => user.isOwner).length} tone="danger" />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email o celular..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <DropdownFilter
            value={selectedStatus}
            label={
              selectedStatus === "todos"
                ? "Estado"
                : statusConfig[selectedStatus].label
            }
            options={statusOptions}
            isOpen={isStatusOpen}
            onToggle={() => setIsStatusOpen(!isStatusOpen)}
            onSelect={(value) => {
              setSelectedStatus(value as StatusFilter);
              setCurrentPage(1);
              setIsStatusOpen(false);
            }}
          />

          <button
            type="button"
            onClick={() => router.push("/administracion/usuarios/nuevo")}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white transition-colors hover:bg-[var(--color-primary)]/90"
          >
            <PlusIcon size={16} weight="bold" />
            Nuevo Usuario
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 pb-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
            <div className="text-center">
              <UserCircleIcon size={48} weight="light" className="mx-auto text-[var(--color-muted-foreground)]" />
              <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                No se encontraron usuarios
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Crea un usuario o ajusta los filtros.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {users.map((user) => (
              <UserRow
                key={user.empresaUsuarioId}
                user={user}
                isWorking={workingUserId === user.empresaUsuarioId}
                onEdit={() =>
                  router.push(
                    `/administracion/usuarios/${user.empresaUsuarioId}/editar`,
                  )
                }
                onStatusToggle={() => handleStatusToggle(user)}
                onDelete={() => setDeleteUser(user)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {users.length} de {meta.total} usuarios
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {meta.page}
            </span>
            <button
              type="button"
              disabled={currentPage >= meta.totalPages || isLoading}
              onClick={() =>
                setCurrentPage((page) => Math.min(meta.totalPages, page + 1))
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteUser !== null}
        onClose={() => setDeleteUser(null)}
        onConfirm={confirmDeleteUser}
        title="Eliminar usuario"
        description="Seguro que deseas eliminar este usuario? Esta accion no se puede deshacer."
        itemName={
          deleteUser
            ? [deleteUser.nombre, deleteUser.apellido].filter(Boolean).join(" ") ||
              deleteUser.email
            : undefined
        }
      />
    </DashboardShell>
  );
}

function UserRow({
  user,
  isWorking,
  onEdit,
  onStatusToggle,
  onDelete,
}: {
  user: CompanyUser;
  isWorking: boolean;
  onEdit: () => void;
  onStatusToggle: () => void;
  onDelete: () => void;
}) {
  const status = statusConfig[user.estado];
  const fullName = [user.nombre, user.apellido].filter(Boolean).join(" ");
  const displayedModules = user.isOwner
    ? [{ key: "all", label: "Todos los modulos", route: "" }]
    : user.modules.slice(0, 4);
  const hiddenModuleCount = user.isOwner
    ? 0
    : Math.max(0, user.modules.length - displayedModules.length);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[1.1fr_1fr_1.2fr_0.55fr_0.55fr_0.5fr] md:items-center md:gap-3 xl:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar
          seed={user.id}
          name={fullName || user.email}
          size={40}
          className="size-10 ring-1 ring-[var(--color-border)]"
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-black text-[var(--color-text)]">
              {fullName || user.email}
            </p>
            {user.isOwner ? (
              <span className="shrink-0 rounded-full bg-[#ef4444]/10 px-2 py-0.5 text-[10px] font-circular-bold text-[#ef4444]">
                Superadmin
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] font-circular-regular">
            USR-{user.id.padStart(3, "0")}
            {user.telefono ? ` - ${user.telefono}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-input-bg)] px-1.5 py-0.5 text-[10px] text-[var(--color-text)]">
              <BuildingsIcon size={11} />
              {user.sucursal?.nombre ?? "Todas las sucursales"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-input-bg)] px-1.5 py-0.5 text-[10px] text-[var(--color-text)]">
              <EyeIcon size={11} />
              {user.visibilidadOperaciones === "propias" ? "Solo propias" : "Todas"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <EnvelopeIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
        <span className="truncate text-sm text-[var(--color-text)] font-circular-regular">
          {user.email}
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap gap-1.5">
        {displayedModules.map((module) => (
          <span
            key={module.key}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[var(--color-input-bg)] px-2.5 py-1 text-xs font-circular-bold text-[var(--color-text)]"
          >
            <UsersThreeIcon size={13} weight="fill" />
            <span className="truncate">{module.label}</span>
          </span>
        ))}
        {hiddenModuleCount > 0 ? (
          <span className="rounded-lg bg-[var(--color-input-bg)] px-2.5 py-1 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
            +{hiddenModuleCount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Creado
        </p>
        <p className="text-xs font-circular-bold text-[var(--color-text)] font-circular-regular">
          {formatDate(user.createdAt)}
        </p>
      </div>

      <div className="flex md:justify-center">
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

      <div className="flex items-center gap-1 md:justify-end">
        <IconButton
          label="Editar"
          disabled={isWorking || user.isOwner}
          onClick={onEdit}
        >
          <PencilSimpleIcon size={16} />
        </IconButton>
        <IconButton
          label={user.estado === "activo" ? "Desactivar" : "Activar"}
          disabled={isWorking || user.isOwner}
          onClick={onStatusToggle}
        >
          <PowerIcon size={16} />
        </IconButton>
        <IconButton
          label="Eliminar"
          disabled={isWorking || user.isOwner}
          onClick={onDelete}
          danger
        >
          <TrashIcon size={16} />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
  danger = false,
}: {
  label: string;
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "text-[#ef4444]" : "text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    warning: "bg-[#f59e0b]/10 text-[#d97706]",
    danger: "bg-[#ef4444]/10 text-[#ef4444]",
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
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DropdownFilter({
  value,
  label,
  options,
  isOpen,
  onToggle,
  onSelect,
}: {
  value: string;
  label: string;
  options: { label: string; value: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-[160px]">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
      >
        <span className="truncate">{label}</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                value === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  CaretDownIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  EnvelopeIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashSimpleIcon,
  UserCircleIcon,
  UserGearIcon,
  UserListIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { cn } from "@/lib/utils";

const usuarios = [
  {
    id: "USR-001",
    name: "Juan Pérez",
    email: "juan.perez@empresa.com",
    role: "administrador",
    status: "active",
    lastAccess: "17/05/2026 10:30 AM",
    sucursal: "Principal",
  },
  {
    id: "USR-002",
    name: "Maria Garcia",
    email: "maria.garcia@empresa.com",
    role: "vendedor",
    status: "active",
    lastAccess: "17/05/2026 09:15 AM",
    sucursal: "Sucursal Norte",
  },
  {
    id: "USR-003",
    name: "Carlos Rodriguez",
    email: "carlos.rodriguez@empresa.com",
    role: "almacen",
    status: "active",
    lastAccess: "16/05/2026 04:20 PM",
    sucursal: "Almacén Central",
  },
  {
    id: "USR-004",
    name: "Ana Torres",
    email: "ana.torres@empresa.com",
    role: "vendedor",
    status: "inactive",
    lastAccess: "10/05/2026 11:00 AM",
    sucursal: "Sucursal Sur",
  },
  {
    id: "USR-005",
    name: "Roberto Diaz",
    email: "roberto.diaz@empresa.com",
    role: "administrador",
    status: "active",
    lastAccess: "17/05/2026 08:45 AM",
    sucursal: "Principal",
  },
  {
    id: "USR-006",
    name: "Lucia Mendoza",
    email: "lucia.mendoza@empresa.com",
    role: "almacen",
    status: "active",
    lastAccess: "15/05/2026 02:30 PM",
    sucursal: "Almacén Central",
  },
];

const roleConfig = {
  administrador: { label: "Administrador", icon: ShieldCheckIcon, bg: "bg-[#ef4444]/10", text: "text-[#ef4444]" },
  vendedor: { label: "Vendedor", icon: UserListIcon, bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]" },
  almacen: { label: "Almacén", icon: UserGearIcon, bg: "bg-[#f59e0b]/10", text: "text-[#d97706]" },
};

const statusConfig = {
  active: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactive: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

export default function UsuariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("todos");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredUsuarios = usuarios.filter((usuario) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      usuario.name.toLowerCase().includes(normalizedSearch) ||
      usuario.email.toLowerCase().includes(normalizedSearch) ||
      usuario.id.toLowerCase().includes(normalizedSearch) ||
      usuario.sucursal.toLowerCase().includes(normalizedSearch);

    const matchesRole = selectedRole === "todos" || usuario.role === selectedRole;
    const matchesStatus = selectedStatus === "todos" || usuario.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const summary = useMemo(() => {
    const activos = filteredUsuarios.filter((u) => u.status === "active").length;
    const inactivos = filteredUsuarios.filter((u) => u.status === "inactive").length;
    const admins = filteredUsuarios.filter((u) => u.role === "administrador").length;

    return { total: filteredUsuarios.length, activos, inactivos, admins };
  }, [filteredUsuarios]);

  return (
    <DashboardShell headerTitle="Usuarios del Sistema">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <UserCircleIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Usuarios
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.total}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <CheckCircleIcon size={22} weight="fill" className="text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Activos
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.activos}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6b7280]/10">
                <WarningCircleIcon size={22} weight="fill" className="text-[#6b7280]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Inactivos
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.inactivos}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ef4444]/10">
                <ShieldCheckIcon size={22} weight="fill" className="text-[#ef4444]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Administradores
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.admins}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email, ID o sucursal..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-full sm:w-[160px]">
            <button
              type="button"
              onClick={() => {
                setIsRoleOpen(!isRoleOpen);
                setIsStatusOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedRole === "todos"
                  ? "Rol"
                  : roleConfig[selectedRole as keyof typeof roleConfig]?.label}
              </span>
              <CaretDownIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
            {isRoleOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Administrador", value: "administrador" },
                  { label: "Vendedor", value: "vendedor" },
                  { label: "Almacén", value: "almacen" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedRole(option.value);
                      setIsRoleOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedRole === option.value
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-[160px]">
            <button
              type="button"
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsRoleOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedStatus === "todos"
                  ? "Estado"
                  : statusConfig[selectedStatus as keyof typeof statusConfig]?.label}
              </span>
              <CaretDownIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
            {isStatusOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Activo", value: "active" },
                  { label: "Inactivo", value: "inactive" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setIsStatusOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedStatus === option.value
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary)]/90"
          >
            <PlusIcon size={16} weight="bold" />
            Nuevo Usuario
          </button>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {filteredUsuarios.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <UserCircleIcon size={48} weight="light" className="mx-auto text-[var(--color-muted-foreground)]" />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron usuarios
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            filteredUsuarios.map((usuario) => {
              const role = roleConfig[usuario.role as keyof typeof roleConfig];
              const RoleIcon = role.icon;
              const status = statusConfig[usuario.status as keyof typeof statusConfig];

              return (
                <div
                  key={usuario.id}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr_40px] md:items-center md:gap-3 xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
                      <UserCircleIcon size={28} weight="fill" className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {usuario.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {usuario.id} - {usuario.sucursal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <EnvelopeIcon size={16} className="text-[var(--color-muted-foreground)]" />
                    <span className="truncate text-sm text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                      {usuario.email}
                    </span>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold",
                        role.bg,
                        role.text,
                      )}
                    >
                      <RoleIcon size={14} weight="fill" />
                      {role.label}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">
                      Último acceso
                    </p>
                    <p className="text-xs font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                      {usuario.lastAccess}
                    </p>
                  </div>

                  <div className="flex md:justify-center">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                        status.bg,
                        status.text,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="relative flex items-center md:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(openMenuId === usuario.id ? null : usuario.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === usuario.id && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <EyeIcon size={16} weight="bold" />
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <PencilSimpleIcon size={16} weight="bold" />
                          Editar usuario
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#ef4444] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <TrashSimpleIcon size={16} weight="bold" />
                          Eliminar usuario
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled
            >
              Anterior
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-bold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  CaretDownIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PlusIcon,
  StorefrontIcon,
  TrashSimpleIcon,
  UserFocusIcon,
  WarningCircleIcon,
  WarehouseIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { cn } from "@/lib/utils";

const sucursales = [
  {
    id: "SUC-001",
    name: "Sede Principal",
    type: "tienda",
    address: "Av. Javier Prado 1200, San Isidro",
    city: "Lima",
    employees: 12,
    status: "active",
    updated: "17/05/2026",
  },
  {
    id: "SUC-002",
    name: "Almacén Central",
    type: "almacen",
    address: "Calle Los Olivos 456, Independencia",
    city: "Lima",
    employees: 8,
    status: "active",
    updated: "16/05/2026",
  },
  {
    id: "SUC-003",
    name: "Sucursal Norte",
    type: "tienda",
    address: "Av. America 789, Trujillo",
    city: "La Libertad",
    employees: 6,
    status: "active",
    updated: "15/05/2026",
  },
  {
    id: "SUC-004",
    name: "Almacén Sur",
    type: "almacen",
    address: "Jr. Balta 234, Chiclayo",
    city: "Lambayeque",
    employees: 4,
    status: "inactive",
    updated: "10/05/2026",
  },
  {
    id: "SUC-005",
    name: "Sucursal Arequipa",
    type: "tienda",
    address: "Calle Mercaderes 456, Cercado",
    city: "Arequipa",
    employees: 5,
    status: "active",
    updated: "14/05/2026",
  },
  {
    id: "SUC-006",
    name: "Almacén Piura",
    type: "almacen",
    address: "Av. Grau 567, Piura",
    city: "Piura",
    employees: 3,
    status: "active",
    updated: "13/05/2026",
  },
];

const typeConfig = {
  tienda: { label: "Tienda", icon: StorefrontIcon, bg: "bg-[#3b82f6]/10", text: "text-[#3b82f6]" },
  almacen: { label: "Almacén", icon: WarehouseIcon, bg: "bg-[#f59e0b]/10", text: "text-[#d97706]" },
};

const statusConfig = {
  active: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactive: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

export default function SucursalesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("todos");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredSucursales = sucursales.filter((sucursal) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      sucursal.name.toLowerCase().includes(normalizedSearch) ||
      sucursal.address.toLowerCase().includes(normalizedSearch) ||
      sucursal.city.toLowerCase().includes(normalizedSearch) ||
      sucursal.id.toLowerCase().includes(normalizedSearch);

    const matchesType = selectedType === "todos" || sucursal.type === selectedType;
    const matchesStatus = selectedStatus === "todos" || sucursal.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const summary = useMemo(() => {
    const activos = filteredSucursales.filter((s) => s.status === "active").length;
    const inactivos = filteredSucursales.filter((s) => s.status === "inactive").length;
    const tiendas = filteredSucursales.filter((s) => s.type === "tienda").length;
    const almacenes = filteredSucursales.filter((s) => s.type === "almacen").length;

    return { total: filteredSucursales.length, activos, inactivos, tiendas, almacenes };
  }, [filteredSucursales]);

  return (
    <DashboardShell headerTitle="Sucursales">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <StorefrontIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Sucursales
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
                  Activas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.activos}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <StorefrontIcon size={22} weight="fill" className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Tiendas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.tiendas}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                <WarehouseIcon size={22} weight="fill" className="text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Almacenes
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {summary.almacenes}
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
              placeholder="Buscar por sucursal, dirección o ciudad..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="relative w-full sm:w-[160px]">
            <button
              type="button"
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsStatusOpen(false);
              }}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedType === "todos"
                  ? "Tipo"
                  : typeConfig[selectedType as keyof typeof typeConfig]?.label}
              </span>
              <CaretDownIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
            {isTypeOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {[
                  { label: "Todos", value: "todos" },
                  { label: "Tienda", value: "tienda" },
                  { label: "Almacén", value: "almacen" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedType(option.value);
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedType === option.value
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
                setIsTypeOpen(false);
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
            Nueva Sucursal
          </button>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {filteredSucursales.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                <StorefrontIcon size={48} weight="light" className="mx-auto text-[var(--color-muted-foreground)]" />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No se encontraron sucursales
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de busqueda
                </p>
              </div>
            </div>
          ) : (
            filteredSucursales.map((sucursal) => {
              const type = typeConfig[sucursal.type as keyof typeof typeConfig];
              const TypeIcon = type.icon;
              const status = statusConfig[sucursal.status as keyof typeof statusConfig];

              return (
                <div
                  key={sucursal.id}
                  className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[1.2fr_0.8fr_1.2fr_0.7fr_0.7fr_40px] md:items-center md:gap-3 xl:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                      <StorefrontIcon size={20} weight="fill" className="text-[var(--color-primary)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {sucursal.name}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                        {sucursal.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold",
                        type.bg,
                        type.text,
                      )}
                    >
                      <TypeIcon size={14} weight="fill" />
                      {type.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPinIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
                    <span className="truncate text-sm text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                      {sucursal.address}, {sucursal.city}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                        Empleados
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {sucursal.employees}
                      </p>
                    </div>
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
                        setOpenMenuId(openMenuId === sucursal.id ? null : sucursal.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                      aria-label="Mas opciones"
                    >
                      <DotsThreeVerticalIcon size={20} weight="bold" />
                    </button>
                    {openMenuId === sucursal.id && (
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <UserFocusIcon size={16} weight="bold" />
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <PencilSimpleIcon size={16} weight="bold" />
                          Editar sucursal
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(null)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#ef4444] transition-colors hover:bg-[var(--color-button-hover)]"
                        >
                          <TrashSimpleIcon size={16} weight="bold" />
                          Eliminar sucursal
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
            Mostrando {filteredSucursales.length} de {sucursales.length} sucursales
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

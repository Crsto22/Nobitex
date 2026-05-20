"use client";

import { useState } from "react";
import {
  CaretDownIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusIcon,
  RulerIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

const sizes = [
  { id: "TAL-001", name: "XS", group: "Ropa", products: 8, order: 1, status: "active" },
  { id: "TAL-002", name: "S", group: "Ropa", products: 18, order: 2, status: "active" },
  { id: "TAL-003", name: "M", group: "Ropa", products: 27, order: 3, status: "active" },
  { id: "TAL-004", name: "L", group: "Ropa", products: 21, order: 4, status: "active" },
  { id: "TAL-005", name: "XL", group: "Ropa", products: 11, order: 5, status: "active" },
  { id: "TAL-006", name: "42", group: "Calzado", products: 7, order: 6, status: "active" },
  { id: "TAL-007", name: "U", group: "Unica", products: 15, order: 7, status: "inactive" },
];

const statusConfig = {
  active: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactive: { label: "Inactivo", bg: "bg-[#ef4444]", text: "text-white" },
};

export default function CatalogoTallasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("todos");
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const groups = [
    { label: "Todos", value: "todos" },
    { label: "Ropa", value: "Ropa" },
    { label: "Calzado", value: "Calzado" },
    { label: "Unica", value: "Unica" },
  ];

  const filteredSizes = sizes.filter((size) => {
    const matchesSearch =
      searchTerm === "" ||
      size.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      size.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
      size.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGroup = selectedGroup === "todos" || size.group === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  const activeCount = sizes.filter((size) => size.status === "active").length;
  const productCount = sizes.reduce((sum, size) => sum + size.products, 0);

  return (
    <DashboardShell headerTitle="Tallas">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid shrink-0 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <RulerIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Tallas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {sizes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <RulerIcon size={22} weight="fill" className="text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Activas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {activeCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <PackageIcon size={22} weight="fill" className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Productos Asignados
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {productCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar por talla, grupo o codigo..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <div className="relative w-full sm:w-[180px]">
            <button
              type="button"
              onClick={() => setIsGroupOpen(!isGroupOpen)}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {groups.find((group) => group.value === selectedGroup)?.label ?? "Todos"}
              </span>
              <CaretDownIcon size={16} className="shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
            {isGroupOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                {groups.map((group) => (
                  <button
                    key={group.value}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(group.value);
                      setIsGroupOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                      selectedGroup === group.value
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
          >
            <PlusIcon size={18} weight="bold" />
            Nueva Talla
          </button>
        </div>

        <div className="grid gap-3 pb-2">
          {filteredSizes.map((size) => {
            const status = statusConfig[size.status as keyof typeof statusConfig];

            return (
              <div
                key={size.id}
                className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(180px,1.3fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(110px,0.7fr)_40px] md:items-center md:gap-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] text-lg font-black text-white [font-family:var(--font-circular-x-sub)]">
                    {size.name}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-text)]">
                      Talla {size.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                      {size.id}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    Grupo
                  </p>
                  <p className="text-sm font-bold text-[var(--color-text)]">
                    {size.group}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    Productos
                  </p>
                  <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                    {size.products}
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

                <div className="relative flex md:justify-end">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === size.id ? null : size.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                    aria-label="Mas opciones"
                  >
                    <DotsThreeVerticalIcon size={20} weight="bold" />
                  </button>
                  {openMenuId === size.id && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                      <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]">
                        <PencilSimpleIcon size={16} weight="bold" />
                        Editar
                      </button>
                      <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#ef4444] hover:bg-[var(--color-button-hover)]">
                        <TrashIcon size={16} weight="bold" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filteredSizes.length} de {sizes.length} tallas
          </p>
          <div className="flex items-center gap-2">
            <button className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] opacity-40">
              Anterior
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-bold text-white">
              1
            </button>
            <button className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

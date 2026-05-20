"use client";

import { useState } from "react";
import {
  CaretDownIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PaletteIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

const colors = [
  { id: "COL-001", name: "Rosado", hex: "#ec4899", products: 10, status: "active" },
  { id: "COL-002", name: "Negro", hex: "#1f2937", products: 14, status: "active" },
  { id: "COL-003", name: "Azul", hex: "#3b82f6", products: 9, status: "active" },
  { id: "COL-004", name: "Blanco", hex: "#e5e7eb", products: 12, status: "active" },
  { id: "COL-005", name: "Rojo", hex: "#ef4444", products: 7, status: "active" },
  { id: "COL-006", name: "Verde", hex: "#10b981", products: 11, status: "active" },
  { id: "COL-007", name: "Naranja", hex: "#f97316", products: 5, status: "inactive" },
  { id: "COL-008", name: "Morado", hex: "#8b5cf6", products: 4, status: "active" },
];

const statusConfig = {
  active: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactive: { label: "Inactivo", bg: "bg-[#ef4444]", text: "text-white" },
};

export default function CatalogoColoresPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredColors = colors.filter((color) => {
    const matchesSearch =
      searchTerm === "" ||
      color.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      color.hex.toLowerCase().includes(searchTerm.toLowerCase()) ||
      color.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "todos" || color.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const activeCount = colors.filter((color) => color.status === "active").length;
  const productCount = colors.reduce((sum, color) => sum + color.products, 0);

  return (
    <DashboardShell headerTitle="Colores">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid shrink-0 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <PaletteIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Colores
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {colors.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <PaletteIcon size={22} weight="fill" className="text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Activos
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
              placeholder="Buscar por color, hex o codigo..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <div className="relative w-full sm:w-[180px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <span className="truncate">
                {selectedStatus === "todos"
                  ? "Todos"
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
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
          >
            <PlusIcon size={18} weight="bold" />
            Nuevo Color
          </button>
        </div>

        <div className="grid gap-3 pb-2 sm:grid-cols-2 xl:grid-cols-3">
          {filteredColors.map((color) => {
            const status = statusConfig[color.status as keyof typeof statusConfig];

            return (
              <div
                key={color.id}
                className="relative rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-14 w-14 shrink-0 rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {color.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {color.id} - {color.hex}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === color.id ? null : color.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                    aria-label="Mas opciones"
                  >
                    <DotsThreeVerticalIcon size={20} weight="bold" />
                  </button>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      Productos
                    </p>
                    <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                      {color.products}
                    </p>
                  </div>
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

                {openMenuId === color.id && (
                  <div className="absolute right-4 top-14 z-20 w-40 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
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
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filteredColors.length} de {colors.length} colores
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

"use client";

import { useState } from "react";
import {
  CaretDownIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

const marcas = [
  {
    id: "MAR-001",
    name: "Nike",
    slug: "nike",
    products: 42,
    status: "active",
    color: "#111111",
    updated: "17/05/2026",
  },
  {
    id: "MAR-002",
    name: "Adidas",
    slug: "adidas",
    products: 38,
    status: "active",
    color: "#000000",
    updated: "16/05/2026",
  },
  {
    id: "MAR-003",
    name: "Puma",
    slug: "puma",
    products: 25,
    status: "active",
    color: "#e4002b",
    updated: "15/05/2026",
  },
  {
    id: "MAR-004",
    name: "Reebok",
    slug: "reebok",
    products: 19,
    status: "active",
    color: "#d4002a",
    updated: "14/05/2026",
  },
  {
    id: "MAR-005",
    name: "Under Armour",
    slug: "under-armour",
    products: 15,
    status: "active",
    color: "#1d428a",
    updated: "13/05/2026",
  },
  {
    id: "MAR-006",
    name: "New Balance",
    slug: "new-balance",
    products: 8,
    status: "inactive",
    color: "#cf0a2c",
    updated: "12/05/2026",
  },
];

const statusConfig = {
  active: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactive: { label: "Inactivo", bg: "bg-[#ef4444]", text: "text-white" },
};

export default function CatalogoMarcasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredMarcas = marcas.filter((marca) => {
    const matchesSearch =
      searchTerm === "" ||
      marca.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      marca.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      marca.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "todos" || marca.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const activeCount = marcas.filter((marca) => marca.status === "active").length;
  const productCount = marcas.reduce((sum, marca) => sum + marca.products, 0);

  return (
    <DashboardShell headerTitle="Marcas">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid shrink-0 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <TagIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Marcas
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {marcas.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <TagIcon size={22} weight="fill" className="text-[#10b981]" />
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
              placeholder="Buscar por marca, slug o codigo..."
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
            Nueva Marca
          </button>
        </div>

        <div className="grid gap-3 pb-2">
          {filteredMarcas.map((marca) => {
            const status = statusConfig[marca.status as keyof typeof statusConfig];

            return (
              <div
                key={marca.id}
                className="grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] md:grid-cols-[minmax(180px,1.4fr)_minmax(130px,0.8fr)_minmax(110px,0.7fr)_minmax(110px,0.7fr)_40px] md:items-center md:gap-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: marca.color }}
                  >
                    <TagIcon size={22} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-text)]">
                      {marca.name}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                      {marca.id} - {marca.slug}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    Productos
                  </p>
                  <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                    {marca.products}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    Actualizado
                  </p>
                  <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                    {marca.updated}
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
                    onClick={() =>
                      setOpenMenuId(openMenuId === marca.id ? null : marca.id)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                    aria-label="Mas opciones"
                  >
                    <DotsThreeVerticalIcon size={20} weight="bold" />
                  </button>
                  {openMenuId === marca.id && (
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
            Mostrando {filteredMarcas.length} de {marcas.length} marcas
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

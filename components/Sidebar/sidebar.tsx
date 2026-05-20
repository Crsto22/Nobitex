"use client";

import { useMemo, useSyncExternalStore } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import {
  ChartPieSliceIcon,
  ChartBarIcon,
  CalendarBlankIcon,
  CreditCardIcon,
  CubeIcon,
  FileTextIcon,
  GearSixIcon,
  IdentificationBadgeIcon,
  ListBulletsIcon,
  MinusCircleIcon,
  PackageIcon,
  PaletteIcon,
  PlusCircleIcon,
  PresentationChartIcon,
  ReceiptIcon,
  RulerIcon,
  ShoppingCartIcon,
  SquaresFourIcon,
  StackIcon,
  TagIcon,
  TruckIcon,
  UploadSimpleIcon,
  UserCircleIcon,
  SignOutIcon,
  UsersThreeIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

type SidebarChild = {
  label: string;
  icon: Icon;
  active?: boolean;
  route?: string;
};

type SidebarSection = {
  label: string;
  icon: Icon;
  active?: boolean;
  direct?: boolean;
  route?: string;
  children: SidebarChild[];
};

const sidebarSections: SidebarSection[] = [
  {
    label: "Dashboard",
    icon: SquaresFourIcon,
    active: true,
    direct: true,
    route: "/dashboard",
    children: [],
  },
  {
    label: "Operaciones",
    icon: ShoppingCartIcon,
    children: [
      { label: "Ventas POS", icon: ShoppingCartIcon, route: "/ventas" },
      { label: "Cotizaciones", icon: FileTextIcon, route: "/cotizaciones" },
      { label: "Clientes", icon: UsersThreeIcon, route: "/clientes" },
    ],
  },
  {
    label: "Historial",
    icon: ReceiptIcon,
    children: [
      { label: "Historial de ventas", icon: ReceiptIcon, route: "/historial/ventas" },
      { label: "Historial cotizaciones", icon: FileTextIcon, route: "/historial/cotizaciones" },
    ],
  },
  {
    label: "Facturacion",
    icon: FileTextIcon,
    children: [
      { label: "Comprobantes", icon: ReceiptIcon, route: "/facturacion/comprobantes" },
      { label: "Nota de credito", icon: FileTextIcon, route: "/facturacion/nota-credito" },
      { label: "Series", icon: ListBulletsIcon, route: "/facturacion/series" },
    ],
  },
  {
    label: "GRE",
    icon: TruckIcon,
    children: [
      { label: "GRE Remitente", icon: TruckIcon, route: "/gre/remitente" },
      { label: "Conductores", icon: UserCircleIcon, route: "/gre/conductores" },
    ],
  },
  {
    label: "Catalogo",
    icon: ListBulletsIcon,
    children: [
      { label: "Productos", icon: CubeIcon, route: "/catalogo/productos" },
      { label: "Ofertas", icon: TagIcon, route: "/catalogo/ofertas" },
      { label: "Carga masiva", icon: UploadSimpleIcon, route: "/catalogo/carga-masiva" },
      { label: "Categorias", icon: PackageIcon, route: "/catalogo/categorias" },
      { label: "Marcas", icon: TagIcon, route: "/catalogo/marcas" },
      { label: "Tallas", icon: RulerIcon, route: "/catalogo/tallas" },
      { label: "Colores", icon: PaletteIcon, route: "/catalogo/colores" },
    ],
  },
  {
    label: "Stock",
    icon: PackageIcon,
    children: [
      { label: "Movimientos", icon: StackIcon, route: "/stock/movimientos" },
      { label: "Traspasos", icon: SignOutIcon, route: "/stock/traspasos" },
    ],
  },
  {
    label: "Reportes",
    icon: PresentationChartIcon,
    children: [
      { label: "Ventas", icon: ChartBarIcon, route: "/reportes/ventas" },
      { label: "Productos", icon: FileTextIcon, route: "/reportes/productos" },
      { label: "Clientes", icon: ChartPieSliceIcon, route: "/reportes/clientes" },
      { label: "Usuarios", icon: PresentationChartIcon, route: "/reportes/usuarios" },
    ],
  },
  {
    label: "Administracion",
    icon: IdentificationBadgeIcon,
    children: [
      { label: "Sucursales", icon: IdentificationBadgeIcon, route: "/administracion/sucursales" },
      { label: "Turnos", icon: CalendarBlankIcon, route: "/administracion/turnos" },
      { label: "Usuarios", icon: WrenchIcon, route: "/administracion/usuarios" },
    ],
  },
  {
    label: "Configuracion",
    icon: GearSixIcon,
    children: [
      { label: "Empresa", icon: GearSixIcon, route: "/configuracion/empresa" },
      { label: "Mi cuenta", icon: UserCircleIcon, route: "/configuracion/mi-cuenta" },
      { label: "Metodos de pago", icon: CreditCardIcon, route: "/configuracion/metodos-pago" },
    ],
  },
];

const SIDEBAR_EXPANDED_SECTIONS_STORAGE_KEY = "sidebar-expanded-sections";
const SIDEBAR_EXPANDED_SECTIONS_CHANGE_EVENT =
  "sidebar-expanded-sections-change";
const defaultExpandedSections = sidebarSections.map((section) => section.label);
const defaultExpandedSectionsSnapshot = JSON.stringify(defaultExpandedSections);
const sectionLabels = new Set(defaultExpandedSections);

type SidebarProps = {
  className?: string;
  collapsed?: boolean;
};

function parseExpandedSectionsSnapshot(snapshot: string | null) {
  try {
    const parsed = snapshot ? JSON.parse(snapshot) : defaultExpandedSections;
    if (!Array.isArray(parsed)) {
      return defaultExpandedSections;
    }

    return parsed.filter(
      (value): value is string =>
        typeof value === "string" && sectionLabels.has(value),
    );
  } catch {
    return defaultExpandedSections;
  }
}

function syncExpandedSectionsAttribute(expandedSections: string[]) {
  document.documentElement.dataset.sidebarExpandedSections =
    expandedSections.join(" ");
}

function getExpandedSectionsSnapshot() {
  return (
    localStorage.getItem(SIDEBAR_EXPANDED_SECTIONS_STORAGE_KEY) ??
    defaultExpandedSectionsSnapshot
  );
}

function getServerExpandedSectionsSnapshot() {
  return defaultExpandedSectionsSnapshot;
}

function subscribeToExpandedSections(onStoreChange: () => void) {
  const handleChange = () => {
    syncExpandedSectionsAttribute(
      parseExpandedSectionsSnapshot(getExpandedSectionsSnapshot()),
    );
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(SIDEBAR_EXPANDED_SECTIONS_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(
      SIDEBAR_EXPANDED_SECTIONS_CHANGE_EVENT,
      handleChange,
    );
  };
}

export function Sidebar({ className, collapsed = false }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const expandedSectionsSnapshot = useSyncExternalStore(
    subscribeToExpandedSections,
    getExpandedSectionsSnapshot,
    getServerExpandedSectionsSnapshot,
  );
  const expandedSections = useMemo(
    () => parseExpandedSectionsSnapshot(expandedSectionsSnapshot),
    [expandedSectionsSnapshot],
  );

  const toggleSection = (sectionLabel: string) => {
    const newSections = expandedSections.includes(sectionLabel)
      ? expandedSections.filter((s) => s !== sectionLabel)
      : [...expandedSections, sectionLabel];

    localStorage.setItem(
      SIDEBAR_EXPANDED_SECTIONS_STORAGE_KEY,
      JSON.stringify(newSections),
    );
    syncExpandedSectionsAttribute(newSections);
    window.dispatchEvent(new Event(SIDEBAR_EXPANDED_SECTIONS_CHANGE_EVENT));
  };

  const getSectionRoute = (section: SidebarSection) => {
    if (section.route) {
      return section.route;
    }

    return section.children.find((child) => child.route)?.route;
  };

  const navigateTo = (route?: string) => {
    if (!route || route === pathname) {
      return;
    }

    router.push(route);
  };

  const isRouteActive = (route?: string) => {
    return route ? pathname === route || pathname.startsWith(`${route}/`) : false;
  };

  const isSectionActive = (section: SidebarSection) => {
    if (isRouteActive(section.route)) {
      return true;
    }

    return section.children.some((child) => isRouteActive(child.route));
  };

  const isChildActive = (child: SidebarChild) => {
    return isRouteActive(child.route);
  };

  return (
    <aside
      className={cn(
        "sidebar-shell sticky top-0 flex h-dvh max-h-dvh shrink-0 flex-col items-center overflow-hidden bg-[var(--color-sidebar-bg)] py-4 font-sans font-bold text-[var(--color-sidebar-text)] transition-[width,padding,color,background-color] duration-200 [font-family:var(--font-raleway)]",
        collapsed
          ? "w-[72px] px-2 md:w-[76px] md:px-2"
          : "w-[244px] px-4 md:w-[268px] md:px-5 md:pt-4 md:pb-5",
        className,
      )}
    >
      <div className="flex w-full flex-col items-center px-1">
        <Image
          src="/Logo/NovitexIco.png"
          width={38}
          height={38}
          className="h-auto w-[38px]"
          priority
          alt="Nobitex"
        />
        {!collapsed ? (
          <p className="sidebar-brand-name mt-2 text-center text-sm font-black leading-none [font-family:var(--font-circular-x-sub)] dark:text-[#f6f8ff] text-[#0f2239]">
            EMPRESA B
          </p>
        ) : null}
      </div>

      <nav className="flex min-h-0 w-full flex-1 flex-col justify-start overflow-hidden py-4">
        {collapsed ? (
          <ul className="sidebar-collapsed-nav sidebar-scrollbar flex max-h-full w-full flex-col items-center gap-2 overflow-y-auto">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              const isActive = isSectionActive(section);

              return (
                <li key={section.label} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateTo(getSectionRoute(section))}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors",
                      isActive
                        ? "bg-[var(--color-sidebar-active)] text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] dark:bg-[var(--color-secondary)] dark:shadow-[0_6px_18px_rgba(253,116,26,0.2)]"
                        : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]",
                    )}
                    aria-label={section.label}
                  >
                    <Icon size={20} weight={isActive ? "fill" : "regular"} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="sidebar-expanded-nav sidebar-scrollbar flex max-h-full w-full flex-col gap-2 overflow-y-auto pr-2">
            {sidebarSections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.label);
              const isHeaderActive = isRouteActive(section.route);
              const sectionRoute = getSectionRoute(section);
              const SectionToggleIcon = isExpanded
                ? MinusCircleIcon
                : PlusCircleIcon;

              return (
                <li
                  key={section.label}
                  className="sidebar-section shrink-0 md:w-full"
                  data-sidebar-section={section.label}
                >
                  <div className="flex flex-col gap-1">
                    <div
                      className={cn(
                        "sidebar-section-row flex w-full items-center gap-1 rounded-[10px] font-sans font-bold transition-colors [font-family:var(--font-raleway)]",
                        isHeaderActive
                          ? "bg-[var(--color-sidebar-active)] text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] dark:bg-[var(--color-secondary)] dark:shadow-[0_6px_18px_rgba(253,116,26,0.2)] dark:text-white"
                          : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => navigateTo(sectionRoute)}
                        className="sidebar-section-button flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-3 py-2 text-left"
                      >
                        <SectionIcon
                          size={18}
                          weight={isHeaderActive ? "fill" : "regular"}
                          className={cn(
                            "shrink-0",
                            isHeaderActive
                              ? "text-white"
                              : "text-[var(--color-sidebar-text)]",
                          )}
                        />
                        <span
                          className={cn(
                            "sidebar-section-label min-w-0 flex-1 truncate text-sm leading-none font-bold",
                            isHeaderActive
                              ? "text-white"
                              : "text-[var(--color-sidebar-text)]",
                          )}
                        >
                          {section.label}
                        </span>
                      </button>
                      {!section.direct ? (
                        <button
                          type="button"
                          onClick={() => toggleSection(section.label)}
                          className={cn(
                            "sidebar-section-toggle mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] transition-colors",
                            isHeaderActive
                              ? "text-white hover:bg-white/10"
                              : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]",
                          )}
                          aria-label={
                            isExpanded
                              ? `Contraer ${section.label}`
                              : `Expandir ${section.label}`
                          }
                          aria-expanded={isExpanded}
                        >
                          <SectionToggleIcon size={17} />
                        </button>
                      ) : null}
                    </div>

                    {isExpanded && !section.direct ? (
                      <div className="sidebar-section-children ml-5 flex flex-col gap-1">
                        {section.children.map((item) => {
                          const Icon = item.icon;
                          const isActive = isChildActive(item);

                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => navigateTo(item.route)}
                              className={cn(
                                "flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left font-sans text-sm font-bold transition-colors [font-family:var(--font-raleway)]",
                                isActive
                                  ? "bg-[var(--color-sidebar-active)] text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] dark:bg-[var(--color-secondary)] dark:shadow-[0_6px_18px_rgba(253,116,26,0.2)] dark:text-white"
                                  : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]",
                              )}
                            >
                              <Icon
                                size={16}
                                weight={isActive ? "fill" : "regular"}
                                className={cn(
                                  "shrink-0",
                                  isActive
                                    ? "text-white"
                                    : "text-[var(--color-sidebar-text)]",
                                )}
                              />
                              <span className="min-w-0 truncate">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Ref,
} from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import { PlusIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  attendanceSidebarSections,
  sidebarSections,
  workspaceOptions,
  superAdminSidebarSections,
  type SidebarWorkspace,
  type SidebarChild,
  type SidebarSection,
} from "@/lib/navigation/sidebar-modules";

const SIDEBAR_SCROLL_STORAGE_KEY = "sidebar-scroll-position:v1";
const SIDEBAR_WORKSPACE_STORAGE_KEY = "sidebar-workspace:v1";

type SidebarProps = {
  className?: string;
  collapsed?: boolean;
  companyName?: string;
  companyLogoUrl?: string | null;
  onNavigate?: () => void;
};

function getPathWorkspace(pathname: string): SidebarWorkspace {
  return pathname.startsWith("/asistencias") ? "asistencias" : "ventas";
}

function workspaceHasAllowedModules(
  sections: SidebarSection[],
  allowed: Set<string>,
  isExpired: boolean,
  isOwner: boolean,
) {
  return sections.some((section) => {
    if (section.direct) {
      if (section.key === "mi-cuenta" || section.key === "plan") return false;
      if (section.ownerOnly && !isOwner) return false;
      return !isExpired && allowed.has(section.key);
    }

    return section.children.some((child) => {
      if (child.key === "mi-cuenta" || child.key === "plan") return false;
      if (child.ownerOnly && !isOwner) return false;
      return !isExpired && allowed.has(child.key);
    });
  });
}

function SidebarNavButton({
  icon: Icon,
  label,
  badge,
  isActive,
  collapsed = false,
  onClick,
  trailingIcon,
  buttonRef,
}: {
  icon: Icon;
  label: string;
  badge?: string;
  isActive: boolean;
  collapsed?: boolean;
  onClick: () => void;
  trailingIcon?: {
    icon: Icon;
    label: string;
    onClick: () => void;
  };
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const TrailingIcon = trailingIcon?.icon;

  return (
    <div
      className={cn(
        "flex items-center rounded-[10px] transition-colors",
        collapsed ? "" : "w-full gap-1",
        isActive
          ? "bg-[var(--color-sidebar-active-bg)]"
          : "hover:bg-[var(--color-sidebar-hover)]",
      )}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        title={collapsed ? label : undefined}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center text-[var(--color-sidebar-option-text)]",
          collapsed
            ? "h-10 w-10 justify-center"
            : "min-w-0 flex-1 gap-2 px-3 py-2 text-left",
        )}
      >
        <Icon
          size={collapsed ? 20 : 18}
          weight={isActive ? "fill" : "regular"}
          className="shrink-0"
        />
        {!collapsed ? (
          <>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm leading-none",
                isActive && "font-circular-bold",
              )}
            >
              {label}
            </span>
            {badge ? (
              <span className="ml-auto shrink-0 rounded-full bg-[var(--color-primary)] px-1.5 py-1 text-[9px] font-circular-bold lowercase leading-none text-white dark:bg-[#3b5bdb]">
                {badge}
              </span>
            ) : null}
          </>
        ) : null}
      </button>
      {!collapsed && trailingIcon && TrailingIcon ? (
        <button
          type="button"
          onClick={trailingIcon.onClick}
          title={trailingIcon.label}
          aria-label={trailingIcon.label}
          className="mr-1.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-sidebar-action-bg)] text-[var(--color-sidebar-option-text)] transition-opacity hover:opacity-80"
        >
          <TrailingIcon size={10} weight="bold" />
        </button>
      ) : null}
    </div>
  );
}

export function Sidebar({
  className,
  collapsed = false,
  companyName,
  companyLogoUrl,
  onNavigate,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const { user, currentPlan } = useAuth();
  const pathWorkspace = getPathWorkspace(pathname);
  const allowedModuleKeys = useMemo(
    () => [
      ...(user?.moduleKeys ?? []),
      ...(currentPlan?.effectiveModuleKeys ?? []),
    ],
    [currentPlan?.effectiveModuleKeys, user?.moduleKeys],
  );
  const isOwner = user?.roles.includes("OWNER") ?? false;
  const isSuperAdmin = user?.roles.includes("SUPERADMIN") ?? false;
  const isExpired =
    currentPlan?.status === "expired" || user?.planStatus === "expired";
  const allowedModules = useMemo(
    () => new Set(allowedModuleKeys ?? []),
    [allowedModuleKeys],
  );
  const hasPosWorkspace = useMemo(
    () =>
      workspaceHasAllowedModules(
        sidebarSections,
        allowedModules,
        isExpired,
        isOwner,
      ),
    [allowedModules, isExpired, isOwner],
  );
  const hasAttendanceWorkspace = useMemo(
    () =>
      workspaceHasAllowedModules(
        attendanceSidebarSections,
        allowedModules,
        isExpired,
        isOwner,
      ),
    [allowedModules, isExpired, isOwner],
  );
  const canSwitchWorkspace = hasPosWorkspace && hasAttendanceWorkspace;
  const workspace: SidebarWorkspace = canSwitchWorkspace
    ? pathWorkspace
    : hasAttendanceWorkspace
      ? "asistencias"
      : "ventas";
  const activeSidebarSections =
    workspace === "asistencias" ? attendanceSidebarSections : sidebarSections;
  const visibleSections = useMemo(() => {
    if (isSuperAdmin) {
      return superAdminSidebarSections;
    }

    return activeSidebarSections
      .map((section) => {
        if (section.direct) {
          if (section.key === "mi-cuenta") return section;
          if (section.ownerOnly) return isOwner ? section : null;
          return !isExpired && allowedModules.has(section.key) ? section : null;
        }

        const children = section.children.filter((child) => {
          if (child.key === "mi-cuenta") return true;
          if (child.ownerOnly) return isOwner;
          return !isExpired && allowedModules.has(child.key);
        });
        return children.length ? { ...section, children } : null;
      })
      .filter((section): section is SidebarSection => Boolean(section));
  }, [
    activeSidebarSections,
    allowedModules,
    isExpired,
    isOwner,
    isSuperAdmin,
  ]);

  const navigateTo = (route?: string) => {
    if (!route) {
      return;
    }

    onNavigate?.();
    if (route === pathname) {
      return;
    }

    router.push(route);
  };

  const switchWorkspace = (nextWorkspace: SidebarWorkspace) => {
    localStorage.setItem(SIDEBAR_WORKSPACE_STORAGE_KEY, nextWorkspace);
    const route = workspaceOptions.find((option) => option.key === nextWorkspace)
      ?.route;
    navigateTo(route);
  };

  const isRouteActive = useCallback(
    (route?: string) => {
      return route
        ? pathname === route || pathname.startsWith(`${route}/`)
        : false;
    },
    [pathname],
  );

  const isSectionActive = useCallback(
    (section: SidebarSection) => {
      if (section.direct) {
        return pathname === section.route;
      }

      if (isRouteActive(section.route)) {
        return true;
      }

      return section.children.some((child) => isRouteActive(child.route));
    },
    [isRouteActive, pathname],
  );

  const activeChildRoute = useMemo(
    () =>
      visibleSections
        .flatMap((section) => section.children)
        .filter((child) => isRouteActive(child.route))
        .sort((left, right) => right.route.length - left.route.length)[0]
        ?.route,
    [isRouteActive, visibleSections],
  );

  const isChildActive = useCallback(
    (child: SidebarChild) => {
      return child.route === activeChildRoute;
    },
    [activeChildRoute],
  );

  const getTrailingIcon = (item: SidebarChild) => {
    if (item.key === "productos") {
      return {
        icon: PlusIcon,
        label: "Crear producto",
        onClick: () => navigateTo("/catalogo/productos/crear"),
      };
    }

    if (item.key === "nota-credito") {
      return {
        icon: PlusIcon,
        label: "Crear nota de credito",
        onClick: () => navigateTo("/facturacion/nota-credito/nuevo"),
      };
    }

    if (item.key === "nota-debito") {
      return {
        icon: PlusIcon,
        label: "Crear nota de debito",
        onClick: () => navigateTo("/facturacion/nota-debito/nuevo"),
      };
    }

    return undefined;
  };

  useEffect(() => {
    if (isSuperAdmin) {
      return;
    }

    localStorage.setItem(SIDEBAR_WORKSPACE_STORAGE_KEY, workspace);
  }, [isSuperAdmin, workspace]);

  useEffect(() => {
    const savedPosition = sessionStorage.getItem(
      `${SIDEBAR_SCROLL_STORAGE_KEY}:${isSuperAdmin ? "admin" : "company"}`,
    );
    if (navRef.current && savedPosition) {
      navRef.current.scrollTop = Number(savedPosition);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      activeItemRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [pathname, collapsed]);

  return (
    <aside
      className={cn(
        "sidebar-shell font-circular-regular flex h-dvh max-h-dvh shrink-0 flex-col items-center overflow-hidden bg-[var(--color-sidebar-bg)] py-3 text-[var(--color-sidebar-text)] transition-[width,padding,color,background-color] duration-200",
        collapsed
          ? "w-[72px] px-1.5 md:w-[76px] md:px-1.5"
          : "w-[224px] px-2 md:w-[244px] md:px-3 md:pt-3 md:pb-4",
        className,
      )}
    >
      <div className="flex w-full shrink-0 flex-col items-center">
        <div
          className={cn(
            "flex w-full items-center",
            collapsed ? "justify-center" : "gap-3",
          )}
        >
          {!isSuperAdmin && companyLogoUrl ? (
            <Image
              src={companyLogoUrl}
              alt={companyName || "Logo empresa"}
              width={38}
              height={38}
              unoptimized
              className="h-[38px] w-[38px] shrink-0 rounded-lg object-contain"
            />
          ) : (
            <Image
              src="/Logo/Nuvex.png"
              width={38}
              height={38}
              className="h-auto w-[38px] shrink-0"
              priority
              alt="Nuvex"
            />
          )}
          {!collapsed ? (
            <p className="sidebar-brand-name font-circular-bold line-clamp-2 min-w-0 flex-1 text-left text-sm leading-tight dark:text-[#f6f8ff] text-[#0f2239]">
              {isSuperAdmin ? "Nuvex Admin" : companyName || "Mi Empresa"}
            </p>
          ) : null}
        </div>
        {!isSuperAdmin && canSwitchWorkspace ? (
          <div
            className={cn(
              "mt-4 grid w-full rounded-[12px] bg-[var(--color-input-bg)] p-1",
              collapsed ? "grid-cols-1 gap-1" : "grid-cols-2 gap-1",
            )}
          >
            {workspaceOptions.map((option) => {
              const Icon = option.icon;
              const isActive = workspace === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => switchWorkspace(option.key)}
                  className={cn(
                    "flex items-center justify-center rounded-[10px] transition-colors",
                    collapsed
                      ? "h-10 w-full"
                      : "min-h-[58px] flex-col gap-1 px-2 py-2",
                    isActive
                      ? "bg-[var(--color-card)] text-[var(--color-primary)] shadow-sm"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-hover)]",
                  )}
                  aria-label={option.label}
                  title={option.label}
                >
                  <Icon
                    size={collapsed ? 20 : 32}
                    weight={isActive ? "fill" : "regular"}
                  />
                  {!collapsed ? (
                    <span className="text-[10px] font-circular-bold uppercase leading-none tracking-[0.04em]">
                      {option.label}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <nav
        ref={navRef}
        onScroll={(event) =>
          sessionStorage.setItem(
            `${SIDEBAR_SCROLL_STORAGE_KEY}:${isSuperAdmin ? "admin" : "company"}`,
            String(event.currentTarget.scrollTop),
          )
        }
        className="sidebar-scrollbar flex min-h-0 w-full flex-1 flex-col justify-start overflow-y-auto overscroll-contain py-4"
      >
        {collapsed ? (
          <ul className="sidebar-collapsed-nav flex w-full shrink-0 flex-col items-center gap-1">
            {visibleSections.map((section, index) => {
              const items = section.direct
                ? [
                    {
                      key: section.key,
                      label: section.label,
                      icon: section.icon,
                      route: section.route,
                      isActive: isSectionActive(section),
                    },
                  ]
                : section.children.map((child) => ({
                    key: child.key,
                    label: child.label,
                    icon: child.icon,
                    route: child.route,
                    isActive: isChildActive(child),
                  }));

              return (
                <li
                  key={section.key}
                  className="flex w-full flex-col items-center gap-1"
                >
                  {items.map((item) => (
                    <SidebarNavButton
                      key={item.key}
                      collapsed
                      icon={item.icon}
                      label={item.label}
                      isActive={item.isActive}
                      onClick={() => navigateTo(item.route)}
                      buttonRef={item.isActive ? activeItemRef : undefined}
                    />
                  ))}
                  {index < visibleSections.length - 1 ? (
                    <span className="my-1 h-px w-6 rounded-full bg-[var(--color-border)]" />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="sidebar-expanded-nav flex w-full shrink-0 flex-col gap-4 pr-1">
            {visibleSections.map((section) => {
              if (section.direct) {
                const isActive = isSectionActive(section);

                return (
                  <li key={section.key} className="shrink-0 md:w-full">
                    <SidebarNavButton
                      icon={section.icon}
                      label={section.label}
                      badge={section.badge}
                      isActive={isActive}
                      onClick={() => navigateTo(section.route)}
                      buttonRef={isActive ? activeItemRef : undefined}
                    />
                  </li>
                );
              }

              return (
                <li
                  key={section.key}
                  className="sidebar-section shrink-0 md:w-full"
                  data-sidebar-section={section.label}
                >
                  <p className="px-3 pb-1.5 text-[12px] lowercase first-letter:uppercase leading-none text-[var(--color-sidebar-text)]">
                    {section.label}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {section.children.map((item) => {
                      const isActive = isChildActive(item);

                      return (
                        <li key={item.key}>
                          <SidebarNavButton
                            icon={item.icon}
                            label={item.label}
                            badge={item.badge}
                            isActive={isActive}
                            onClick={() => navigateTo(item.route)}
                            trailingIcon={getTrailingIcon(item)}
                            buttonRef={isActive ? activeItemRef : undefined}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}

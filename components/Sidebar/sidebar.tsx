"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { MinusCircleIcon, PlusCircleIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  sidebarSections,
  superAdminSidebarSections,
  type SidebarChild,
  type SidebarSection,
} from "@/lib/navigation/sidebar-modules";

const SIDEBAR_EXPANDED_SECTIONS_STORAGE_KEY = "sidebar-expanded-sections:v1";
const SIDEBAR_EXPANDED_SECTIONS_CHANGE_EVENT =
  "sidebar-expanded-sections-change";
const SIDEBAR_SCROLL_STORAGE_KEY = "sidebar-scroll-position:v1";
const allSidebarSections = [...sidebarSections, ...superAdminSidebarSections];
const defaultExpandedSections = allSidebarSections.map(
  (section) => section.label,
);
const defaultExpandedSectionsSnapshot = JSON.stringify(defaultExpandedSections);
const sectionLabels = new Set(defaultExpandedSections);

type SidebarProps = {
  className?: string;
  collapsed?: boolean;
  companyName?: string;
  companyLogoUrl?: string | null;
  onNavigate?: () => void;
};

function getSectionRoute(section: SidebarSection) {
  if (section.route) {
    return section.route;
  }

  return section.children.find((child) => child.route)?.route;
}

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
  const syncedPathnameRef = useRef<string | null>(null);
  const { user, currentPlan } = useAuth();
  const allowedModuleKeys = user?.moduleKeys;
  const isOwner = user?.roles.includes("OWNER") ?? false;
  const isSuperAdmin = user?.roles.includes("SUPERADMIN") ?? false;
  const isExpired =
    currentPlan?.status === "expired" || user?.planStatus === "expired";
  const visibleSections = useMemo(() => {
    if (isSuperAdmin) {
      return superAdminSidebarSections;
    }

    const allowed = new Set(allowedModuleKeys ?? []);

    return sidebarSections
      .map((section) => {
        if (section.direct) {
          return !isExpired && allowed.has(section.key) ? section : null;
        }

        const children = section.children.filter((child) => {
          if (child.key === "mi-cuenta") return true;
          if (child.ownerOnly) return isOwner;
          return !isExpired && allowed.has(child.key);
        });
        return children.length ? { ...section, children } : null;
      })
      .filter((section): section is SidebarSection => Boolean(section));
  }, [allowedModuleKeys, isExpired, isOwner, isSuperAdmin]);
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

  const navigateToSection = (section: SidebarSection) => {
    if (!section.direct && !expandedSections.includes(section.label)) {
      toggleSection(section.label);
    }
    navigateTo(getSectionRoute(section));
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

  useEffect(() => {
    if (syncedPathnameRef.current === pathname) {
      return;
    }

    syncedPathnameRef.current = pathname;

    const activeSection = visibleSections.find(
      (section) => !section.direct && isSectionActive(section),
    );

    if (!activeSection || expandedSections.includes(activeSection.label)) {
      return;
    }

    const newSections = [...expandedSections, activeSection.label];
    localStorage.setItem(
      SIDEBAR_EXPANDED_SECTIONS_STORAGE_KEY,
      JSON.stringify(newSections),
    );
    syncExpandedSectionsAttribute(newSections);
    window.dispatchEvent(new Event(SIDEBAR_EXPANDED_SECTIONS_CHANGE_EVENT));
  }, [
    expandedSections,
    isSectionActive,
    pathname,
    visibleSections,
  ]);

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
  }, [pathname, collapsed, expandedSectionsSnapshot]);

  return (
    <aside
      className={cn(
        "sidebar-shell font-circular-light flex h-dvh max-h-dvh shrink-0 flex-col items-center overflow-hidden bg-[var(--color-sidebar-bg)] py-4 text-[var(--color-sidebar-text)] transition-[width,padding,color,background-color] duration-200",
        collapsed
          ? "w-[72px] px-2 md:w-[76px] md:px-2"
          : "w-[244px] px-4 md:w-[268px] md:px-5 md:pt-4 md:pb-5",
        className,
      )}
    >
      <div className="flex w-full shrink-0 flex-col items-center px-1">
        {!isSuperAdmin && companyLogoUrl ? (
          <Image
            src={companyLogoUrl}
            alt={companyName || "Logo empresa"}
            width={38}
            height={38}
            unoptimized
            className="h-[38px] w-[38px] rounded-lg object-contain"
          />
        ) : (
          <Image
            src="/Logo/Nuvex.png"
            width={38}
            height={38}
            className="h-auto w-[38px]"
            priority
            alt="Nuvex"
          />
        )}
        {!collapsed ? (
          <p className="sidebar-brand-name font-circular-bold mt-2 text-center text-sm leading-none dark:text-[#f6f8ff] text-[#0f2239]">
            {isSuperAdmin ? "Nuvex Admin" : companyName || "Mi Empresa"}
          </p>
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
          <ul className="sidebar-collapsed-nav flex w-full shrink-0 flex-col items-center gap-2">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = isSectionActive(section);

              return (
                <li key={section.label} className="shrink-0">
                  <button
                    ref={isActive ? activeItemRef : undefined}
                    type="button"
                    onClick={() => navigateToSection(section)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors",
                      isActive
                        ? "bg-[var(--color-primary)] text-white shadow-sm dark:bg-[var(--color-secondary)] dark:text-white"
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
          <ul className="sidebar-expanded-nav flex w-full shrink-0 flex-col gap-2 pr-2">
            {visibleSections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.label);
              const isHeaderActive = isSectionActive(section);
              const isDirectActive = Boolean(section.direct && isHeaderActive);
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
                        "sidebar-section-row flex w-full items-center gap-1 rounded-[10px] transition-colors",
                        isDirectActive
                          ? "bg-[var(--color-primary)] text-white shadow-sm dark:bg-[var(--color-secondary)] dark:text-white"
                          : isHeaderActive
                            ? "text-[var(--color-sidebar-active)] dark:text-[var(--color-secondary)]"
                            : "text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover)]",
                      )}
                    >
                      <button
                        ref={isDirectActive ? activeItemRef : undefined}
                        type="button"
                        onClick={() => navigateToSection(section)}
                        className="sidebar-section-button flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-3 py-2 text-left"
                        aria-expanded={
                          section.direct ? undefined : isExpanded
                        }
                      >
                        <SectionIcon
                          size={18}
                          weight={isHeaderActive ? "fill" : "regular"}
                          className={cn(
                            "shrink-0",
                            isDirectActive
                              ? "text-white"
                              : isHeaderActive
                                ? "text-[var(--color-sidebar-active)] dark:text-[var(--color-secondary)]"
                                : "text-[var(--color-sidebar-text)]",
                          )}
                        />
                        <span
                          className={cn(
                            "sidebar-section-label min-w-0 flex-1 truncate text-sm leading-none",
                            isDirectActive
                              ? "font-circular-bold text-white"
                              : isHeaderActive
                                ? "font-circular-bold text-[var(--color-sidebar-active)] dark:text-[var(--color-secondary)]"
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
                              ? "text-[var(--color-sidebar-active)] hover:bg-[var(--color-sidebar-hover)] dark:text-[var(--color-secondary)]"
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

                    {!section.direct ? (
                      <div
                        className={cn(
                          "overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out",
                          isExpanded
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 -translate-y-1",
                        )}
                        style={{
                          maxHeight: isExpanded
                            ? `${section.children.length * 36}px`
                            : "0px",
                        }}
                      >
                        <div className="sidebar-section-children ml-5 flex flex-col gap-1">
                          {section.children.map((item) => {
                            const Icon = item.icon;
                            const isActive = isChildActive(item);

                            return (
                              <button
                                ref={isActive ? activeItemRef : undefined}
                                key={item.label}
                                type="button"
                                onClick={() => navigateTo(item.route)}
                                className={cn(
                                  "flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-sm transition-colors",
                                  isActive
                                    ? "bg-[var(--color-primary)] text-white shadow-sm dark:bg-[var(--color-secondary)] dark:text-white"
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
                                <span
                                  className={cn(
                                    "min-w-0 truncate",
                                    isActive ? "font-circular-bold" : "",
                                  )}
                                >
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
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

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Header } from "@/components/Header/header";
import { LoadingScreen } from "@/components/loading-screen";
import { Sidebar } from "@/components/Sidebar/sidebar";
import { sessionExpiredEventName } from "@/lib/api/auth-fetch";
import { companyApi } from "@/lib/api/company";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  getStoredCompanyInfo,
  getSessionUser,
  setStoredCompanyInfo,
} from "@/lib/auth/session";
import { sidebarModules } from "@/lib/navigation/sidebar-modules";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_CHANGE_EVENT = "sidebar-collapsed-change";
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

type DashboardShellProps = {
  children: ReactNode;
  headerTitle?: ReactNode;
  headerParent?: {
    label: string;
    href: string;
  };
};

function getStoredSidebarCollapsed() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
}

function syncSidebarCollapsedAttribute(isCollapsed: boolean) {
  document.documentElement.dataset.sidebarCollapsed = String(isCollapsed);
}

function getSidebarCollapsedSnapshot() {
  return getStoredSidebarCollapsed() ? "true" : "false";
}

function getServerSidebarCollapsedSnapshot() {
  return "false";
}

function subscribeToSidebarCollapsed(onStoreChange: () => void) {
  const handleChange = () => {
    syncSidebarCollapsedAttribute(getStoredSidebarCollapsed());
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, handleChange);
  };
}

function subscribeToMobile(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function getServerMobileSnapshot() {
  return false;
}

export function DashboardShell({
  children,
  headerTitle = "Punto de Venta",
  headerParent,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    companyInfo,
    currentPlan,
    setupStatus,
    isSetupLoading,
    isLoading,
    isAuthenticated,
    logout,
    updateCompanyInfo,
  } = useAuth();
  const isSidebarCollapsed =
    useSyncExternalStore(
      subscribeToSidebarCollapsed,
      getSidebarCollapsedSnapshot,
      getServerSidebarCollapsedSnapshot,
    ) === "true";
  const isMobile = useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isSuperAdmin = user?.roles.includes("SUPERADMIN") ?? false;

  const loadCompanyData = useCallback(async () => {
    if (isSuperAdmin) {
      return;
    }

    const stored = getStoredCompanyInfo();
    if (stored?.documento) {
      return;
    }

    const jwtLogo = user?.empresaLogoUrl;
    const jwtName = user?.empresaNombreComercial;
    if (jwtName) {
      const info = {
        nombreComercial: jwtName,
        logoUrl: jwtLogo ?? null,
        documento: null,
      };
      setStoredCompanyInfo(info);
      updateCompanyInfo(info);
    }

    try {
      const company = await companyApi.getCompany();
      const info = {
        nombreComercial: company.nombreComercial,
        logoUrl: company.logoUrl,
        documento: company.ruc ?? company.dni,
      };
      setStoredCompanyInfo(info);
      updateCompanyInfo(info);
    } catch {
      // Silently fail - company data will load on next visit
    }
  }, [isSuperAdmin, updateCompanyInfo, user]);

  useEffect(() => {
    if (isAuthenticated && !isSuperAdmin) {
      void loadCompanyData();
    }
  }, [isAuthenticated, isSuperAdmin, loadCompanyData]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const currentModule = sidebarModules
    .filter(
      (module) =>
        pathname === module.route || pathname.startsWith(`${module.route}/`),
    )
    .sort((a, b) => b.route.length - a.route.length)[0];
  const isOwner = user?.roles.includes("OWNER") ?? false;
  const allowedModuleKeys = useMemo(
    () => [
      ...(user?.moduleKeys ?? []),
      ...(currentPlan?.effectiveModuleKeys ?? []),
    ],
    [currentPlan?.effectiveModuleKeys, user?.moduleKeys],
  );
  const isExpired =
    currentPlan?.status === "expired" || user?.planStatus === "expired";
  const isPlatformRoute =
    pathname === "/superadmin" || pathname.startsWith("/superadmin/");
  const isNotificationsRoute = pathname === "/notificaciones";
  const isOnboardingRoute = pathname === "/onboarding";
  const mustCompleteSetup =
    !isSuperAdmin && !isExpired && Boolean(setupStatus?.requiresBranch);
  const canAccessTenantRoute =
    !currentModule ||
    currentModule.key === "mi-cuenta" ||
    ((currentModule.key === "plan" ||
      currentModule.key === "asistencias-plan") &&
      isOwner) ||
    (!isExpired && allowedModuleKeys.includes(currentModule.key));
  const canAccessCurrentRoute = mustCompleteSetup
    ? isOnboardingRoute
    : isNotificationsRoute ||
      isOnboardingRoute ||
      (isSuperAdmin
        ? isPlatformRoute
        : !isPlatformRoute && canAccessTenantRoute);

  useEffect(() => {
    if (
      isLoading ||
      isSetupLoading ||
      !isAuthenticated ||
      canAccessCurrentRoute
    ) {
      return;
    }

    const allowedKeys = new Set(allowedModuleKeys);
    const fallback = isSuperAdmin
      ? "/superadmin"
      : mustCompleteSetup
        ? "/onboarding"
        : isExpired
          ? isOwner
            ? "/configuracion/plan"
            : "/configuracion/mi-cuenta"
          : (sidebarModules.find(
              (module) =>
                module.key === "mi-cuenta" ||
                (module.ownerOnly ? isOwner : allowedKeys.has(module.key)),
            )?.route ?? "/configuracion/mi-cuenta");

    router.replace(fallback);
  }, [
    canAccessCurrentRoute,
    isAuthenticated,
    isLoading,
    isSetupLoading,
    isExpired,
    isOwner,
    isSuperAdmin,
    mustCompleteSetup,
    router,
    allowedModuleKeys,
  ]);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (!getSessionUser()) {
        router.replace("/login");
      }
    };

    window.addEventListener(sessionExpiredEventName, handleSessionExpired);
    return () => {
      window.removeEventListener(sessionExpiredEventName, handleSessionExpired);
    };
  }, [router]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen((isOpen) => !isOpen);
      return;
    }

    const nextValue = !isSidebarCollapsed;
    syncSidebarCollapsedAttribute(nextValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_CHANGE_EVENT));
  };

  if (
    isLoading ||
    isSetupLoading ||
    !isAuthenticated ||
    !canAccessCurrentRoute
  ) {
    return <LoadingScreen />;
  }

  const displayName = isSuperAdmin
    ? "Nuvex Admin"
    : companyInfo?.nombreComercial || user?.empresaNombreComercial;
  const logoUrl = isSuperAdmin
    ? null
    : (companyInfo?.logoUrl ?? user?.empresaLogoUrl);

  return (
    <main className="relative flex h-dvh overflow-hidden bg-[var(--color-background)] transition-colors duration-200">
      {isMobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Cerrar sidebar"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}
      <div
        aria-hidden="true"
        className={cn(
          "hidden h-dvh shrink-0 transition-[width] duration-200 md:block",
          isSidebarCollapsed ? "w-[76px]" : "w-[268px]",
        )}
      />
      <Sidebar
        collapsed={isMobile ? false : isSidebarCollapsed}
        className={cn(
          "fixed inset-y-0 left-0 z-50 border-r border-[var(--color-border)] shadow-xl transition-transform md:translate-x-0 md:shadow-none",
          isMobileSidebarOpen
            ? "max-md:translate-x-0"
            : "max-md:-translate-x-full",
        )}
        companyName={displayName}
        companyLogoUrl={logoUrl}
        onNavigate={() => setIsMobileSidebarOpen(false)}
      />

      <section className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)] transition-colors duration-200">
        <Header
          title={
            headerParent ? (
              <nav
                className="flex min-w-0 items-center gap-2"
                aria-label="Ruta actual"
              >
                <Link
                  href={headerParent.href}
                  className="truncate text-sm font-circular-regular text-[var(--color-text)]/70 transition-colors hover:text-[var(--color-primary)]"
                >
                  {headerParent.label}
                </Link>
                <CaretRightIcon
                  size={14}
                  weight="bold"
                  className="shrink-0 text-[var(--color-muted-foreground)]"
                />
                <span className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                  {headerTitle}
                </span>
              </nav>
            ) : (
              headerTitle
            )
          }
          isSidebarCollapsed={
            isMobile ? !isMobileSidebarOpen : isSidebarCollapsed
          }
          onToggleSidebar={toggleSidebar}
          user={user}
          planCode={currentPlan?.plan.code}
          onLogout={logout}
        />

        {isExpired && !isOwner ? (
          <div className="border-b border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-2 text-sm text-[#a16207] dark:text-[#fbbf24]">
            La suscripcion esta vencida. Contacta al propietario de la empresa
            para reactivarla.
          </div>
        ) : null}
        <div className="content-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </section>
    </main>
  );
}

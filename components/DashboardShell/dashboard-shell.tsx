"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { Header } from "@/components/Header/header";
import { Sidebar } from "@/components/Sidebar/sidebar";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_CHANGE_EVENT = "sidebar-collapsed-change";

type DashboardShellProps = {
  children: ReactNode;
  headerTitle?: ReactNode;
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

export function DashboardShell({
  children,
  headerTitle = "Punto de Venta",
}: DashboardShellProps) {
  const isSidebarCollapsed =
    useSyncExternalStore(
      subscribeToSidebarCollapsed,
      getSidebarCollapsedSnapshot,
      getServerSidebarCollapsedSnapshot,
    ) === "true";

  const toggleSidebar = () => {
    const nextValue = !isSidebarCollapsed;
    syncSidebarCollapsedAttribute(nextValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_CHANGE_EVENT));
  };

  return (
    <main className="flex min-h-screen bg-[var(--color-background)] transition-colors duration-200">
      <Sidebar
        collapsed={isSidebarCollapsed}
        className="border-r border-[var(--color-border)]"
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-background)] transition-colors duration-200">
        <Header
          title={headerTitle}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {children}
      </section>
    </main>
  );
}

import {
  BellIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SidebarIcon,
  SunIcon,
} from "@phosphor-icons/react/ssr";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type HeaderProps = {
  title?: ReactNode;
  className?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function Header({
  title = "Punto de Venta",
  className,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between gap-4 bg-[var(--color-header-bg)] px-5 transition-colors duration-200 md:px-7",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label="Alternar sidebar"
          aria-pressed={isSidebarCollapsed}
        >
          <SidebarIcon size={18} />
        </button>
        <div className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]/70">
          {title}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <label className="relative hidden w-[170px] lg:block xl:w-[250px]">
          <MagnifyingGlassIcon
            size={16}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-input-text)]"
          />
          <input
            type="text"
            placeholder="Buscar"
            className="h-10 w-full rounded-full bg-[var(--color-input-bg)] pr-4 pl-10 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label="Tema"
        >
          {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label="Configuracion"
        >
          <GearSixIcon size={18} />
        </button>

        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
          aria-label="Notificaciones"
        >
          <BellIcon size={18} />
          <span className="absolute top-1 right-0 flex min-w-[18px] items-center justify-center rounded-full bg-[#ff4a4a] px-1 text-[9px] font-bold leading-4 text-white">
            +99
          </span>
        </button>
      </div>
    </header>
  );
}

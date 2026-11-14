"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react/ssr";

import { useTheme } from "@/lib/theme/use-theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  iconSize?: number;
};

export function ThemeToggle({ className, iconSize = 20 }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Activar tema claro" : "Activar tema oscuro"}
      title={isDark ? "Tema claro" : "Tema oscuro"}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
        className,
      )}
    >
      {isDark ? (
        <SunIcon size={iconSize} weight="bold" />
      ) : (
        <MoonIcon size={iconSize} weight="bold" />
      )}
    </button>
  );
}

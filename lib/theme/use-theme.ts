"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  getCurrentTheme,
  readStoredTheme,
  storeTheme,
  type Theme,
} from "@/lib/theme/theme";

const THEME_CHANGE_EVENT = "nuvex-theme-change";

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => {
    observer.disconnect();
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function getIsDarkSnapshot() {
  return getCurrentTheme() === "dark";
}

function getIsDarkServerSnapshot() {
  return false;
}

/**
 * Estado compartido del tema de la aplicacion.
 * Cualquier pantalla que necesite el toggle (header, login, registro, etc.)
 * lo usa desde aqui para no duplicar la logica.
 */
export function useTheme() {
  const isDark = useSyncExternalStore(
    subscribeToTheme,
    getIsDarkSnapshot,
    getIsDarkServerSnapshot,
  );

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      applyTheme(stored);
    }
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    applyTheme(theme);
    storeTheme(theme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getCurrentTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { isDark, toggleTheme, setTheme };
}

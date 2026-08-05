"use client";

import {
  CaretDownIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/ssr";
import { useEffect, useId, useRef, useState } from "react";

import peruUbigeos from "@/lib/data/peru-ubigeos.json";
import { cn } from "@/lib/utils";

type PeruUbigeo = {
  ubigeo: string;
  distrito: string;
  provincia: string;
  departamento: string;
  label: string;
};

const ubigeos = peruUbigeos as PeruUbigeo[];

type UbigeoSelectProps = {
  value: string;
  disabled?: boolean;
  onSelect: (item: PeruUbigeo) => void;
  label?: string;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type { PeruUbigeo };

export function UbigeoSelect({
  value,
  disabled = false,
  onSelect,
  label = "Ubigeo / distrito",
}: UbigeoSelectProps) {
  const selectedUbigeo = ubigeos.find((item) => item.ubigeo === value) ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const controlId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const displayValue = selectedUbigeo
    ? `${selectedUbigeo.distrito} - ${selectedUbigeo.ubigeo}`
    : "";

  const normalizedSearch = normalizeSearch(search);
  const results =
    normalizedSearch.length < 2
      ? ubigeos.slice(0, 12)
      : ubigeos
          .filter((item) =>
            normalizeSearch(
              `${item.label} ${item.distrito} ${item.provincia} ${item.departamento}`,
            ).includes(normalizedSearch),
          )
          .slice(0, 18);

  useEffect(() => {
    if (isOpen && !disabled) {
      const animationFrame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [isOpen, disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setSearch("");
      setIsOpen(true);
    }
  };

  const handleSelect = (item: PeruUbigeo) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={controlId}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
        {label}
      </label>
      <button
        id={controlId}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none transition-colors hover:bg-[var(--color-button-hover)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-70",
          !displayValue && "text-[var(--color-placeholder)]",
        )}
        aria-label="Ubigeo"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {displayValue || "Buscar distrito, provincia o ubigeo"}
        </span>
        <CaretDownIcon
          size={16}
          className={cn(
            "shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)] animate-in fade-in zoom-in-95 duration-200">
          <div className="relative px-1 pb-1">
            <MagnifyingGlassIcon
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Buscar ubigeo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar..."
              className="h-9 w-full rounded-lg bg-[var(--color-input-bg)] pl-9 pr-4 text-xs font-circular-regular text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {results.length > 0 ? (
              results.map((item) => (
                <button
                  key={item.ubigeo}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-button-hover)]",
                    value === item.ubigeo && "bg-[var(--color-primary)] text-white",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {item.distrito}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-xs font-circular-regular text-[var(--color-muted-foreground)]",
                        value === item.ubigeo && "text-white/80",
                      )}
                    >
                      {item.provincia}, {item.departamento}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-black text-[var(--color-primary)] font-circular-regular",
                      value === item.ubigeo && "text-white",
                    )}
                  >
                    {item.ubigeo}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                No se encontraron ubigeos
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

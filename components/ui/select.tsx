"use client";

import {
  CaretDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
  optionClassName?: string;
  required?: boolean;
  disabled?: boolean;
  fixedMenu?: boolean;
};

export function Select({
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  label,
  ariaLabel,
  searchable = false,
  className,
  buttonClassName,
  optionClassName,
  required = false,
  disabled = false,
  fixedMenu = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const controlId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();

  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption?.label || "";

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  useEffect(() => {
    if (isOpen && searchable) {
      const animationFrame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
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

  const updateMenuPosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUp = window.innerHeight - rect.bottom < 240 && rect.top > 240;
    setMenuStyle({
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
    });
  };

  useEffect(() => {
    if (!isOpen || !fixedMenu) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [fixedMenu, isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setSearch("");
      if (fixedMenu) updateMenuPosition();
      setIsOpen(true);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? (
        <label
          htmlFor={controlId}
          className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
        >
          {label}
        </label>
      ) : null}
      <button
        ref={buttonRef}
        id={controlId}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none transition-colors hover:bg-[var(--color-button-hover)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60",
          !displayValue && "text-[var(--color-placeholder)]",
          buttonClassName,
        )}
        aria-label={ariaLabel || label || placeholder}
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {displayValue || placeholder}
          {required && !displayValue && (
            <span className="ml-0.5 text-[var(--color-primary)]">*</span>
          )}
        </span>
        <CaretDownIcon
          size={16}
          className={cn(
            "shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen &&
        (() => {
          const menu = (
            <div
              ref={menuRef}
              style={fixedMenu ? menuStyle : undefined}
              className={cn(
                "rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)] animate-in fade-in zoom-in-95 duration-200",
                fixedMenu
                  ? "fixed z-[9999]"
                  : "absolute left-0 top-full z-[100] mt-2 w-full",
              )}
            >
              {searchable && (
                <div className="relative px-1 pb-1">
                  <MagnifyingGlassIcon
                    size={14}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-placeholder)]"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    aria-label={`Buscar en ${label}`}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar..."
                    className="h-9 w-full rounded-lg bg-[var(--color-input-bg)] pl-9 pr-8 text-xs font-circular-regular text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute top-1/2 right-2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
                      aria-label="Limpiar busqueda"
                    >
                      <XIcon size={12} weight="bold" />
                    </button>
                  )}
                </div>
              )}

              <div className="max-h-52 overflow-y-auto">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                        value === option.value
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                        optionClassName,
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {value === option.value ? (
                        <CheckIcon
                          size={17}
                          weight="bold"
                          className="shrink-0"
                        />
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                    No se encontraron resultados
                  </div>
                )}
              </div>
            </div>
          );
          return fixedMenu ? createPortal(menu, document.body) : menu;
        })()}
    </div>
  );
}

type NativeSelectProps = Omit<
  ComponentPropsWithoutRef<"select">,
  "children" | "defaultValue" | "multiple" | "onChange" | "size"
> & {
  children: ReactNode;
  onChange?: (event: { target: { value: string } }) => void;
  fixedMenu?: boolean;
};

function readNativeOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (
      !isValidElement<{ value?: string | number; children?: ReactNode }>(child)
    ) {
      return;
    }

    if (child.type === "option") {
      const label = Children.toArray(child.props.children).join("");
      options.push({
        value: String(child.props.value ?? label),
        label,
      });
      return;
    }

    options.push(...readNativeOptions(child.props.children));
  });

  return options;
}

export function NativeSelect({
  children,
  value,
  onChange,
  className,
  disabled,
  required,
  fixedMenu = false,
  "aria-label": ariaLabel,
}: NativeSelectProps) {
  const options = readNativeOptions(children);

  return (
    <Select
      options={options}
      value={String(value ?? "")}
      onChange={(nextValue) => onChange?.({ target: { value: nextValue } })}
      ariaLabel={ariaLabel}
      placeholder={options[0]?.label ?? "Seleccionar"}
      className="min-w-0 flex-1"
      buttonClassName={className}
      disabled={disabled}
      required={required}
      fixedMenu={fixedMenu}
    />
  );
}

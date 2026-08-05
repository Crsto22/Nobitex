"use client";

import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

type CatalogSelectorProps = {
  title: string;
  emptyText: string;
  showList: boolean;
  showSearch: boolean;
  searchValue: string;
  searchRef: React.RefObject<HTMLInputElement | null>;
  children: React.ReactNode;
  onToggleList: () => void;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
};

export function CatalogSelector({
  title,
  emptyText,
  showList,
  showSearch,
  searchValue,
  searchRef,
  children,
  onToggleList,
  onToggleSearch,
  onSearchChange,
  onCreate,
}: CatalogSelectorProps) {
  return (
    <div>
      <div className="mb-3">
        <p className="text-xs font-circular-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
          {title}
        </p>
      </div>
      <div className="-m-1 flex flex-wrap items-center gap-2.5 p-1">
        <button
          type="button"
          onClick={onToggleList}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#d9dde5] text-[#1f2937] shadow-[0_6px_18px_rgba(17,37,58,0.10)] transition-transform duration-300 hover:scale-105 hover:bg-[#cfd5df]"
          aria-label={showList ? `Cerrar ${title}` : `Abrir ${title}`}
          aria-expanded={showList}
        >
          <PlusIcon
            size={18}
            weight="bold"
            className={cn("transition-transform duration-300", showList && "rotate-45")}
          />
        </button>
        {showList ? (
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={onToggleSearch}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-transform hover:scale-105"
              aria-label={`Buscar ${title}`}
              aria-expanded={showSearch}
            >
              <MagnifyingGlassIcon size={17} weight="bold" />
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="ml-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)]/45 bg-transparent text-[var(--color-muted-foreground)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-input-bg)] hover:text-[var(--color-primary)]"
              aria-label={`Crear ${title}`}
            >
              <PlusIcon size={17} weight="bold" />
            </button>
            <label
              className={cn(
                "overflow-visible transition-[max-width,opacity,margin-left,transform] duration-300 ease-out",
                showSearch
                  ? "ml-2 max-w-[170px] translate-x-0 opacity-100"
                  : "ml-0 max-w-0 -translate-x-1 opacity-0 pointer-events-none",
              )}
            >
              <span className="sr-only">Buscar</span>
              <input
                ref={searchRef}
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar"
                tabIndex={showSearch ? 0 : -1}
                className="h-9 w-[170px] rounded-full bg-[var(--color-input-bg)] px-4 text-xs font-circular-regular text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)]/25"
              />
            </label>
          </div>
        ) : null}
        {children}
        {!showList ? <span className="sr-only">{emptyText}</span> : null}
      </div>
    </div>
  );
}

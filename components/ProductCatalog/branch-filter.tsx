"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { BuildingsIcon, CaretDownIcon, StorefrontIcon, XIcon } from "@phosphor-icons/react/ssr";

import type { Branch } from "@/lib/api/branches";
import { cn } from "@/lib/utils";

type BranchFilterProps = {
  branches: Branch[];
  selectedBranchId: string;
  isOpen: boolean;
  className?: string;
  compactOnMobile?: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onBranchChange: (branchId: string) => void;
};

export function BranchFilter({
  branches,
  selectedBranchId,
  isOpen,
  className,
  compactOnMobile = false,
  onOpenChange,
  onBranchChange,
}: BranchFilterProps) {
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const selectedLabel = selectedBranch?.nombre ?? "Sucursal";
  const SelectedBranchIcon =
    selectedBranch?.tipo === "almacen" ? BuildingsIcon : StorefrontIcon;
  const compactButtonRef = useRef<HTMLButtonElement>(null);
  const desktopButtonRef = useRef<HTMLButtonElement>(null);
  const [compactPanelStyle, setCompactPanelStyle] = useState<CSSProperties | null>(
    null,
  );
  const [desktopPanelStyle, setDesktopPanelStyle] = useState<CSSProperties | null>(
    null,
  );

  const updateCompactPanelPosition = useCallback(() => {
    const rect = compactButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (window.innerWidth < 640) {
      setCompactPanelStyle({ left: 12, right: 12, top: 64 });
      return;
    }

    setCompactPanelStyle({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
      width: 280,
    });
  }, []);

  const updateDesktopPanelPosition = useCallback(() => {
    const rect = desktopButtonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDesktopPanelStyle({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
      width: Math.max(rect.width, 220),
    });
  }, []);

  useEffect(() => {
    if (!compactOnMobile || !isOpen) return;
    const animationFrame = requestAnimationFrame(updateCompactPanelPosition);
    window.addEventListener("resize", updateCompactPanelPosition);
    window.addEventListener("scroll", updateCompactPanelPosition, true);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateCompactPanelPosition);
      window.removeEventListener("scroll", updateCompactPanelPosition, true);
    };
  }, [compactOnMobile, isOpen, updateCompactPanelPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const animationFrame = requestAnimationFrame(updateDesktopPanelPosition);
    window.addEventListener("resize", updateDesktopPanelPosition);
    window.addEventListener("scroll", updateDesktopPanelPosition, true);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateDesktopPanelPosition);
      window.removeEventListener("scroll", updateDesktopPanelPosition, true);
    };
  }, [isOpen, updateDesktopPanelPosition]);

  const desktopMenu =
    isOpen && desktopPanelStyle
      ? createPortal(
          <div
            style={desktopPanelStyle}
            className="fixed z-[9999] max-h-72 overflow-y-auto rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]"
          >
            {branches.map((branch) => (
              <BranchOption
                key={branch.id}
                branch={branch}
                selected={selectedBranchId === branch.id}
                onClick={() => {
                  onBranchChange(branch.id);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>,
          document.body,
        )
      : null;

  if (compactOnMobile) {
    return (
      <>
        <div className="relative shrink-0 lg:hidden">
          <button
            ref={compactButtonRef}
            type="button"
            onClick={() => onOpenChange(!isOpen)}
            disabled={branches.length === 0}
            aria-label="Cambiar sucursal"
            aria-expanded={isOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SelectedBranchIcon size={17} weight="fill" />
          </button>
        </div>

        {isOpen && compactPanelStyle
          ? createPortal(
              <div
                style={compactPanelStyle}
                className="fixed z-[9999] overflow-hidden rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_12px_36px_rgba(21,25,34,0.24)] ring-1 ring-[var(--color-border)]"
              >
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-sm font-circular-bold text-[var(--color-text)]">
                    Sucursal
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label="Cerrar"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
                  >
                    <XIcon size={14} weight="bold" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl p-1">
                  {branches.map((branch) => (
                    <BranchOption
                      key={branch.id}
                      branch={branch}
                      selected={selectedBranchId === branch.id}
                      onClick={() => {
                        onBranchChange(branch.id);
                        onOpenChange(false);
                      }}
                    />
                  ))}
                </div>
              </div>,
              document.body,
            )
          : null}

        {desktopMenu}

        <div className={cn("relative hidden w-full sm:w-[220px] lg:block", className)}>
          <button
            ref={desktopButtonRef}
            type="button"
            onClick={() => onOpenChange(!isOpen)}
            disabled={branches.length === 0}
            className="flex h-11 w-full items-center justify-between gap-3 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-medium text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex min-w-0 items-center gap-2">
              <SelectedBranchIcon
                size={18}
                weight="fill"
                className="shrink-0 text-[var(--color-primary)]"
              />
              <span className="truncate">{selectedLabel}</span>
            </span>
            <CaretDownIcon size={16} className="shrink-0" />
          </button>
        </div>
      </>
    );
  }

  return (
    <div className={cn("relative w-full sm:w-[220px]", className)}>
      <button
        ref={desktopButtonRef}
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        disabled={branches.length === 0}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-medium text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SelectedBranchIcon
            size={18}
            weight="fill"
            className="shrink-0 text-[var(--color-primary)]"
          />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <CaretDownIcon size={16} className="shrink-0" />
      </button>

      {desktopMenu}
    </div>
  );
}

function BranchOption({
  branch,
  selected,
  onClick,
}: {
  branch: Branch;
  selected: boolean;
  onClick: () => void;
}) {
  const BranchIcon = branch.tipo === "tienda" ? StorefrontIcon : BuildingsIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        selected
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            selected
              ? "bg-white/15 text-white"
              : "bg-[var(--color-input-bg)] text-[var(--color-primary)]",
          )}
        >
          <BranchIcon size={16} weight="fill" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-circular-bold">{branch.nombre}</span>
          <span
            className={cn(
              "block truncate text-[11px] font-circular-regular",
              selected ? "text-white/75" : "text-[var(--color-muted-foreground)]",
            )}
          >
            {branch.tipo.toUpperCase()}
            {branch.esPrincipal ? " · PRINCIPAL" : ""}
          </span>
        </span>
      </span>
      {selected ? <span className="h-2 w-2 shrink-0 rounded-full bg-white" /> : null}
    </button>
  );
}

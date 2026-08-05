"use client";

import { XIcon } from "@phosphor-icons/react/ssr";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeModal = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) {
        closeModal();
      }
    };

    if (isOpen && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
      dialog.addEventListener("click", handleBackdropClick);
    } else if (!isOpen && dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
    }

    return () => {
      dialog.removeEventListener("click", handleBackdropClick);
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-4 backdrop:bg-black/35 backdrop:animate-in backdrop:fade-in backdrop:duration-200"
    >
      <div
        className={cn(
          "relative flex max-h-[calc(100dvh-3rem)] w-[calc(100vw-2rem)] flex-col rounded-[18px] bg-[var(--color-card)] shadow-[0_22px_70px_rgba(15,23,42,0.28)] ring-1 ring-[var(--color-border)] animate-in zoom-in-95 duration-200",
          sizeClasses[size],
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 p-5 pb-0">
          <div>
            <h2
              id={titleId}
              className="text-lg font-black text-[var(--color-text)]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm font-medium text-[var(--color-muted-foreground)]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
            aria-label="Cerrar"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>

        <div className="mt-5 min-h-0 overflow-y-auto px-5 pb-5 pr-4">
          {children}
        </div>
      </div>
    </dialog>
  );
}

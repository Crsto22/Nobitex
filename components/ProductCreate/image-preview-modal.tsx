"use client";

import Image from "next/image";
import { XIcon } from "@phosphor-icons/react/ssr";

import type { PendingColorImage } from "./types";

type ImagePreviewModalProps = {
  pendingImage: PendingColorImage | null;
  onCancel: () => void;
  onAccept: () => void;
};

export function ImagePreviewModal({
  pendingImage,
  onCancel,
  onAccept,
}: ImagePreviewModalProps) {
  if (!pendingImage) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/60 px-4 py-8 backdrop-blur-sm">
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-5 right-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[var(--color-muted-foreground)] shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition-colors hover:text-[#ef4444] dark:bg-[var(--color-background)]"
        aria-label="Cerrar vista previa"
      >
        <XIcon size={18} weight="bold" />
      </button>

      <div className="relative">
        <span
          className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.92),0_10px_24px_rgba(0,0,0,0.24)]"
          style={{ backgroundColor: pendingImage.colorHex }}
          aria-label={pendingImage.colorLabel}
        />
        <Image
          src={pendingImage.preview}
          alt={`Vista previa ${pendingImage.colorLabel}`}
          width={1200}
          height={900}
          unoptimized
          className="h-auto max-h-[72dvh] w-auto max-w-[92vw] rounded-[24px] object-contain"
        />
      </div>

      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 min-w-[112px] rounded-[14px] bg-white/90 px-4 text-sm font-circular-bold text-[var(--color-muted-foreground)] shadow-[0_10px_26px_rgba(0,0,0,0.16)] transition-colors hover:text-[var(--color-text)] dark:bg-[var(--color-background)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="h-11 min-w-[112px] rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white shadow-[0_10px_26px_rgba(0,0,0,0.18)] transition-opacity hover:opacity-90"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

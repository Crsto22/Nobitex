"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarcodeIcon,
  CameraIcon,
  ShoppingCartSimpleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";

import { cn } from "@/lib/utils";

export type ScannerRecentItem = {
  id: string;
  name: string;
  code: string;
  price: string;
  image: string | null;
  colorHex?: string;
  colorName?: string;
  size?: string;
};

type BarcodeScannerDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  total: string;
  cartTotalQuantity: number;
  recentItems: ScannerRecentItem[];
  onDetected: (code: string) => Promise<void> | void;
};

function playScanBeep() {
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.13);
  window.setTimeout(() => void audioContext.close(), 180);
}

function scannerErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Permiso de camara denegado.";
    }
    if (error.name === "NotFoundError") {
      return "No se encontro una camara disponible.";
    }
  }

  return "No se pudo iniciar la camara.";
}

export function BarcodeScannerDrawer({
  isOpen,
  onClose,
  total,
  cartTotalQuantity,
  recentItems,
  onDetected,
}: BarcodeScannerDrawerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastCodeRef = useRef("");
  const lastScanAtRef = useRef(0);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [lastCode, setLastCode] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!isOpen) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      queueMicrotask(() => {
        setError("");
        setIsStarting(false);
      });
      return;
    }

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    queueMicrotask(() => {
      setIsStarting(true);
      setError("");
    });

    reader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        },
        videoRef.current ?? undefined,
        (result) => {
          const code = result?.getText().trim();
          if (!code) return;

          const now = Date.now();
          if (code === lastCodeRef.current && now - lastScanAtRef.current < 1400) {
            return;
          }

          lastCodeRef.current = code;
          lastScanAtRef.current = now;
          setLastCode(code);
          playScanBeep();
          void onDetectedRef.current(code);
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((startError: unknown) => {
        if (!cancelled) {
          setError(scannerErrorMessage(startError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsStarting(false);
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <section className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col items-center justify-end lg:hidden">
      <button
        type="button"
        aria-label="Cerrar escaner"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 animate-in fade-in duration-200"
      />
      <div className="relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--color-card)] p-4 pb-5 animate-in slide-in-from-bottom-2 duration-200">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[var(--color-text)] text-fixed-lg">
            Escanear
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Ver carrito"
              className="relative flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] pl-3 pr-4 text-white transition-colors hover:opacity-90"
            >
              <ShoppingCartSimpleIcon size={17} weight="bold" />
              <span className="text-xs font-circular-bold">{total}</span>
              {cartTotalQuantity > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[9px] font-circular-bold text-white">
                  {cartTotalQuantity}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
            >
              <XIcon size={16} weight="bold" />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[16px] bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="h-[42%] w-[78%] rounded-[14px] border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]">
              <div className="mt-[18%] h-0.5 w-full bg-[#ff7417] shadow-[0_0_12px_rgba(255,116,23,0.9)]" />
            </div>
          </div>
          {isStarting || error ? (
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-8 text-center text-white",
                !error && "bg-black/35",
              )}
            >
              <CameraIcon size={32} weight="bold" />
              <p className="text-sm font-circular-bold">
                {error || "Iniciando camara..."}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex h-10 items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)]">
          <BarcodeIcon size={18} weight="bold" />
          <span className="min-w-0 truncate font-circular-regular">
            {lastCode ? `Ultimo codigo: ${lastCode}` : "Apunta al codigo de barras"}
          </span>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <h3 className="px-1 text-sm font-black text-[var(--color-text)]">
            Ultimos escaneados
          </h3>
          <div className="scrollbar-hidden mt-3 max-h-full space-y-3 overflow-y-auto pr-1">
            {recentItems.length === 0 ? (
              <div className="flex h-28 items-center justify-center rounded-[14px] bg-[var(--color-input-bg)] px-4 text-center text-sm font-circular-regular text-[var(--color-muted-foreground)]">
                Aun no hay productos escaneados
              </div>
            ) : (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[14px] bg-[var(--color-input-bg)] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-text)]">
                      {item.name}
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                      {item.colorHex ? (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.colorHex }}
                        />
                      ) : null}
                      <span className="truncate">
                        {item.size ? `${item.size} · ` : ""}
                        {item.code}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-circular-bold text-[var(--color-muted-foreground)]">
                    {item.price}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

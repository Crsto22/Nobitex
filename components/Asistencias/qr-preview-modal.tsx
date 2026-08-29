"use client";

import { useCallback, useEffect, useState } from "react";
import { DownloadSimpleIcon, QrCodeIcon } from "@phosphor-icons/react/ssr";

import { Modal } from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";
import {
  attendanceQrPointsApi,
  type QrPoint,
  type QrPointQrResponse,
} from "@/lib/api/attendance-qr-points";

export function QrPreviewModal({
  point,
  onClose,
}: {
  point: QrPoint;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<QrPointQrResponse | null>(null);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const loadQr = useCallback(() => {
    let isMounted = true;

    attendanceQrPointsApi
      .getQr(point.id)
      .then((response) => {
        if (!isMounted) return;
        setQr(response);
        setError("");
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo generar el QR.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [point.id]);

  useEffect(() => loadQr(), [loadQr]);

  useEffect(() => {
    if (qr?.tipoQr !== "dinamico" || !qr.expiresAt) return;

    const interval = window.setInterval(() => {
      const nextSeconds = Math.max(
        0,
        Math.ceil((new Date(qr.expiresAt!).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(nextSeconds);
      if (nextSeconds <= 1) loadQr();
    }, 1000);

    return () => window.clearInterval(interval);
  }, [loadQr, qr]);

  const downloadQr = () => {
    if (!qr?.dataUrl) return;

    const link = document.createElement("a");
    link.href = qr.dataUrl;
    link.download = `${point.nombre.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
  };

  return (
    <Modal isOpen onClose={onClose} title="QR de asistencia" size="md">
      <div className="space-y-4 text-center">
        <div>
          <p className="text-base font-circular-bold text-[var(--color-text)]">
            {point.nombre}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {point.sucursal.nombre}
          </p>
          <p className="mt-1 text-xs font-circular-bold text-[var(--color-primary)]">
            {point.tipoQr === "dinamico"
              ? `QR dinamico · cambia cada ${point.refreshSeconds}s`
              : "QR normal"}
          </p>
        </div>

        <div className="mx-auto flex min-h-[260px] max-w-[280px] items-center justify-center rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-[var(--color-border)]">
          {qr?.dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr.dataUrl}
              alt={`QR ${point.nombre}`}
              className="w-full"
            />
          ) : (
            <QrCodeIcon
              size={48}
              className="text-[var(--color-muted-foreground)]"
            />
          )}
        </div>

        {error ? (
          <p className="text-sm font-circular-regular text-[#d9480f]">
            {error}
          </p>
        ) : null}

        {qr?.tipoQr === "dinamico" && secondsLeft !== null ? (
          <p className="text-sm font-circular-bold text-[var(--color-primary)]">
            Cambia en {secondsLeft}s
          </p>
        ) : null}

        <Button
          type="button"
          onClick={downloadQr}
          disabled={!qr?.dataUrl}
          className="h-11 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          <DownloadSimpleIcon size={18} weight="bold" />
          Descargar PNG
        </Button>
      </div>
    </Modal>
  );
}

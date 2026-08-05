"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarIcon,
  CaretRightIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  FileCodeIcon,
  PackageIcon,
  PaperPlaneTiltIcon,
  ReceiptIcon,
  StorefrontIcon,
  UserIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  creditNotesApi,
  type CreditNoteResponse,
  type CreditNoteSunatEstado,
} from "@/lib/api/credit-notes";
import { cn } from "@/lib/utils";
import { documentFileName } from "@/lib/document-file-name";

const statusConfig: Record<
  CreditNoteSunatEstado,
  { label: string; bg: string; text: string }
> = {
  pendiente_envio: {
    label: "Pendiente de envio",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  enviando: {
    label: "Enviando",
    bg: "bg-[#3b82f6]/10",
    text: "text-[#1d4ed8]",
  },
  pendiente_cdr: {
    label: "Pendiente CDR",
    bg: "bg-[#8b5cf6]/10",
    text: "text-[#6d28d9]",
  },
  aceptado: {
    label: "Aceptado SUNAT",
    bg: "bg-[#10b981]/10",
    text: "text-[#047857]",
  },
  observado: {
    label: "Observado",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  rechazado: {
    label: "Rechazado",
    bg: "bg-[#ef4444]/10",
    text: "text-[#dc2626]",
  },
  error_transitorio: {
    label: "Error transitorio",
    bg: "bg-[#f59e0b]/10",
    text: "text-[#b45309]",
  },
  error_definitivo: {
    label: "Error definitivo",
    bg: "bg-[#ef4444]/10",
    text: "text-[#dc2626]",
  },
};

function formatMoney(value: string) {
  return `S/${Number(value).toFixed(2)}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-card)] px-4 py-3">
      <p className="text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-circular-bold text-[var(--color-text)]">
        {value}
      </p>
    </div>
  );
}

export default function CreditNoteDetailPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const toast = useSystemToast();
  const [note, setNote] = useState<CreditNoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    creditNotesApi
      .findOne(publicId)
      .then((response) => mounted && setNote(response))
      .catch((error: unknown) =>
        toast.showToast({
          title: "No se pudo cargar la nota de credito",
          description:
            error instanceof Error ? error.message : "Intentalo nuevamente",
          variant: "error",
        }),
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [publicId, toast]);

  const download = async (kind: "pdf" | "xml" | "cdr") => {
    if (!note || busy) return;
    setBusy(kind);
    try {
      const blob =
        kind === "pdf"
          ? await creditNotesApi.downloadPdf(note.publicId)
          : kind === "xml"
            ? await creditNotesApi.downloadSunatXml(note.publicId)
            : await creditNotesApi.downloadSunatCdr(note.publicId);
      downloadBlob(
        blob,
        documentFileName(note.correlativo, kind === "cdr" ? "zip" : kind),
      );
    } catch (error) {
      toast.showToast({
        title: "No se pudo descargar el archivo",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const retry = async () => {
    if (!note || busy) return;
    setBusy("retry");
    try {
      await creditNotesApi.retrySunat(note.publicId);
      setNote(await creditNotesApi.findOne(note.publicId));
      toast.showToast({ title: "Envio SUNAT programado", variant: "success" });
    } catch (error) {
      toast.showToast({
        title: "No se pudo enviar a SUNAT",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <nav className="flex min-w-0 items-center gap-2" aria-label="Ruta actual">
      <Link
        href="/facturacion/nota-credito"
        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
      >
        Notas de credito
      </Link>
      <CaretRightIcon size={14} />
      <span className="truncate font-circular-bold">Detalle</span>
    </nav>
  );

  if (loading || !note) {
    return (
      <DashboardShell headerTitle={header}>
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
          {loading ? (
            <Image
              src="/svg/loader/Loader.svg"
              alt="Cargando"
              width={48}
              height={48}
            />
          ) : (
            <div className="text-center text-sm text-[var(--color-muted-foreground)]">
              <WarningCircleIcon size={44} className="mx-auto mb-2" />
              Nota de credito no encontrada
            </div>
          )}
        </div>
      </DashboardShell>
    );
  }

  const status = statusConfig[note.sunat.estado];
  const creator = note.creadoPor
    ? `${note.creadoPor.nombre} ${note.creadoPor.apellido}`.trim()
    : "Sistema";

  return (
    <DashboardShell headerTitle={header}>
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
              <ReceiptIcon size={22} weight="fill" />
            </div>
            <div>
              <p className="text-lg font-circular-bold text-[var(--color-text)]">
                {note.correlativo}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {note.tipoComprobante === "nota_credito_factura"
                  ? "Nota de credito de factura"
                  : "Nota de credito de boleta"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void retry()}
              disabled={Boolean(busy)}
              className="flex h-10 items-center gap-2 rounded-[12px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-bold disabled:opacity-50"
            >
              <PaperPlaneTiltIcon size={16} /> Enviar SUNAT
            </button>
            <button
              type="button"
              onClick={() => void download("pdf")}
              disabled={Boolean(busy)}
              className="flex h-10 items-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white disabled:opacity-50"
            >
              <DownloadSimpleIcon size={16} /> PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Info
            label="Fecha de emision"
            value={formatDateTime(note.createdAt)}
          />
          <Info
            label="Sucursal"
            value={note.sucursal?.nombre ?? "Sin sucursal"}
          />
          <Info label="Creado por" value={creator} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserIcon size={19} className="text-[var(--color-primary)]" />
              <h2 className="text-sm font-circular-bold text-[var(--color-text)]">
                Cliente
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Nombre" value={note.cliente?.nombre ?? "Cliente"} />
              <Info
                label="Documento"
                value={
                  note.cliente?.numeroDocumento
                    ? `${note.cliente.tipoDocumento.toUpperCase()} ${note.cliente.numeroDocumento}`
                    : "Sin documento"
                }
              />
            </div>
          </section>
          <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <StorefrontIcon
                size={19}
                className="text-[var(--color-primary)]"
              />
              <h2 className="text-sm font-circular-bold text-[var(--color-text)]">
                Comprobante afectado
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info
                label="Comprobante"
                value={note.ventaReferencia.correlativo}
              />
              <Info
                label="Fecha original"
                value={formatDateTime(note.ventaReferencia.createdAt)}
              />
            </div>
            <Link
              href={`/historial/ventas/${note.ventaReferencia.publicId}`}
              className="mt-3 inline-flex text-sm font-circular-bold text-[var(--color-primary)] hover:underline"
            >
              Ver venta original
            </Link>
          </section>
        </div>

        <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-circular-bold text-[var(--color-text)]">
            Motivo y estado
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <Info label="Codigo de motivo" value={note.codigoMotivo} />
            <Info label="Descripcion" value={note.descripcionMotivo} />
            <Info
              label="Stock"
              value={
                note.stockDevuelto ? "Devuelto al inventario" : "Sin devolucion"
              }
            />
          </div>
        </section>

        <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-circular-bold text-[var(--color-text)]">
            Productos acreditados
          </h2>
          <div className="space-y-3">
            {note.detalles.map((detail) => {
              const variant = detail.productoVariante;
              return (
                <div
                  key={detail.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-card)] p-3"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-input-bg)]">
                    {variant.imagen?.urlThumbnail ? (
                      <Image
                        src={variant.imagen.urlThumbnail}
                        alt={variant.producto.nombre}
                        width={56}
                        height={56}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PackageIcon
                        size={24}
                        className="text-[var(--color-muted-foreground)]"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                      {variant.producto.nombre}
                    </p>
                    {variant.producto.tipo === "variantes" ? (
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {variant.color.nombre} · Talla {variant.talla.nombre}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
                      SKU: {variant.sku ?? "-"} · IGV:{" "}
                      {formatMoney(detail.igvMonto)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {detail.cantidad} × {formatMoney(detail.precioUnitario)}
                    </p>
                    <p className="text-sm font-circular-bold text-[var(--color-text)]">
                      {formatMoney(detail.total)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-circular-bold text-[var(--color-text)]">
                SUNAT
              </h2>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-circular-bold",
                  status.bg,
                  status.text,
                )}
              >
                {status.label}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Codigo" value={note.sunat.codigo ?? "-"} />
              <Info label="Hash" value={note.sunat.hash ?? "-"} />
              <Info
                label="Enviado"
                value={formatDateTime(note.sunat.enviadoAt)}
              />
              <Info
                label="Respondido"
                value={formatDateTime(note.sunat.respondidoAt)}
              />
              <div className="sm:col-span-2">
                <Info
                  label="Mensaje"
                  value={note.sunat.mensaje ?? "Sin respuesta SUNAT"}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!note.sunat.xmlDisponible || Boolean(busy)}
                onClick={() => void download("xml")}
                className="flex h-9 items-center gap-2 rounded-[10px] bg-[var(--color-card)] px-3 text-xs font-circular-bold disabled:opacity-40"
              >
                <FileCodeIcon size={15} /> XML
              </button>
              <button
                type="button"
                disabled={!note.sunat.cdrDisponible || Boolean(busy)}
                onClick={() => void download("cdr")}
                className="flex h-9 items-center gap-2 rounded-[10px] bg-[var(--color-card)] px-3 text-xs font-circular-bold disabled:opacity-40"
              >
                <FileCodeIcon size={15} /> CDR
              </button>
            </div>
          </section>
          <section className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-circular-bold text-[var(--color-text)]">
              Resumen
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">
                  Op. gravadas
                </span>
                <strong>{formatMoney(note.opGravadas)}</strong>
              </div>
              {Number(note.opExoneradas) > 0 ? (
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">
                    Op. exoneradas
                  </span>
                  <strong>{formatMoney(note.opExoneradas)}</strong>
                </div>
              ) : null}
              {Number(note.opInafectas) > 0 ? (
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">
                    Op. inafectas
                  </span>
                  <strong>{formatMoney(note.opInafectas)}</strong>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">
                  IGV ({Number(note.igvPorcentaje).toFixed(2)}%)
                </span>
                <strong>{formatMoney(note.igvMonto)}</strong>
              </div>
              {Number(note.descuentoMonto) > 0 ? (
                <div className="flex justify-between text-[#ef4444]">
                  <span>Descuento</span>
                  <strong>-{formatMoney(note.descuentoMonto)}</strong>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base">
                <span className="font-circular-bold">Total</span>
                <strong className="font-circular-bold">
                  {formatMoney(note.total)}
                </strong>
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted-foreground)]">
          {note.sunat.estado === "aceptado" ? (
            <CheckCircleIcon size={15} className="text-[#10b981]" />
          ) : (
            <CalendarIcon size={15} />
          )}
          Actualizado {formatDateTime(note.updatedAt)}
        </div>
      </div>
    </DashboardShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { debitNotesApi, type DebitNoteResponse } from "@/lib/api/debit-notes";

export default function NotaDebitoDetallePage() {
  const { publicId } = useParams<{ publicId: string }>();
  const toast = useSystemToast();
  const [note, setNote] = useState<DebitNoteResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    debitNotesApi
      .findOne(publicId)
      .then(setNote)
      .finally(() => setLoading(false));
  }, [publicId]);
  useEffect(() => {
    debitNotesApi
      .findOne(publicId)
      .then(setNote)
      .finally(() => setLoading(false));
  }, [publicId]);

  const retry = async () => {
    try {
      await debitNotesApi.retry(publicId);
      toast.showToast({
        title: "Reintento solicitado",
        description: "Billing volvera a procesar la nota.",
        variant: "success",
      });
      load();
    } catch (error) {
      toast.showToast({
        title: "No se pudo reintentar",
        description:
          error instanceof Error ? error.message : "Intente nuevamente.",
        variant: "error",
      });
    }
  };
  const download = async (kind: "pdf" | "ticket" | "xml" | "cdr") => {
    try {
      const blob = await debitNotesApi[kind](publicId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${note?.correlativo ?? "nota-debito"}.${kind === "pdf" || kind === "ticket" ? "pdf" : "zip"}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.showToast({
        title: "Archivo no disponible",
        description:
          error instanceof Error
            ? error.message
            : "La nota aun esta procesando.",
        variant: "error",
      });
    }
  };

  return (
    <DashboardShell
      headerTitle={note?.correlativo ?? "Nota de debito"}
      headerParent={{
        label: "Notas de debito",
        href: "/facturacion/nota-debito",
      }}
    >
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:p-6">
        {loading || !note ? (
          <div className="grid min-h-96 place-items-center text-sm text-[var(--color-muted-foreground)]">
            Cargando nota de debito...
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-4">
            <section className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/facturacion/nota-debito"
                  className="grid size-10 place-items-center rounded-xl bg-[var(--color-input-bg)]"
                >
                  <ArrowLeftIcon size={19} />
                </Link>
                <div>
                  <h1 className="font-circular-bold">
                    {note.correlativo ?? "Comprobante en procesamiento"}
                  </h1>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Afecta a {note.ventaReferencia.correlativo}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Action
                  label="PDF"
                  onClick={() => download("pdf")}
                  disabled={!note.sunat.archivosDisponibles}
                />
                <Action
                  label="Ticket"
                  onClick={() => download("ticket")}
                  disabled={!note.sunat.archivosDisponibles}
                />
                <Action
                  label="XML"
                  onClick={() => download("xml")}
                  disabled={!note.sunat.archivosDisponibles}
                />
                <Action
                  label="CDR"
                  onClick={() => download("cdr")}
                  disabled={!note.sunat.archivosDisponibles}
                />
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white"
                >
                  <PaperPlaneTiltIcon size={17} />
                  Reenviar
                </button>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <Info label="Cliente" value={note.cliente.nombre} />
              <Info
                label="Motivo SUNAT"
                value={`${note.codigoMotivo} - ${note.descripcionMotivo}`}
              />
              <Info
                label="Vencimiento"
                value={new Date(
                  `${note.fechaVencimiento}T00:00:00`,
                ).toLocaleDateString("es-PE")}
              />
            </section>

            <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-circular-bold">Estado SUNAT</h2>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    Ambiente {note.billing.environment}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs font-circular-bold">
                  {note.sunat.estado.replaceAll("_", " ")}
                </span>
              </div>
              {(note.sunat.mensaje || note.billing.lastError) && (
                <div className="mt-4 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-3 text-sm text-[#dc2626]">
                  {note.sunat.mensaje || note.billing.lastError}
                </div>
              )}
            </section>

            <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-sm">
              <h2 className="font-circular-bold">Conceptos adicionales</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
                      <th className="p-3">Descripcion</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">IGV</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.detalles.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--color-border)]/60"
                      >
                        <td className="p-3">{item.descripcion}</td>
                        <td className="p-3">S/ {item.valorVenta}</td>
                        <td className="p-3">S/ {item.igvMonto}</td>
                        <td className="p-3 text-right font-circular-bold">
                          S/ {item.importe}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={3}
                        className="p-3 text-right font-circular-bold"
                      >
                        Total adicional
                      </td>
                      <td className="p-3 text-right text-base font-circular-bold text-[var(--color-primary)]">
                        S/{" "}
                        {note.detalles
                          .reduce((sum, item) => sum + Number(item.importe), 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </DashboardShell>
  );
}

function Action({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-border)] px-4 text-sm font-circular-bold disabled:opacity-40"
    >
      <DownloadSimpleIcon size={17} />
      {label}
    </button>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 text-sm font-circular-bold">{value}</p>
    </article>
  );
}

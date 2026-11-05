"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  NoteIcon,
  PlusIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { NativeSelect } from "@/components/ui/select";
import { debitNotesApi, type DebitNoteResponse } from "@/lib/api/debit-notes";

export default function NotaDebitoPage() {
  const [notes, setNotes] = useState<DebitNoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      debitNotesApi
        .findAll({
          search,
          sunatEstado: status || undefined,
          tipoComprobante: type || undefined,
          limit: 50,
        })
        .then((response) => setNotes(response.data))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, type]);

  const counters = useMemo(
    () => ({
      accepted: notes.filter((item) => item.sunat.estado === "aceptado").length,
      pending: notes.filter((item) =>
        ["pendiente_envio", "enviando", "pendiente_cdr"].includes(
          item.sunat.estado,
        ),
      ).length,
      observed: notes.filter((item) => item.sunat.estado === "observado")
        .length,
      errors: notes.filter((item) =>
        ["rechazado", "error_transitorio", "error_definitivo"].includes(
          item.sunat.estado,
        ),
      ).length,
    }),
    [notes],
  );
  const cards = [
    [
      "Aceptadas",
      counters.accepted,
      CheckCircleIcon,
      "text-[#059669] bg-[#10b981]/10",
    ],
    [
      "Por enviar",
      counters.pending,
      NoteIcon,
      "text-[#2563eb] bg-[#3b82f6]/10",
    ],
    [
      "Observadas",
      counters.observed,
      WarningCircleIcon,
      "text-[#d97706] bg-[#f59e0b]/10",
    ],
    [
      "Rechazadas / error",
      counters.errors,
      XCircleIcon,
      "text-[#dc2626] bg-[#ef4444]/10",
    ],
  ] as const;

  return (
    <DashboardShell headerTitle="Notas de Debito">
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:p-6">
        <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, Icon, tone]) => (
            <article
              key={label}
              className="flex items-center gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.10)]"
            >
              <span
                className={`grid size-11 place-items-center rounded-xl ${tone}`}
              >
                <Icon size={21} weight="fill" />
              </span>
              <div>
                <p className="text-xl font-circular-bold text-[var(--color-text)]">
                  {value}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {label}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.10)]">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon
                size={18}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por numero o cliente..."
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm outline-none"
              />
            </div>
            <NativeSelect
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente_envio">Por enviar</option>
              <option value="aceptado">Aceptado</option>
              <option value="observado">Observado</option>
              <option value="rechazado">Rechazado</option>
              <option value="error_definitivo">Error</option>
            </NativeSelect>
            <NativeSelect
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="nota_debito_factura">N/D Factura</option>
              <option value="nota_debito_boleta">N/D Boleta</option>
            </NativeSelect>
            <Link
              href="/facturacion/nota-debito/nuevo"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white"
            >
              <PlusIcon size={18} weight="bold" />
              Nueva nota de debito
            </Link>
          </div>

          {loading ? (
            <div className="grid min-h-72 place-items-center text-sm text-[var(--color-muted-foreground)]">
              Cargando notas de debito...
            </div>
          ) : notes.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-[14px] bg-[var(--color-input-bg)] text-center">
              <div>
                <NoteIcon
                  size={30}
                  className="mx-auto text-[var(--color-primary)]"
                  weight="fill"
                />
                <h2 className="mt-3 font-circular-bold">
                  Aun no hay notas de debito
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Las notas emitidas apareceran aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="text-xs text-[var(--color-muted-foreground)]">
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="p-3">Nota</th>
                    <th className="p-3">Comprobante afectado</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {notes.map((note) => (
                    <tr
                      key={note.publicId}
                      className="border-b border-[var(--color-border)]/60"
                    >
                      <td className="p-3 font-circular-bold">
                        {note.correlativo ?? "Procesando"}
                      </td>
                      <td className="p-3">
                        {note.ventaReferencia.correlativo}
                      </td>
                      <td className="p-3">{note.cliente.nombre}</td>
                      <td className="p-3 font-circular-bold">
                        S/{" "}
                        {note.detalles
                          .reduce((sum, item) => sum + Number(item.importe), 0)
                          .toFixed(2)}
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs">
                          {note.sunat.estado.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/facturacion/nota-debito/${note.publicId}`}
                          className="text-sm font-circular-bold text-[var(--color-primary)]"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </DashboardShell>
  );
}

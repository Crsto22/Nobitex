"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { NativeSelect } from "@/components/ui/select";
import { debitNotesApi, type EligibleDebitSale } from "@/lib/api/debit-notes";
import { seriesApi, type SerieComprobante } from "@/lib/api/sales";

type Adjustment = { enabled: boolean; amount: string; description: string };

export default function NuevaNotaDebitoPage() {
  const router = useRouter();
  const toast = useSystemToast();
  const [search, setSearch] = useState("");
  const [sales, setSales] = useState<EligibleDebitSale[]>([]);
  const [sale, setSale] = useState<EligibleDebitSale | null>(null);
  const [series, setSeries] = useState<SerieComprobante[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [reason, setReason] = useState<"01" | "02" | "03">("02");
  const [reasonDescription, setReasonDescription] = useState(
    "Aumento en el valor de la operacion",
  );
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>(
    {},
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      debitNotesApi
        .eligibleSales(search)
        .then(setSales)
        .catch(() => setSales([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!sale) return;
    const type =
      sale.tipoComprobante === "factura"
        ? "nota_debito_factura"
        : "nota_debito_boleta";
    seriesApi
      .findAll({ tipoComprobante: type, activo: true, limit: 100 })
      .then((response) => {
        setSeries(response.data);
        setSeriesId(
          response.data.find((item) => item.esPrincipal)?.id ??
            response.data[0]?.id ??
            "",
        );
      });
  }, [sale]);

  const selectSale = (item: EligibleDebitSale) => {
    setSale(item);
    setAdjustments(
      Object.fromEntries(
        item.detalles.map((line) => [
          line.id,
          { enabled: false, amount: "", description: line.descripcion },
        ]),
      ),
    );
  };

  const total = useMemo(
    () =>
      Object.values(adjustments).reduce(
        (sum, item) => sum + (item.enabled ? Number(item.amount) || 0 : 0),
        0,
      ),
    [adjustments],
  );
  const taxable = total / 1.18;

  const update = (id: string, patch: Partial<Adjustment>) =>
    setAdjustments((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));

  const submit = async () => {
    if (!sale || !seriesId) {
      toast.showToast({
        title: "Configuracion incompleta",
        description:
          "Seleccione un comprobante y una serie FD/BD sincronizada.",
        variant: "error",
      });
      return;
    }
    const selected = sale.detalles
      .filter((line) => adjustments[line.id]?.enabled)
      .map((line) => ({
        ventaDetalleId: line.id,
        importe: Number(adjustments[line.id].amount || 0).toFixed(2),
        descripcion: adjustments[line.id].description.trim(),
      }))
      .filter(
        (item) => Number(item.importe) > 0 && item.descripcion.length >= 3,
      );
    if (!selected.length) {
      toast.showToast({
        title: "Agregue un concepto",
        description:
          "Seleccione al menos una linea e ingrese un importe mayor a cero.",
        variant: "error",
      });
      return;
    }
    setSaving(true);
    try {
      const note = await debitNotesApi.create({
        ventaPublicId: sale.publicId,
        serieId: seriesId,
        codigoMotivo: reason,
        descripcionMotivo: reasonDescription,
        fechaVencimiento: dueDate,
        ajustes: selected,
      });
      toast.showToast({
        title: "Nota registrada",
        description: "Nuvex Billing esta procesando la emision.",
        variant: "success",
      });
      router.push(`/facturacion/nota-debito/${note.publicId}`);
    } catch (error) {
      toast.showToast({
        title: "No se pudo emitir",
        description:
          error instanceof Error ? error.message : "Revise los datos fiscales.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      headerTitle="Nueva Nota de Debito"
      headerParent={{
        label: "Notas de debito",
        href: "/facturacion/nota-debito",
      }}
    >
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <section className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/facturacion/nota-debito"
                className="grid size-10 place-items-center rounded-xl bg-[var(--color-input-bg)]"
              >
                <ArrowLeftIcon size={19} />
              </Link>
              <div>
                <h1 className="font-circular-bold">Registrar nota de debito</h1>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  El correlativo sera asignado por Nuvex Billing.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="h-11 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
            >
              {saving ? "Registrando..." : "Guardar y emitir"}
            </button>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
            <div className="space-y-4">
              <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-sm">
                <h2 className="text-sm font-circular-bold">
                  Comprobante aceptado
                </h2>
                <div className="relative mt-4">
                  <MagnifyingGlassIcon
                    size={18}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar numero o cliente..."
                    className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm outline-none"
                  />
                </div>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {sales.map((item) => (
                    <button
                      key={item.publicId}
                      type="button"
                      onClick={() => selectSale(item)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${sale?.publicId === item.publicId ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)]"}`}
                    >
                      <div>
                        <p className="text-sm font-circular-bold">
                          {item.correlativo}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {item.cliente?.nombre}
                        </p>
                      </div>
                      <span className="text-sm font-circular-bold">
                        S/ {item.total}
                      </span>
                    </button>
                  ))}
                  {!sales.length && (
                    <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                      No hay comprobantes aceptados con cliente identificado.
                    </p>
                  )}
                </div>
              </section>

              {sale && (
                <>
                  <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Serie FD/BD">
                        <NativeSelect
                          value={seriesId}
                          onChange={(event) => setSeriesId(event.target.value)}
                        >
                          <option value="">Seleccione</option>
                          {series.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.serie}
                            </option>
                          ))}
                        </NativeSelect>
                      </Field>
                      <Field label="Motivo SUNAT">
                        <NativeSelect
                          value={reason}
                          onChange={(event) =>
                            setReason(event.target.value as typeof reason)
                          }
                        >
                          <option value="01">01 - Intereses por mora</option>
                          <option value="02">02 - Aumento en el valor</option>
                          <option value="03">03 - Penalidades / otros</option>
                        </NativeSelect>
                      </Field>
                      <Field label="Vencimiento">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                          className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-4 text-sm"
                        />
                      </Field>
                    </div>
                    <Field label="Descripcion del motivo">
                      <textarea
                        value={reasonDescription}
                        onChange={(event) =>
                          setReasonDescription(event.target.value.slice(0, 250))
                        }
                        className="mt-2 min-h-20 w-full rounded-[14px] bg-[var(--color-input-bg)] p-4 text-sm outline-none"
                      />
                    </Field>
                  </section>

                  <section className="rounded-[14px] bg-[var(--color-card)] p-5 shadow-sm">
                    <h2 className="text-sm font-circular-bold">
                      Conceptos afectados
                    </h2>
                    <div className="mt-4 space-y-3">
                      {sale.detalles.map((line) => {
                        const value = adjustments[line.id];
                        return (
                          <div
                            key={line.id}
                            className="grid gap-3 rounded-xl border border-[var(--color-border)] p-3 md:grid-cols-[32px_1fr_160px]"
                          >
                            <input
                              type="checkbox"
                              checked={value?.enabled ?? false}
                              onChange={(event) =>
                                update(line.id, {
                                  enabled: event.target.checked,
                                })
                              }
                            />
                            <input
                              value={value?.description ?? ""}
                              disabled={!value?.enabled}
                              onChange={(event) =>
                                update(line.id, {
                                  description: event.target.value,
                                })
                              }
                              className="h-10 rounded-xl bg-[var(--color-input-bg)] px-3 text-sm disabled:opacity-50"
                            />
                            <input
                              value={value?.amount ?? ""}
                              disabled={!value?.enabled}
                              inputMode="decimal"
                              placeholder="Importe con IGV"
                              onChange={(event) =>
                                update(line.id, {
                                  amount: event.target.value.replace(
                                    /[^\d.]/g,
                                    "",
                                  ),
                                })
                              }
                              className="h-10 rounded-xl bg-[var(--color-input-bg)] px-3 text-sm disabled:opacity-50"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </div>

            <aside className="h-fit rounded-[14px] bg-[var(--color-card)] p-5 shadow-sm xl:sticky xl:top-4">
              <h2 className="text-sm font-circular-bold">
                Resumen del incremento
              </h2>
              <div className="mt-4 space-y-3 rounded-xl bg-[var(--color-input-bg)] p-4">
                <Total label="Valor adicional" value={taxable} />
                <Total label="IGV estimado" value={total - taxable} />
                <div className="border-t border-[var(--color-border)] pt-3">
                  <Total label="Total nota" value={total} strong />
                </div>
              </div>
              <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                Billing recalculara los importes definitivos según la afectacion
                tributaria de cada linea.
              </p>
            </aside>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-circular-bold">{label}</span>
      {children}
    </label>
  );
}
function Total({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span
        className={
          strong
            ? "font-circular-bold"
            : "text-xs text-[var(--color-muted-foreground)]"
        }
      >
        {label}
      </span>
      <span className="font-circular-bold">S/ {value.toFixed(2)}</span>
    </div>
  );
}

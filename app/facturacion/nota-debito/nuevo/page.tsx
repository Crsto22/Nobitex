"use client";

import { NativeSelect } from "@/components/ui/select";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  ReceiptIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { HistoryPeriodFilter } from "@/components/History/history-period-filter";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  debitNotesApi,
  type CreateDebitNotePayload,
} from "@/lib/api/debit-notes";
import {
  salesApi,
  seriesApi,
  type SerieComprobante,
  type VentaResponse,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";
import { defaultHistoryPeriod } from "@/lib/history-period";

type Adjustment = {
  enabled: boolean;
  amount: string;
  description: string;
};

type Motivo = CreateDebitNotePayload["codigoMotivo"];

const motiveOptions: { value: Motivo; label: string }[] = [
  { value: "01", label: "01 - Intereses por mora" },
  { value: "02", label: "02 - Aumento en el valor" },
  { value: "03", label: "03 - Penalidades / otros" },
];

function formatMoney(value: string | number) {
  const number = typeof value === "number" ? value : Number(value);
  return `S/${Number.isFinite(number) ? number.toFixed(2) : "0.00"}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intentalo nuevamente";
}

export default function NuevaNotaDebitoPage() {
  const router = useRouter();
  const toast = useSystemToast();
  const [search, setSearch] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState(defaultHistoryPeriod);
  const [sales, setSales] = useState<VentaResponse[]>([]);
  const [selectedSale, setSelectedSale] = useState<VentaResponse | null>(null);
  const [series, setSeries] = useState<SerieComprobante[]>([]);
  const [serieId, setSerieId] = useState("");
  const [codigoMotivo, setCodigoMotivo] = useState<Motivo>("02");
  const [descripcionMotivo, setDescripcionMotivo] = useState(
    "Aumento en el valor de la operacion",
  );
  const [fechaVencimiento, setFechaVencimiento] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>(
    {},
  );
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const noteSerieType =
    selectedSale?.tipoComprobante === "factura"
      ? "nota_debito_factura"
      : "nota_debito_boleta";

  const loadSales = useCallback(
    (options: RequestInit = {}) => {
      setIsLoadingSales(true);
      salesApi
        .findComprobantes(
          {
            page: 1,
            limit: 50,
            ...historyPeriod,
            search: search.trim() || undefined,
            noteEligibility: "debit",
          },
          options,
        )
        .then((response) => setSales(response.data))
        .catch((error) => {
          if (options.signal?.aborted) return;
          toast.showToast({
            title: "No se pudieron cargar comprobantes",
            description: getErrorMessage(error),
            variant: "error",
          });
        })
        .finally(() => {
          if (!options.signal?.aborted) setIsLoadingSales(false);
        });
    },
    [historyPeriod, search, toast],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => loadSales({ signal: controller.signal }),
      300,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadSales]);

  useEffect(() => {
    if (!selectedSale) return;
    seriesApi
      .findAll({ tipoComprobante: noteSerieType, activo: true, limit: 100 })
      .then((response) => {
        setSeries(response.data);
        setSerieId(
          response.data.find((item) => item.esPrincipal)?.id ??
            response.data[0]?.id ??
            "",
        );
      })
      .catch((error) =>
        toast.showToast({
          title: "No se pudieron cargar series",
          description: getErrorMessage(error),
          variant: "error",
        }),
      );
  }, [noteSerieType, selectedSale, toast]);

  const total = useMemo(
    () =>
      Object.values(adjustments).reduce(
        (sum, item) => sum + (item.enabled ? Number(item.amount) || 0 : 0),
        0,
      ),
    [adjustments],
  );
  const taxable = total / 1.18;
  const igv = total - taxable;

  const updateAdjustment = (id: string, patch: Partial<Adjustment>) =>
    setAdjustments((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));

  const save = async () => {
    if (!selectedSale) {
      toast.showToast({ title: "Selecciona un comprobante", variant: "error" });
      return;
    }
    if (!serieId) {
      toast.showToast({ title: "Selecciona una serie", variant: "error" });
      return;
    }
    const selected = selectedSale.detalles
      .filter((detail) => adjustments[detail.id]?.enabled)
      .map((detail) => ({
        ventaDetalleId: detail.id,
        importe: Number(adjustments[detail.id].amount || 0).toFixed(2),
        descripcion: adjustments[detail.id].description.trim(),
      }))
      .filter(
        (item) => Number(item.importe) > 0 && item.descripcion.length >= 3,
      );
    if (!selected.length) {
      toast.showToast({
        title: "Agrega un concepto",
        description:
          "Selecciona al menos una linea e ingresa un importe mayor a cero.",
        variant: "error",
      });
      return;
    }
    setIsSaving(true);
    try {
      await debitNotesApi.create({
        ventaPublicId: selectedSale.publicId,
        serieId,
        codigoMotivo,
        descripcionMotivo,
        fechaVencimiento,
        ajustes: selected,
      });
      toast.showToast({ title: "Nota de debito creada", variant: "success" });
      router.push("/facturacion/nota-debito");
    } catch (error) {
      toast.showToast({
        title: "No se pudo crear la nota",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
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
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !selectedSale}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-50"
          >
            <CheckCircleIcon size={16} weight="bold" />
            {isSaving ? "Guardando..." : "Crear nota"}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <h2 className="text-sm font-circular-bold text-[var(--color-text)]">
              Comprobante afectado
            </h2>
            <div className="relative mt-3">
              <MagnifyingGlassIcon
                size={18}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar factura, boleta o cliente"
                aria-label="Buscar factura, boleta o cliente"
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none"
              />
            </div>
            <div className="mt-3">
              <HistoryPeriodFilter
                value={historyPeriod}
                onChange={(value) => {
                  setHistoryPeriod(value);
                  setSelectedSale(null);
                  setAdjustments({});
                }}
              />
            </div>
            <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {isLoadingSales ? (
                <p className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                  Cargando...
                </p>
              ) : sales.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                  No hay comprobantes aceptados
                </p>
              ) : (
                sales.map((sale) => (
                  <button
                    key={sale.publicId}
                    type="button"
                    onClick={() => {
                      setSelectedSale(sale);
                      setAdjustments(
                        Object.fromEntries(
                          sale.detalles.map((detail) => [
                            detail.id,
                            {
                              enabled: false,
                              amount: "",
                              description:
                                detail.descripcion ??
                                detail.productoVariante.producto.nombre,
                            },
                          ]),
                        ),
                      );
                    }}
                    className={cn(
                      "w-full rounded-[12px] p-3 text-left transition-colors",
                      selectedSale?.publicId === sale.publicId
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    <p className="text-sm font-circular-bold">
                      {sale.correlativo}
                    </p>
                    <p className="truncate text-xs opacity-80">
                      {sale.cliente?.nombre ?? "Cliente"} -{" "}
                      {formatMoney(sale.total)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            {!selectedSale ? (
              <div className="flex min-h-[420px] items-center justify-center text-center">
                <div>
                  <ReceiptIcon
                    size={48}
                    weight="light"
                    className="mx-auto text-[var(--color-muted-foreground)]"
                  />
                  <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                    Selecciona un comprobante
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Info label="Comprobante" value={selectedSale.correlativo} />
                  <Info
                    label="Cliente"
                    value={selectedSale.cliente?.nombre ?? "-"}
                  />
                  <Info
                    label="Total original"
                    value={formatMoney(selectedSale.total)}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Serie
                    </span>
                    <NativeSelect
                      value={serieId}
                      onChange={(event) => setSerieId(event.target.value)}
                      className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none"
                    >
                      {series.map((serie) => (
                        <option key={serie.id} value={serie.id}>
                          {serie.serie}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Motivo SUNAT
                    </span>
                    <NativeSelect
                      value={codigoMotivo}
                      onChange={(event) =>
                        setCodigoMotivo(event.target.value as Motivo)
                      }
                      className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none"
                    >
                      {motiveOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Vencimiento
                    </span>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(event) =>
                        setFechaVencimiento(event.target.value)
                      }
                      className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    Descripcion del motivo
                  </span>
                  <input
                    value={descripcionMotivo}
                    onChange={(event) =>
                      setDescripcionMotivo(event.target.value)
                    }
                    className="h-11 w-full rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none"
                  />
                </label>

                <div className="overflow-hidden rounded-[12px] border border-[var(--color-border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--color-input-bg)] text-xs text-[var(--color-muted-foreground)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Producto</th>
                        <th className="px-3 py-2 text-left">Concepto</th>
                        <th className="px-3 py-2 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.detalles.map((detail) => {
                        const value = adjustments[detail.id];
                        return (
                          <tr
                            key={detail.id}
                            className="border-t border-[var(--color-border)]"
                          >
                            <td className="px-3 py-2 text-[var(--color-text)]">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={value?.enabled ?? false}
                                  onChange={(event) =>
                                    updateAdjustment(detail.id, {
                                      enabled: event.target.checked,
                                    })
                                  }
                                />
                                <span className="truncate">
                                  {detail.descripcion ??
                                    detail.productoVariante.producto.nombre}
                                </span>
                              </label>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={value?.description ?? ""}
                                disabled={!value?.enabled}
                                onChange={(event) =>
                                  updateAdjustment(detail.id, {
                                    description: event.target.value,
                                  })
                                }
                                aria-label="Concepto"
                                className="h-9 w-full rounded-[10px] bg-[var(--color-input-bg)] px-2 text-[var(--color-text)] outline-none disabled:opacity-50"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={value?.amount ?? ""}
                                disabled={!value?.enabled}
                                inputMode="decimal"
                                placeholder="Con IGV"
                                onChange={(event) =>
                                  updateAdjustment(detail.id, {
                                    amount: event.target.value.replace(
                                      /[^\d.]/g,
                                      "",
                                    ),
                                  })
                                }
                                aria-label="Importe con IGV"
                                className="h-9 w-28 rounded-[10px] bg-[var(--color-input-bg)] px-2 text-right text-[var(--color-text)] outline-none disabled:opacity-50"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="ml-auto grid max-w-sm gap-2 rounded-[12px] bg-[var(--color-input-bg)] p-4 text-sm text-[var(--color-text)]">
                  <TotalRow label="Subtotal" value={taxable} />
                  <TotalRow label="IGV" value={igv} />
                  <TotalRow label="Total nota" value={total} strong />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-input-bg)] p-3">
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 truncate text-sm font-circular-bold text-[var(--color-text)]">
        {value}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        strong && "text-base font-circular-bold",
      )}
    >
      <span>{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}

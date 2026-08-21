"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ReceiptIcon } from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  StockItemPicker,
  type SelectedStockItem,
} from "@/components/Stock/stock-item-picker";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { CalendarInput } from "@/components/ui/calendar-input";
import { Select } from "@/components/ui/select";
import {
  purchasesApi,
  type PurchaseDocumentType,
  type Supplier,
} from "@/lib/api/purchases";
import { stockApi } from "@/lib/api/stock";

const documentOptions: Array<{ value: "" | PurchaseDocumentType; label: string }> = [
  { value: "", label: "Sin comprobante" },
  { value: "factura", label: "Factura" },
  { value: "boleta", label: "Boleta" },
  { value: "otro", label: "Otro" },
];

type Location = {
  id: string;
  nombre: string;
  tipo: "tienda" | "almacen";
  canUseAsOrigin: boolean;
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [documentType, setDocumentType] = useState<"" | PurchaseDocumentType>("");
  const [issueDate, setIssueDate] = useState("");
  const [serie, setSerie] = useState("");
  const [number, setNumber] = useState("");
  const [items, setItems] = useState<SelectedStockItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    purchasesApi
      .suppliers({ page: 1, limit: 100, activo: true })
      .then((result) => {
        setSuppliers(result.data);
        if (result.data.length === 1) setSupplierId(result.data[0].id);
      })
      .catch(() => setSuppliers([]));

    stockApi
      .locations()
      .then((result) => {
        setLocations(result);
        if (result.length === 1) setDestinationId(result[0].id);
      })
      .catch(() => setLocations([]));
  }, []);

  const selectDestination = (value: string) => {
    if (value !== destinationId) setItems([]);
    setDestinationId(value);
  };

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + item.cantidad, 0),
    [items],
  );
  const totalCost = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.cantidad * Number(item.costoUnitario || 0),
        0,
      ),
    [items],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supplierId || !destinationId || !items.length) {
      showToast({
        title: "Completa la orden",
        description: "Selecciona proveedor, destino y productos.",
        variant: "warning",
      });
      return;
    }
    if (items.some((item) => Number(item.costoUnitario ?? -1) < 0)) {
      showToast({
        title: "Costo invalido",
        description: "Revisa los costos unitarios.",
        variant: "warning",
      });
      return;
    }
    setSubmitting(true);
    try {
      await purchasesApi.createOrder({
        proveedorId: supplierId,
        destinoSucursalId: destinationId,
        ...(documentType ? { tipoComprobante: documentType } : {}),
        ...(issueDate ? { fechaEmision: issueDate } : {}),
        ...(serie.trim() ? { serie: serie.trim() } : {}),
        ...(number.trim() ? { numero: number.trim() } : {}),
        items: items.map((item) => ({
          productoVarianteId: item.productoVarianteId,
          cantidad: item.cantidad,
          costoUnitario: Number(item.costoUnitario || 0),
        })),
      });
      showToast({
        title: "Orden registrada",
        description: "El stock ingreso al destino seleccionado.",
        variant: "success",
      });
      router.push("/compras/ordenes");
    } catch (error) {
      showToast({
        title: "No se pudo registrar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell
      headerTitle="Nueva orden"
      headerParent={{ label: "Ordenes de compra", href: "/compras/ordenes" }}
    >
      <form onSubmit={submit} className="min-h-full space-y-4 bg-[var(--color-background)] p-4 lg:p-6">
        <div className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
          <h1 className="text-lg font-circular-bold text-[var(--color-text)] text-fixed-lg">
            Registrar orden de compra
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Al guardar, el stock se agregara al destino seleccionado.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="space-y-5 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <Select
              label="Proveedor"
              required
              searchable
              value={supplierId}
              onChange={setSupplierId}
              placeholder="Seleccionar proveedor"
              options={suppliers.map((supplier) => ({
                value: supplier.id,
                label: `${supplier.displayName} · RUC ${supplier.ruc}`,
              }))}
            />
            <Select
              label="Destino"
              required
              searchable
              value={destinationId}
              onChange={selectDestination}
              placeholder="Seleccionar tienda o almacen"
              options={locations.map((location) => ({
                value: location.id,
                label: `${location.nombre} · ${location.tipo === "tienda" ? "Tienda" : "Almacen"}`,
              }))}
            />

            <div className="rounded-[14px] bg-[var(--color-background)] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-circular-bold text-[var(--color-text)]">
                <ReceiptIcon size={17} />
                Comprobante opcional
              </div>
              <div className="grid gap-3">
                <Select
                  value={documentType}
                  onChange={(value) => setDocumentType(value as "" | PurchaseDocumentType)}
                  placeholder="Tipo de comprobante"
                  options={documentOptions}
                />
                <CalendarInput value={issueDate} onChange={setIssueDate} labelInline="Fecha emision" clearable />
                <div className="grid grid-cols-2 gap-3">
                  <input value={serie} onChange={(event) => setSerie(event.target.value.toUpperCase())} placeholder="Serie" maxLength={20} className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                  <input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Numero" maxLength={30} className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
                </div>
              </div>
            </div>

            <div className="rounded-[14px] bg-[var(--color-background)] p-4">
              <p className="text-xs text-[var(--color-muted-foreground)]">Resumen</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-[var(--color-text)]">{items.length} productos</p>
                  <p className="text-2xl font-circular-bold text-[var(--color-primary)]">{totalUnits}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--color-text)]">Total costo</p>
                  <p className="text-2xl font-circular-bold text-[var(--color-primary)]">{money(totalCost)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                Productos, cantidades y costo
              </h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Busca productos y coloca cantidad comprada y costo unitario.
              </p>
            </div>
            <StockItemPicker
              sucursalId={destinationId}
              items={items}
              onChange={setItems}
              enforceAvailable={false}
              showCostInput
            />
          </section>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/compras/ordenes")}
            className="h-11 rounded-[14px] bg-[var(--color-card)] px-5 text-sm font-circular-bold text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white disabled:opacity-60"
          >
            <CheckIcon size={17} weight="bold" />
            {submitting ? "Registrando..." : "Registrar orden"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

function money(value: number) {
  return value.toLocaleString("es-PE", { style: "currency", currency: "PEN" });
}

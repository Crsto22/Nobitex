"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  FloppyDiskIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { CalendarInput } from "@/components/ui/calendar-input";
import { Select } from "@/components/ui/select";
import { UbigeoSelect, type PeruUbigeo } from "@/components/ui/ubigeo-select";
import { branchesApi, type Branch } from "@/lib/api/branches";
import {
  guiaRemisionApi,
  guiaRemisionCatalogosApi,
  type CreateGuiaRemisionDetalle,
  type CreateGuiaRemisionPayload,
  type GuiaCatalogoParticipante,
  type GuiaCatalogoVehiculo,
} from "@/lib/api/guia-remision";
import { productsApi, type ProductResponse } from "@/lib/api/products";

function getDefaultForm() {
  return {
    sucursalId: "",
    sucursalPartidaId: "",
    sucursalLlegadaId: "",
    fechaInicioTraslado: new Date().toISOString().slice(0, 10),
    motivoTraslado: "04",
    descripcionMotivo: "",
    pesoBrutoTotal: "1.000",
    numeroBultos: "1",
    destinatarioTipoDoc: "6",
    destinatarioNroDoc: "",
    destinatarioRazonSocial: "",
    conductorId: "",
    vehiculoId: "",
    documentoTipo: "",
    documentoSerie: "",
    documentoNumero: "",
    observaciones: "",
    emitirDirectamente: false,
    partidaModo: "sucursal" as "sucursal" | "externa",
    llegadaModo: "sucursal" as "sucursal" | "externa",
    ubigeoPartida: "",
    direccionPartida: "",
    ubigeoLlegada: "",
    direccionLlegada: "",
  };
}

const defaultDetail: CreateGuiaRemisionDetalle = {
  descripcion: "",
  cantidad: "1",
  unidadMedida: "NIU",
  codigoProducto: "",
  pesoUnitario: "",
};
type DraftDetail = CreateGuiaRemisionDetalle & { uiId: string };

const motivoOptions = [
  { label: "Traslado entre establecimientos", value: "04" },
  { label: "Venta", value: "01" },
  { label: "Compra", value: "02" },
  { label: "Venta con entrega a terceros", value: "03" },
  { label: "Consignacion", value: "05" },
  { label: "Devolucion", value: "06" },
  { label: "Otros", value: "13" },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intentalo nuevamente";
}

export default function CrearGuiaRemisionPage() {
  const router = useRouter();
  const toast = useSystemToast();

  const [form, setForm] = useState(() => getDefaultForm());
  const [details, setDetails] = useState<DraftDetail[]>([
    { ...defaultDetail, uiId: "initial" },
  ]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [conductores, setConductores] = useState<GuiaCatalogoParticipante[]>(
    [],
  );
  const [vehiculos, setVehiculos] = useState<GuiaCatalogoVehiculo[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductResponse[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  const isMotivoTrasladoInterno = form.motivoTraslado === "04";
  const requiereDestinatario = form.motivoTraslado !== "04";
  const requiereDocumentoRelacionado = form.motivoTraslado !== "04";
  const requiereDescripcionMotivo = form.motivoTraslado === "13";

  const productSearchSucursalId =
    form.sucursalPartidaId || form.sucursalLlegadaId || null;

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      branchesApi.findAll({ limit: 100, estado: "activo" }),
      guiaRemisionCatalogosApi.findParticipantes({
        limit: 100,
        tipo: "conductor",
        activo: true,
      }),
      guiaRemisionCatalogosApi.findVehiculos({ limit: 100, activo: true }),
    ])
      .then(([branchesResponse, driversResponse, vehiclesResponse]) => {
        if (!isMounted) return;

        setBranches(
          branchesResponse.data.filter((branch) => branch.tipo !== "asistencia"),
        );
        setConductores(driversResponse.data);
        setVehiculos(vehiclesResponse.data);

        const defaultBranch =
          branchesResponse.data.find((branch) => branch.esPrincipal) ??
          branchesResponse.data[0];

        setForm((current) => ({
          ...current,
          sucursalId: current.sucursalId || defaultBranch?.id || "",
          sucursalPartidaId:
            current.sucursalPartidaId || defaultBranch?.id || "",
          sucursalLlegadaId:
            current.sucursalLlegadaId || defaultBranch?.id || "",
        }));
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        toast.showToast({
          title: "No se pudieron cargar datos",
          description: getErrorMessage(error),
          variant: "error",
        });
      })
      .finally(() => {
        if (isMounted) setIsCatalogLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [toast]);

  useEffect(() => {
    searchAbortRef.current?.abort();

    if (!productSearchSucursalId || productQuery.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    const timer = window.setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const response = await productsApi.findAll({
          search: productQuery.trim(),
          sucursalId: productSearchSucursalId ?? undefined,
          limit: 8,
          status: "active",
        });
        if (!controller.signal.aborted) {
          setProductResults(response.data);
        }
      } catch {
        if (!controller.signal.aborted) {
          setProductResults([]);
        }
      } finally {
        setLoadingProducts(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [productSearchSucursalId, productQuery]);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
    };
  }, []);

  const addProductToDetails = useCallback(
    (product: ProductResponse) => {
      const descripcion = product.descripcion || product.nombre;
      const exists = details.some(
        (d) => d.descripcion.trim() === descripcion.trim(),
      );
      if (exists) return;

      const variante = product.variantes?.[0];
      setDetails((current) => [
        ...current,
        {
          uiId: crypto.randomUUID(),
          descripcion,
          cantidad: "1",
          unidadMedida: product.unidadMedida?.codigo?.toUpperCase() || "NIU",
          codigoProducto: variante?.sku || product.publicId,
          pesoUnitario: "",
        },
      ]);
      setProductQuery("");
      setProductResults([]);
    },
    [details],
  );

  const updateDetail = (
    index: number,
    patch: Partial<CreateGuiaRemisionDetalle>,
  ) => {
    setDetails((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeDetail = (index: number) => {
    setDetails((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const cleanDetails = details.flatMap((detail) => {
      const cleanDetail = {
        descripcion: detail.descripcion.trim(),
        cantidad: detail.cantidad.trim(),
        unidadMedida: (detail.unidadMedida || "NIU").trim().toUpperCase(),
        codigoProducto: detail.codigoProducto?.trim() || undefined,
        pesoUnitario: detail.pesoUnitario?.trim() || undefined,
      };

      return cleanDetail.descripcion ? [cleanDetail] : [];
    });

    if (!form.sucursalId) {
      setFormError("Selecciona sucursal de emision.");
      return;
    }

    if (form.partidaModo === "sucursal" && !form.sucursalPartidaId) {
      setFormError("Selecciona sucursal de partida.");
      return;
    }

    if (form.llegadaModo === "sucursal" && !form.sucursalLlegadaId) {
      setFormError("Selecciona sucursal de llegada.");
      return;
    }

    if (form.partidaModo === "externa" && !form.ubigeoPartida) {
      setFormError("Selecciona ubigeo de partida.");
      return;
    }

    if (form.llegadaModo === "externa" && !form.ubigeoLlegada) {
      setFormError("Selecciona ubigeo de llegada.");
      return;
    }

    if (requiereDestinatario) {
      if (!form.destinatarioNroDoc || !form.destinatarioRazonSocial) {
        setFormError("Completa documento y razon social del destinatario.");
        return;
      }
    }

    if (!form.conductorId || !form.vehiculoId) {
      setFormError("Selecciona conductor y placa.");
      return;
    }

    if (!cleanDetails.length) {
      setFormError("Agrega al menos un detalle.");
      return;
    }

    if (requiereDescripcionMotivo && !form.descripcionMotivo.trim()) {
      setFormError("Describe el motivo de traslado.");
      return;
    }

    const documentosRelacionados =
      requiereDocumentoRelacionado &&
      form.documentoTipo &&
      form.documentoSerie.trim() &&
      form.documentoNumero.trim()
        ? [
            {
              tipoDocumento: form.documentoTipo,
              serie: form.documentoSerie.trim().toUpperCase(),
              numero: form.documentoNumero.trim(),
            },
          ]
        : undefined;

    const payload: CreateGuiaRemisionPayload = {
      sucursalId: form.sucursalId,
      fechaInicioTraslado: form.fechaInicioTraslado,
      motivoTraslado: form.motivoTraslado,
      ...(form.descripcionMotivo.trim()
        ? { descripcionMotivo: form.descripcionMotivo.trim() }
        : {}),
      modalidadTransporte: "02",
      pesoBrutoTotal: form.pesoBrutoTotal,
      unidadPeso: "KGM",
      numeroBultos: form.numeroBultos ? Number(form.numeroBultos) : undefined,
      observaciones: form.observaciones.trim() || undefined,
      sucursalPartidaId:
        form.partidaModo === "sucursal" ? form.sucursalPartidaId : undefined,
      sucursalLlegadaId:
        form.llegadaModo === "sucursal" ? form.sucursalLlegadaId : undefined,
      destinatarioTipoDoc: form.destinatarioTipoDoc,
      destinatarioNroDoc: form.destinatarioNroDoc.trim(),
      destinatarioRazonSocial: form.destinatarioRazonSocial.trim(),
      detalles: cleanDetails,
      documentosRelacionados,
      catalogoParticipanteIds: [form.conductorId],
      catalogoVehiculoIds: [form.vehiculoId],
      emitirDirectamente: form.emitirDirectamente,
    };

    setIsSubmitting(true);
    const loadingId = toast.showToast({
      title: "Creando guia...",
      description: "GRE Remitente",
      variant: "loading",
    });

    try {
      const created = await guiaRemisionApi.create(payload);
      toast.dismissToast(loadingId);
      toast.showToast({
        title: "Guia creada",
        description: created.correlativo,
        variant: "success",
      });
      router.push("/gre/remitente");
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.dismissToast(loadingId);
      setFormError(message);
      toast.showToast({
        title: "No se pudo crear la guia",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const partidaBranch = branches.find((b) => b.id === form.sucursalPartidaId);
  const llegadaBranch = branches.find((b) => b.id === form.sucursalLlegadaId);

  return (
    <DashboardShell
      headerTitle="Nueva guia de remision"
      headerParent={{
        label: "Guías de remisión",
        href: "/gre/remitente",
      }}
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div>
          <div>
            <h1 className="text-2xl font-circular-bold text-[var(--color-text)] text-fixed-2xl">
              Nueva guia de remision
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              GRE Remitente
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid items-start gap-4 xl:grid-cols-[3fr_2.5fr]">
            <div className="space-y-4 xl:order-1">
              <div className="grid gap-4 md:grid-cols-2">
                <section className="space-y-4 rounded-[16px] bg-[var(--color-sidebar-bg)] p-4 shadow-sm">
                  <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                    Datos del documento
                  </h2>

                  <Select
                    label="Sucursal emision"
                    value={form.sucursalId}
                    onChange={(value) =>
                      setForm((c) => ({ ...c, sucursalId: value }))
                    }
                    options={branches.map((branch) => ({
                      label: branch.esPrincipal
                        ? `${branch.nombre} - Principal`
                        : branch.nombre,
                      value: branch.id,
                    }))}
                    placeholder={
                      isCatalogLoading ? "Cargando..." : "Seleccionar"
                    }
                  />

                  <CalendarInput
                    label="Fecha inicio traslado"
                    value={form.fechaInicioTraslado}
                    disabled={isSubmitting}
                    onChange={(value) =>
                      setForm((c) => ({ ...c, fechaInicioTraslado: value }))
                    }
                  />

                  <Select
                    label="Motivo de traslado"
                    value={form.motivoTraslado}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        motivoTraslado: value,
                        ...(value === "04"
                          ? {
                              partidaModo: "sucursal" as const,
                              llegadaModo: "sucursal" as const,
                              descripcionMotivo: "",
                              destinatarioNroDoc: "",
                              destinatarioRazonSocial: "",
                              documentoTipo: "",
                              documentoSerie: "",
                              documentoNumero: "",
                              ubigeoPartida: "",
                              direccionPartida: "",
                              ubigeoLlegada: "",
                              direccionLlegada: "",
                            }
                          : {}),
                      }))
                    }
                    options={motivoOptions}
                  />

                  {!isMotivoTrasladoInterno && (
                    <div>
                      <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
                        Descripcion del motivo{" "}
                        {requiereDescripcionMotivo && (
                          <span className="text-[var(--color-primary)]">*</span>
                        )}
                      </span>
                      <textarea
                        value={form.descripcionMotivo}
                        disabled={isSubmitting}
                        onChange={(e) =>
                          setForm((c) => ({
                            ...c,
                            descripcionMotivo: e.target.value.slice(0, 255),
                          }))
                        }
                        placeholder="Ej. Envio por mantenimiento"
                        aria-label="Ej. Envio por mantenimiento"
                        className="min-h-20 w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <p className="mt-1 text-right text-[10px] text-[var(--color-muted-foreground)]">
                        {form.descripcionMotivo.length}/255
                      </p>
                    </div>
                  )}

                  <label className="flex items-center justify-between rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3">
                    <div>
                      <span className="block text-sm font-circular-regular text-[var(--color-text)]">
                        Emitir directamente
                      </span>
                      <span className="block text-xs text-[var(--color-muted-foreground)]">
                        Se enviara a SUNAT al registrar
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.emitirDirectamente}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setForm((c) => ({
                          ...c,
                          emitirDirectamente: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                  </label>
                </section>

                <section className="space-y-4 rounded-[16px] bg-[var(--color-sidebar-bg)] p-4 shadow-sm">
                  <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                    Tipo de transporte
                  </h2>

                  <div className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3.5">
                    <UserIcon
                      size={20}
                      weight="bold"
                      className="text-[var(--color-primary)]"
                    />
                    <p className="text-sm font-circular-bold text-[var(--color-text)]">
                      Privado
                    </p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Conductor propio
                    </p>
                  </div>

                  <Select
                    label="Conductor"
                    value={form.conductorId}
                    onChange={(value) =>
                      setForm((c) => ({ ...c, conductorId: value }))
                    }
                    options={conductores.map((driver) => ({
                      label:
                        [driver.nombres, driver.apellidos]
                          .filter(Boolean)
                          .join(" ") || driver.numeroDocumento,
                      value: driver.publicId,
                    }))}
                    placeholder={
                      isCatalogLoading ? "Cargando..." : "Seleccionar"
                    }
                    searchable
                  />

                  <Select
                    label="Placa del vehiculo"
                    value={form.vehiculoId}
                    onChange={(value) =>
                      setForm((c) => ({ ...c, vehiculoId: value }))
                    }
                    options={vehiculos.map((vehicle) => ({
                      label: vehicle.placa,
                      value: vehicle.publicId,
                    }))}
                    placeholder={
                      isCatalogLoading ? "Cargando..." : "Seleccionar"
                    }
                    searchable
                  />
                </section>
              </div>

              <section className="rounded-[16px] bg-[var(--color-sidebar-bg)] p-4 shadow-sm">
                <h2 className="mb-4 text-base font-circular-bold text-[var(--color-text)]">
                  Ruta de traslado
                </h2>
                <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981]/15 text-[10px] font-circular-bold text-[#10b981]">
                        A
                      </span>
                      <span className="text-sm font-circular-regular text-[var(--color-text)]">
                        Punto de partida
                      </span>
                    </div>

                    {!isMotivoTrasladoInterno && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((c) => ({
                              ...c,
                              partidaModo: "sucursal",
                              ubigeoPartida: "",
                              direccionPartida: "",
                            }))
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-circular-bold transition-colors ${
                            form.partidaModo === "sucursal"
                              ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
                          }`}
                        >
                          Sucursal propia
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((c) => ({
                              ...c,
                              partidaModo: "externa",
                              sucursalPartidaId: "",
                            }))
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-circular-bold transition-colors ${
                            form.partidaModo === "externa"
                              ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
                          }`}
                        >
                          Direccion externa
                        </button>
                      </div>
                    )}

                    {form.partidaModo === "sucursal" ? (
                      <>
                        <Select
                          label=""
                          value={form.sucursalPartidaId}
                          onChange={(value) =>
                            setForm((c) => ({
                              ...c,
                              sucursalPartidaId: value,
                            }))
                          }
                          options={branches.map((branch) => ({
                            label: `${branch.nombre} - ${branch.distrito}`,
                            value: branch.id,
                          }))}
                          placeholder="Seleccionar sucursal"
                        />
                        {partidaBranch && (
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {partidaBranch.direccion} - {partidaBranch.distrito}
                            {partidaBranch.ubigeo ? (
                              <>
                                {" "}
                                ·{" "}
                                <span className="font-mono">
                                  {partidaBranch.ubigeo}
                                </span>
                              </>
                            ) : null}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <UbigeoSelect
                          value={form.ubigeoPartida}
                          disabled={isSubmitting}
                          label=""
                          onSelect={(item: PeruUbigeo) =>
                            setForm((c) => ({
                              ...c,
                              ubigeoPartida: item.ubigeo,
                            }))
                          }
                        />
                        <input
                          value={form.direccionPartida}
                          disabled={isSubmitting}
                          onChange={(e) =>
                            setForm((c) => ({
                              ...c,
                              direccionPartida: e.target.value,
                            }))
                          }
                          placeholder="Direccion completa de partida"
                          aria-label="Direccion completa de partida"
                          className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    )}
                  </div>

                  <div className="hidden items-center justify-center pt-6 md:flex">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)] shadow-sm">
                      <ArrowRightIcon size={16} weight="bold" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/15 text-[10px] font-circular-bold text-[#3b82f6]">
                        B
                      </span>
                      <span className="text-sm font-circular-regular text-[var(--color-text)]">
                        Punto de llegada
                      </span>
                    </div>

                    {!isMotivoTrasladoInterno && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((c) => ({
                              ...c,
                              llegadaModo: "sucursal",
                              ubigeoLlegada: "",
                              direccionLlegada: "",
                            }))
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-circular-bold transition-colors ${
                            form.llegadaModo === "sucursal"
                              ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
                          }`}
                        >
                          Sucursal propia
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((c) => ({
                              ...c,
                              llegadaModo: "externa",
                              sucursalLlegadaId: "",
                            }))
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-circular-bold transition-colors ${
                            form.llegadaModo === "externa"
                              ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                              : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
                          }`}
                        >
                          Direccion externa
                        </button>
                      </div>
                    )}

                    {form.llegadaModo === "sucursal" ? (
                      <>
                        <Select
                          label=""
                          value={form.sucursalLlegadaId}
                          onChange={(value) =>
                            setForm((c) => ({
                              ...c,
                              sucursalLlegadaId: value,
                            }))
                          }
                          options={branches.flatMap((branch) =>
                            branch.id === form.sucursalPartidaId
                              ? []
                              : [
                                  {
                                    label: `${branch.nombre} - ${branch.distrito}`,
                                    value: branch.id,
                                  },
                                ],
                          )}
                          placeholder="Seleccionar sucursal"
                        />
                        {llegadaBranch && (
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {llegadaBranch.direccion} - {llegadaBranch.distrito}
                            {llegadaBranch.ubigeo ? (
                              <>
                                {" "}
                                ·{" "}
                                <span className="font-mono">
                                  {llegadaBranch.ubigeo}
                                </span>
                              </>
                            ) : null}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <UbigeoSelect
                          value={form.ubigeoLlegada}
                          disabled={isSubmitting}
                          label=""
                          onSelect={(item: PeruUbigeo) =>
                            setForm((c) => ({
                              ...c,
                              ubigeoLlegada: item.ubigeo,
                            }))
                          }
                        />
                        <input
                          value={form.direccionLlegada}
                          disabled={isSubmitting}
                          onChange={(e) =>
                            setForm((c) => ({
                              ...c,
                              direccionLlegada: e.target.value,
                            }))
                          }
                          placeholder="Direccion completa de llegada"
                          aria-label="Direccion completa de llegada"
                          className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {requiereDestinatario && (
                <section className="space-y-4 rounded-[16px] bg-[var(--color-sidebar-bg)] p-4 shadow-sm">
                  <div>
                    <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                      Destinatario
                    </h2>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Obligatorio para este motivo.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
                    <Select
                      label="Tipo doc."
                      value={form.destinatarioTipoDoc}
                      onChange={(value) =>
                        setForm((c) => ({
                          ...c,
                          destinatarioTipoDoc: value,
                          destinatarioNroDoc: "",
                        }))
                      }
                      options={[
                        { label: "RUC", value: "6" },
                        { label: "DNI", value: "1" },
                      ]}
                    />
                    <InputField
                      id="gre-recipient-doc"
                      label="Numero documento"
                      value={form.destinatarioNroDoc}
                      maxLength={form.destinatarioTipoDoc === "6" ? 11 : 8}
                      disabled={isSubmitting}
                      onChange={(value) =>
                        setForm((c) => ({
                          ...c,
                          destinatarioNroDoc: value.replace(/\D/g, ""),
                        }))
                      }
                    />
                  </div>
                  <InputField
                    id="gre-recipient-name"
                    label="Razon social / nombre"
                    value={form.destinatarioRazonSocial}
                    disabled={isSubmitting}
                    onChange={(value) =>
                      setForm((c) => ({ ...c, destinatarioRazonSocial: value }))
                    }
                  />
                </section>
              )}

              {requiereDocumentoRelacionado && (
                <section className="space-y-4 rounded-[16px] bg-[var(--color-sidebar-bg)] p-4 shadow-sm">
                  <div>
                    <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                      Documento relacionado
                    </h2>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Opcional para sustentar la operacion.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Select
                      label="Tipo"
                      value={form.documentoTipo}
                      onChange={(value) =>
                        setForm((c) => ({ ...c, documentoTipo: value }))
                      }
                      options={[
                        { label: "Sin documento", value: "" },
                        { label: "Factura", value: "01" },
                        { label: "Boleta", value: "03" },
                        { label: "Nota venta", value: "04" },
                      ]}
                    />
                    <InputField
                      id="gre-doc-serie"
                      label="Serie"
                      value={form.documentoSerie}
                      maxLength={4}
                      disabled={isSubmitting}
                      onChange={(value) =>
                        setForm((c) => ({
                          ...c,
                          documentoSerie: value.toUpperCase().slice(0, 4),
                        }))
                      }
                    />
                    <InputField
                      id="gre-doc-number"
                      label="Numero"
                      value={form.documentoNumero}
                      disabled={isSubmitting}
                      onChange={(value) =>
                        setForm((c) => ({
                          ...c,
                          documentoNumero: value.replace(/\D/g, ""),
                        }))
                      }
                    />
                  </div>
                </section>
              )}

              <section className="space-y-4 rounded-[16px] bg-[var(--color-sidebar-bg)] p-4 shadow-sm">
                <h2 className="text-base font-circular-bold text-[var(--color-text)]">
                  Observaciones
                </h2>
                <textarea
                  value={form.observaciones}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm((c) => ({
                      ...c,
                      observaciones: event.target.value,
                    }))
                  }
                  placeholder="Notas adicionales sobre el traslado..."
                  aria-label="Notas adicionales sobre el traslado..."
                  className="min-h-24 w-full resize-none rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </section>

              {formError ? (
                <div className="rounded-[12px] border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-sm font-circular-regular text-[#d97706]">
                  {formError}
                </div>
              ) : (
                <div className="rounded-[12px] border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-3 text-sm font-circular-regular text-[#10b981]">
                  La guia esta lista para registrarse.
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || isCatalogLoading}
                  className="w-full"
                >
                  <FloppyDiskIcon size={17} weight="bold" />
                  {isSubmitting ? "Creando..." : "Crear guia de remision"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/gre/remitente")}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            <div className="xl:order-2 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start">
              <section className="flex h-full flex-col rounded-[16px] bg-[var(--color-sidebar-bg)] shadow-sm">
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      id="gre-weight"
                      label="Peso bruto total (KGM)"
                      value={form.pesoBrutoTotal}
                      disabled={isSubmitting}
                      onChange={(value) =>
                        setForm((c) => ({
                          ...c,
                          pesoBrutoTotal: value.replace(/[^\d.]/g, ""),
                        }))
                      }
                    />
                    <InputField
                      id="gre-packages"
                      label="N° de bultos"
                      value={form.numeroBultos}
                      disabled={isSubmitting}
                      onChange={(value) =>
                        setForm((c) => ({
                          ...c,
                          numeroBultos: value.replace(/\D/g, ""),
                        }))
                      }
                    />
                  </div>

                  <div className="relative">
                    <MagnifyingGlassIcon
                      size={16}
                      weight="bold"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
                    />
                    <input
                      value={productQuery}
                      onChange={(event) => {
                        const value = event.target.value;
                        setProductQuery(value);
                        if (value.trim().length < 2) {
                          setProductResults([]);
                          setLoadingProducts(false);
                        }
                      }}
                      placeholder={
                        productSearchSucursalId
                          ? "Buscar producto, SKU..."
                          : "Selecciona una sucursal de partida o llegada"
                      }
                      disabled={!productSearchSucursalId}
                      className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {productSearchSucursalId &&
                    productQuery.trim().length >= 2 &&
                    productResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-[12px] border border-[var(--color-border)]">
                        {productResults.map((product) => {
                          const nombre = product.descripcion || product.nombre;
                          const alreadyAdded = details.some(
                            (d) => d.descripcion.trim() === nombre.trim(),
                          );
                          return (
                            <button
                              key={product.publicId}
                              type="button"
                              onClick={() => addProductToDetails(product)}
                              disabled={alreadyAdded}
                              className="flex w-full items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                                  {nombre}
                                </p>
                                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                                  {[
                                    product.unidadMedida?.codigo,
                                    `Stock ${product.stockTotal ?? 0}`,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-circular-bold ${
                                  alreadyAdded
                                    ? "bg-[#10b981]/10 text-[#10b981]"
                                    : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                                }`}
                              >
                                {alreadyAdded ? "Agregado" : "Agregar"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {loadingProducts && (
                    <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                      Buscando productos...
                    </p>
                  )}
                </div>

                <div className="scrollbar-hidden flex-1 space-y-3 overflow-y-auto px-4 pb-4 xl:max-h-[calc(100dvh-22rem)]">
                  {details.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[var(--color-border)] py-10 text-center">
                      <p className="text-sm font-circular-bold text-[var(--color-muted-foreground)]">
                        Sin productos
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        Busca y agrega productos a trasladar
                      </p>
                    </div>
                  ) : (
                    details.map((detail, index) => (
                      <div
                        key={detail.uiId}
                        className="overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[var(--color-card)] transition-shadow hover:shadow-sm"
                      >
                        <div className="space-y-2 p-3">
                          <div className="flex items-start gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-circular-bold text-[var(--color-primary)]">
                              {index + 1}
                            </div>
                            <input
                              value={detail.descripcion}
                              onChange={(e) =>
                                updateDetail(index, {
                                  descripcion: e.target.value,
                                })
                              }
                              placeholder="Descripcion del producto"
                              aria-label="Descripcion del producto"
                              className="h-10 flex-1 rounded-[12px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                            />
                            <button
                              type="button"
                              title="Quitar item"
                              onClick={() => removeDetail(index)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[#dc2626] transition-colors hover:bg-[#dc2626]/10"
                            >
                              <TrashIcon size={17} weight="bold" />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pl-8">
                            <div>
                              <label
                                htmlFor={`detail-quantity-${detail.uiId}`}
                                className="mb-1 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]"
                              >
                                Cantidad
                              </label>
                              <div className="flex h-8 items-center overflow-hidden rounded-[8px] border border-[var(--color-border)]">
                                <button
                                  type="button"
                                  aria-label="Disminuir cantidad"
                                  onClick={() => {
                                    const curr =
                                      Number(
                                        detail.cantidad.replace(",", "."),
                                      ) || 0;
                                    const next = Math.max(1, curr - 1);
                                    updateDetail(index, {
                                      cantidad: String(next),
                                    });
                                  }}
                                  className="flex h-full w-7 shrink-0 items-center justify-center border-r border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)]"
                                >
                                  <MinusIcon size={14} weight="bold" />
                                </button>
                                <input
                                  id={`detail-quantity-${detail.uiId}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={detail.cantidad}
                                  onChange={(e) =>
                                    updateDetail(index, {
                                      cantidad: e.target.value.replace(
                                        /[^\d.]/g,
                                        "",
                                      ),
                                    })
                                  }
                                  className="w-0 flex-1 bg-transparent text-center text-sm font-circular-bold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  aria-label="Aumentar cantidad"
                                  onClick={() => {
                                    const curr =
                                      Number(
                                        detail.cantidad.replace(",", "."),
                                      ) || 0;
                                    updateDetail(index, {
                                      cantidad: String(curr + 1),
                                    });
                                  }}
                                  className="flex h-full w-7 shrink-0 items-center justify-center border-l border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)]"
                                >
                                  <PlusIcon size={14} weight="bold" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="mb-1 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                                Unidad
                              </p>
                              <div className="flex h-8 items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 text-sm text-[var(--color-muted-foreground)]">
                                {detail.unidadMedida || "NIU"}
                              </div>
                            </div>

                            <div>
                              <label
                                htmlFor={`detail-weight-${detail.uiId}`}
                                className="mb-1 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]"
                              >
                                Peso (kg)
                              </label>
                              <input
                                id={`detail-weight-${detail.uiId}`}
                                value={detail.pesoUnitario || ""}
                                onChange={(e) =>
                                  updateDetail(index, {
                                    pesoUnitario: e.target.value.replace(
                                      /[^\d.]/g,
                                      "",
                                    ),
                                  })
                                }
                                placeholder="0.00"
                                className="h-8 w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 text-sm text-[var(--color-input-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/20"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {details.length > 0 && (
                  <div className="border-t border-[var(--color-border)] px-4 py-3">
                    <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                      {details.length}{" "}
                      {details.length === 1
                        ? "producto agregado"
                        : "productos agregados"}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

function InputField(props: {
  id: string;
  label: string;
  value: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={props.id} className="block">
      <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {props.label}
      </span>
      <input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        maxLength={props.maxLength}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

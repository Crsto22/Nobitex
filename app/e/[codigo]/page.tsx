"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingsIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  HouseIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MapTrifoldIcon,
  MotorcycleIcon,
  PaperPlaneTiltIcon,
  PhoneIcon,
  ShoppingCartIcon,
  SpinnerGapIcon,
  StorefrontIcon,
  UserIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { AgencyMap } from "@/components/shipping/agency-map";
import {
  shippingLinksApi,
  type PublicShippingAgency,
  type PublicShippingDespacho,
  type PublicShippingLink,
  type PublicShippingMetodo,
  type PublicShippingProducto,
  type PublicShippingRecojo,
  type SearchShippingAgenciesOptions,
} from "@/lib/api/shipping-links";
import type { SaleShippingAgency } from "@/lib/api/sales";

const metodoVisuals: Record<
  string,
  { image?: string; selectedBg: string; iconColor?: string; checkColor?: string }
> = {
  SHALOM: {
    image: "/envios/shalom.svg",
    selectedBg: "bg-[#e52421] ring-2 ring-[#e52421]",
    checkColor: "text-white",
  },
  OLVA: {
    image: "/envios/olva.webp",
    selectedBg: "bg-[#fba832] ring-2 ring-[#fba832]",
    checkColor: "text-[#1f2937]",
  },
  RECOJO: {
    selectedBg: "bg-[#f97316] ring-2 ring-[#f97316]",
    iconColor: "text-[#f97316]",
    checkColor: "text-white",
  },
  MOTORIZADO: {
    selectedBg: "bg-[#3b82f6] ring-2 ring-[#3b82f6]",
    iconColor: "text-[#3b82f6]",
    checkColor: "text-white",
  },
  DOMICILIO: {
    selectedBg: "bg-[#10b981] ring-2 ring-[#10b981]",
    iconColor: "text-[#10b981]",
    checkColor: "text-white",
  },
};

type FormStep = 1 | 2 | 3 | 4;
type UserLocation = { latitude: number; longitude: number };

export default function ShippingDetailsPage() {
  const params = useParams<{ codigo: string }>();
  const code = params.codigo;
  const formRef = useRef<HTMLFormElement>(null);
  const requestSequenceRef = useRef(0);
  const [link, setLink] = useState<PublicShippingLink | null>(null);
  const [step, setStep] = useState<FormStep>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const [agencyQuery, setAgencyQuery] = useState("");
  const [agencyResults, setAgencyResults] = useState<PublicShippingAgency[]>([]);
  const [selectedAgency, setSelectedAgency] =
    useState<PublicShippingAgency | null>(null);
  const [isSearchingAgencies, setIsSearchingAgencies] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [form, setForm] = useState({
    nombreCompleto: "",
    dni: "",
    tipoDocumento: "DNI" as "DNI" | "CE",
    celular: "",
    metodo: "",
    fechaEnvio: "",
    agenciaExternalId: "",
    direccionEntrega: "",
    referenciaEntrega: "",
  });

  const selectedMetodo =
    link?.metodosEnvio.find((metodo) => metodo.metodo === form.metodo) ?? null;
  const isRecojo = selectedMetodo?.tipo === "recojo";
  const isDomicilio = selectedMetodo?.tipo === "domicilio";
  const isCourier = selectedMetodo?.tipo === "courier";
  const confirmStep: FormStep = isRecojo ? 3 : 4;
  const despacho = link?.despacho ?? null;
  const recojo = link?.recojo ?? null;

  useEffect(() => {
    let active = true;
    void shippingLinksApi
      .findOne(code)
      .then((data) => {
        if (!active) return;
        setLink(data);
        setIsComplete(data.estado === "recibido");
      })
      .catch(() => {
        if (active) setIsUnavailable(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  const fetchAgencies = useCallback(
    async (options: SearchShippingAgenciesOptions) => {
      if (!form.metodo || !isCourier) return;
      const requestSequence = ++requestSequenceRef.current;
      setIsSearchingAgencies(true);
      try {
        const data = await shippingLinksApi.searchAgencies(
          code,
          form.metodo as SaleShippingAgency,
          options,
        );
        if (requestSequence === requestSequenceRef.current) {
          setAgencyResults(data);
        }
      } catch {
        if (requestSequence === requestSequenceRef.current) {
          setAgencyResults([]);
          setError("No pudimos cargar las agencias. Intenta nuevamente.");
        }
      } finally {
        if (requestSequence === requestSequenceRef.current) {
          setIsSearchingAgencies(false);
        }
      }
    },
    [code, form.metodo, isCourier],
  );

  useEffect(() => {
    if (step !== 3 || !form.metodo || isComplete || !isCourier) return;
    const term = agencyQuery.trim();
    if (term.length === 1 && !userLocation) {
      requestSequenceRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAgencyResults([]);
      setIsSearchingAgencies(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setError("");
      void fetchAgencies(
        term.length >= 2
          ? {
              q: term,
              ...(userLocation
                ? {
                    lat: userLocation.latitude,
                    lng: userLocation.longitude,
                  }
                : {}),
            }
          : userLocation
            ? { lat: userLocation.latitude, lng: userLocation.longitude }
            : {},
      );
    }, term ? 2000 : 0);

    return () => window.clearTimeout(timer);
  }, [agencyQuery, fetchAgencies, form.metodo, isComplete, isCourier, step, userLocation]);

  const selectAgency = useCallback((agency: PublicShippingAgency) => {
    setSelectedAgency(agency);
    setForm((current) => ({
      ...current,
      agenciaExternalId: agency.externalId,
    }));
  }, []);

  const chooseMetodo = (metodo: string) => {
    setForm((current) => ({
      ...current,
      metodo,
      agenciaExternalId: "",
      direccionEntrega: "",
      referenciaEntrega: "",
    }));
    setSelectedAgency(null);
    setAgencyQuery("");
    setAgencyResults([]);
    setUserLocation(null);
    setIsMapVisible(false);
    setLocationError("");
  };

  const continueFromStepOne = () => {
    if (!formRef.current?.reportValidity() || !form.metodo) return;
    setError("");
    setStep(2);
  };

  const locateUser = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAgencyQuery("");
        setSelectedAgency(null);
        setForm((current) => ({ ...current, agenciaExternalId: "" }));
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsMapVisible(true);
        setIsLocating(false);
      },
      (geolocationError) => {
        setIsLocating(false);
        setLocationError(
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? "Debes permitir la ubicación para mostrar agencias cercanas."
            : "No pudimos obtener tu ubicación. Intenta nuevamente.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== confirmStep || !form.metodo || isSubmitting) {
      return;
    }
    if (!isRecojo && !form.fechaEnvio) {
      return;
    }
    if (!isRecojo && !isDomicilio && !form.agenciaExternalId) {
      return;
    }
    if (isDomicilio && !form.direccionEntrega.trim()) {
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await shippingLinksApi.submit(code, {
        nombreCompleto: form.nombreCompleto.trim(),
        dni: form.dni,
        tipoDocumento: form.tipoDocumento,
        celular: form.celular,
        metodo: form.metodo,
        fechaEnvio: isRecojo ? undefined : form.fechaEnvio,
        agencia:
          isRecojo || isDomicilio
            ? undefined
            : (form.metodo as SaleShippingAgency),
        agenciaExternalId:
          isRecojo || isDomicilio ? undefined : form.agenciaExternalId,
        direccionEntrega: isDomicilio
          ? form.direccionEntrega.trim()
          : undefined,
        referenciaEntrega:
          isDomicilio && form.referenciaEntrega.trim()
            ? form.referenciaEntrega.trim()
            : undefined,
      });
      setIsComplete(true);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos guardar tus datos. Intenta nuevamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PublicShell>
        <CenteredMessage>
          <SpinnerGapIcon size={25} className="animate-spin text-[var(--color-primary)]" />
          Cargando formulario...
        </CenteredMessage>
      </PublicShell>
    );
  }

  if (isUnavailable || !link) {
    return (
      <PublicShell>
        <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
          <div>
            <WarningCircleIcon
              size={52}
              weight="fill"
              className="mx-auto text-[var(--color-destructive)]"
            />
            <h1 className="mt-4 text-xl font-black text-[var(--color-text)]">
              Enlace no disponible
            </h1>
            <p className="mt-2 max-w-sm text-sm text-[var(--color-muted-foreground)]">
              Solicita al negocio un nuevo enlace para registrar tus datos de envío.
            </p>
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PublicHeader link={link} productos={link.productos ?? []} />
      <div className="flex flex-1 justify-center px-4 pb-6 pt-2 sm:px-5 sm:pt-3 lg:py-10">
        <div className="w-full max-w-6xl">
          {isComplete ? (
            <div className="mx-auto w-full max-w-md">
              <SuccessState businessName={link.negocio.nombreComercial} />
            </div>
          ) : (
            <>
              <div
                className={`grid gap-6 lg:mx-auto lg:max-w-5xl lg:items-start lg:gap-14 ${
                  link.productos?.length
                    ? "lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]"
                    : ""
                }`}
              >
                {link.productos?.length ? (
                  <aside className="hidden lg:sticky lg:top-24 lg:block">
                    <ProductSummaryCard productos={link.productos} />
                  </aside>
                ) : null}
                <div
                  className={`mx-auto w-full lg:mx-0 ${
                    step === 3 ? "max-w-3xl" : "max-w-md lg:max-w-xl"
                  }`}
                >
                  {step === 1 ? (
                    <div className="mb-2 sm:mb-4">
                      <StepTitle title="Datos de envío" />
                    </div>
                  ) : null}
                  <div className="sticky top-[70px] z-30 -mx-2 mb-6 bg-[var(--color-background)] px-2 py-2">
                    <StepIndicator
                      current={step}
                      labels={
                        isRecojo
                          ? ["Datos", "Listo", "Confirmar"]
                          : [
                              "Datos",
                              "Fecha",
                              isDomicilio ? "Dirección" : "Agencia",
                              "Confirmar",
                            ]
                      }
                    />
                  </div>
                  <form ref={formRef} onSubmit={submit} className="space-y-5">
              {step === 1 ? (
                <StepOne
                  form={form}
                  metodos={link.metodosEnvio}
                  onFormChange={setForm}
                  onMetodoChange={chooseMetodo}
                  onContinue={continueFromStepOne}
                />
              ) : null}

              {step === 2 && form.metodo ? (
                isRecojo ? (
                  <StepPickupReady
                    recojo={recojo}
                    onBack={() => setStep(1)}
                    onContinue={() => setStep(3)}
                  />
                ) : (
                  <StepShippingDate
                    despacho={despacho}
                    selected={form.fechaEnvio}
                    onSelect={(value) =>
                      setForm((current) => ({
                        ...current,
                        fechaEnvio: value,
                      }))
                    }
                    onBack={() => setStep(1)}
                    onContinue={() => setStep(3)}
                  />
                )
              ) : null}

              {step === 3 && form.metodo && isDomicilio ? (
                <StepDeliveryAddress
                  direccion={form.direccionEntrega}
                  referencia={form.referenciaEntrega}
                  onDireccionChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      direccionEntrega: value,
                    }))
                  }
                  onReferenciaChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      referenciaEntrega: value,
                    }))
                  }
                  onBack={() => setStep(2)}
                  onContinue={() => setStep(4)}
                />
              ) : null}

              {step === 3 && form.metodo && isCourier ? (
                <StepTwo
                  courier={form.metodo as SaleShippingAgency}
                  agencyQuery={agencyQuery}
                  agencies={agencyResults}
                  selectedAgency={selectedAgency}
                  userLocation={userLocation}
                  isSearching={isSearchingAgencies}
                  isLocating={isLocating}
                  locationError={locationError}
                  isMapVisible={isMapVisible}
                  onQueryChange={(value) => {
                    setAgencyQuery(value);
                    setSelectedAgency(null);
                    setForm((current) => ({
                      ...current,
                      agenciaExternalId: "",
                    }));
                  }}
                  onLocate={locateUser}
                  onClearLocation={() => {
                    setAgencyQuery("");
                    setUserLocation(null);
                    setAgencyResults([]);
                    setLocationError("");
                  }}
                  onToggleMap={() => setIsMapVisible((visible) => !visible)}
                  onSelect={selectAgency}
                  onBack={() => setStep(2)}
                  onContinue={() => selectedAgency && setStep(4)}
                />
              ) : null}

              {step === confirmStep &&
              selectedMetodo &&
              (isRecojo || isDomicilio || selectedAgency) ? (
                <StepThree
                  form={form}
                  metodo={selectedMetodo}
                  agency={isRecojo || isDomicilio ? null : selectedAgency}
                  fechaListo={recojo?.fechaListo ?? null}
                  isSubmitting={isSubmitting}
                  onBack={() => setStep(isRecojo ? 2 : 3)}
                />
              ) : null}

              {error ? (
                <p className="rounded-xl bg-[var(--color-destructive)]/10 px-4 py-3 text-sm text-[var(--color-destructive)]">
                  {error}
                </p>
              ) : null}
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

function StepOne({
  form,
  metodos,
  onFormChange,
  onMetodoChange,
  onContinue,
}: {
  form: {
    nombreCompleto: string;
    dni: string;
    tipoDocumento: "DNI" | "CE";
    celular: string;
    metodo: string;
    fechaEnvio: string;
    agenciaExternalId: string;
    direccionEntrega: string;
    referenciaEntrega: string;
  };
  metodos: PublicShippingMetodo[];
  onFormChange: React.Dispatch<React.SetStateAction<typeof form>>;
  onMetodoChange: (metodo: string) => void;
  onContinue: () => void;
}) {
  const selectedMetodo =
    metodos.find((metodo) => metodo.metodo === form.metodo) ?? null;
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardWidthClass =
    metodos.length <= 2
      ? "w-[calc(50%-0.375rem)] max-w-[240px]"
      : "w-[calc(50%-0.375rem)] max-w-[240px] xl:w-[calc(33.333%-0.5rem)]";

  const scrollMetodos = (direction: -1 | 1) => {
    const container = carouselRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * Math.max(container.clientWidth * 0.8, 180),
      behavior: "smooth",
    });
  };

  return (
    <>
      <Field icon={<UserIcon size={19} />} label="Nombre completo">
        <input
          required
          minLength={3}
          maxLength={150}
          autoComplete="name"
          value={form.nombreCompleto}
          onChange={(event) =>
            onFormChange((current) => ({
              ...current,
              nombreCompleto: event.target.value,
            }))
          }
          className="public-shipping-input"
          placeholder="Ej. María López"
        />
      </Field>
      <div>
        <span className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]">
          <span className="text-[var(--color-primary)]">
            <IdentificationCardIcon size={19} />
          </span>
          Documento de identidad
        </span>
        <div className="flex items-center gap-2">
          <div className="grid shrink-0 grid-cols-2 gap-1.5">
            {(["DNI", "CE"] as const).map((tipo) => {
              const selected = form.tipoDocumento === tipo;
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() =>
                    onFormChange((current) => ({
                      ...current,
                      tipoDocumento: tipo,
                      dni: "",
                    }))
                  }
                  className={`h-12 w-12 rounded-full text-sm font-black transition-colors ${
                    selected
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                  }`}
                >
                  {tipo}
                </button>
              );
            })}
          </div>
          <input
            required
            inputMode="numeric"
            pattern={form.tipoDocumento === "DNI" ? "[0-9]{8}" : "[0-9]{9,12}"}
            minLength={form.tipoDocumento === "DNI" ? 8 : 9}
            maxLength={form.tipoDocumento === "DNI" ? 8 : 12}
            value={form.dni}
            onChange={(event) =>
              onFormChange((current) => ({
                ...current,
                dni: event.target.value
                  .replace(/\D/g, "")
                  .slice(0, current.tipoDocumento === "DNI" ? 8 : 12),
              }))
            }
            className="public-shipping-input min-w-0 flex-1"
            placeholder={form.tipoDocumento === "DNI" ? "12345678" : "001234567"}
          />
        </div>
      </div>
      <Field icon={<PhoneIcon size={19} />} label="Celular">
        <input
          required
          inputMode="tel"
          pattern="9[0-9]{8}"
          minLength={9}
          maxLength={9}
          autoComplete="tel"
          value={form.celular}
          onChange={(event) =>
            onFormChange((current) => ({
              ...current,
              celular: event.target.value.replace(/\D/g, "").slice(0, 9),
            }))
          }
          className="public-shipping-input"
          placeholder="987654321"
        />
      </Field>
      <fieldset>
        <legend className="sr-only">Método de envío</legend>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]">
            <BuildingsIcon size={19} className="text-[var(--color-primary)]" />
            Método de envío
          </span>
          {metodos.length > 2 ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollMetodos(-1)}
                aria-label="Método anterior"
                className="grid size-8 place-items-center rounded-full bg-[var(--color-sidebar-bg)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                <CaretLeftIcon size={14} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => scrollMetodos(1)}
                aria-label="Método siguiente"
                className="grid size-8 place-items-center rounded-full bg-[var(--color-sidebar-bg)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                <CaretRightIcon size={14} weight="bold" />
              </button>
            </div>
          ) : null}
        </div>
        {metodos.length === 0 ? (
          <p className="rounded-xl bg-[var(--color-input-bg)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No hay métodos de envío disponibles. Contacta al negocio.
          </p>
        ) : (
          <div
            ref={carouselRef}
            className="scrollbar-hidden -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2"
          >
            {metodos.map((metodo) => {
              const visual = metodoVisuals[metodo.metodo];
              const selected = form.metodo === metodo.metodo;
              const iconColor = selected
                ? "text-white"
                : (visual?.iconColor ?? "text-[var(--color-primary)]");
              const textColor = selected
                ? "text-white"
                : "text-[var(--color-text)]";
              return (
                <button
                  key={metodo.metodo}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onMetodoChange(metodo.metodo)}
                  className={`relative flex h-28 shrink-0 snap-start flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl p-2 transition-all ${cardWidthClass} ${
                    selected
                      ? (visual?.selectedBg ??
                        "bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/30")
                      : "hover:bg-[var(--color-button-hover)]"
                  }`}
                >
                  {metodo.tipo === "recojo" ? (
                    <>
                      <StorefrontIcon
                        size={40}
                        weight="fill"
                        className={iconColor}
                      />
                      <span className={`text-sm font-black ${textColor}`}>
                        {metodo.nombre}
                      </span>
                    </>
                  ) : metodo.metodo === "MOTORIZADO" ? (
                    <>
                      <MotorcycleIcon
                        size={40}
                        weight="fill"
                        className={iconColor}
                      />
                      <span className={`text-sm font-black ${textColor}`}>
                        {metodo.nombre}
                      </span>
                    </>
                  ) : metodo.metodo === "DOMICILIO" ? (
                    <>
                      <HouseIcon
                        size={40}
                        weight="fill"
                        className={iconColor}
                      />
                      <span className={`text-sm font-black ${textColor}`}>
                        {metodo.nombre}
                      </span>
                    </>
                  ) : visual?.image ? (
                    <Image
                      src={visual.image}
                      alt={metodo.nombre}
                      width={200}
                      height={80}
                      unoptimized
                      className="h-full w-auto max-w-full rounded-2xl object-contain"
                    />
                  ) : (
                    <span className={`text-sm font-black ${textColor}`}>
                      {metodo.nombre}
                    </span>
                  )}
                  {selected ? (
                    <CheckCircleIcon
                      size={21}
                      weight="fill"
                      className={`absolute right-2 top-2 ${
                        visual?.checkColor ?? "text-white"
                      }`}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        {selectedMetodo?.tipo === "recojo" ? (
          <p className="mt-2 rounded-xl bg-[var(--color-input-bg)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
            Recogerás tu pedido en:{" "}
            <span className="font-bold text-[var(--color-text)]">
              {selectedMetodo.direccion || "la tienda (dirección por confirmar)"}
            </span>
          </p>
        ) : null}
      </fieldset>
      <button
        type="button"
        disabled={!form.metodo}
        onClick={onContinue}
        className="public-primary-button"
      >
        Siguiente
        <ArrowRightIcon size={19} weight="bold" />
      </button>
    </>
  );
}

function StepShippingDate({
  despacho,
  selected,
  onSelect,
  onBack,
  onContinue,
}: {
  despacho: PublicShippingDespacho | null;
  selected: string;
  onSelect: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollFechas = (direction: -1 | 1) => {
    const container = carouselRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * Math.max(container.clientWidth * 0.7, 160),
      behavior: "smooth",
    });
  };

  return (
    <>
      <StepTitle
        title="Fecha de envío"
        subtitle="Elige cuándo quieres que salga tu pedido."
      />
      {!despacho ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center">
          <p className="text-sm font-black text-[var(--color-text)]">
            El negocio aún no habilitó las fechas de envío
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Contacta al negocio para coordinar tu pedido.
          </p>
        </div>
      ) : (
        <>
          {despacho.horaCorte ? (
            <p className="rounded-2xl bg-[var(--color-input-bg)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
              Los pedidos después de las{" "}
              <span className="font-bold text-[var(--color-text)]">
                {despacho.horaCorte}
              </span>{" "}
              salen el siguiente día de despacho.
            </p>
          ) : null}
          {despacho.anticipacionDias > 0 ? (
            <p className="rounded-2xl bg-[#f59e0b]/10 px-4 py-3 text-xs text-[#b45309]">
              El negocio necesita{" "}
              <span className="font-bold">
                {despacho.anticipacionDias} día
                {despacho.anticipacionDias === 1 ? "" : "s"}
              </span>{" "}
              para preparar tu pedido.
            </p>
          ) : null}
          <div className="mx-auto w-full max-w-md">
            <div
              ref={carouselRef}
              className="scrollbar-hidden -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 py-2"
            >
              {despacho.fechasDisponibles.map((fecha) => {
                const isSelected = fecha === selected;
                return (
                  <button
                    key={fecha}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(fecha)}
                    className={`flex size-[76px] shrink-0 snap-start flex-col items-center justify-center rounded-full transition-colors sm:size-[88px] ${
                      isSelected
                        ? "bg-[#059669] text-white"
                        : "bg-[var(--color-sidebar-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase opacity-80">
                      {formatFechaEnvioWeekday(fecha)}
                    </span>
                    <span className="text-sm font-black">
                      {formatFechaEnvioDay(fecha)}
                    </span>
                  </button>
                );
              })}
            </div>
            {despacho.fechasDisponibles.length > 3 ? (
              <div className="mt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollFechas(-1)}
                  aria-label="Fecha anterior"
                  className="grid size-8 place-items-center rounded-full bg-[var(--color-sidebar-bg)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  <CaretLeftIcon size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollFechas(1)}
                  aria-label="Fecha siguiente"
                  className="grid size-8 place-items-center rounded-full bg-[var(--color-sidebar-bg)] text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  <CaretRightIcon size={14} weight="bold" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="public-secondary-button">
          <ArrowLeftIcon size={19} />
          Atrás
        </button>
        <button
          type="button"
          disabled={!despacho || !selected}
          onClick={onContinue}
          className="public-primary-button"
        >
          Siguiente
          <ArrowRightIcon size={19} />
        </button>
      </div>
    </>
  );
}

function StepPickupReady({
  recojo,
  onBack,
  onContinue,
}: {
  recojo: PublicShippingRecojo | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <StepTitle
        title="Recojo en tienda"
        subtitle="Así preparamos tu pedido para que lo recojas."
      />
      {!recojo || !recojo.fechaListo ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center">
          <p className="text-sm font-black text-[var(--color-text)]">
            El negocio aún no habilitó las fechas de recojo
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Contacta al negocio para coordinar tu pedido.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-[#10b981]/10 px-5 py-6 text-center">
            <p className="text-xs font-bold uppercase text-[#047857]">
              Tu pedido estará listo
            </p>
            <p className="mt-2 text-2xl font-black capitalize text-[#047857]">
              {formatFechaEnvio(recojo.fechaListo)}
            </p>
          </div>
          {recojo.anticipacionDias > 0 ? (
            <p className="rounded-xl bg-[var(--color-input-bg)] px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
              El negocio necesita{" "}
              <span className="font-bold text-[var(--color-text)]">
                {recojo.anticipacionDias} día
                {recojo.anticipacionDias === 1 ? "" : "s"}
              </span>{" "}
              para preparar tu pedido.
            </p>
          ) : null}
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="public-secondary-button">
          <ArrowLeftIcon size={19} />
          Atrás
        </button>
        <button
          type="button"
          disabled={!recojo?.fechaListo}
          onClick={onContinue}
          className="public-primary-button"
        >
          Continuar
          <ArrowRightIcon size={19} />
        </button>
      </div>
    </>
  );
}

function StepTwo({
  courier,
  agencyQuery,
  agencies,
  selectedAgency,
  userLocation,
  isSearching,
  isLocating,
  locationError,
  isMapVisible,
  onQueryChange,
  onLocate,
  onClearLocation,
  onToggleMap,
  onSelect,
  onBack,
  onContinue,
}: {
  courier: SaleShippingAgency;
  agencyQuery: string;
  agencies: PublicShippingAgency[];
  selectedAgency: PublicShippingAgency | null;
  userLocation: UserLocation | null;
  isSearching: boolean;
  isLocating: boolean;
  locationError: string;
  isMapVisible: boolean;
  onQueryChange: (value: string) => void;
  onLocate: () => void;
  onClearLocation: () => void;
  onToggleMap: () => void;
  onSelect: (agency: PublicShippingAgency) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const courierLabel = courier === "SHALOM" ? "Shalom" : "Olva";
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const externalId = selectedAgency?.externalId;
    if (!externalId) return;
    itemRefs.current[externalId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedAgency?.externalId]);

  return (
    <>
      <StepTitle title={`Elige tu agencia ${courierLabel}`} />
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3">
        <div className="relative">
          <MagnifyingGlassIcon
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          />
          <input
            value={agencyQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            className="public-shipping-input pl-11"
            placeholder="Busca distrito o agencia (ej. Cayma, Arequipa)"
          />
          {isSearching ? (
            <SpinnerGapIcon
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--color-primary)]"
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={onLocate}
          disabled={isLocating}
          aria-label="Ubicarme"
          className="flex h-12 w-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-input-bg)] text-sm font-black text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)] disabled:opacity-60 sm:w-auto sm:px-5"
        >
          {isLocating ? (
            <SpinnerGapIcon size={18} className="animate-spin" />
          ) : (
            <MapPinIcon size={18} weight="fill" className="text-red-600" />
          )}
          <span className="hidden sm:inline">Ubicarme</span>
        </button>
      </div>
      {locationError ? (
        <p className="text-xs font-semibold text-[var(--color-destructive)]">
          {locationError}
        </p>
      ) : null}
      {userLocation ? (
        <div className="flex items-center justify-between rounded-xl bg-[#2563eb]/8 px-3 py-2 text-xs font-bold text-[#1d4ed8]">
          <span>Mostrando las agencias más cercanas a tu ubicación.</span>
          <button type="button" onClick={onClearLocation} className="underline">
            Quitar ubicación
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onToggleMap}
        className="flex items-center gap-2 text-xs font-black text-[var(--color-primary)] hover:underline"
      >
        <MapTrifoldIcon size={18} weight="fill" />
        {isMapVisible ? "Ocultar mapa" : "Ver mapa"}
      </button>
      {isMapVisible ? (
        <AgencyMap
          agencies={agencies}
          selectedExternalId={selectedAgency?.externalId ?? ""}
          onSelect={onSelect}
          courier={courier}
          userLocation={userLocation}
          focusResults={agencyQuery.trim().length >= 2}
        />
      ) : null}
      {agencies.length || agencyQuery.trim().length >= 2 || userLocation ? (
        <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
          {isSearching
            ? "Buscando agencias..."
            : `${agencies.length} agencias disponibles`}
        </p>
        <div className="flex items-center gap-3 text-[11px] font-bold text-[var(--color-muted-foreground)]">
          <span className={`h-2.5 w-2.5 rounded-full ${courier === "SHALOM" ? "bg-[#dc2626]" : "bg-[#eab308]"}`} />
          Agencia {courierLabel}
          {userLocation ? <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" /> : null}
          {userLocation ? "Tu ubicación" : null}
        </div>
        </div>
      ) : null}
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {!isSearching &&
        !agencies.length &&
        (agencyQuery.trim().length >= 2 || userLocation) ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            No encontramos agencias para esta búsqueda.
          </div>
        ) : null}
        {agencies.map((agency) => (
          <button
            key={agency.externalId}
            ref={(node) => {
              itemRefs.current[agency.externalId] = node;
            }}
            type="button"
            onClick={() => onSelect(agency)}
            className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
              selectedAgency?.externalId === agency.externalId
                ? "bg-[var(--color-primary)]/10"
                : "bg-[var(--color-sidebar-bg)] hover:bg-[var(--color-button-hover)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <MapPinIcon
                size={20}
                weight="fill"
                className={`mt-0.5 shrink-0 ${courier === "SHALOM" ? "text-[#dc2626]" : "text-[#ca8a04]"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black text-[var(--color-text)]">
                    {agency.nombre}
                  </p>
                  {agency.distanceKm !== null && agency.distanceKm !== undefined ? (
                    <span className="shrink-0 text-xs font-black text-[var(--color-primary)]">
                      {formatDistance(agency.distanceKm)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                  {[agency.direccion, agency.distrito, agency.provincia]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {selectedAgency?.externalId === agency.externalId ? (
                <CheckCircleIcon
                  size={21}
                  weight="fill"
                  className="shrink-0 text-[#059669]"
                />
              ) : null}
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="public-secondary-button">
          <ArrowLeftIcon size={19} />
          Atrás
        </button>
        <button
          type="button"
          disabled={!selectedAgency}
          onClick={onContinue}
          className="public-primary-button"
        >
          Siguiente
          <ArrowRightIcon size={19} />
        </button>
      </div>
    </>
  );
}

function StepDeliveryAddress({
  direccion,
  referencia,
  onDireccionChange,
  onReferenciaChange,
  onBack,
  onContinue,
}: {
  direccion: string;
  referencia: string;
  onDireccionChange: (value: string) => void;
  onReferenciaChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const canContinue = direccion.trim().length >= 5;
  return (
    <>
      <StepTitle
        title="Dirección de entrega"
        subtitle="Indica dónde deseas recibir tu pedido."
      />
      <Field icon={<MapPinIcon size={19} />} label="Dirección completa">
        <textarea
          required
          minLength={5}
          maxLength={500}
          rows={3}
          value={direccion}
          onChange={(event) => onDireccionChange(event.target.value)}
          className="public-shipping-input min-h-[88px] resize-none border-0"
          placeholder="Ej. Av. Los Álamos 123, Dpto. 201, Arequipa"
        />
      </Field>
      <Field icon={<MapPinIcon size={19} />} label="Referencia (opcional)">
        <input
          maxLength={300}
          value={referencia}
          onChange={(event) => onReferenciaChange(event.target.value)}
          className="public-shipping-input border-0"
          placeholder="Ej. Frente al parque, portón azul"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="public-secondary-button">
          <ArrowLeftIcon size={19} />
          Atrás
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="public-primary-button"
        >
          Siguiente
          <ArrowRightIcon size={19} />
        </button>
      </div>
    </>
  );
}

function StepThree({
  form,
  metodo,
  agency,
  fechaListo,
  isSubmitting,
  onBack,
}: {
  form: {
    nombreCompleto: string;
    dni: string;
    tipoDocumento: "DNI" | "CE";
    celular: string;
    metodo: string;
    fechaEnvio: string;
    agenciaExternalId: string;
    direccionEntrega: string;
    referenciaEntrega: string;
  };
  metodo: PublicShippingMetodo;
  agency: PublicShippingAgency | null;
  fechaListo: string | null;
  isSubmitting: boolean;
  onBack: () => void;
}) {
  const isDomicilio = metodo.tipo === "domicilio";
  const isRecojo = metodo.tipo === "recojo";
  return (
    <>
      <StepTitle
        title="Confirma tus datos"
        subtitle="Revisa la información antes de enviarla al negocio."
      />
      <div className="space-y-3 rounded-2xl bg-[var(--color-sidebar-bg)] p-4">
        <SummaryRow label="Cliente" value={form.nombreCompleto} />
        <SummaryRow label={form.tipoDocumento} value={form.dni} />
        <SummaryRow label="Celular" value={form.celular} />
        <SummaryRow label="Método" value={metodo.nombre} />
        <SummaryRow
          label={isRecojo ? "Listo para recojo" : "Fecha de envío"}
          value={
            isRecojo
              ? fechaListo
                ? formatFechaEnvio(fechaListo)
                : "Por confirmar"
              : formatFechaEnvio(form.fechaEnvio)
          }
        />
        <div className="border-t border-[var(--color-border)] pt-3">
          <p className="text-[11px] font-bold uppercase text-[var(--color-muted-foreground)]">
            {metodo.tipo === "recojo"
              ? "Recojo en tienda"
              : isDomicilio
                ? "Dirección de entrega"
                : "Agencia seleccionada"}
          </p>
          {metodo.tipo === "recojo" ? (
            <p className="mt-1 text-sm leading-5 text-[var(--color-text)]">
              {metodo.direccion || "Dirección por confirmar con el negocio."}
            </p>
          ) : isDomicilio ? (
            <>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text)]">
                {form.direccionEntrega || "Sin dirección"}
              </p>
              {form.referenciaEntrega ? (
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                  Ref: {form.referenciaEntrega}
                </p>
              ) : null}
            </>
          ) : agency ? (
            <>
              <p className="mt-1 text-sm font-black text-[var(--color-text)]">
                {agency.nombre}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {[agency.direccion, agency.distrito, agency.provincia]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onBack} className="public-secondary-button">
          <ArrowLeftIcon size={19} />
          Atrás
        </button>
        <button type="submit" disabled={isSubmitting} className="public-primary-button">
          {isSubmitting ? (
            <SpinnerGapIcon size={19} className="animate-spin" />
          ) : (
            <PaperPlaneTiltIcon size={19} weight="fill" />
          )}
          Enviar datos
        </button>
      </div>
    </>
  );
}

function PublicHeader({
  link,
  productos,
}: {
  link: PublicShippingLink;
  productos: PublicShippingProducto[];
}) {
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const totalUnits = productos.reduce(
    (total, producto) => total + producto.cantidad,
    0,
  );

  return (
    <header className="sticky top-0 z-[1100] w-full border-b border-gray-200 bg-[var(--color-background)]">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-4">
        <Image
          src={link.negocio.logoUrl || "/Logo/Nuvex.png"}
          alt={link.negocio.nombreComercial}
          width={38}
          height={38}
          unoptimized={Boolean(link.negocio.logoUrl)}
          priority={!link.negocio.logoUrl}
          className="h-[38px] w-[38px] shrink-0 rounded-lg object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-[var(--color-text)]">
            {link.negocio.nombreComercial}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Formulario seguro con Nuvex
          </p>
        </div>
        {productos.length ? (
          <button
            type="button"
            onClick={() => setIsProductsOpen((open) => !open)}
            aria-expanded={isProductsOpen}
            aria-controls="mobile-order-products"
            aria-label="Ver productos de tu compra"
            className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-full bg-[var(--color-sidebar-bg)] px-3 text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] lg:hidden"
          >
            <span className="relative">
              <ShoppingCartIcon size={19} weight="fill" />
              <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-[var(--color-primary)] px-1 text-[9px] font-black leading-4 text-white">
                {totalUnits}
              </span>
            </span>
            <CaretDownIcon
              size={14}
              weight="bold"
              className={`transition-transform duration-200 ${
                isProductsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        ) : null}
      </div>
      {isProductsOpen ? (
        <button
          type="button"
          aria-label="Cerrar carrito"
          onClick={() => setIsProductsOpen(false)}
          className="fixed inset-x-0 bottom-0 top-[70px] z-[1098] bg-black/25 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}
      {productos.length ? (
        <div
          id="mobile-order-products"
          className={`absolute inset-x-0 top-full z-[1099] grid overflow-hidden bg-[var(--color-background)] transition-all duration-300 ease-out lg:hidden ${
            isProductsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mx-auto w-full max-w-6xl px-5 pb-4">
              <div className="rounded-2xl p-2">
                <ProductList productos={productos} compact />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function StepIndicator({
  current,
  labels,
}: {
  current: FormStep;
  labels: string[];
}) {
  const total = labels.length;
  const activeIndex = Math.min(current, total);
  return (
    <div className="mx-auto w-full max-w-md">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {labels.map((label, index) => {
          const number = index + 1;
          const active = number <= activeIndex;
          return (
            <div
              key={label}
              className="relative h-1.5 overflow-hidden rounded-full bg-[#10b981]/15"
            >
              <div
                className={`h-full rounded-full bg-[#10b981] transition-all duration-500 ease-out ${
                  active ? "w-full" : "w-0"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-black text-[var(--color-text)]">{title}</h1>
      {subtitle ? (
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function ProductSummaryCard({
  productos,
}: {
  productos: PublicShippingProducto[];
}) {
  const totalUnits = productos.reduce(
    (total, producto) => total + producto.cantidad,
    0,
  );

  return (
    <section className="overflow-hidden rounded-3xl">
      <div className="px-5 py-5">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--color-primary)]">
          <ShoppingCartIcon size={13} weight="fill" />
          Tu pedido
        </span>
        <h2 className="mt-3 text-xl font-black text-[var(--color-text)]">
          Productos de tu compra
        </h2>
        <p className="mt-1 text-xs font-semibold text-[var(--color-muted-foreground)]">
          {productos.length}{" "}
          {productos.length === 1 ? "producto" : "productos"} · {totalUnits}{" "}
          {totalUnits === 1 ? "unidad" : "unidades"}
        </p>
      </div>
      <div className="p-2">
        <ProductList productos={productos} />
      </div>
    </section>
  );
}

function ProductList({
  productos,
  compact = false,
}: {
  productos: PublicShippingProducto[];
  compact?: boolean;
}) {
  return (
    <ul className="space-y-1">
      {productos.map((producto, index) => (
        <li
          key={`${producto.nombre}-${index}`}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
            compact ? "" : "hover:bg-[var(--color-button-hover)]"
          }`}
        >
          <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--color-text)]">
            {producto.nombre}
          </span>
          <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-black text-[var(--color-primary)]">
            x{producto.cantidad}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-bold text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-right text-sm font-black text-[var(--color-text)]">{value}</span>
    </div>
  );
}

function SuccessState({ businessName }: { businessName: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#10b981]/10">
        <CheckCircleIcon size={52} weight="fill" className="text-[#10b981]" />
      </div>
      <h1 className="mt-5 text-2xl font-black text-[var(--color-text)]">
        ¡Datos recibidos!
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted-foreground)]">
        {businessName} ya puede coordinar el envío de tu pedido.
      </p>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 px-5 py-10 text-sm text-[var(--color-muted-foreground)]">
      {children}
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-[var(--color-background)]">
      {children}
      <footer className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] px-5 py-4 text-[11px] font-bold text-[var(--color-muted-foreground)]">
        <span>Protegido por</span>
        <Image
          src="/Logo/nuvex_logo.svg"
          alt="Nuvex"
          width={72}
          height={22}
          className="h-5 w-auto"
        />
      </footer>
    </main>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]">
        <span className="text-[var(--color-primary)]">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;
}

function parseFechaEnvio(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatFechaEnvio(iso: string) {
  if (!iso) return "—";
  return parseFechaEnvio(iso).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatFechaEnvioWeekday(iso: string) {
  return parseFechaEnvio(iso).toLocaleDateString("es-PE", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function formatFechaEnvioDay(iso: string) {
  return parseFechaEnvio(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

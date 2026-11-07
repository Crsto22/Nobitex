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
  CheckCircleIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MapTrifoldIcon,
  PaperPlaneTiltIcon,
  PhoneIcon,
  SpinnerGapIcon,
  UserIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { AgencyMap } from "@/components/shipping/agency-map";
import {
  shippingLinksApi,
  type PublicShippingAgency,
  type PublicShippingLink,
  type SearchShippingAgenciesOptions,
} from "@/lib/api/shipping-links";
import type { SaleShippingAgency } from "@/lib/api/sales";

const couriers: Array<{
  value: SaleShippingAgency;
  label: string;
  image: string;
  selectedBg: string;
}> = [
  {
    value: "SHALOM",
    label: "Shalom",
    image: "/envios/shalom.svg",
    selectedBg: "bg-[#e52421]/10 ring-2 ring-[#e52421]/30",
  },
  {
    value: "OLVA",
    label: "Olva",
    image: "/envios/olva.webp",
    selectedBg: "bg-[#f5c518]/15 ring-2 ring-[#f5c518]/40",
  },
];

type CourierOption = (typeof couriers)[number];

type FormStep = 1 | 2 | 3;
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
    celular: "",
    agencia: "" as SaleShippingAgency | "",
    agenciaExternalId: "",
  });

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
      if (!form.agencia) return;
      const requestSequence = ++requestSequenceRef.current;
      setIsSearchingAgencies(true);
      try {
        const data = await shippingLinksApi.searchAgencies(
          code,
          form.agencia,
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
    [code, form.agencia],
  );

  useEffect(() => {
    if (step !== 2 || !form.agencia || isComplete) return;
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
  }, [agencyQuery, fetchAgencies, form.agencia, isComplete, step, userLocation]);

  const selectAgency = useCallback((agency: PublicShippingAgency) => {
    setSelectedAgency(agency);
    setForm((current) => ({
      ...current,
      agenciaExternalId: agency.externalId,
    }));
  }, []);

  const chooseCourier = (courier: SaleShippingAgency) => {
    setForm((current) => ({
      ...current,
      agencia: courier,
      agenciaExternalId: "",
    }));
    setSelectedAgency(null);
    setAgencyQuery("");
    setAgencyResults([]);
    setUserLocation(null);
    setIsMapVisible(false);
    setLocationError("");
  };

  const continueToAgencies = () => {
    if (!formRef.current?.reportValidity() || !form.agencia) return;
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
    if (
      step !== 3 ||
      !form.agencia ||
      !form.agenciaExternalId ||
      isSubmitting
    ) {
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await shippingLinksApi.submit(code, {
        nombreCompleto: form.nombreCompleto.trim(),
        dni: form.dni,
        celular: form.celular,
        agencia: form.agencia,
        agenciaExternalId: form.agenciaExternalId,
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
      <PublicHeader link={link} />
      {!isComplete ? (
        <div className="bg-[var(--color-background)] px-4 py-3 sm:px-5">
          <StepIndicator current={step} />
        </div>
      ) : null}
      <div className="flex flex-1 justify-center px-4 py-7 sm:px-5">
        <div className={`w-full ${step === 2 ? "max-w-3xl" : "max-w-md"}`}>
          {isComplete ? (
            <SuccessState businessName={link.negocio.nombreComercial} />
          ) : (
            <form ref={formRef} onSubmit={submit} className="space-y-5">
              {step === 1 ? (
                <StepOne
                  form={form}
                  couriers={couriers.filter((courier) =>
                    link.metodosEnvio.includes(courier.value),
                  )}
                  onFormChange={setForm}
                  onCourierChange={chooseCourier}
                  onContinue={continueToAgencies}
                />
              ) : null}

              {step === 2 && form.agencia ? (
                <StepTwo
                  courier={form.agencia}
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
                  onBack={() => setStep(1)}
                  onContinue={() => selectedAgency && setStep(3)}
                />
              ) : null}

              {step === 3 && selectedAgency && form.agencia ? (
                <StepThree
                  form={form}
                  agency={selectedAgency}
                  isSubmitting={isSubmitting}
                  onBack={() => setStep(2)}
                />
              ) : null}

              {error ? (
                <p className="rounded-xl bg-[var(--color-destructive)]/10 px-4 py-3 text-sm text-[var(--color-destructive)]">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

function StepOne({
  form,
  couriers: enabledCouriers,
  onFormChange,
  onCourierChange,
  onContinue,
}: {
  form: {
    nombreCompleto: string;
    dni: string;
    celular: string;
    agencia: SaleShippingAgency | "";
    agenciaExternalId: string;
  };
  couriers: CourierOption[];
  onFormChange: React.Dispatch<React.SetStateAction<typeof form>>;
  onCourierChange: (courier: SaleShippingAgency) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <StepTitle
        title="Datos de envío"
        subtitle="Completa tus datos y elige la empresa que transportará tu pedido."
      />
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
      <Field icon={<IdentificationCardIcon size={19} />} label="DNI">
        <input
          required
          inputMode="numeric"
          pattern="[0-9]{8}"
          minLength={8}
          maxLength={8}
          value={form.dni}
          onChange={(event) =>
            onFormChange((current) => ({
              ...current,
              dni: event.target.value.replace(/\D/g, "").slice(0, 8),
            }))
          }
          className="public-shipping-input"
          placeholder="12345678"
        />
      </Field>
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
        <legend className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--color-muted-foreground)]">
          <BuildingsIcon size={19} className="text-[var(--color-primary)]" />
          Empresa de envío
        </legend>
        {enabledCouriers.length === 0 ? (
          <p className="rounded-xl bg-[var(--color-input-bg)] px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No hay métodos de envío disponibles. Contacta al negocio.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {enabledCouriers.map((courier) => (
              <button
                key={courier.value}
                type="button"
                onClick={() => onCourierChange(courier.value)}
                className={`relative flex h-28 items-center justify-center overflow-hidden rounded-2xl p-2 transition-all ${
                  form.agencia === courier.value
                    ? courier.selectedBg
                    : "hover:bg-[var(--color-button-hover)]"
                }`}
              >
                <Image
                  src={courier.image}
                  alt={courier.label}
                  width={200}
                  height={80}
                  unoptimized
                  className="h-full w-auto max-w-full rounded-2xl object-contain"
                />
                {form.agencia === courier.value ? (
                  <CheckCircleIcon
                    size={21}
                    weight="fill"
                    className="absolute right-2 top-2 text-[var(--color-primary)]"
                  />
                ) : null}
              </button>
            ))}
          </div>
        )}
      </fieldset>
      <button
        type="button"
        disabled={!form.agencia}
        onClick={onContinue}
        className="public-primary-button"
      >
        Siguiente
        <ArrowRightIcon size={19} weight="bold" />
      </button>
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
      <StepTitle
        title={`Elige tu agencia ${courierLabel}`}
        subtitle="Busca por distrito, usa tu ubicación o selecciona un pin del mapa."
      />
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
          className="flex h-12 w-12 items-center justify-center gap-2 rounded-xl border border-[var(--color-primary)] text-sm font-black text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 disabled:opacity-60 sm:w-auto sm:px-5"
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
            className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
              selectedAgency?.externalId === agency.externalId
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] bg-[var(--color-sidebar-bg)] hover:bg-[var(--color-button-hover)]"
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

function StepThree({
  form,
  agency,
  isSubmitting,
  onBack,
}: {
  form: {
    nombreCompleto: string;
    dni: string;
    celular: string;
    agencia: SaleShippingAgency | "";
    agenciaExternalId: string;
  };
  agency: PublicShippingAgency;
  isSubmitting: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <StepTitle
        title="Confirma tus datos"
        subtitle="Revisa la información antes de enviarla al negocio."
      />
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-sidebar-bg)] p-4">
        <SummaryRow label="Cliente" value={form.nombreCompleto} />
        <SummaryRow label="DNI" value={form.dni} />
        <SummaryRow label="Celular" value={form.celular} />
        <SummaryRow label="Courier" value={form.agencia === "SHALOM" ? "Shalom" : "Olva"} />
        <div className="border-t border-[var(--color-border)] pt-3">
          <p className="text-[11px] font-bold uppercase text-[var(--color-muted-foreground)]">
            Agencia seleccionada
          </p>
          <p className="mt-1 text-sm font-black text-[var(--color-text)]">
            {agency.nombre}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
            {[agency.direccion, agency.distrito, agency.provincia]
              .filter(Boolean)
              .join(" · ")}
          </p>
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

function PublicHeader({ link }: { link: PublicShippingLink }) {
  return (
    <header className="sticky top-0 z-[1100] w-full border-b border-gray-200 bg-[var(--color-background)] px-5 py-4">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
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
      </div>
    </header>
  );
}

function StepIndicator({ current }: { current: FormStep }) {
  const labels = ["Datos", "Agencia", "Confirmar"];
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="mb-2 text-center text-xs font-bold text-[var(--color-muted-foreground)]">
        Paso {current} de 3 · {labels[current - 1]}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {labels.map((label, index) => {
          const number = index + 1;
          const active = number <= current;
          return (
            <div
              key={label}
              className="relative h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]"
            >
              <div
                className={`h-full rounded-full bg-[var(--color-primary)] transition-all duration-500 ease-out ${
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

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-black text-[var(--color-text)]">{title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>
    </div>
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

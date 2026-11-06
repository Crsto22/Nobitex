"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  BuildingsIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  PaperPlaneTiltIcon,
  PhoneIcon,
  SpinnerGapIcon,
  UserIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import {
  shippingLinksApi,
  type PublicShippingLink,
} from "@/lib/api/shipping-links";
import type { SaleShippingAgency } from "@/lib/api/sales";

const agencies: Array<{
  value: SaleShippingAgency;
  label: string;
  image: string;
  selectedBg: string;
}> = [
  {
    value: "SHALOM",
    label: "Shalom",
    image: "/envios/shalom.svg",
    selectedBg: "bg-[#e52421]/10",
  },
  {
    value: "OLVA",
    label: "Olva",
    image: "/envios/olva.webp",
    selectedBg: "bg-[#f5c518]/15",
  },
];

export default function ShippingDetailsPage() {
  const params = useParams<{ codigo: string }>();
  const code = params.codigo;
  const [link, setLink] = useState<PublicShippingLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombreCompleto: "",
    dni: "",
    celular: "",
    agencia: "" as SaleShippingAgency | "",
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.agencia || isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await shippingLinksApi.submit(code, {
        nombreCompleto: form.nombreCompleto.trim(),
        dni: form.dni,
        celular: form.celular,
        agencia: form.agencia,
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
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="flex items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
            <SpinnerGapIcon size={24} className="animate-spin text-[var(--color-primary)]" />
            Cargando formulario...
          </div>
        </div>
      </PublicShell>
    );
  }

  if (isUnavailable || !link) {
    return (
      <PublicShell>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="flex flex-col items-center justify-center px-6 text-center">
            <WarningCircleIcon
              size={52}
              weight="fill"
              className="text-[var(--color-destructive)]"
            />
            <h1 className="mt-4 text-xl font-black text-[var(--color-text)]">
              Enlace no disponible
            </h1>
            <p className="mt-2 max-w-sm text-sm text-[var(--color-muted-foreground)]">
              Solicita al negocio un nuevo enlace para registrar tus datos de
              envío.
            </p>
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <header className="sticky top-0 z-30 w-full border-b border-[var(--color-border)] bg-[var(--color-sidebar-bg)] px-5 py-4">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          {link.negocio.logoUrl ? (
            <Image
              src={link.negocio.logoUrl}
              alt={link.negocio.nombreComercial}
              width={38}
              height={38}
              unoptimized
              className="h-[38px] w-[38px] shrink-0 rounded-lg object-contain"
            />
          ) : (
            <Image
              src="/Logo/Nuvex.png"
              alt="Nuvex"
              width={38}
              height={38}
              priority
              className="h-[38px] w-[38px] shrink-0 object-contain"
            />
          )}
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

      <div className="flex flex-1 justify-center px-5 py-8">
        <div className="my-auto w-full max-w-md">
          {isComplete ? (
            <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#10b981]/10">
                <CheckCircleIcon
                  size={52}
                  weight="fill"
                  className="text-[#10b981]"
                />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--color-text)]">
                ¡Datos recibidos!
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted-foreground)]">
                {link.negocio.nombreComercial} ya puede coordinar el envío de tu
                pedido.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="text-center">
                <h1 className="text-2xl font-black text-[var(--color-text)]">
                  Datos de envío
                </h1>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Completa tus datos para coordinar el envío de tu pedido.
                </p>
              </div>

              <Field icon={<UserIcon size={19} />} label="Nombre completo">
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  autoComplete="name"
                  value={form.nombreCompleto}
                  onChange={(event) =>
                    setForm((current) => ({
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
                    setForm((current) => ({
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
                    setForm((current) => ({
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
                  Agencia
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {agencies.map((agency) => (
                    <button
                      key={agency.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          agencia: agency.value,
                        }))
                      }
                      className={`relative flex h-28 items-center justify-center overflow-hidden rounded-2xl p-2 transition-colors ${
                        form.agencia === agency.value
                          ? agency.selectedBg
                          : "hover:bg-[var(--color-button-hover)]"
                      }`}
                    >
                      <Image
                        src={agency.image}
                        alt={agency.label}
                        width={200}
                        height={80}
                        unoptimized
                        className="h-full w-auto max-w-full rounded-2xl object-contain"
                      />
                      {form.agencia === agency.value ? (
                        <CheckCircleIcon
                          size={20}
                          weight="fill"
                          className="absolute right-1.5 top-1.5 text-[var(--color-primary)]"
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error ? (
                <p className="rounded-xl bg-[var(--color-destructive)]/10 px-4 py-3 text-sm text-[var(--color-destructive)]">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!form.agencia || isSubmitting}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-black text-white shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <SpinnerGapIcon size={19} className="animate-spin" />
                ) : (
                  <PaperPlaneTiltIcon size={19} weight="fill" />
                )}
                Enviar datos
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicShell>
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

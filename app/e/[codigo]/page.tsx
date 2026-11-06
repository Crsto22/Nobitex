"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  BuildingsIcon,
  CheckCircleIcon,
  IdentificationCardIcon,
  PackageIcon,
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

const agencies: Array<{ value: SaleShippingAgency; label: string }> = [
  { value: "SHALOM", label: "Shalom" },
  { value: "OLVA", label: "Olva" },
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
        <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-[#667085]">
          <SpinnerGapIcon size={24} className="animate-spin text-[#6d28d9]" />
          Cargando formulario...
        </div>
      </PublicShell>
    );
  }

  if (isUnavailable || !link) {
    return (
      <PublicShell>
        <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
          <WarningCircleIcon size={52} weight="fill" className="text-[#ef4444]" />
          <h1 className="mt-4 text-xl font-black text-[#172033]">
            Enlace no disponible
          </h1>
          <p className="mt-2 max-w-sm text-sm text-[#667085]">
            Solicita al negocio un nuevo enlace para registrar tus datos de envío.
          </p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <header className="border-b border-[#ece8f7] bg-gradient-to-r from-[#32106f] to-[#7c2dcc] px-5 py-5 text-white">
        <div className="flex items-center gap-3">
          {link.negocio.logoUrl ? (
            <div
              role="img"
              aria-label={`Logo de ${link.negocio.nombreComercial}`}
              className="h-12 w-12 shrink-0 rounded-xl bg-white bg-contain bg-center bg-no-repeat shadow-sm"
              style={{ backgroundImage: `url(${link.negocio.logoUrl})` }}
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <PackageIcon size={26} weight="fill" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-black">
              {link.negocio.nombreComercial}
            </p>
            <p className="text-xs text-white/75">
              Formulario seguro con Nuvex
            </p>
          </div>
        </div>
      </header>

      {isComplete ? (
        <div className="flex min-h-[430px] flex-col items-center justify-center px-7 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#10b981]/10">
            <CheckCircleIcon size={52} weight="fill" className="text-[#10b981]" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-[#172033]">
            ¡Datos recibidos!
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#667085]">
            {link.negocio.nombreComercial} ya puede coordinar el envío de tu pedido.
          </p>
          <div className="mt-5 rounded-full bg-[#f4f0fb] px-4 py-2 text-xs font-bold text-[#6d28d9]">
            Venta {link.venta.correlativo}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 px-5 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-black text-[#172033]">
              Datos de envío
            </h1>
            <p className="mt-1 text-sm text-[#667085]">
              Completa tus datos para coordinar el envío de tu pedido.
            </p>
            <p className="mt-2 text-xs font-bold text-[#6d28d9]">
              Venta {link.venta.correlativo}
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
            <legend className="mb-2 flex items-center gap-2 text-xs font-bold text-[#475467]">
              <BuildingsIcon size={19} className="text-[#6d28d9]" />
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
                  className={`h-12 rounded-xl border text-sm font-bold transition-colors ${
                    form.agencia === agency.value
                      ? "border-[#7c2dcc] bg-[#7c2dcc]/10 text-[#6d28d9]"
                      : "border-[#dfe3eb] bg-white text-[#475467]"
                  }`}
                >
                  {agency.label}
                </button>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#b42318]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!form.agencia || isSubmitting}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#9333ea] px-4 text-sm font-black text-white shadow-lg shadow-purple-900/15 disabled:cursor-not-allowed disabled:opacity-50"
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
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#f5f3fa] px-3 py-5 sm:flex sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_20px_70px_rgba(48,25,82,0.14)]">
        {children}
        <footer className="flex items-center justify-center gap-2 border-t border-[#ece8f7] px-5 py-4 text-[11px] font-bold text-[#98a2b3]">
          <span>Protegido por</span>
          <Image
            src="/Logo/nuvex_logo.svg"
            alt="Nuvex"
            width={72}
            height={22}
            className="h-5 w-auto"
          />
        </footer>
      </div>
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
      <span className="mb-2 flex items-center gap-2 text-xs font-bold text-[#475467]">
        <span className="text-[#6d28d9]">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  TagIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { NativeSelect } from "@/components/ui/select";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  platformAdminApi,
  type SavePlatformAffiliatePayload,
} from "@/lib/api/platform-admin";

const inputClass =
  "h-11 w-full rounded-xl bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const initial: SavePlatformAffiliatePayload = {
  code: "",
  name: "",
  document: "",
  email: "",
  phone: "",
  discountPercent: "0",
  commissionPercent: "0",
  status: "activo",
};

export default function AffiliateFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useSystemToast();
  const isNew = params.id === "nuevo";
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const affiliate = await platformAdminApi.getAffiliate(params.id);
      setForm({
        code: affiliate.code,
        name: affiliate.name,
        document: affiliate.document ?? "",
        email: affiliate.email ?? "",
        phone: affiliate.phone ?? "",
        discountPercent: affiliate.discountPercent,
        commissionPercent: affiliate.commissionPercent,
        status: affiliate.status,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el afiliado",
      );
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const set = (key: keyof SavePlatformAffiliatePayload, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        document: form.document?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      };
      if (isNew) await platformAdminApi.createAffiliate(payload);
      else await platformAdminApi.updateAffiliate(params.id, payload);
      showToast({
        title: isNew ? "Afiliado creado" : "Afiliado actualizado",
        description: `El código ${form.code.toUpperCase()} quedó disponible.`,
        variant: "success",
      });
      router.push("/superadmin/afiliados");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar";
      setError(message);
      showToast({
        title: "No se pudo guardar",
        description: message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      headerTitle={isNew ? "Nuevo afiliado" : "Editar afiliado"}
      headerParent={{ label: "Afiliados", href: "/superadmin/afiliados" }}
    >
      <main className="content-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto bg-[var(--color-background)] p-4 lg:px-6 lg:py-5">
        {loading ? (
          <div className="h-96 animate-pulse rounded-[14px] bg-[var(--color-card)]" />
        ) : (
          <form
            onSubmit={submit}
            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
          >
            <div className="space-y-4">
              <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.1)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-[var(--color-primary)] text-white">
                    <UserCircleIcon size={20} weight="fill" />
                  </span>
                  <p className="text-sm font-circular-bold">
                    Datos del afiliado
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nombre">
                    <input
                      required
                      minLength={2}
                      maxLength={160}
                      value={form.name}
                      onChange={(event) => set("name", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Documento">
                    <input
                      maxLength={20}
                      value={form.document}
                      onChange={(event) => set("document", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Correo">
                    <input
                      type="email"
                      maxLength={180}
                      value={form.email}
                      onChange={(event) => set("email", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Teléfono">
                    <input
                      maxLength={30}
                      value={form.phone}
                      onChange={(event) => set("phone", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>
              <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.1)]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-[#10283e] text-white">
                    <TagIcon size={19} weight="fill" />
                  </span>
                  <p className="text-sm font-circular-bold">
                    Código y porcentajes
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Código">
                    <input
                      required
                      pattern="[A-Za-z0-9-]{4,30}"
                      maxLength={30}
                      value={form.code}
                      onChange={(event) =>
                        set("code", event.target.value.toUpperCase())
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Estado">
                    <NativeSelect
                      value={form.status}
                      onChange={(event) => set("status", event.target.value)}
                      className={inputClass}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Descuento inicial (%)">
                    <input
                      required
                      type="number"
                      min="0"
                      max="50"
                      step="0.01"
                      value={form.discountPercent}
                      onChange={(event) =>
                        set("discountPercent", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Comisión recurrente (%)">
                    <input
                      required
                      type="number"
                      min="0"
                      max="50"
                      step="0.01"
                      value={form.commissionPercent}
                      onChange={(event) =>
                        set("commissionPercent", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>
              {error ? (
                <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}
            </div>
            <aside className="h-fit rounded-[14px] bg-[var(--color-primary)] p-4 text-white shadow-[0_2px_10px_rgba(21,25,34,0.12)] xl:sticky xl:top-0">
              <p className="text-xs opacity-70">Código</p>
              <p className="mt-1 text-xl font-circular-bold">
                {form.code || "SIN CÓDIGO"}
              </p>
              <div className="my-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[10px] opacity-70">Descuento</p>
                  <p className="font-circular-bold">
                    {Number(form.discountPercent || 0).toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[10px] opacity-70">Comisión</p>
                  <p className="font-circular-bold">
                    {Number(form.commissionPercent || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-circular-bold text-[var(--color-primary)] disabled:opacity-60"
              >
                <CheckCircleIcon size={18} />{" "}
                {saving ? "Guardando..." : "Guardar afiliado"}
              </button>
            </aside>
          </form>
        )}
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
    <label className="grid gap-1.5 text-xs text-[var(--color-muted-foreground)]">
      {label}
      {children}
    </label>
  );
}

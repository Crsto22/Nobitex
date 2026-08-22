"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  DotsThreeVerticalIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { clientsApi } from "@/lib/api/clients";
import { purchasesApi, type Supplier } from "@/lib/api/purchases";
import { defaultPageSize } from "@/lib/pagination";

const emptyForm = {
  ruc: "",
  razonSocial: "",
  nombreComercial: "",
  direccion: "",
  telefono: "",
  email: "",
  personaContacto: "",
  telefonoContacto: "",
  activo: true,
};

type SupplierForm = typeof emptyForm;

export default function SuppliersPage() {
  const { showToast } = useSystemToast();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: defaultPageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchingRuc, setSearchingRuc] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    editing: Supplier | null;
    form: SupplierForm;
    error: string;
  }>({ open: false, editing: null, form: emptyForm, error: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await purchasesApi.suppliers({
        page: meta.page,
        limit: meta.limit,
        search: search.trim() || undefined,
      });
      setRows(result.data);
      setMeta(result.meta);
    } catch (error) {
      showToast({
        title: "No se pudieron cargar proveedores",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [meta.limit, meta.page, search, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openCreate = () => {
    setModal({ open: true, editing: null, form: emptyForm, error: "" });
  };

  const openEdit = (supplier: Supplier) => {
    setOpenMenuId(null);
    setModal({
      open: true,
      editing: supplier,
      error: "",
      form: {
        ruc: supplier.ruc,
        razonSocial: supplier.razonSocial,
        nombreComercial: supplier.nombreComercial ?? "",
        direccion: supplier.direccion ?? "",
        telefono: supplier.telefono ?? "",
        email: supplier.email ?? "",
        personaContacto: supplier.personaContacto ?? "",
        telefonoContacto: supplier.telefonoContacto ?? "",
        activo: supplier.activo,
      },
    });
  };

  const closeModal = () => {
    if (!submitting && !searchingRuc) {
      setModal({ open: false, editing: null, form: emptyForm, error: "" });
    }
  };

  const searchRuc = async () => {
    const ruc = modal.form.ruc.replace(/\D/g, "");
    if (!/^\d{11}$/.test(ruc)) {
      setModal((current) => ({ ...current, error: "El RUC debe tener 11 digitos." }));
      return;
    }
    setSearchingRuc(true);
    setModal((current) => ({ ...current, error: "" }));
    try {
      const data = await clientsApi.consultarRuc(ruc);
      setModal((current) => ({
        ...current,
        form: {
          ...current.form,
          ruc,
          razonSocial: data.razonSocial || current.form.razonSocial,
          nombreComercial: data.nombreComercial || current.form.nombreComercial,
          direccion: data.direccion || current.form.direccion,
          telefono: data.telefonos?.[0] || current.form.telefono,
        },
      }));
      showToast({ title: "RUC encontrado", variant: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo consultar el RUC.";
      setModal((current) => ({ ...current, error: message }));
      showToast({ title: "No se pudo consultar", description: message, variant: "error" });
    } finally {
      setSearchingRuc(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload(modal.form);
    const validation = validate(payload);
    if (validation) {
      setModal((current) => ({ ...current, error: validation }));
      return;
    }
    setSubmitting(true);
    try {
      const saved = modal.editing
        ? await purchasesApi.updateSupplier(modal.editing.id, payload)
        : await purchasesApi.createSupplier(payload);
      await load();
      showToast({
        title: modal.editing ? "Proveedor actualizado" : "Proveedor creado",
        description: saved.displayName,
        variant: "success",
      });
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar.";
      setModal((current) => ({ ...current, error: message }));
      showToast({ title: "No se pudo guardar", description: message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteSupplier) return;
    try {
      await purchasesApi.removeSupplier(deleteSupplier.id);
      await load();
      showToast({ title: "Proveedor inactivado", variant: "success" });
    } catch (error) {
      showToast({
        title: "No se pudo inactivar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setDeleteSupplier(null);
    }
  };

  return (
    <DashboardShell headerTitle="Proveedores">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric icon={<UsersThreeIcon size={22} weight="fill" />} label="Proveedores" value={meta.total} />
          <Metric icon={<IdentificationCardIcon size={22} weight="fill" />} label="Activos" value={meta.activeTotal} tone="success" />
          <Metric icon={<TrashIcon size={22} weight="fill" />} label="Inactivos" value={meta.inactiveTotal} tone="muted" />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative flex-1">
            <MagnifyingGlassIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setMeta((current) => ({ ...current, page: 1 }));
              }}
              placeholder="Buscar por RUC, razon social, telefono o contacto"
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] hover:opacity-90"
          >
            <PlusIcon size={18} weight="bold" />
            Nuevo proveedor
          </button>
        </div>

        <section className="space-y-2">
          {loading ? (
            <SuppliersSkeleton />
          ) : rows.map((supplier) => (
            <article key={supplier.id} className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-sm sm:p-4 md:grid-cols-[1.2fr_0.7fr_1fr_1fr_0.4fr] md:items-center md:gap-4 md:gap-y-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <UserIcon size={20} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">{supplier.displayName}</p>
                  <p className="truncate text-xs text-[var(--color-muted-foreground)]">{supplier.razonSocial}</p>
                </div>
              </div>
              <div>
                <span className="inline-flex rounded-lg bg-[#f59e0b]/10 px-3 py-1.5 text-xs font-circular-bold text-[#d97706]">RUC {supplier.ruc}</span>
              </div>
              <Info icon={<PhoneIcon size={15} />} value={supplier.telefono || supplier.email} fallback="Sin contacto" />
              <Info icon={<MapPinIcon size={15} />} value={supplier.direccion} fallback="Sin direccion" />
              <div className="relative flex justify-end">
                <button type="button" onClick={() => setOpenMenuId(openMenuId === supplier.id ? null : supplier.id)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-button-hover)]">
                  <DotsThreeVerticalIcon size={20} weight="bold" />
                </button>
                {openMenuId === supplier.id ? (
                  <div className="absolute right-0 top-10 z-20 w-44 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                    <button type="button" onClick={() => openEdit(supplier)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--color-button-hover)]">
                      <PencilSimpleIcon size={16} /> Editar
                    </button>
                    <button type="button" onClick={() => { setOpenMenuId(null); setDeleteSupplier(supplier); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10">
                      <TrashIcon size={16} /> Inactivar
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {!rows.length && !loading ? (
            <div className="rounded-[14px] bg-[var(--color-card)] px-4 py-16 text-center text-sm text-[var(--color-muted-foreground)]">Sin proveedores registrados</div>
          ) : null}
        </section>
      </div>

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.editing ? "Editar proveedor" : "Nuevo proveedor"} description="Consulta por RUC y completa los datos de contacto." size="lg">
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm text-[#4e5671]">RUC</label>
            <div className="flex gap-2">
              <input value={modal.form.ruc} onChange={(event) => setModal((current) => ({ ...current, form: { ...current.form, ruc: event.target.value.replace(/\D/g, "") } }))} maxLength={11} required className="h-11 min-w-0 flex-1 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
              <Button type="button" onClick={searchRuc} disabled={searchingRuc || modal.form.ruc.length !== 11} className="h-11 rounded-[14px] bg-[var(--color-primary)] px-4 text-white">
                {searchingRuc ? "..." : "Buscar"}
              </Button>
            </div>
          </div>
          <Field label="Razon social" value={modal.form.razonSocial} onChange={(value) => setForm(setModal, "razonSocial", value)} required />
          <Field label="Nombre comercial" value={modal.form.nombreComercial} onChange={(value) => setForm(setModal, "nombreComercial", value)} />
          <Field label="Direccion" value={modal.form.direccion} onChange={(value) => setForm(setModal, "direccion", value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefono" value={modal.form.telefono} onChange={(value) => setForm(setModal, "telefono", value)} />
            <Field label="Email" type="email" value={modal.form.email} onChange={(value) => setForm(setModal, "email", value)} />
          </div>
          <div className="grid gap-4 rounded-[14px] bg-[var(--color-background)] p-4 sm:grid-cols-2">
            <Field label="Persona contacto" value={modal.form.personaContacto} onChange={(value) => setForm(setModal, "personaContacto", value)} />
            <Field label="Telefono contacto" value={modal.form.telefonoContacto} onChange={(value) => setForm(setModal, "telefonoContacto", value)} />
          </div>
          {modal.error ? <p className="text-sm text-[#d9480f]">{modal.error}</p> : null}
          <div className="flex gap-3">
            <Button type="button" onClick={closeModal} disabled={submitting || searchingRuc} className="h-11 flex-1 rounded-[14px] bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]">Cancelar</Button>
            <Button type="submit" disabled={submitting || searchingRuc} className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-white hover:opacity-90">{submitting ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteSupplier !== null}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={() => void confirmDelete()}
        title="Inactivar proveedor"
        description="El proveedor quedara oculto para nuevas ordenes."
        itemName={deleteSupplier?.displayName}
      />
    </DashboardShell>
  );
}

function SuppliersSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid animate-pulse grid-cols-2 gap-x-3 gap-y-3 rounded-[14px] bg-[var(--color-card)] p-3 shadow-sm sm:p-4 md:grid-cols-[1.2fr_0.7fr_1fr_1fr_0.4fr] md:items-center md:gap-4"
        >
          <SkeletonBlock />
          <div className="h-8 w-28 rounded-lg bg-[var(--color-input-bg)]" />
          <SkeletonBlock compact />
          <SkeletonBlock />
          <div className="flex justify-end">
            <div className="h-9 w-9 rounded-full bg-[var(--color-input-bg)]" />
          </div>
        </div>
      ))}
    </>
  );
}

function SkeletonBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-2">
      <div
        className={`h-3 rounded-full bg-[var(--color-input-bg)] ${compact ? "w-20" : "w-36"}`}
      />
      <div
        className={`h-4 rounded-full bg-[var(--color-input-bg)] ${compact ? "w-28" : "w-44"}`}
      />
    </div>
  );
}

function buildPayload(form: SupplierForm) {
  return {
    ruc: form.ruc.trim(),
    razonSocial: form.razonSocial.trim(),
    nombreComercial: form.nombreComercial.trim() || null,
    direccion: form.direccion.trim() || null,
    telefono: form.telefono.trim() || null,
    email: form.email.trim() || null,
    personaContacto: form.personaContacto.trim() || null,
    telefonoContacto: form.telefonoContacto.trim() || null,
    activo: form.activo,
  };
}

function validate(payload: ReturnType<typeof buildPayload>) {
  if (!/^\d{11}$/.test(payload.ruc)) return "El RUC debe tener 11 digitos.";
  if (!payload.razonSocial) return "Ingresa la razon social.";
  return "";
}

function setForm(
  setModal: Dispatch<SetStateAction<{ open: boolean; editing: Supplier | null; form: SupplierForm; error: string }>>,
  key: keyof SupplierForm,
  value: string,
) {
  setModal((current) => ({ ...current, form: { ...current.form, [key]: value } }));
}

function Field({ label, value, onChange, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#4e5671]">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
    </label>
  );
}

function Info({ icon, value, fallback }: { icon: ReactNode; value?: string | null; fallback: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[var(--color-muted-foreground)]">{icon}</span>
      <span className="truncate text-xs text-[var(--color-text)]">{value || fallback}</span>
    </div>
  );
}

function Metric({ icon, label, value, tone = "primary" }: { icon: ReactNode; label: string; value: number; tone?: "primary" | "success" | "muted" }) {
  const colors = tone === "success" ? "bg-[#10b981]/10 text-[#10b981]" : tone === "muted" ? "bg-[#6b7280]/10 text-[#6b7280]" : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]";
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors}`}>{icon}</div>
        <div>
          <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
          <p className="text-2xl font-circular-bold text-[var(--color-text)]">{value.toLocaleString("es-PE")}</p>
        </div>
      </div>
    </div>
  );
}

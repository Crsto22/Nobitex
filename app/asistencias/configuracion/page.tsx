"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PlusIcon,
  StorefrontIcon,
  UsersIcon,
  WarehouseIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import {
  branchesApi,
  type Branch,
  type BranchPayload,
  type BranchStatus,
  type BranchType,
} from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import peruUbigeos from "@/lib/data/peru-ubigeos.json";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type PeruUbigeo = {
  ubigeo: string;
  distrito: string;
  provincia: string;
  departamento: string;
  label: string;
};

const ubigeos = peruUbigeos as PeruUbigeo[];
const pageSize = defaultPageSize;
const typeConfig = {
  tienda: {
    label: "POS",
    icon: StorefrontIcon,
    className: "bg-[#3b82f6]/10 text-[#2563eb]",
  },
  almacen: {
    label: "Almacen",
    icon: WarehouseIcon,
    className: "bg-[#f59e0b]/10 text-[#d97706]",
  },
  asistencia: {
    label: "Asistencia",
    icon: UsersIcon,
    className: "bg-[#10b981]/10 text-[#059669]",
  },
};
const emptyForm = {
  nombre: "",
  ubigeo: "",
  distrito: "",
  direccion: "",
  estado: "activo" as BranchStatus,
};

export default function AsistenciasConfiguracionPage() {
  const { refreshPlan } = useAuth();
  const { showToast } = useSystemToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
    storeTotal: 0,
    warehouseTotal: 0,
    attendanceTotal: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response] = await Promise.all([
        branchesApi.findAll({
          page,
          limit: pageSize,
          search,
        }),
        refreshPlan(),
      ]);
      setBranches(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      showToast({
        title: "No se pudo cargar",
        description:
          requestError instanceof Error
            ? requestError.message
            : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, refreshPlan, search, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const branchUsage = meta.total;
  const districtOptions = useMemo(
    () =>
      ubigeos
        .filter((item) =>
          normalize(`${item.label} ${item.ubigeo}`).includes(
            normalize(form.distrito),
          ),
        )
        .slice(0, 30),
    [form.distrito],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({
      nombre: branch.nombre,
      ubigeo: branch.ubigeo,
      distrito: branch.distrito,
      direccion: branch.direccion,
      estado: branch.estado,
    });
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = buildPayload(form, editing?.tipo);
    if (!payload) {
      setError("Completa nombre, distrito, ubigeo y direccion.");
      return;
    }
    setSaving(true);
    try {
      const saved = editing
        ? await branchesApi.update(editing.id, payload)
        : await branchesApi.create(payload);
      showToast({
        title: editing ? "Sucursal actualizada" : "Sucursal creada",
        description: saved.nombre,
        variant: "success",
      });
      closeModal();
      await load();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo guardar la sucursal.";
      setError(message);
      if (message) {
        showToast({
          title: "No se pudo guardar",
          description: message,
          variant: "error",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (branch: Branch) => {
    try {
      await branchesApi.update(branch.id, {
        estado: branch.estado === "activo" ? "inactivo" : "activo",
      });
      await load();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cambiar el estado.";
      if (message) {
        showToast({
          title: "No se pudo actualizar",
          description: message,
          variant: "error",
        });
      }
    }
  };

  return (
    <DashboardShell headerTitle="Sucursales">
      <main className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6 lg:py-5">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Sucursales" value={String(branchUsage)} />
          <Metric label="POS" value={String(meta.storeTotal)} />
          <Metric label="Almacenes" value={String(meta.warehouseTotal)} />
          <Metric label="Asistencia" value={String(meta.attendanceTotal)} />
          <Metric label="Activas" value={String(meta.activeTotal)} />
          <Metric label="Inactivas" value={String(meta.inactiveTotal)} />
        </section>

        <section className="sticky -top-4 z-20 -mx-3 flex flex-col gap-3 bg-[var(--color-background)] px-3 py-2 sm:-mx-4 sm:flex-row sm:px-4 lg:-mx-6 lg:px-6">
          <label className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar sucursal, distrito o direccion..."
              className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>
          <button
            type="button"
            onClick={openCreate}
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white"
          >
            <PlusIcon size={16} weight="bold" />
            Nueva sucursal
          </button>
        </section>

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[14px] bg-[var(--color-card)]"
              />
            ))}
          </div>
        ) : branches.length ? (
          <section className="grid gap-3">
            {branches.map((branch) => {
              const type = typeConfig[branch.tipo];
              const TypeIcon = type.icon;
              return (
              <article
                key={branch.id}
                className="grid gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.1)] md:grid-cols-[1fr_1.2fr_auto] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", type.className)}>
                    <TypeIcon size={21} weight="fill" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
                      {branch.nombre}
                    </p>
                    <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-circular-bold", type.className)}>
                      {type.label}
                    </span>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--color-text)]">
                  <MapPinIcon
                    size={16}
                    className="shrink-0 text-[var(--color-muted-foreground)]"
                  />
                  <span className="truncate">
                    {branch.direccion} · {branch.distrito}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleStatus(branch)}
                    className={cn(
                      "h-9 rounded-lg px-3 text-xs font-circular-bold",
                      branch.estado === "activo"
                        ? "bg-[#10b981]/10 text-[#059669]"
                        : "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
                    )}
                  >
                    {branch.estado === "activo" ? "Activo" : "Inactivo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(branch)}
                    className="grid size-9 place-items-center rounded-lg bg-[var(--color-input-bg)] text-[var(--color-text)]"
                    aria-label="Editar sucursal"
                  >
                    <PencilSimpleIcon size={16} weight="bold" />
                  </button>
                </div>
              </article>
              );
            })}
          </section>
        ) : (
          <section className="grid min-h-[220px] place-items-center rounded-[14px] bg-[var(--color-card)] p-6 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#10b981]/10 text-[#059669]">
                <StorefrontIcon size={24} weight="fill" />
              </span>
              <h2 className="mt-3 text-base font-circular-bold text-[var(--color-text)]">
                Sin sucursales
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Crea una sucursal para enlazar tus puntos QR.
              </p>
            </div>
          </section>
        )}

        <footer className="flex items-center justify-between pb-2 text-xs text-[var(--color-muted-foreground)]">
          <span>
            Mostrando {branches.length} de {meta.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary)] font-circular-bold text-white">
              {meta.page}
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
              className="h-8 rounded-lg bg-[var(--color-input-bg)] px-3 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar sucursal" : "Nueva sucursal"}
        description="Sucursal o sede usada para marcajes y puntos QR."
        size="lg"
      >
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nombre"
              value={form.nombre}
              onChange={(value) =>
                setForm((current) => ({ ...current, nombre: value }))
              }
              placeholder="Sede principal"
            />
            <label className="grid gap-2 text-sm">
              <span className="font-circular-bold text-[var(--color-text)]">
                Estado
              </span>
              <select
                value={form.estado}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    estado: event.target.value as BranchStatus,
                  }))
                }
                className="h-11 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-[var(--color-text)] outline-none"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-circular-bold text-[var(--color-text)]">
                Distrito / ubigeo
              </span>
              <input
                list="attendance-ubigeos"
                value={form.distrito}
                onChange={(event) => {
                  const value = event.target.value;
                  const selected = ubigeos.find((item) => item.label === value);
                  setForm((current) => ({
                    ...current,
                    distrito: selected?.distrito ?? value,
                    ubigeo: selected?.ubigeo ?? current.ubigeo,
                  }));
                }}
                placeholder="Buscar distrito"
                className="h-11 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-[var(--color-text)] outline-none"
              />
              <datalist id="attendance-ubigeos">
                {districtOptions.map((item) => (
                  <option key={item.ubigeo} value={item.label} />
                ))}
              </datalist>
            </label>
            <Field
              label="Ubigeo"
              value={form.ubigeo}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  ubigeo: onlyDigits(value).slice(0, 6),
                }))
              }
              placeholder="150101"
            />
          </div>

          <Field
            label="Direccion"
            value={form.direccion}
            onChange={(value) =>
              setForm((current) => ({ ...current, direccion: value }))
            }
            placeholder="Av. Principal 123"
          />

          {error ? <p className="text-sm text-[#d9480f]">{error}</p> : null}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={saving}
              className="h-11 flex-1 rounded-[14px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-white"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.08)]">
      <span className="grid size-10 place-items-center rounded-xl bg-[#10b981]/10 text-[#059669]">
        <CheckCircleIcon size={20} weight="fill" />
      </span>
      <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="text-xl font-circular-bold text-[var(--color-text)]">
        {value}
      </p>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-circular-bold text-[var(--color-text)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-[var(--color-text)] outline-none"
      />
    </label>
  );
}

function buildPayload(
  form: typeof emptyForm,
  branchType: BranchType = "asistencia",
): BranchPayload | null {
  const nombre = form.nombre.trim();
  const ubigeo = form.ubigeo.trim();
  const distrito = form.distrito.trim();
  const direccion = form.direccion.trim();
  if (!nombre || !/^\d{6}$/.test(ubigeo) || !distrito || !direccion) {
    return null;
  }
  return {
    nombre,
    tipo: branchType,
    ubigeo,
    distrito,
    direccion,
    estado: form.estado,
    esPrincipal: false,
    modoCajaHabilitado: false,
  };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

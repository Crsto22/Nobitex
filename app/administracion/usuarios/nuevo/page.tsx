"use client";

import { NativeSelect } from "@/components/ui/select";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  FloppyDiskIcon,
  SquaresFourIcon,
  BuildingsIcon,
  EyeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { usersApi, type CreateUserPayload } from "@/lib/api/users";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  assignableSidebarModules,
  tenantSidebarSections,
  warehouseAssignableModuleKeys,
} from "@/lib/navigation/sidebar-modules";
import { cn } from "@/lib/utils";

const defaultForm: CreateUserPayload = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  password: "",
  confirmarPassword: "",
  moduleKeys: [],
  sucursalId: null,
  visibilidadOperaciones: "todas",
};

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const { currentPlan } = useAuth();
  const [form, setForm] = useState<CreateUserPayload>(defaultForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  useEffect(() => {
    branchesApi
      .findAll({ limit: 100, estado: "activo" })
      .then((response) => setBranches(response.data))
      .catch(() => setBranches([]))
      .finally(() => setIsLoadingBranches(false));
  }, []);
  const availableModuleKeys = useMemo(
    () =>
      new Set(
        currentPlan?.plan.moduleKeys ??
          assignableSidebarModules.map((module) => module.key),
      ),
    [currentPlan],
  );
  const availableModules = useMemo(
    () => {
      const warehouseSelected = branches.some(
        (branch) => branch.id === form.sucursalId && branch.tipo === "almacen",
      );
      return (
      assignableSidebarModules.filter((module) =>
        availableModuleKeys.has(module.key) &&
        (!warehouseSelected || warehouseAssignableModuleKeys.has(module.key)),
      ));
    },
    [availableModuleKeys, branches, form.sucursalId],
  );
  const assignableModuleKeys = useMemo(
    () => new Set(availableModules.map((module) => module.key)),
    [availableModules],
  );
  const moduleCount = form.moduleKeys.filter((key) =>
    assignableModuleKeys.has(key),
  ).length;
  const allSelected =
    availableModules.length > 0 && moduleCount === availableModules.length;
  const selectedModules = useMemo(
    () => new Set(form.moduleKeys),
    [form.moduleKeys],
  );

  const setField = (field: keyof CreateUserPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleModule = (moduleKey: string) => {
    setForm((current) => {
      const selected = new Set(current.moduleKeys);
      if (selected.has(moduleKey)) {
        selected.delete(moduleKey);
      } else {
        selected.add(moduleKey);
      }

      return { ...current, moduleKeys: Array.from(selected) };
    });
  };

  const toggleAllModules = () => {
    setForm((current) => ({
      ...current,
      moduleKeys: allSelected
        ? []
        : availableModules.map((module) => module.key),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const payload: CreateUserPayload = {
      ...form,
      nombre: form.nombre.trim(),
      apellido: form.apellido?.trim() || undefined,
      email: form.email.trim().toLowerCase(),
      telefono: form.telefono?.trim() || undefined,
      moduleKeys: form.moduleKeys.filter((key) => assignableModuleKeys.has(key)),
    };

    if (!payload.nombre || !payload.email || !payload.password) {
      setFormError("Completa nombre, correo y contrasena temporal.");
      return;
    }

    if (payload.password !== payload.confirmarPassword) {
      setFormError("Las contrasenas no coinciden.");
      return;
    }

    if (payload.moduleKeys.length === 0) {
      setFormError("Selecciona al menos un modulo.");
      return;
    }

    if (
      form.sucursalId === "" ||
      (form.sucursalId &&
        !branches.some((branch) => branch.id === form.sucursalId))
    ) {
      setFormError("Selecciona una sucursal valida.");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await usersApi.create(payload);
      showToast({
        title: "Usuario creado",
        description: `${created.nombre} ya puede iniciar sesion.`,
        variant: "success",
      });
      router.push("/administracion/usuarios");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el usuario.";
      setFormError(message);
      showToast({
        title: "No se pudo crear",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell
      headerTitle="Nuevo usuario"
      headerParent={{ label: "Usuarios", href: "/administracion/usuarios" }}
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-circular-bold text-[var(--color-text)]">
              Crear usuario nuevo
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Datos de acceso y modulos permitidos.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"
        >
          <section className="space-y-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="user-name"
                label="Nombre"
                value={form.nombre}
                placeholder="Juan"
                disabled={isSubmitting}
                onChange={(value) => setField("nombre", value)}
              />
              <InputField
                id="user-last-name"
                label="Apellido"
                value={form.apellido ?? ""}
                placeholder="Perez"
                disabled={isSubmitting}
                onChange={(value) => setField("apellido", value)}
              />
            </div>

            <section className="space-y-4 rounded-[12px] bg-[var(--color-input-bg)] p-3">
              <div className="flex items-center gap-2">
                <BuildingsIcon
                  size={17}
                  weight="fill"
                  className="text-[var(--color-primary)]"
                />
                <p className="text-sm font-circular-bold text-[var(--color-text)]">
                  Alcance de trabajo
                </p>
              </div>

              <ScopeToggle
                icon={<BuildingsIcon size={16} weight="bold" />}
                label="Sucursales"
                value={form.sucursalId ? "single" : "all"}
                options={[
                  { value: "all", label: "Todas" },
                  { value: "single", label: "Una sucursal" },
                ]}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    sucursalId:
                      value === "all" ? null : current.sucursalId || "",
                  }))
                }
              />

              {form.sucursalId !== null ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
                    Sucursal asignada
                  </span>
                  <NativeSelect
                    value={form.sucursalId}
                    disabled={isSubmitting || isLoadingBranches}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sucursalId: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-[14px] border-0 bg-[var(--color-card)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    <option value="">Selecciona una sucursal</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nombre}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              ) : null}

              <ScopeToggle
                icon={<EyeIcon size={16} weight="bold" />}
                label="Operaciones comerciales"
                value={form.visibilidadOperaciones}
                options={[
                  { value: "todas", label: "Todas" },
                  { value: "propias", label: "Solo las suyas" },
                ]}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    visibilidadOperaciones: value as "propias" | "todas",
                  }))
                }
              />
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="user-email"
                label="Correo"
                value={form.email}
                placeholder="usuario@empresa.com"
                type="email"
                disabled={isSubmitting}
                onChange={(value) => setField("email", value)}
              />
              <InputField
                id="user-phone"
                label="Celular"
                value={form.telefono ?? ""}
                placeholder="999999999"
                disabled={isSubmitting}
                onChange={(value) => setField("telefono", value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="user-password"
                label="Contrasena temporal"
                value={form.password}
                placeholder="Minimo 8 caracteres"
                type="password"
                disabled={isSubmitting}
                onChange={(value) => setField("password", value)}
              />
              <InputField
                id="user-confirm-password"
                label="Confirmar contrasena"
                value={form.confirmarPassword}
                placeholder="Repite la contrasena"
                type="password"
                disabled={isSubmitting}
                onChange={(value) => setField("confirmarPassword", value)}
              />
            </div>

            {formError ? (
              <p className="text-sm font-circular-regular text-[#d9480f]">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/administracion/usuarios")}
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
              >
                <FloppyDiskIcon size={16} weight="bold" />
                {isSubmitting ? "Guardando..." : "Crear usuario"}
              </Button>
            </div>
          </section>

          <section className="space-y-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-circular-bold text-[var(--color-text)]">
                  Modulos de acceso
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {moduleCount} de {availableModules.length} seleccionados
                </p>
              </div>
              <button
                type="button"
                onClick={toggleAllModules}
                disabled={isSubmitting}
                className="h-9 rounded-[10px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:opacity-60"
              >
                {allSelected ? "Quitar todos" : "Marcar todos"}
              </button>
            </div>

            <div className="space-y-3">
              {tenantSidebarSections.map((section) => {
                const modules =
                  section.direct && section.route
                    ? [
                        {
                          key: section.key,
                          label: section.label,
                          icon: section.icon,
                          route: section.route,
                        },
                      ]
                    : section.children;
                const availableSectionModules = modules.filter(
                  (module) =>
                    module.assignable !== false &&
                    assignableModuleKeys.has(module.key),
                );
                const SectionIcon = section.icon;

                if (availableSectionModules.length === 0) return null;

                return (
                  <div
                    key={section.key}
                    className="rounded-[12px] bg-[var(--color-input-bg)] p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <SectionIcon
                        size={17}
                        weight="fill"
                        className="text-[var(--color-primary)]"
                      />
                      <p className="text-sm font-circular-bold text-[var(--color-text)]">
                        {section.label}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableSectionModules.map((module) => {
                        const Icon = module.icon;
                        const isSelected = selectedModules.has(module.key);

                        return (
                          <button
                            key={module.key}
                            type="button"
                            onClick={() => toggleModule(module.key)}
                            disabled={isSubmitting}
                            className={cn(
                              "flex min-h-11 items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm transition-colors disabled:opacity-60",
                              isSelected
                                ? "bg-[var(--color-primary)] text-white"
                                : "bg-[var(--color-card)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                                isSelected
                                  ? "border-white bg-white text-[var(--color-primary)]"
                                  : "border-[var(--color-border)]",
                              )}
                            >
                              {isSelected ? (
                                <CheckIcon size={13} weight="bold" />
                              ) : null}
                            </span>
                            <Icon
                              size={16}
                              weight={isSelected ? "fill" : "regular"}
                            />
                            <span className="min-w-0 truncate">
                              {module.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 rounded-[12px] bg-[var(--color-input-bg)] p-3 text-xs text-[var(--color-muted-foreground)]">
              <SquaresFourIcon size={16} weight="fill" />
              El sidebar del usuario se filtrara con estos modulos al iniciar
              sesion.
            </div>
          </section>
        </form>
      </div>
    </DashboardShell>
  );
}

function ScopeToggle({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-circular-regular text-[#4e5671]">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 rounded-[10px] text-xs font-circular-bold transition-colors",
              value === option.value
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-card)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  placeholder,
  disabled,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      />
    </label>
  );
}

"use client";

import { NativeSelect } from "@/components/ui/select";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckIcon,
  FloppyDiskIcon,
  SquaresFourIcon,
  BuildingsIcon,
  EyeIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { LoadingScreen } from "@/components/loading-screen";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { usersApi, type UpdateUserPayload } from "@/lib/api/users";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  assignableSidebarModules,
  sidebarSections,
  warehouseAssignableModuleKeys,
} from "@/lib/navigation/sidebar-modules";
import { cn } from "@/lib/utils";

const defaultForm: UpdateUserPayload = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  moduleKeys: [],
  sucursalId: null,
  visibilidadOperaciones: "todas",
};

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { showToast } = useSystemToast();
  const { currentPlan } = useAuth();
  const [form, setForm] = useState<UpdateUserPayload>(defaultForm);
  const [formError, setFormError] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const userId = params.id;
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

  useEffect(() => {
    branchesApi
      .findAll({ limit: 100, estado: "activo" })
      .then((response) => setBranches(response.data))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    let isMounted = true;

    usersApi
      .findOne(userId)
      .then((user) => {
        if (!isMounted) return;
        setIsOwner(user.isOwner);
        setForm({
          nombre: user.nombre,
          apellido: user.apellido ?? "",
          email: user.email,
          telefono: user.telefono ?? "",
          moduleKeys: user.moduleKeys.filter((key) =>
            availableModuleKeys.has(key),
          ),
          sucursalId: user.sucursal?.id ?? null,
          visibilidadOperaciones: user.visibilidadOperaciones,
        });
      })
      .catch((error) => {
        if (!isMounted) return;
        showToast({
          title: "No se pudo cargar",
          description:
            error instanceof Error ? error.message : "Usuario no encontrado.",
          variant: "error",
        });
        router.replace("/administracion/usuarios");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [availableModuleKeys, router, showToast, userId]);

  const setField = (field: keyof UpdateUserPayload, value: string) => {
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

    const payload: UpdateUserPayload = {
      ...form,
      nombre: form.nombre.trim(),
      apellido: form.apellido?.trim() || undefined,
      email: form.email.trim().toLowerCase(),
      telefono: form.telefono?.trim() || undefined,
      moduleKeys: form.moduleKeys.filter((key) => assignableModuleKeys.has(key)),
    };

    if (!payload.nombre || !payload.email) {
      setFormError("Completa nombre y correo.");
      return;
    }

    if (payload.moduleKeys.length === 0) {
      setFormError("Selecciona al menos un modulo.");
      return;
    }

    if (payload.sucursalId === "") {
      setFormError("Selecciona una sucursal valida.");
      return;
    }

    setIsSubmitting(true);

    try {
      await usersApi.update(userId, payload);
      showToast({
        title: "Usuario actualizado",
        description: "Los cambios fueron guardados.",
        variant: "success",
      });
      router.push("/administracion/usuarios");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar.";
      setFormError(message);
      showToast({
        title: "No se pudo actualizar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardShell
      headerTitle="Editar usuario"
      headerParent={{ label: "Usuarios", href: "/administracion/usuarios" }}
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-circular-bold text-[var(--color-text)]">
              Editar usuario
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Datos del usuario y modulos permitidos.
            </p>
          </div>
        </div>

        {isOwner ? (
          <div className="rounded-[14px] bg-[#ef4444]/10 px-4 py-3 text-sm font-circular-bold text-[#ef4444]">
            El superadmin no se puede modificar desde esta pantalla.
          </div>
        ) : null}

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
                disabled={isSubmitting || isOwner}
                onChange={(value) => setField("nombre", value)}
              />
              <InputField
                id="user-last-name"
                label="Apellido"
                value={form.apellido ?? ""}
                placeholder="Perez"
                disabled={isSubmitting || isOwner}
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
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm text-[#4e5671]">
                  <BuildingsIcon size={16} /> Sucursales
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "all", label: "Todas" },
                    { value: "single", label: "Una sucursal" },
                  ].map((option) => {
                    const selected =
                      option.value === (form.sucursalId ? "single" : "all");
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isSubmitting || isOwner}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            sucursalId:
                              option.value === "all"
                                ? null
                                : current.sucursalId || "",
                          }))
                        }
                        className={cn(
                          "h-10 rounded-[10px] text-xs font-circular-bold",
                          selected
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--color-card)] text-[var(--color-text)]",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {form.sucursalId !== null ? (
                <NativeSelect
                  value={form.sucursalId}
                  disabled={isSubmitting || isOwner}
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
              ) : null}
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm text-[#4e5671]">
                  <EyeIcon size={16} /> Operaciones comerciales
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "todas", label: "Todas" },
                    { value: "propias", label: "Solo las suyas" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSubmitting || isOwner}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          visibilidadOperaciones: option.value as
                            "propias" | "todas",
                        }))
                      }
                      className={cn(
                        "h-10 rounded-[10px] text-xs font-circular-bold",
                        form.visibilidadOperaciones === option.value
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-card)] text-[var(--color-text)]",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="user-email"
                label="Correo"
                value={form.email}
                placeholder="usuario@empresa.com"
                type="email"
                disabled={isSubmitting || isOwner}
                onChange={(value) => setField("email", value)}
              />
              <InputField
                id="user-phone"
                label="Celular"
                value={form.telefono ?? ""}
                placeholder="999999999"
                disabled={isSubmitting || isOwner}
                onChange={(value) => setField("telefono", value)}
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
                disabled={isSubmitting || isOwner}
                className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
              >
                <FloppyDiskIcon size={16} weight="bold" />
                {isSubmitting ? "Guardando..." : "Guardar cambios"}
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
                disabled={isSubmitting || isOwner}
                className="h-9 rounded-[10px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:opacity-60"
              >
                {allSelected ? "Quitar todos" : "Marcar todos"}
              </button>
            </div>

            <div className="space-y-3">
              {sidebarSections.map((section) => {
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
                            disabled={isSubmitting || isOwner}
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

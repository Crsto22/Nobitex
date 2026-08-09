"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircleIcon,
  FloppyDiskIcon,
  KeyIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { accountApi, type AccountProfile } from "@/lib/api/account";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

const passwordRequirements = [
  {
    label: "Minimo 8 caracteres",
    test: (password: string) => password.length >= 8,
  },
  {
    label: "Una letra mayuscula",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: "Una letra minuscula",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: "Un numero",
    test: (password: string) => /\d/.test(password),
  },
];

export function AccountPage({
  mode = "combined",
  headerTitle = "Mi cuenta",
}: {
  mode?: "combined" | "datos" | "password";
  headerTitle?: string;
}) {
  const { completeAuth } = useAuth();
  const { showToast } = useSystemToast();
  const [activeTab, setActiveTab] = useState<"datos" | "password">(
    mode === "password" ? "password" : "datos",
  );
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirmarPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPasswordValid = useMemo(
    () =>
      passwordRequirements.every((requirement) =>
        requirement.test(passwordForm.password),
      ),
    [passwordForm.password],
  );

  useEffect(() => {
    let isMounted = true;

    accountApi
      .me()
      .then((response) => {
        if (!isMounted) return;
        setProfile(response);
        setProfileForm({
          nombre: response.nombre,
          apellido: response.apellido ?? "",
          telefono: response.telefono ?? "",
        });
      })
      .catch((requestError) => {
        if (!isMounted) return;
        showToast({
          title: "No se pudo cargar tu cuenta",
          description:
            requestError instanceof Error
              ? requestError.message
              : "Intentalo nuevamente.",
          variant: "error",
        });
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!profileForm.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await accountApi.update({
        nombre: profileForm.nombre.trim(),
        apellido: profileForm.apellido.trim() || undefined,
        telefono: profileForm.telefono.trim() || undefined,
      });
      completeAuth(response);
      const updated = await accountApi.me();
      setProfile(updated);
      setProfileForm({
        nombre: updated.nombre,
        apellido: updated.apellido ?? "",
        telefono: updated.telefono ?? "",
      });
      showToast({
        title: "Cuenta actualizada",
        description: "Tus datos fueron guardados.",
        variant: "success",
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar tu cuenta.";
      setError(message);
      showToast({
        title: "No se pudo actualizar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError(
        "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula y un numero.",
      );
      return;
    }

    if (passwordForm.password !== passwordForm.confirmarPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await accountApi.changePassword(passwordForm);
      completeAuth(response);
      setPasswordForm({
        currentPassword: "",
        password: "",
        confirmarPassword: "",
      });
      showToast({
        title: "Contrasena actualizada",
        description: "Tu nueva contrasena ya esta activa.",
        variant: "success",
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cambiar la contrasena.";
      setError(message);
      showToast({
        title: "No se pudo cambiar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell headerTitle={headerTitle}>
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                <UserCircleIcon size={32} weight="fill" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-circular-bold text-[var(--color-text)]">
                  {profile
                    ? [profile.nombre, profile.apellido]
                        .filter(Boolean)
                        .join(" ")
                    : "Mi cuenta"}
                </p>
                <p className="truncate text-sm text-[var(--color-muted-foreground)]">
                  {profile?.email ?? "Datos de usuario"}
                </p>
              </div>
            </div>

            {mode === "combined" ? (
              <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-[var(--color-input-bg)] p-1">
                <TabButton
                  active={activeTab === "datos"}
                  onClick={() => {
                    setActiveTab("datos");
                    setError("");
                  }}
                >
                  Datos
                </TabButton>
                <TabButton
                  active={activeTab === "password"}
                  onClick={() => {
                    setActiveTab("password");
                    setError("");
                  }}
                >
                  Contrasena
                </TabButton>
              </div>
            ) : null}
          </div>
        </section>

        {isLoading ? (
          <div className="h-72 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-sm" />
        ) : activeTab === "datos" ? (
          <form
            onSubmit={updateProfile}
            className="space-y-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="account-name"
                label="Nombre"
                value={profileForm.nombre}
                disabled={isSubmitting}
                onChange={(value) =>
                  setProfileForm((current) => ({ ...current, nombre: value }))
                }
              />
              <InputField
                id="account-last-name"
                label="Apellido"
                value={profileForm.apellido}
                disabled={isSubmitting}
                onChange={(value) =>
                  setProfileForm((current) => ({ ...current, apellido: value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                id="account-email"
                label="Correo"
                value={profile?.email ?? ""}
                disabled
                type="email"
                onChange={() => {}}
              />
              <InputField
                id="account-phone"
                label="Celular"
                value={profileForm.telefono}
                disabled={isSubmitting}
                onChange={(value) =>
                  setProfileForm((current) => ({ ...current, telefono: value }))
                }
              />
            </div>

            <FormError message={error} />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90"
            >
              <FloppyDiskIcon size={16} weight="bold" />
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={changePassword}
            className="space-y-4 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                id="current-password"
                label="Contrasena actual"
                value={passwordForm.currentPassword}
                type="password"
                disabled={isSubmitting}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: value,
                  }))
                }
              />
              <InputField
                id="new-password"
                label="Nueva contrasena"
                value={passwordForm.password}
                type="password"
                disabled={isSubmitting}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    password: value,
                  }))
                }
              />
              <InputField
                id="confirm-password"
                label="Confirmar contrasena"
                value={passwordForm.confirmarPassword}
                type="password"
                disabled={isSubmitting}
                onChange={(value) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmarPassword: value,
                  }))
                }
              />
            </div>

            <PasswordRules password={passwordForm.password} />
            <FormError message={error} />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white hover:opacity-90"
            >
              <KeyIcon size={16} weight="bold" />
              {isSubmitting ? "Actualizando..." : "Cambiar contrasena"}
            </Button>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-[10px] px-4 text-sm font-circular-bold transition-colors",
        active
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
      )}
    >
      {children}
    </button>
  );
}

function InputField({
  id,
  label,
  value,
  disabled,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
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
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  );
}

function PasswordRules({ password }: { password: string }) {
  return (
    <div className="grid gap-2 rounded-[16px] bg-[var(--color-input-bg)] p-3 sm:grid-cols-2">
      {passwordRequirements.map((requirement) => {
        const isValid = requirement.test(password);

        return (
          <div
            key={requirement.label}
            className={cn(
              "flex items-center gap-2 text-xs font-circular-regular",
              isValid
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted-foreground)]",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                isValid
                  ? "bg-[#ff7417] text-white"
                  : "bg-[var(--color-card)] ring-1 ring-[var(--color-border)]",
              )}
            >
              {isValid ? <CheckCircleIcon size={16} weight="fill" /> : null}
            </span>
            {requirement.label}
          </div>
        );
      })}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return message ? (
    <p className="text-sm font-circular-regular text-[#d9480f]">{message}</p>
  ) : null;
}

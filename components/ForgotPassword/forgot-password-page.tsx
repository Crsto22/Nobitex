"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  HouseIcon,
  KeyIcon,
} from "@phosphor-icons/react/ssr";

import { useSystemToast } from "@/components/SystemToast/system-toast";
import { ThemeToggle } from "@/components/ThemeToggle/theme-toggle";
import { TurnstileWidget } from "@/components/Turnstile/turnstile-widget";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";

type ForgotPasswordStep =
  "request" | "sent" | "checking" | "reset" | "expired" | "success";

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

export function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useSystemToast();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
  });
  const [focusedPasswordField, setFocusedPasswordField] = useState<
    "password" | null
  >(null);
  const [step, setStep] = useState<ForgotPasswordStep>(
    tokenFromUrl ? "checking" : "request",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  useEffect(() => {
    if (!tokenFromUrl) {
      return;
    }

    let isMounted = true;

    authApi
      .validateResetToken({ token: tokenFromUrl })
      .then(() => {
        if (isMounted) {
          setStep("reset");
        }
      })
      .catch(() => {
        if (isMounted) {
          setStep("expired");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tokenFromUrl]);

  useEffect(() => {
    if (step !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace("/login");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [router, step]);

  const requestToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!turnstileToken) {
      showToast({
        title: "Verificacion requerida",
        description: "Completa la verificacion de seguridad para continuar.",
        variant: "warning",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword({ email, turnstileToken });
      setStep("sent");
      showToast({
        title: "Correo enviado",
        description: "Te enviamos un enlace para restablecer tu contrasena.",
        variant: "success",
      });
    } catch (error) {
      setTurnstileResetKey((value) => value + 1);
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo solicitar el restablecimiento.";
      showToast({
        title: "No se pudo enviar el correo",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tokenFromUrl) {
      showToast({
        title: "Enlace no valido",
        description: "El enlace de restablecimiento no es valido.",
        variant: "error",
      });
      return;
    }

    const isPasswordValid = passwordRequirements.every((requirement) =>
      requirement.test(password),
    );

    if (!isPasswordValid) {
      showToast({
        title: "Contrasena no valida",
        description:
          "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula y un numero.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword({
        token: tokenFromUrl,
        password,
        confirmarPassword: password,
      });
      setStep("success");
      showToast({
        title: "Contrasena actualizada",
        description: "Ya puedes iniciar sesion con tu nueva contrasena.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cambiar la contrasena.";

      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("expiro") ||
        normalizedMessage.includes("usado") ||
        normalizedMessage.includes("no es valido")
      ) {
        setStep("expired");
      }

      showToast({
        title: "No se pudo cambiar la contrasena",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (name: keyof typeof visiblePasswords) => {
    setVisiblePasswords((currentValue) => ({
      ...currentValue,
      [name]: !currentValue[name],
    }));
  };

  return (
    <main className="min-h-dvh overflow-y-auto bg-[#f3f5fb] dark:bg-[#0a0a0a]">
      <section className="login-form-motion relative grid min-h-dvh overflow-hidden bg-[var(--color-sidebar-bg)] dark:bg-[#0a0a0a] lg:grid-cols-[minmax(0,1fr)_minmax(580px,820px)]">
        <div className="login-dots-bg relative z-10 hidden min-h-dvh flex-col overflow-hidden bg-[#f6f2f1] px-8 py-10 dark:bg-[#2a2a2a] lg:flex xl:px-12">
          <div className="flex w-full shrink-0 items-center justify-start">
            <Image
              src="/Logo/nuvex_logo.svg"
              alt="Nuvex"
              width={160}
              height={54}
              className="h-auto w-[160px] dark:brightness-0 dark:invert"
              priority
            />
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Image
              src="/img/login.webp"
              alt="Login"
              width={520}
              height={520}
              className="h-auto w-full max-w-[420px] object-contain"
              priority
            />
          </div>
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col overflow-hidden px-5 py-6 sm:px-8 lg:px-14 lg:py-7 xl:px-20">
          <div className="mb-4 flex w-full items-center justify-between">
            <div className="lg:hidden">
              <Image
                src="/Logo/logopng.webp"
                alt="Nuvex"
                width={96}
                height={22}
                className="h-auto w-24 dark:brightness-0 dark:invert"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <ThemeToggle className="text-[var(--color-primary)] hover:bg-[var(--color-button-hover)] dark:text-white dark:hover:bg-white/10" />
              <Link
                href="https://nuvex.pe"
                target="_blank"
                rel="noreferrer"
                aria-label="Ir a nuvex.pe"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)] dark:text-white dark:hover:bg-white/10"
              >
                <HouseIcon size={20} weight="bold" />
              </Link>
            </div>
          </div>
          <div className="register-form-scroll m-auto flex max-h-[calc(100dvh-6rem)] w-full max-w-[400px] flex-col overflow-y-auto pr-2 lg:max-h-[calc(100dvh-7rem)]">
            <div className="mb-5">
              <h1 className="mt-1 text-2xl font-semibold text-[var(--color-primary)] text-fixed-2xl dark:text-[#d7dae3]">
                {getTitle(step)}
              </h1>
              <p className="mt-2 max-w-[480px] text-sm font-circular-regular leading-6 text-[#525b75] dark:text-white/60">
                {getDescription(step)}
              </p>
            </div>

            {step === "request" && (
              <form className="space-y-4 xl:space-y-5" onSubmit={requestToken}>
                <FormInput
                  id="email"
                  label="Correo electronico"
                  value={email}
                  onValueChange={setEmail}
                  type="email"
                  placeholder="alex@email.com"
                  autoComplete="email"
                  icon={<EnvelopeSimpleIcon size={24} weight="fill" />}
                  disabled={isSubmitting}
                />

                <TurnstileWidget
                  action="forgot_password"
                  onTokenChange={setTurnstileToken}
                  resetKey={turnstileResetKey}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting || !turnstileToken}
                  className="h-11 w-full rounded-2xl bg-[var(--color-primary)] text-sm font-circular-regular text-white hover:bg-[#0c1754] dark:disabled:bg-[#242424] dark:disabled:text-white/45 dark:disabled:opacity-100 xl:h-12"
                >
                  {isSubmitting ? "Enviando correo..." : "Enviar enlace"}
                </Button>

                <FooterActions />
              </form>
            )}

            {step === "sent" && (
              <StateMessage
                icon={<EnvelopeSimpleIcon size={38} weight="fill" />}
                title="Correo enviado"
                description="Te enviamos un enlace para restablecer tu contrasena. Revisa tu correo y abre el enlace."
                actionLabel="Volver al inicio de sesion"
                actionHref="/login"
              />
            )}

            {step === "checking" && (
              <div className="rounded-2xl bg-white px-5 py-6 text-center ring-1 ring-[var(--color-sidebar-action-bg)] dark:bg-[#1c1c1c] dark:ring-[#2c2c2c]">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
                <h2 className="mt-4 text-lg font-semibold text-[var(--color-primary)] text-fixed-lg dark:text-white/90">
                  Verificando enlace
                </h2>
                <p className="mt-2 text-sm font-circular-regular leading-6 text-[#525b75] dark:text-white/60">
                  Estamos validando si el enlace sigue disponible.
                </p>
              </div>
            )}

            {step === "reset" && (
              <form className="space-y-4 xl:space-y-5" onSubmit={resetPassword}>
                <FormInput
                  id="password"
                  label="Nueva contrasena"
                  value={password}
                  onValueChange={setPassword}
                  type={visiblePasswords.password ? "text" : "password"}
                  placeholder="Minimo 8 caracteres"
                  autoComplete="new-password"
                  endAdornment={
                    <PasswordAdornment
                      isVisible={visiblePasswords.password}
                      showToggle={
                        focusedPasswordField === "password" ||
                        password.length > 0
                      }
                      onClick={() => togglePasswordVisibility("password")}
                    />
                  }
                  disabled={isSubmitting}
                  onBlur={() => setFocusedPasswordField(null)}
                  onFocus={() => setFocusedPasswordField("password")}
                />
                <PasswordRules password={password} />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-2xl bg-[var(--color-primary)] text-sm font-circular-regular text-white hover:bg-[#0c1754] dark:disabled:bg-[#242424] dark:disabled:text-white/45 dark:disabled:opacity-100 xl:h-12"
                >
                  {isSubmitting ? "Actualizando..." : "Cambiar contrasena"}
                </Button>

                <FooterActions />
              </form>
            )}

            {step === "success" && (
              <StateMessage
                icon={<CheckCircleIcon size={38} weight="fill" />}
                title="Contrasena cambiada"
                description="Tu contrasena ha sido actualizada correctamente. Te llevaremos al inicio de sesion."
                actionLabel="Iniciar sesion"
                actionHref="/login"
              />
            )}

            {step === "expired" && (
              <StateMessage
                icon={<EnvelopeSimpleIcon size={38} weight="fill" />}
                title="Enlace expirado"
                description="El enlace para restablecer tu contrasena expiro, ya fue usado o no es valido. Solicita uno nuevo para continuar."
                actionLabel="Solicitar nuevo enlace"
                actionHref="/forgot-password"
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function getTitle(step: ForgotPasswordStep) {
  if (step === "sent") {
    return "Revisa tu correo";
  }

  if (step === "success") {
    return "Listo";
  }

  if (step === "checking") {
    return "Verificando enlace";
  }

  if (step === "expired") {
    return "Enlace expirado";
  }

  return step === "reset" ? "Nueva contrasena" : "Restablece tu contrasena";
}

function getDescription(step: ForgotPasswordStep) {
  if (step === "sent") {
    return "Te enviamos un enlace para continuar el restablecimiento.";
  }

  if (step === "success") {
    return "La contrasena fue cambiada correctamente.";
  }

  if (step === "checking") {
    return "Estamos revisando si tu enlace sigue activo.";
  }

  if (step === "expired") {
    return "Solicita un nuevo enlace para restablecer tu contrasena.";
  }

  return step === "reset"
    ? "Ingresa una nueva contrasena para tu cuenta."
    : "Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.";
}

type FormInputProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  icon?: ReactNode;
  endAdornment?: ReactNode;
  disabled?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
};

function FormInput({
  id,
  label,
  value,
  onValueChange,
  type = "text",
  placeholder,
  autoComplete,
  icon,
  endAdornment,
  disabled,
  onBlur,
  onFocus,
}: FormInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671] dark:text-white/70"
      >
        {label}
      </label>
      <div className="flex overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--color-sidebar-action-bg)] transition focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 dark:bg-[#1c1c1c] dark:ring-[#2c2c2c]">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          onBlur={onBlur}
          onFocus={onFocus}
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[var(--color-placeholder)] disabled:cursor-not-allowed disabled:opacity-70 dark:text-white dark:placeholder:text-[#8f8f8f] xl:h-12"
        />
        {endAdornment ? (
          endAdornment
        ) : (
          <div className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] xl:h-10 xl:w-10">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordRules({ password }: { password: string }) {
  return (
    <div className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-[var(--color-sidebar-action-bg)] dark:bg-[#1c1c1c] dark:ring-[#2c2c2c] sm:grid-cols-2">
      {passwordRequirements.map((requirement) => {
        const isValid = requirement.test(password);

        return (
          <div
            key={requirement.label}
            className={`flex items-center gap-2 text-xs font-circular-regular ${
              isValid
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                isValid
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-card)] ring-1 ring-[var(--color-border)]"
              }`}
            >
              {isValid && <CheckCircleIcon size={16} weight="fill" />}
            </span>
            {requirement.label}
          </div>
        );
      })}
    </div>
  );
}

function PasswordAdornment({
  isVisible,
  showToggle,
  onClick,
}: {
  isVisible: boolean;
  showToggle: boolean;
  onClick: () => void;
}) {
  if (!showToggle) {
    return (
      <div className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] xl:h-10 xl:w-10">
        <KeyIcon size={24} weight="fill" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] transition hover:text-[#ef6a12] disabled:opacity-50 xl:h-10 xl:w-10"
      aria-label={isVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
    >
      {isVisible ? (
        <EyeSlashIcon size={24} weight="fill" />
      ) : (
        <EyeIcon size={24} weight="fill" />
      )}
    </button>
  );
}

function FooterActions() {
  return (
    <>
      <Button
        asChild
        variant="outline"
        className="h-11 w-full rounded-2xl border-transparent bg-[var(--color-input-bg)] text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)] xl:h-12"
      >
        <Link href="/login">Volver al inicio de sesion</Link>
      </Button>
    </>
  );
}

function StateMessage({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-5 py-6 text-center ring-1 ring-[var(--color-sidebar-action-bg)] dark:bg-[#1c1c1c] dark:ring-[#2c2c2c]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center text-[var(--color-primary)]">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[var(--color-primary)] text-fixed-lg dark:text-white/90">
        {title}
      </h2>
      <p className="mt-2 text-sm font-circular-regular leading-6 text-[#525b75] dark:text-white/60">
        {description}
      </p>
      <Button
        asChild
        className="mt-5 h-11 w-full rounded-2xl bg-[var(--color-primary)] text-sm font-circular-regular text-white hover:bg-[#0c1754] dark:disabled:bg-[#242424] dark:disabled:text-white/45 dark:disabled:opacity-100"
      >
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

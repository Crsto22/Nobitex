"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChartBarIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  LockKeyIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react/ssr";

import { useSystemToast } from "@/components/SystemToast/system-toast";
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
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    confirmarPassword: false,
  });
  const [focusedPasswordField, setFocusedPasswordField] = useState<
    "password" | "confirmarPassword" | null
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

    if (password !== confirmarPassword) {
      showToast({
        title: "Contrasenas distintas",
        description: "Las contrasenas no coinciden.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword({
        token: tokenFromUrl,
        password,
        confirmarPassword,
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
    <main className="min-h-dvh overflow-y-auto bg-[#f3f5fb]">
      <section className="login-form-motion relative grid min-h-dvh overflow-hidden bg-white lg:grid-cols-[minmax(0,1fr)_minmax(520px,620px)]">
        <div
          className="relative z-10 hidden min-h-dvh overflow-hidden bg-cover bg-center px-8 py-10 text-white lg:flex lg:items-center xl:px-12"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?auto=format&fit=crop&ixlib=rb-4.1.0&q=80&w=1800)",
          }}
        >
          <div className="absolute inset-0 bg-black/68" />
          <div className="relative z-10 w-full max-w-[640px]">
            <div className="mb-24 inline-flex rounded-[16px] border-2 border-white bg-white px-4 py-2 shadow-[0_14px_34px_rgba(16,29,105,0.18)]">
              <Image
                src="/Logo/logopng.png"
                alt="Norbitex"
                width={180}
                height={42}
                className="h-auto w-[160px] xl:w-[180px]"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
            <h2 className="max-w-[560px] text-5xl font-black leading-[1.08] xl:text-6xl text-fixed-5xl">
              Recupera el acceso y vuelve a gestionar tu negocio.
            </h2>
            <div className="mt-8 space-y-4 text-base font-circular-regular text-white/88">
              <p className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white">
                  <LockKeyIcon
                    size={20}
                    weight="fill"
                    className="text-[var(--color-secondary)]"
                  />
                </span>
                Cambio de contrasena seguro
              </p>
              <p className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white">
                  <ShieldCheckIcon
                    size={20}
                    weight="fill"
                    className="text-[var(--color-secondary)]"
                  />
                </span>
                Validacion por correo
              </p>
              <p className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white">
                  <ChartBarIcon
                    size={20}
                    weight="fill"
                    className="text-[var(--color-secondary)]"
                  />
                </span>
                Tu operacion continua protegida
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-dvh items-center justify-center overflow-hidden px-5 py-6 sm:px-8 lg:px-14 lg:py-7 xl:px-20">
          <div className="register-form-scroll flex max-h-[calc(100dvh-3rem)] w-full max-w-[560px] flex-col overflow-y-auto pr-2">
            <div className="mb-5">
              <Image
                src="/Logo/logopng.png"
                alt="Nobitex"
                width={145}
                height={46}
                className="h-auto w-[128px] sm:w-[145px] lg:hidden"
                style={{ width: "auto", height: "auto" }}
                priority
              />
              <h1 className="mt-4 text-3xl font-black text-[var(--color-primary)] sm:text-4xl text-fixed-3xl">
                {getTitle(step)}
              </h1>
              <p className="mt-2 max-w-[480px] text-sm font-circular-regular leading-6 text-[#525b75]">
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
                  className="font-heading h-12 w-full rounded-[16px] bg-[var(--color-secondary)] text-sm font-black text-white shadow-[0_14px_28px_rgba(253,116,26,0.28)] hover:bg-[#ef6a12]"
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
              <div className="rounded-2xl bg-[#f1f4f9] px-5 py-6 text-center ring-1 ring-[#edf1f6]">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#dbe3ef] border-t-[var(--color-secondary)]" />
<h2 className="mt-4 text-lg font-black text-[var(--color-primary)] text-fixed-lg">
                  Verificando enlace
                </h2>
                <p className="mt-2 text-sm font-circular-regular leading-6 text-[#525b75]">
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
                <FormInput
                  id="confirm-password"
                  label="Confirmar contrasena"
                  value={confirmarPassword}
                  onValueChange={setConfirmarPassword}
                  type={
                    visiblePasswords.confirmarPassword ? "text" : "password"
                  }
                  placeholder="Confirma tu nueva contrasena"
                  autoComplete="new-password"
                  endAdornment={
                    <PasswordAdornment
                      isVisible={visiblePasswords.confirmarPassword}
                      showToggle={
                        focusedPasswordField === "confirmarPassword" ||
                        confirmarPassword.length > 0
                      }
                      onClick={() =>
                        togglePasswordVisibility("confirmarPassword")
                      }
                    />
                  }
                  disabled={isSubmitting}
                  onBlur={() => setFocusedPasswordField(null)}
                  onFocus={() => setFocusedPasswordField("confirmarPassword")}
                />

                <PasswordRules password={password} />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-heading h-12 w-full rounded-[16px] bg-[var(--color-secondary)] text-sm font-black text-white shadow-[0_14px_28px_rgba(253,116,26,0.28)] hover:bg-[#ef6a12]"
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
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
        {label}
      </label>
      <div className="flex overflow-hidden rounded-[16px] bg-[var(--color-input-bg)] transition-colors hover:bg-[var(--color-button-hover)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20">
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
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] disabled:cursor-not-allowed disabled:opacity-70 xl:h-12"
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
    <div className="grid gap-2 rounded-[16px] bg-[var(--color-input-bg)] p-3 sm:grid-cols-2">
      {passwordRequirements.map((requirement) => {
        const isValid = requirement.test(password);

        return (
          <div
            key={requirement.label}
            className={`flex items-center gap-2 text-xs font-circular-regular${
              isValid
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                isValid
                  ? "bg-[#ff7417] text-white"
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
        className="h-11 w-full rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)] xl:h-12"
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
    <div className="rounded-2xl bg-[#f1f4f9] px-5 py-6 text-center ring-1 ring-[#edf1f6]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center text-[var(--color-secondary)]">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-black text-[var(--color-primary)] text-fixed-lg">
        {title}
      </h2>
      <p className="mt-2 text-sm font-circular-regular leading-6 text-[#525b75]">
        {description}
      </p>
      <Button
        asChild
        className="mt-5 h-11 w-full rounded-[14px] bg-[#ff7417] text-sm font-black text-white shadow-[0_8px_18px_rgba(255,116,23,0.3)] hover:bg-[#f2670a]"
      >
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

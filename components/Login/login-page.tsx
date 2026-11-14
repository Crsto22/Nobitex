"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EyeIcon,
  EyeSlashIcon,
  HouseIcon,
  KeyIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";

import { useSystemToast } from "@/components/SystemToast/system-toast";
import { ThemeToggle } from "@/components/ThemeToggle/theme-toggle";
import { TurnstileWidget } from "@/components/Turnstile/turnstile-widget";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  consumeSessionExpired,
  getSessionUser,
  ONBOARDING_TOKEN_STORAGE_KEY,
  ONBOARDING_USER_STORAGE_KEY,
} from "@/lib/auth/session";
import { getProductModeFromModuleKeys } from "@/lib/navigation/product-mode";
import { cn } from "@/lib/utils";

const supportWhatsAppPhone = "51923328058";

export function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useSystemToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isMascotHidden, setIsMascotHidden] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTurnstile, setRequiresTurnstile] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  useEffect(() => {
    if (consumeSessionExpired()) {
      showToast({
        title: "Sesion expirada",
        description: "Tu sesion ha expirado. Inicia sesion de nuevo.",
        variant: "warning",
      });
    }
  }, [showToast]);

  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const isFormComplete =
    emailValue.trim().length > 0 && passwordValue.trim().length > 0;
  const shouldShowPasswordToggle =
    isPasswordFocused || passwordValue.length > 0;
  const whatsappMessage = encodeURIComponent("Hola, necesito ayuda con Nuvex.");
  const whatsappPhone = (
    process.env.NEXT_PUBLIC_NUVEX_WHATSAPP || supportWhatsAppPhone
  ).replace(
    /\D/g,
    "",
  );
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`
    : `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  const hideMascot = () => {
    setIsMascotHidden(true);
  };

  const showMascot = () => {
    setIsMascotHidden(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (requiresTurnstile && !turnstileToken) {
      setIsLoading(false);
      showToast({
        title: "No se pudo iniciar sesion",
        description: "Completa la verificacion de seguridad para continuar.",
        variant: "error",
      });
      return;
    }

    try {
      const response = await login({
        email,
        password,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      if (response.setupRequired === "company" && response.onboardingToken) {
        window.sessionStorage.setItem(
          ONBOARDING_TOKEN_STORAGE_KEY,
          response.onboardingToken,
        );
        window.sessionStorage.setItem(
          ONBOARDING_USER_STORAGE_KEY,
          JSON.stringify(response.usuario ?? {}),
        );
        showToast({
          title: "Completa tu empresa",
          description:
            "Tu correo ya esta verificado. Continua con los datos de tu empresa.",
          variant: "warning",
        });
        router.replace("/register?resume=company");
        return;
      }
      showToast({
        title: "Bienvenido a Nuvex",
        description: "Inicio de sesion correcto.",
        variant: "success",
      });
      router.replace(getPostLoginPath(response.usuario?.moduleKeys));
    } catch (error) {
      const errorCode =
        error instanceof ApiError &&
        error.body &&
        typeof error.body === "object" &&
        "code" in error.body
          ? String((error.body as { code?: unknown }).code ?? "")
          : "";
      if (
        errorCode === "TURNSTILE_REQUIRED" ||
        errorCode === "TURNSTILE_INVALID"
      ) {
        setRequiresTurnstile(true);
      }
      if (requiresTurnstile || errorCode.startsWith("TURNSTILE_")) {
        setTurnstileResetKey((value) => value + 1);
      }
      const message =
        error instanceof Error ? error.message : "No se pudo iniciar sesion.";

      showToast({
        title: "No se pudo iniciar sesion",
        description: message,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="h-dvh overflow-hidden bg-[#f3f5fb] dark:bg-[#0a0a0a]">
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_minmax(580px,820px)]">
        <section className="order-2 flex h-full flex-col overflow-y-auto bg-[var(--color-sidebar-bg)] px-5 py-6 shadow-[90px_0_40px_rgba(16,29,105,0.05)] dark:bg-[#0a0a0a] lg:px-8 lg:py-8">
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
          <div className="m-auto flex w-full max-w-[480px] flex-col justify-center gap-5 lg:max-h-[100dvh] xl:gap-6">
            <div className="mx-auto mb-2 w-full max-w-[400px]">
              <h1 className="text-left text-2xl font-semibold text-[var(--color-primary)] text-fixed-2xl dark:text-[#d7dae3]">
                Ingresa a tu negocio
              </h1>
            </div>

            <form
              className="mx-auto w-full max-w-[400px] space-y-4 xl:space-y-5"
              onSubmit={handleSubmit}
            >
              <div>
                <div className="flex overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--color-sidebar-action-bg)] transition focus-within:ring-2 focus-within:ring-[var(--color-secondary)]/30 dark:bg-[#1c1c1c] dark:ring-[#2c2c2c] dark:focus-within:ring-[var(--color-primary)]/50">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Dirección de correo electrónico"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                    onChange={(event) => setEmailValue(event.target.value)}
                    className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[#9ca5ba] dark:text-white dark:placeholder:text-[#8f8f8f] xl:h-12"
                  />
                  <div className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] xl:h-10 xl:w-10">
                    <UserIcon size={24} weight="fill" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--color-sidebar-action-bg)] transition focus-within:ring-2 focus-within:ring-[var(--color-secondary)]/30 dark:bg-[#1c1c1c] dark:ring-[#2c2c2c] dark:focus-within:ring-[var(--color-primary)]/50">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    onBlur={() => setIsPasswordFocused(false)}
                    onChange={(event) => setPasswordValue(event.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[#9ca5ba] dark:text-white dark:placeholder:text-[#8f8f8f] xl:h-12"
                  />
                  {shouldShowPasswordToggle ? (
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((currentValue) => !currentValue)
                      }
                      disabled={isLoading}
                      className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] transition hover:text-[#ef6a12] disabled:opacity-50 xl:h-10 xl:w-10"
                      aria-label={
                        showPassword
                          ? "Ocultar contrasena"
                          : "Mostrar contrasena"
                      }
                    >
                      {showPassword ? (
                        <EyeSlashIcon size={24} weight="fill" />
                      ) : (
                        <EyeIcon size={24} weight="fill" />
                      )}
                    </button>
                  ) : (
                    <div className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] xl:h-10 xl:w-10">
                      <KeyIcon size={24} weight="fill" />
                    </div>
                  )}
                </div>
                <div className="mt-8 flex items-center justify-between gap-3">
                  <Link
                    href="/register"
                    className="text-xs font-semibold text-[#7b83b7] underline-offset-4 transition-colors hover:text-[var(--color-primary)] hover:underline dark:text-white/60 dark:hover:text-white"
                  >
                    Registrate
                  </Link>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#7b83b7] underline-offset-4 transition-colors hover:text-[var(--color-primary)] hover:underline dark:text-white/60 dark:hover:text-white"
                  >
                    Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              {requiresTurnstile ? (
                <TurnstileWidget
                  action="login"
                  onTokenChange={setTurnstileToken}
                  resetKey={turnstileResetKey}
                />
              ) : null}

              <Button
                type="submit"
                disabled={isLoading || (requiresTurnstile && !turnstileToken)}
                className={cn(
                  "h-11 w-full rounded-2xl text-sm font-circular-regular text-white xl:h-12",
                  isFormComplete
                    ? "bg-[var(--color-primary)] hover:bg-[#0c1754]"
                    : "bg-[#b8bdd6] dark:bg-[#242424] dark:text-white/45",
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/45 border-t-white" />
                    Iniciando sesion...
                  </span>
                ) : (
                  "Iniciar sesion"
                )}
              </Button>

            </form>
          </div>
        </section>

        <section className="login-dots-bg order-1 hidden h-full flex-col bg-[#f6f2f1] px-8 py-10 dark:bg-[#2a2a2a] lg:flex xl:px-12">
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
        </section>
      </div>
      {!isMascotHidden ? (
        <div className="fixed bottom-3 right-3 z-50 sm:bottom-5 sm:right-5">
          <button
            type="button"
            onClick={hideMascot}
            className="absolute -right-1 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-circular-bold leading-none text-[var(--color-primary)] shadow-[0_10px_24px_rgba(16,29,105,0.18)] ring-1 ring-[#e5e9f2] transition hover:bg-[#fff4ec] hover:text-[var(--color-secondary)] dark:bg-[#1c1c1c] dark:text-white dark:ring-[#2c2c2c] dark:hover:bg-[#242424]"
            aria-label="Ocultar ayuda"
          >
            ×
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex items-end gap-2"
            aria-label="Necesitas ayuda por WhatsApp"
          >
            <span className="mb-10 rounded-2xl bg-white px-4 py-2 text-sm font-circular-bold text-[var(--color-primary)] shadow-[0_16px_40px_rgba(16,29,105,0.18)] ring-1 ring-[#e5e9f2] transition group-hover:-translate-y-1 group-hover:text-[var(--color-secondary)] dark:bg-[#1c1c1c] dark:text-white dark:ring-[#2c2c2c] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
              Necesitas ayuda?
            </span>
            <span
              className="nuvex-mascot nuvex-mascot--help drop-shadow-[0_18px_26px_rgba(16,29,105,0.22)]"
              aria-hidden="true"
            />
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={showMascot}
          className="fixed bottom-3 right-3 z-50 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-circular-bold text-white shadow-[0_14px_30px_rgba(253,116,26,0.28)] transition hover:bg-[#ef6a12] sm:bottom-5 sm:right-5"
          aria-label="Mostrar ayuda"
        >
          Ayuda
        </button>
      )}
    </main>
  );
}

function getPostLoginPath(moduleKeys?: string[]) {
  const keys = moduleKeys?.length
    ? moduleKeys
    : (getSessionUser()?.moduleKeys ?? []);
  return getProductModeFromModuleKeys(keys).attendanceOnly
    ? "/asistencias/dashboard"
    : "/dashboard";
}

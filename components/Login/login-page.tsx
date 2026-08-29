"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";

import { useSystemToast } from "@/components/SystemToast/system-toast";
import { TurnstileWidget } from "@/components/Turnstile/turnstile-widget";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  consumeSessionExpired,
  ONBOARDING_TOKEN_STORAGE_KEY,
  ONBOARDING_USER_STORAGE_KEY,
} from "@/lib/auth/session";

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
  const [passwordValue, setPasswordValue] = useState("");
  const shouldShowPasswordToggle =
    isPasswordFocused || passwordValue.length > 0;
  const whatsappMessage = encodeURIComponent("Hola, necesito ayuda con Nuvex.");
  const whatsappPhone = (process.env.NEXT_PUBLIC_NUVEX_WHATSAPP ?? "").replace(
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
      router.replace("/dashboard");
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
    <main className="h-dvh overflow-hidden bg-[#f3f5fb]">
      <div className="grid h-full lg:grid-cols-[1fr_minmax(460px,620px)]">
        <section className="order-2 flex h-full flex-col overflow-y-auto bg-white px-5 py-6 shadow-[90px_0_40px_rgba(16,29,105,0.05)] lg:px-8 lg:py-8">
          <div className="mb-4 flex w-full justify-start lg:hidden">
            <Image
              src="/Logo/logopng.webp"
              alt="Nuvex"
              width={96}
              height={22}
              className="h-auto w-24"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </div>
          <div className="m-auto flex w-full max-w-100 flex-col justify-center gap-5 lg:max-h-[100dvh] xl:gap-6">
            <div className="mb-2">
              <h1 className="text-center text-3xl font-black text-[var(--color-primary)] text-fixed-3xl">
                Ingresa a tu negocio
              </h1>
              <p className="mt-2 text-center text-sm font-circular-regular text-[#525b75]">
                Gestiona ventas, productos y stock.
              </p>
            </div>

            <form className="space-y-4 xl:space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
                >
                  Correo
                </label>
                <div className="flex overflow-hidden rounded-xl bg-[#f1f4f9] ring-1 ring-[#edf1f6] transition focus-within:ring-2 focus-within:ring-[var(--color-secondary)]/30">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="alex@email.com"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                    className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[#9ca5ba] xl:h-12"
                  />
                  <div className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] xl:h-10 xl:w-10">
                    <UserIcon size={24} weight="fill" />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
                >
                  Contrasena
                </label>
                <div className="flex overflow-hidden rounded-xl bg-[#f1f4f9] ring-1 ring-[#edf1f6] transition focus-within:ring-2 focus-within:ring-[var(--color-secondary)]/30">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contrasena"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    onBlur={() => setIsPasswordFocused(false)}
                    onChange={(event) => setPasswordValue(event.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[#9ca5ba] xl:h-12"
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
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-circular-regular text-[var(--color-primary)] underline-offset-4 hover:underline"
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
                className="h-11 w-full rounded-xl bg-[var(--color-secondary)] text-sm font-circular-regular text-white shadow-[0_14px_28px_rgba(253,116,26,0.28)] hover:bg-[#ef6a12] xl:h-12"
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

              <div className="flex items-center gap-4 py-2 xl:py-3">
                <div className="h-px flex-1 bg-[#e5e9f2]" />
                <span className="text-xs font-circular-regular uppercase tracking-[0.18em] text-[#a6afc3]">
                  o
                </span>
                <div className="h-px flex-1 bg-[#e5e9f2]" />
              </div>

              <Button
                asChild
                variant="outline"
                className="h-11 w-full rounded-xl border-[var(--color-secondary)] bg-white text-sm font-circular-regular text-[var(--color-secondary)] hover:bg-[#fff4ec] hover:text-[var(--color-secondary)] xl:h-12"
              >
                <Link href="/register">Registrate ahora</Link>
              </Button>
            </form>
          </div>
        </section>

        <section className="order-1 hidden h-full items-center justify-center bg-[#f3f5fb] px-8 py-10 lg:flex xl:px-12">
          <div className="flex max-w-[520px] flex-col items-center text-center">
            <Image
              src="/Logo/nuvex_logo.svg"
              alt="Nuvex"
              width={330}
              height={110}
              className="h-auto w-[330px] max-w-[330px]"
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
            className="absolute -right-1 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-circular-bold leading-none text-[var(--color-primary)] shadow-[0_10px_24px_rgba(16,29,105,0.18)] ring-1 ring-[#e5e9f2] transition hover:bg-[#fff4ec] hover:text-[var(--color-secondary)]"
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
            <span className="mb-10 rounded-2xl bg-white px-4 py-2 text-sm font-circular-bold text-[var(--color-primary)] shadow-[0_16px_40px_rgba(16,29,105,0.18)] ring-1 ring-[#e5e9f2] transition group-hover:-translate-y-1 group-hover:text-[var(--color-secondary)]">
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

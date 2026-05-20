"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { KeyIcon, UserIcon } from "@phosphor-icons/react/ssr";

import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#f3f5fb]">
      <div className="grid h-full lg:grid-cols-[minmax(460px,620px)_1fr]">
        <section className="flex h-full items-center justify-center bg-white px-5 py-6 shadow-[90px_0_40px_rgba(16,29,105,0.05)] lg:px-8 lg:py-8">
          <div className="flex w-full max-w-100 flex-col justify-center gap-6 lg:max-h-[100dvh]">
            <div className="mb-2">
              <Image
                src="/Logo/NovitexLogo.png"
                alt="Nobitex"
                width={170}
                height={54}
                className="mx-auto mb-3 h-auto w-[150px] sm:w-[170px]"
                style={{ width: "auto", height: "auto" }}
                priority
              />
              <p className="mt-2 text-center text-sm font-semibold text-[#525b75]">
                Inicia sesion a Nobitex
              </p>
            </div>

            <form className="space-y-4 xl:space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#4e5671]"
                >
                  Correo
                </label>
                <div className="flex overflow-hidden rounded-xl bg-[#f1f4f9] ring-1 ring-[#edf1f6] transition focus-within:ring-2 focus-within:ring-[var(--color-secondary)]/30">
                  <input
                    id="email"
                    type="email"
                    placeholder="alex@email.com"
                    className="h-11 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[#9ca5ba] xl:h-12"
                  />
                  <div className="m-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-white xl:h-10 xl:w-10">
                    <UserIcon size={24} />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[#4e5671]"
                >
                  Contrasena
                </label>
                <div className="flex overflow-hidden rounded-xl bg-[#f1f4f9] ring-1 ring-[#edf1f6] transition focus-within:ring-2 focus-within:ring-[var(--color-secondary)]/30">
                  <input
                    id="password"
                    type="password"
                    placeholder="Ingresa tu contrasena"
                    className="h-11 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[#9ca5ba] xl:h-12"
                  />
                  <div className="m-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-white xl:h-10 xl:w-10">
                    <KeyIcon size={24} />
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <Link
                    href="#"
                    className="text-xs font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                  >
                    Olvidaste tu contrasena?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-[var(--color-secondary)] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(253,116,26,0.28)] hover:bg-[#ef6a12] xl:h-12"
              >
                Iniciar sesion
              </Button>

              <div className="flex items-center gap-4 py-2 xl:py-3">
                <div className="h-px flex-1 bg-[#e5e9f2]" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a6afc3]">
                  o
                </span>
                <div className="h-px flex-1 bg-[#e5e9f2]" />
              </div>

              <Button
                variant="outline"
                className="h-11 w-full rounded-xl border-[var(--color-secondary)] bg-white text-sm font-semibold text-[var(--color-secondary)] hover:bg-[#fff4ec] hover:text-[var(--color-secondary)] xl:h-12"
              >
                Registrate ahora
              </Button>
            </form>
          </div>
        </section>

        <section className="relative hidden h-full overflow-hidden bg-[linear-gradient(180deg,#f5f7fc_0%,#eef2f8_100%)] lg:flex lg:items-center lg:justify-center">
          <div className="absolute left-24 top-16 h-40 w-40 rounded-full bg-white/45 blur-3xl" />
          <div className="absolute bottom-14 right-20 h-52 w-52 rounded-full bg-[#fd741a]/10 blur-3xl" />
          <div className="relative z-10 flex h-full w-full items-center justify-center px-8 py-8 xl:px-10 xl:py-10">
            <Image
              src="/image/Login/PantallaLogin.png"
              alt="Pantalla de login"
              width={749}
              height={420}
              className="h-auto max-h-[calc(100dvh-4rem)] w-full max-w-[min(46vw,760px)] object-contain xl:max-h-[calc(100dvh-5rem)]"
              style={{ width: "100%", height: "auto" }}
              priority
            />
          </div>
        </section>
      </div>
    </main>
  );
}

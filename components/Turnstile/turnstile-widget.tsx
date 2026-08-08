"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          theme: "auto";
          size: "flexible";
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function TurnstileWidget({
  action,
  onTokenChange,
  resetKey,
}: {
  action: "register" | "forgot_password" | "login";
  onTokenChange: (token: string) => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || widgetIdRef.current) return;
    widgetIdRef.current =
      window.turnstile?.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme: "auto",
        size: "flexible",
        callback: (token) => onTokenChangeRef.current(token),
        "expired-callback": () => onTokenChangeRef.current(""),
        "error-callback": () => onTokenChangeRef.current(""),
      }) ?? null;
  }, [action]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  useEffect(() => {
    if (widgetIdRef.current && resetKey > 0) {
      window.turnstile?.reset(widgetIdRef.current);
      onTokenChangeRef.current("");
    }
  }, [resetKey]);

  if (!siteKey) {
    return (
      <p className="rounded-[14px] bg-[#fff4ec] px-4 py-3 text-center text-xs font-semibold text-[#d9480f]">
        Turnstile no esta configurado.
      </p>
    );
  }

  return (
    <div className="min-h-[65px] w-full overflow-hidden rounded-[14px]">
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onLoad={renderWidget}
      />
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

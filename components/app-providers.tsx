"use client";

import type { ReactNode } from "react";
import { SystemToastProvider } from "@/components/SystemToast/system-toast";
import { PlanLimitAlert } from "@/components/PlanLimitAlert/plan-limit-alert";
import { PwaRegister } from "@/components/pwa-register";
import { AuthProvider } from "@/lib/auth/auth-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SystemToastProvider>
      <AuthProvider>
        {children}
        <PlanLimitAlert />
        <PwaRegister />
      </AuthProvider>
    </SystemToastProvider>
  );
}

"use client";

import type { ReactNode } from "react";
import { SystemToastProvider } from "@/components/SystemToast/system-toast";
import { PlanLimitAlert } from "@/components/PlanLimitAlert/plan-limit-alert";
import { AuthProvider } from "@/lib/auth/auth-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SystemToastProvider>
      <AuthProvider>
        {children}
        <PlanLimitAlert />
      </AuthProvider>
    </SystemToastProvider>
  );
}

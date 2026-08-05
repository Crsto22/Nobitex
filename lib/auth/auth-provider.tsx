"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi, type LoginPayload, type LoginResponse } from "@/lib/api/auth";
import { accountApi } from "@/lib/api/account";
import { sessionExpiredEventName } from "@/lib/api/auth-fetch";
import {
  companyApi,
  type CompanySetupStatus,
} from "@/lib/api/company";
import {
  plansApi,
  type CurrentPlanResponse,
} from "@/lib/api/plans";
import {
  clearSession,
  getStoredCompanyInfo,
  getSessionUser,
  saveAuthSession,
  setStoredCompanyInfo,
  type AuthSessionPayload,
  type CompanyInfo,
  type SessionUser,
} from "@/lib/auth/session";
import { publishAuthEvent, subscribeAuthEvents } from "@/lib/auth/multi-tab-sync";

type AuthContextValue = {
  user: SessionUser | null;
  companyInfo: CompanyInfo | null;
  currentPlan: CurrentPlanResponse | null;
  setupStatus: CompanySetupStatus | null;
  isSetupLoading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  completeAuth: (payload: AuthSessionPayload) => void;
  refreshSession: () => Promise<string | null>;
  refreshPlan: () => Promise<CurrentPlanResponse | null>;
  refreshSetupStatus: () => Promise<CompanySetupStatus | null>;
  logout: () => Promise<void>;
  updateCompanyInfo: (info: CompanyInfo) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [currentPlan, setCurrentPlan] =
    useState<CurrentPlanResponse | null>(null);
  const [setupStatus, setSetupStatus] = useState<CompanySetupStatus | null>(
    null,
  );
  const [isSetupLoading, setIsSetupLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlan = useCallback(async () => {
    const sessionUser = getSessionUser();
    if (!sessionUser?.empresaId) {
      setCurrentPlan(null);
      return null;
    }

    try {
      const [plan, profile] = await Promise.all([
        plansApi.current(),
        accountApi.me(),
      ]);
      setCurrentPlan(plan);
      setUser((current) =>
        current
          ? {
              ...current,
              moduleKeys: plan.effectiveModuleKeys,
              planCode: plan.plan.code,
              planStatus: plan.status,
              planStartsAt: plan.startsAt,
              planEndsAt: plan.endsAt,
              sucursalId: profile.sucursalId,
              sucursalTipo: profile.sucursalTipo,
              visibilidadOperaciones: profile.visibilidadOperaciones,
            }
          : current,
      );
      return plan;
    } catch {
      return null;
    }
  }, []);

  const refreshSetupStatus = useCallback(async () => {
    const sessionUser = getSessionUser();
    if (!sessionUser?.empresaId || sessionUser.roles.includes("SUPERADMIN")) {
      setSetupStatus(null);
      setIsSetupLoading(false);
      return null;
    }

    setIsSetupLoading(true);
    try {
      const status = await companyApi.getSetupStatus();
      setSetupStatus(status);
      return status;
    } catch {
      setSetupStatus(null);
      return null;
    } finally {
      setIsSetupLoading(false);
    }
  }, []);

  const completeAuth = useCallback((payload: AuthSessionPayload) => {
    const sessionUser = saveAuthSession(payload);
    setUser(sessionUser);
    void refreshPlan();
    void refreshSetupStatus();
  }, [refreshPlan, refreshSetupStatus]);

  const refreshSession = useCallback(async () => {
    try {
      const response = await authApi.refresh();
      const sessionUser = saveAuthSession(response);
      setUser(sessionUser);
      await Promise.all([refreshPlan(), refreshSetupStatus()]);
      return response.accessToken ?? response.token ?? null;
    } catch {
      const currentUser = getSessionUser();
      if (!currentUser) {
        clearSession();
        setUser(null);
        setCurrentPlan(null);
      }
      return null;
    }
  }, [refreshPlan, refreshSetupStatus]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await authApi.login(payload);
      if (response.setupRequired === "company") {
        return response;
      }
      const sessionUser = saveAuthSession(response);
      setUser(sessionUser);
      await Promise.all([refreshPlan(), refreshSetupStatus()]);
      return response;
    },
    [refreshPlan, refreshSetupStatus]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      setUser(null);
      setCompanyInfo(null);
      setCurrentPlan(null);
      setSetupStatus(null);
      publishAuthEvent("logout");
    }
  }, []);

  const updateCompanyInfo = useCallback((info: CompanyInfo) => {
    setStoredCompanyInfo(info);
    setCompanyInfo(info);
  }, []);

  // Silent refresh on mount
  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      const currentUser = getSessionUser();

      if (currentUser) {
        setUser(currentUser);
        const storedCompany = getStoredCompanyInfo();
        if (storedCompany) {
          setCompanyInfo(storedCompany);
        }
        await Promise.all([refreshPlan(), refreshSetupStatus()]);
        setIsLoading(false);
        return;
      }

      await refreshSession();
      setIsLoading(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshPlan, refreshSession, refreshSetupStatus]);

  // Same-tab session expired event
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!getSessionUser()) {
        clearSession();
        setUser(null);
        setCompanyInfo(null);
        setCurrentPlan(null);
        setSetupStatus(null);
        authApi.logout().catch(() => {});
      }
    };

    window.addEventListener(sessionExpiredEventName, handleSessionExpired);
    return () => {
      window.removeEventListener(sessionExpiredEventName, handleSessionExpired);
    };
  }, []);

  // Cross-tab auth event synchronization
  useEffect(() => {
    const unsubscribe = subscribeAuthEvents((type) => {
      if (type === "logout" || type === "session-expired") {
        clearSession();
        setUser(null);
        setCompanyInfo(null);
        setCurrentPlan(null);
        setSetupStatus(null);
      }
    });

    return unsubscribe;
  }, []);

  // Revalidate session when tab becomes visible after being hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const currentUser = getSessionUser();
      if (currentUser) {
        void refreshPlan();
        return;
      }

      refreshSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshPlan, refreshSession]);

  const value = useMemo(
    () => ({
      user,
      companyInfo,
      currentPlan,
      setupStatus,
      isSetupLoading,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      completeAuth,
      refreshSession,
      refreshPlan,
      refreshSetupStatus,
      logout,
      updateCompanyInfo,
    }),
    [
      completeAuth,
      companyInfo,
      currentPlan,
      isSetupLoading,
      isLoading,
      login,
      logout,
      refreshPlan,
      refreshSetupStatus,
      refreshSession,
      updateCompanyInfo,
      user,
      setupStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}

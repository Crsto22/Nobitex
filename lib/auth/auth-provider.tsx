"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { authApi, type LoginPayload, type LoginResponse } from "@/lib/api/auth";
import { accountApi } from "@/lib/api/account";
import { sessionExpiredEventName } from "@/lib/api/auth-fetch";
import { companyApi, type CompanySetupStatus } from "@/lib/api/company";
import { plansApi, type CurrentPlanResponse } from "@/lib/api/plans";
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
import {
  publishAuthEvent,
  subscribeAuthEvents,
} from "@/lib/auth/multi-tab-sync";

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
const visibilityRefreshCooldownMs = positiveNumber(
  process.env.NEXT_PUBLIC_AUTH_VISIBILITY_REFRESH_COOLDOWN_MS,
  60_000,
);
const authDataRefreshCooldownMs = positiveNumber(
  process.env.NEXT_PUBLIC_AUTH_DATA_REFRESH_COOLDOWN_MS,
  60_000,
);

type RefreshOptions = { force?: boolean };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [currentPlan, setCurrentPlan] = useState<CurrentPlanResponse | null>(
    null,
  );
  const [setupStatus, setSetupStatus] = useState<CompanySetupStatus | null>(
    null,
  );
  const [isSetupLoading, setIsSetupLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const lastVisibilityRefreshAt = useRef(0);
  const currentPlanRef = useRef<CurrentPlanResponse | null>(null);
  const setupStatusRef = useRef<CompanySetupStatus | null>(null);
  const refreshPlanPromiseRef = useRef<Promise<CurrentPlanResponse | null> | null>(
    null,
  );
  const refreshSetupPromiseRef =
    useRef<Promise<CompanySetupStatus | null> | null>(null);
  const lastPlanRefreshAt = useRef(0);
  const lastSetupRefreshAt = useRef(0);

  useEffect(() => {
    currentPlanRef.current = currentPlan;
  }, [currentPlan]);

  useEffect(() => {
    setupStatusRef.current = setupStatus;
  }, [setupStatus]);

  const refreshPlan = useCallback(async (options: RefreshOptions = {}) => {
    const sessionUser = getSessionUser();
    if (!sessionUser?.empresaId) {
      setCurrentPlan(null);
      currentPlanRef.current = null;
      return null;
    }

    const now = Date.now();
    if (
      !options.force &&
      currentPlanRef.current &&
      now - lastPlanRefreshAt.current < authDataRefreshCooldownMs
    ) {
      return currentPlanRef.current;
    }

    if (refreshPlanPromiseRef.current) {
      return refreshPlanPromiseRef.current;
    }

    refreshPlanPromiseRef.current = (async () => {
      const [plan, profile] = await Promise.all([
        plansApi.current(),
        accountApi.me(),
      ]);
      lastPlanRefreshAt.current = Date.now();
      currentPlanRef.current = plan;
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
    })();

    try {
      return await refreshPlanPromiseRef.current;
    } catch {
      return null;
    } finally {
      refreshPlanPromiseRef.current = null;
    }
  }, []);

  const refreshSetupStatus = useCallback(async (options: RefreshOptions = {}) => {
    const sessionUser = getSessionUser();
    if (!sessionUser?.empresaId || sessionUser.roles.includes("SUPERADMIN")) {
      setSetupStatus(null);
      setupStatusRef.current = null;
      setIsSetupLoading(false);
      return null;
    }

    const now = Date.now();
    if (
      !options.force &&
      setupStatusRef.current &&
      now - lastSetupRefreshAt.current < authDataRefreshCooldownMs
    ) {
      return setupStatusRef.current;
    }

    if (refreshSetupPromiseRef.current) {
      return refreshSetupPromiseRef.current;
    }

    setIsSetupLoading(true);
    refreshSetupPromiseRef.current = (async () => {
      const status = await companyApi.getSetupStatus();
      lastSetupRefreshAt.current = Date.now();
      setupStatusRef.current = status;
      setSetupStatus(status);
      return status;
    })();

    try {
      return await refreshSetupPromiseRef.current;
    } catch {
      setSetupStatus(null);
      setupStatusRef.current = null;
      return null;
    } finally {
      refreshSetupPromiseRef.current = null;
      setIsSetupLoading(false);
    }
  }, []);

  const completeAuth = useCallback(
    (payload: AuthSessionPayload) => {
      const sessionUser = saveAuthSession(payload);
      setUser(sessionUser);
      void refreshPlan({ force: true });
      void refreshSetupStatus({ force: true });
    },
    [refreshPlan, refreshSetupStatus],
  );

  const refreshSession = useCallback(async () => {
    try {
      const response = await authApi.refresh();
      const sessionUser = saveAuthSession(response);
      setUser(sessionUser);
      await Promise.all([
        refreshPlan({ force: true }),
        refreshSetupStatus({ force: true }),
      ]);
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
      await Promise.all([
        refreshPlan({ force: true }),
        refreshSetupStatus({ force: true }),
      ]);
      return response;
    },
    [refreshPlan, refreshSetupStatus],
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
        const now = Date.now();
        if (
          now - lastVisibilityRefreshAt.current <
          visibilityRefreshCooldownMs
        ) {
          return;
        }
        lastVisibilityRefreshAt.current = now;
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
    ],
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

function positiveNumber(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-store";

export const ONBOARDING_TOKEN_STORAGE_KEY = "nuvex_onboarding_token";
export const ONBOARDING_USER_STORAGE_KEY = "nuvex_onboarding_user";
export const COMPANY_INFO_STORAGE_KEY = "nuvex_company_info";
export const SESSION_EXPIRED_KEY = "nuvex_session_expired";

export type SessionUser = {
  id: string;
  nombre?: string;
  apellido?: string | null;
  email?: string;
  telefono?: string | null;
  empresaId?: string;
  empresaNombreComercial?: string;
  empresaLogoUrl?: string | null;
  empresaUsuarioId?: string;
  roles: string[];
  moduleKeys?: string[];
  planCode?: string;
  planStatus?: "trial" | "active" | "expired";
  planStartsAt?: string;
  planEndsAt?: string | null;
  sucursalId?: string | null;
  sucursalTipo?: "tienda" | "almacen" | "asistencia" | null;
  visibilidadOperaciones?: "propias" | "todas";
};

export type CompanyInfo = {
  nombreComercial: string;
  logoUrl: string | null;
  documento: string | null;
};

export type AuthSessionPayload = {
  accessToken?: string;
  token?: string;
  usuario?: {
    id: string;
    nombre?: string;
    apellido?: string | null;
    email?: string;
    telefono?: string | null;
    roles?: string[];
    moduleKeys?: string[];
  };
  empresa?: {
    id: string;
    nombreComercial?: string;
    logoUrl?: string | null;
  };
};

type JwtPayload = {
  sub?: string;
  nombre?: string;
  apellido?: string | null;
  email?: string;
  telefono?: string | null;
  empresaId?: string;
  empresaNombreComercial?: string;
  empresaLogoUrl?: string | null;
  empresaUsuarioId?: string;
  roles?: string[];
  moduleKeys?: string[];
  planCode?: string;
  planStatus?: "trial" | "active" | "expired";
  planStartsAt?: string;
  planEndsAt?: string | null;
  sucursalId?: string | null;
  sucursalTipo?: "tienda" | "almacen" | "asistencia" | null;
  visibilidadOperaciones?: "propias" | "todas";
  exp?: number;
};

export function saveAuthSession(payload: AuthSessionPayload) {
  const token = payload.accessToken ?? payload.token;

  if (!token) {
    return null;
  }

  setAccessToken(token);
  return getSessionUser();
}

export function clearSession() {
  clearAccessToken();
  window.sessionStorage.removeItem(ONBOARDING_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(ONBOARDING_USER_STORAGE_KEY);
  window.sessionStorage.removeItem(COMPANY_INFO_STORAGE_KEY);
}

export function getSessionUser(): SessionUser | null {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);

  if (!payload?.sub || isExpired(payload.exp)) {
    clearAccessToken();
    return null;
  }

  return {
    id: payload.sub,
    nombre: payload.nombre,
    apellido: payload.apellido,
    email: payload.email,
    telefono: payload.telefono,
    empresaId: payload.empresaId,
    empresaNombreComercial: payload.empresaNombreComercial,
    empresaLogoUrl: payload.empresaLogoUrl,
    empresaUsuarioId: payload.empresaUsuarioId,
    roles: payload.roles ?? [],
    moduleKeys: payload.moduleKeys,
    planCode: payload.planCode,
    planStatus: payload.planStatus,
    planStartsAt: payload.planStartsAt,
    planEndsAt: payload.planEndsAt,
    sucursalId: payload.sucursalId,
    sucursalTipo: payload.sucursalTipo,
    visibilidadOperaciones: payload.visibilidadOperaciones,
  };
}

export function getStoredCompanyInfo(): CompanyInfo | null {
  try {
    const raw = window.sessionStorage.getItem(COMPANY_INFO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CompanyInfo;
  } catch {
    return null;
  }
}

export function setStoredCompanyInfo(info: CompanyInfo) {
  window.sessionStorage.setItem(COMPANY_INFO_STORAGE_KEY, JSON.stringify(info));
}

export function getUserDisplayName(user: SessionUser | null) {
  if (!user) {
    return "";
  }

  const fullName = [user.nombre, user.apellido].filter(Boolean).join(" ");
  return fullName || user.email || "Usuario";
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = window.atob(normalizedPayload);
    return JSON.parse(decodedPayload) as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(exp?: number) {
  if (!exp) {
    return false;
  }

  return exp * 1000 <= Date.now();
}

export function getAccessTokenExpiry(): number | null {
  const token = getAccessToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  return payload?.exp ?? null;
}

const PROACTIVE_REFRESH_SECONDS = 5 * 60; // 5 minutes

export function shouldRefreshProactively(): boolean {
  const exp = getAccessTokenExpiry();
  if (!exp) return false;

  return exp * 1000 <= Date.now() + PROACTIVE_REFRESH_SECONDS * 1000;
}

export function markSessionExpired() {
  try {
    window.sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
  } catch {
    // sessionStorage unavailable
  }
}

export function consumeSessionExpired(): boolean {
  try {
    const value = window.sessionStorage.getItem(SESSION_EXPIRED_KEY);
    if (value) {
      window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

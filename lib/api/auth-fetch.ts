import {
  API_BASE_URL,
  ApiError,
  apiRequest,
  clearApiCache,
  getBlobTimeoutMs,
  withTimeoutSignal,
} from "@/lib/api/client";
import { getAccessToken, setAccessToken } from "@/lib/auth/token-store";
import { publishAuthEvent } from "@/lib/auth/multi-tab-sync";
import {
  markSessionExpired,
  shouldRefreshProactively,
} from "@/lib/auth/session";

export const sessionExpiredEventName = "nuvex-session-expired";
export const planLimitReachedEventName = "nuvex-plan-limit-reached";

export type PlanLimitReachedDetail = {
  message: string;
  resource?: string;
  used?: number;
  limit?: number;
};

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return requestWithAuth<T>(path, options, true);
}

export async function authBlobFetch(
  path: string,
  options: RequestInit = {},
): Promise<Blob> {
  return requestBlobWithAuth(path, options, true);
}

async function requestWithAuth<T>(
  path: string,
  options: RequestInit,
  canRefresh: boolean,
): Promise<T> {
  if (shouldRefreshProactively()) {
    try {
      await ensureFreshToken();
    } catch {
      // Proactive refresh failed, but current token may still be valid.
      // Continue with the request and let the 401 reactive flow handle it.
    }
  }

  try {
    return await apiRequest<T>(path, withAuthorization(options));
  } catch (error) {
    if (error instanceof ApiError && isPlanLimitReached(error)) {
      dispatchPlanLimitReached(error);
      error.message = "";
      throw error;
    }

    if (!(error instanceof ApiError) || error.status !== 401 || !canRefresh) {
      throw error;
    }

    try {
      await ensureFreshToken();
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) {
        dispatchSessionExpired();
      }
      throw error;
    }

    return requestWithAuth<T>(path, options, false);
  }
}

async function requestBlobWithAuth(
  path: string,
  options: RequestInit,
  canRefresh: boolean,
): Promise<Blob> {
  if (shouldRefreshProactively()) {
    try {
      await ensureFreshToken();
    } catch {
      // Reactive 401 flow below will handle expired sessions.
    }
  }

  const authorizedOptions = withAuthorization(options);
  const timeout = withTimeoutSignal(options.signal, getBlobTimeoutMs());
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...authorizedOptions,
      credentials: options.credentials ?? "include",
      signal: timeout.signal,
    });
  } catch (error) {
    if (timeout.timedOut()) {
      throw new ApiError("La descarga tardo demasiado.", 408, null);
    }
    throw error;
  } finally {
    timeout.cleanup();
  }

  if (response.status === 401 && canRefresh) {
    try {
      await ensureFreshToken();
    } catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.status === 401) {
        dispatchSessionExpired();
      }
      throw new ApiError("Sesión expirada.", 401, null);
    }

    return requestBlobWithAuth(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(getErrorMessageFromBody(body), response.status, body);
  }

  return response.blob();
}

async function ensureFreshToken(): Promise<void> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const refreshResponse = await apiRequest<{
      accessToken?: string;
      token?: string;
    }>("/auth/refresh", { method: "POST" });
    const token = refreshResponse.accessToken ?? refreshResponse.token;

    if (!token) {
      throw new Error("Refresh failed");
    }

    setAccessToken(token);
    clearApiCache();
  })();

  try {
    await refreshPromise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

function withAuthorization(options: RequestInit) {
  const token = getAccessToken();

  return {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

function dispatchSessionExpired() {
  clearApiCache();
  markSessionExpired();
  publishAuthEvent("session-expired");
  window.dispatchEvent(new Event(sessionExpiredEventName));
}

function isPlanLimitReached(error: ApiError) {
  return (
    error.status === 409 &&
    Boolean(
      error.body &&
      typeof error.body === "object" &&
      (error.body as { code?: string }).code === "PLAN_LIMIT_REACHED",
    )
  );
}

function dispatchPlanLimitReached(error: ApiError) {
  if (typeof window === "undefined") return;
  const body = error.body as PlanLimitReachedDetail;
  window.dispatchEvent(
    new CustomEvent<PlanLimitReachedDetail>(planLimitReachedEventName, {
      detail: {
        message: body.message || "Alcanzaste el límite permitido por tu plan.",
        resource: body.resource,
        used: body.used,
        limit: body.limit,
      },
    }),
  );
}

function getErrorMessageFromBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return "No se pudo completar la solicitud.";
  }

  const errorBody = body as { message?: string | string[]; error?: string };

  if (Array.isArray(errorBody.message)) {
    return errorBody.message.join(" ");
  }

  return (
    errorBody.message ?? errorBody.error ?? "No se pudo completar la solicitud."
  );
}

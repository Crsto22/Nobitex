export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightGets = new Map<string, Promise<unknown>>();
const apiTimeoutMs = positiveNumber(process.env.NEXT_PUBLIC_API_TIMEOUT_MS, 0);
const apiBlobTimeoutMs = positiveNumber(
  process.env.NEXT_PUBLIC_API_BLOB_TIMEOUT_MS,
  120_000,
);
const apiGetCacheMs = positiveNumber(
  process.env.NEXT_PUBLIC_API_GET_CACHE_MS,
  15_000,
);

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const cacheKey = `${method}:${url}:${headers.get("authorization") ?? ""}`;
  const canUseCache = method === "GET" && !options.signal && getCacheMs() > 0;
  const cached = canUseCache ? getCache.get(cacheKey) : null;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  if (canUseCache && inFlightGets.has(cacheKey)) {
    return inFlightGets.get(cacheKey) as Promise<T>;
  }

  const request = (async () => {
    const timeout = withTimeoutSignal(options.signal, getTimeoutMs(method));
    try {
      const response = await fetch(url, {
        ...options,
        credentials: options.credentials ?? "include",
        headers,
        signal: timeout.signal,
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new ApiError(getErrorMessage(body), response.status, body);
      }

      if (method !== "GET") {
        clearApiCache();
      }

      if (canUseCache) {
        getCache.set(cacheKey, {
          expiresAt: Date.now() + getCacheMs(),
          value: body,
        });
      }

      return body as T;
    } catch (error) {
      if (timeout.timedOut()) {
        throw new ApiError("La solicitud tardo demasiado.", 408, null);
      }
      throw error;
    } finally {
      timeout.cleanup();
    }
  })();

  if (canUseCache) {
    inFlightGets.set(cacheKey, request);
    request.then(
      () => inFlightGets.delete(cacheKey),
      () => inFlightGets.delete(cacheKey),
    );
  }

  return request;
}

export function clearApiCache() {
  getCache.clear();
}

export function withTimeoutSignal(
  signal: AbortSignal | null | undefined,
  ms: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  const abort = () => controller.abort();

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    timedOut: () => controller.signal.aborted && !signal?.aborted,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abort);
    },
  };
}

export function getBlobTimeoutMs() {
  return apiBlobTimeoutMs;
}

function getTimeoutMs(method: string) {
  return apiTimeoutMs || (method === "GET" ? 20_000 : 30_000);
}

function getCacheMs() {
  return apiGetCacheMs;
}

function positiveNumber(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getErrorMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return "No se pudo completar la solicitud.";
  }

  const errorBody = body as ApiErrorBody;

  if (Array.isArray(errorBody.message)) {
    return errorBody.message.join(" ");
  }

  return (
    errorBody.message ?? errorBody.error ?? "No se pudo completar la solicitud."
  );
}

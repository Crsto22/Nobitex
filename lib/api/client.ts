export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

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
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: options.credentials ?? "include",
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body), response.status, body);
  }

  return body as T;
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

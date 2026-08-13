import { clearApiCache } from "@/lib/api/client";

const TOKEN_COOKIE = "nuvex-token";

let accessToken: string | null = null;

export function getAccessToken() {
  if (!accessToken && typeof document !== "undefined") {
    accessToken = getCookie(TOKEN_COOKIE);
  }

  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  clearApiCache();
  if (typeof document !== "undefined") {
    if (token) {
      document.cookie = `${TOKEN_COOKIE}=${token};path=/;SameSite=Lax;max-age=${60 * 60 * 24 * 7}`;
    } else {
      document.cookie = `${TOKEN_COOKIE}=;path=/;SameSite=Lax;max-age=0`;
    }
  }
}

export function clearAccessToken() {
  accessToken = null;
  clearApiCache();
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_COOKIE}=;path=/;SameSite=Lax;max-age=0`;
  }
}

function getCookie(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

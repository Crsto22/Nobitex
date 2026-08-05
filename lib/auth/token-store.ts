const TOKEN_COOKIE = "nobitex-token";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
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
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_COOKIE}=;path=/;SameSite=Lax;max-age=0`;
  }
}

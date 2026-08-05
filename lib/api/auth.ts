import { apiRequest } from "@/lib/api/client";

export type RegisterPayload = {
  turnstileToken: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  confirmarPassword: string;
};

export type VerifyEmailPayload = {
  email: string;
  codigo: string;
};

export type VerifyEmailResponse = {
  onboardingToken: string;
};

export type LoginPayload = {
  email: string;
  password: string;
  turnstileToken?: string;
};

export type ForgotPasswordPayload = {
  email: string;
  turnstileToken: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
  confirmarPassword: string;
};

export type ValidateResetTokenPayload = {
  token: string;
};

export type LoginResponse = {
  setupRequired?: "company";
  onboardingToken?: string;
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
    planCode?: string;
    planStatus?: "trial" | "active" | "expired";
    planStartsAt?: string;
    planEndsAt?: string | null;
  };
  empresa?: {
    id: string;
    nombreComercial?: string;
    planCode?: string;
    planStatus?: "trial" | "active" | "expired";
    planStartsAt?: string;
    planEndsAt?: string | null;
  };
};

export const authApi = {
  register(payload: RegisterPayload) {
    return apiRequest<void>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verifyEmail(payload: VerifyEmailPayload) {
    return apiRequest<VerifyEmailResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login(payload: LoginPayload) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  refresh() {
    return apiRequest<LoginResponse>("/auth/refresh", {
      method: "POST",
    });
  },

  logout() {
    return apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  forgotPassword(payload: ForgotPasswordPayload) {
    return apiRequest<{ message: string; expiresInMinutes: number }>(
      "/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  resetPassword(payload: ResetPasswordPayload) {
    return apiRequest<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  validateResetToken(payload: ValidateResetTokenPayload) {
    return apiRequest<{ message: string }>("/auth/validate-reset-token", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

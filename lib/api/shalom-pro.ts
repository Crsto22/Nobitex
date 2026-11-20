import { authFetch } from "@/lib/api/auth-fetch";

export type ShalomProConnectionStatus = "SIN_CONECTAR" | "PENDING" | "ACTIVE" | "ERROR";

export type ShalomProStatus = {
  connected: boolean;
  tenantId: string | null;
  applicationId: string | null;
  status: ShalomProConnectionStatus;
  defaultPackageType: string | null;
  hasWebhook: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
  valid?: boolean;
  message?: string | null;
};

export type ProvisionShalomProPayload = {
  username: string;
  password: string;
  packageType?: string;
};

export const shalomProApi = {
  status() {
    return authFetch<ShalomProStatus>("/company/shalom-pro");
  },

  provision(payload: ProvisionShalomProPayload) {
    return authFetch<ShalomProStatus>("/company/shalom-pro/provision", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  validate() {
    return authFetch<ShalomProStatus>("/company/shalom-pro/validate", {
      method: "POST",
    });
  },

  repairWebhook() {
    return authFetch<{ registered: boolean; message: string }>(
      "/company/shalom-pro/webhook",
      { method: "POST" },
    );
  },
};

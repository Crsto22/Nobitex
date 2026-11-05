import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";
import type { PlatformSubscriptionPaymentMethod } from "@/lib/api/platform-admin";

export type PlatformReceiptType =
  "nota_venta" | "boleta" | "factura" | "nota_credito";
export type PlatformReceiptStatus =
  | "pendiente"
  | "aceptado"
  | "rechazado"
  | "error"
  | "anulacion_pendiente"
  | "anulado";

export type BillingEnvironment = "BETA" | "PRODUCTION";
export type BillingIntegrationStatus = "PENDING" | "READY" | "ERROR";
export type BillingDocumentStatus =
  | "RECEIVED"
  | "VALIDATING"
  | "QUEUED"
  | "PROCESSING"
  | "ACCEPTED"
  | "ACCEPTED_WITH_OBSERVATIONS"
  | "REJECTED"
  | "RETRY_SCHEDULED"
  | "FAILED"
  | "VOIDED";

export type PlatformBillingIntegration = {
  enabled: boolean;
  configured: boolean;
  tenantId: string | null;
  applicationId: string | null;
  establishmentId: string | null;
  status: BillingIntegrationStatus;
  lastError: string | null;
  lastSyncedAt: string | null;
  apiKeys: Record<BillingEnvironment, boolean>;
  webhooks: Record<BillingEnvironment, boolean>;
  credentials: Record<BillingEnvironment, boolean>;
  certificates: Record<BillingEnvironment, boolean>;
  series?: number;
};

export type PlatformReceipt = {
  id: string;
  company: { id: string; name: string };
  type: PlatformReceiptType;
  number?: number | null;
  correlativo: string;
  issuedAt: string;
  receiver: {
    documentType: string | null;
    document: string | null;
    name: string;
    address: string | null;
  };
  baseAmount: string;
  igv: string;
  total: string;
  currency: "PEN";
  status: PlatformReceiptStatus;
  provider?: "LEGACY" | "NUVEX_BILLING";
  billingDocumentId?: string | null;
  billingEnvironment?: BillingEnvironment | null;
  billingStatus?: BillingDocumentStatus | null;
  billingUpdatedAt?: string | null;
  billingLastError?: string | null;
  sunatCode: string | null;
  sunatMessage: string | null;
  downloads: {
    pdf: boolean;
    xml: boolean;
    cdr: boolean;
    cancellationXml: boolean;
    cancellationCdr: boolean;
  };
  cancellation: null | {
    state:
      | "no_aplica"
      | "pendiente_envio"
      | "enviando"
      | "pendiente_cdr"
      | "aceptado"
      | "observado"
      | "rechazado"
      | "error_transitorio"
      | "error_definitivo";
    type: "RA" | "RC" | null;
    code: string | null;
    message: string | null;
    ticket: string | null;
    requestedAt: string | null;
    respondedAt: string | null;
  };
  source: {
    type: "subscription" | "overage" | "extra" | "credit-note";
    id?: string;
  };
};

export type PlatformIssuerConfig = {
  ruc: string | null;
  businessName: string | null;
  tradeName: string | null;
  address: string | null;
  ubigeo: string | null;
  environment: "BETA" | "PRODUCCION";
  igvPercent: string;
  active: boolean;
  solUserConfigured: boolean;
  solPasswordConfigured: boolean;
  certificate: { name: string; sizeBytes: number; uploadedAt: string } | null;
  updatedAt: string | null;
  billing?: PlatformBillingIntegration;
};

export type PlatformSeries = {
  id: string;
  type: PlatformReceiptType;
  series: string;
  currentNumber: number;
  active: boolean;
  billing?: {
    environment: BillingEnvironment;
    fiscalSeriesId: string | null;
    synced: boolean;
  };
};

export type PlatformSeriesResponse = {
  data: PlatformSeries[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { active: number; inactive: number; issued: number };
};

export const platformBillingApi = {
  findReceipts(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      type?: PlatformReceiptType;
      status?: PlatformReceiptStatus;
    } = {},
    owner = false,
  ) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(
      ([key, value]) => value && params.set(key, String(value)),
    );
    const path = owner
      ? "/billing/receipts"
      : "/platform-admin/billing/receipts";
    return authFetch<{
      data: PlatformReceipt[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`${path}${params.size ? `?${params}` : ""}`);
  },
  getIssuer() {
    return authFetch<PlatformIssuerConfig>("/platform-admin/billing/issuer");
  },
  updateIssuer(
    payload: Partial<{
      ruc: string;
      businessName: string;
      tradeName: string;
      address: string;
      ubigeo: string;
      environment: "BETA" | "PRODUCCION";
      igvPercent: number;
      active: boolean;
    }>,
  ) {
    return authFetch<PlatformIssuerConfig>("/platform-admin/billing/issuer", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  provisionIssuer(environment: BillingEnvironment) {
    return authFetch<PlatformBillingIntegration>(
      "/platform-admin/billing/issuer/provision",
      {
        method: "POST",
        body: JSON.stringify({ environment }),
      },
    );
  },
  updateIssuerCredentials(
    environment: BillingEnvironment,
    payload: { solUsername: string; solPassword: string },
  ) {
    return authFetch<unknown>(
      `/platform-admin/billing/issuer/${environment}/credentials`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
  },
  uploadCertificate(
    environment: BillingEnvironment,
    file: File,
    certificatePassword: string,
  ) {
    const body = new FormData();
    body.append("certificate", file);
    body.append("password", certificatePassword);
    return authFetch<unknown>(
      `/platform-admin/billing/issuer/${environment}/certificate`,
      { method: "PUT", body },
    );
  },
  deleteCertificate(environment: BillingEnvironment) {
    return authFetch<unknown>(
      `/platform-admin/billing/issuer/${environment}/certificate`,
      { method: "DELETE" },
    );
  },
  setIssuerEnabled(enabled: boolean) {
    return authFetch<PlatformBillingIntegration>(
      "/platform-admin/billing/issuer/enabled",
      { method: "PUT", body: JSON.stringify({ enabled }) },
    );
  },
  findSeries(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      type?: PlatformReceiptType;
      status?: "activo" | "inactivo";
    } = {},
  ) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    return authFetch<PlatformSeriesResponse>(
      `/platform-admin/billing/series${params.size ? `?${params}` : ""}`,
    );
  },
  createSeries(payload: {
    type: PlatformReceiptType;
    series: string;
    active: boolean;
  }) {
    return authFetch<PlatformSeries>("/platform-admin/billing/series", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateSeries(
    id: string,
    payload: { type: PlatformReceiptType; series: string; active: boolean },
  ) {
    return authFetch<PlatformSeries>(
      `/platform-admin/billing/series/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
  },
  createExtraCharge(payload: {
    requestId: string;
    companyId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    paymentMethod: PlatformSubscriptionPaymentMethod;
    paymentMethodOther?: string;
    receiptType: Exclude<PlatformReceiptType, "nota_credito">;
  }) {
    return authFetch<PlatformReceipt>("/platform-admin/billing/extra-charges", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  issueHistorical(payload: {
    requestId: string;
    sourceType: "subscription" | "overage";
    sourceId: string;
    receiptType: Exclude<PlatformReceiptType, "nota_credito">;
  }) {
    return authFetch<PlatformReceipt>(
      "/platform-admin/billing/receipts/historical",
      { method: "POST", body: JSON.stringify(payload) },
    );
  },
  retry(id: string) {
    return authFetch<{ queued: boolean }>(
      `/platform-admin/billing/receipts/${encodeURIComponent(id)}/retry`,
      { method: "POST" },
    );
  },
  cancel(id: string, reason: string) {
    return authFetch<PlatformReceipt>(
      `/platform-admin/billing/receipts/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ requestId: crypto.randomUUID(), reason }),
      },
    );
  },
  createCreditNote(id: string, reason: string) {
    return authFetch<PlatformReceipt>(
      `/platform-admin/billing/receipts/${encodeURIComponent(id)}/credit-note`,
      {
        method: "POST",
        body: JSON.stringify({ requestId: crypto.randomUUID(), reason }),
      },
    );
  },
  downloadCancellation(id: string, kind: "xml" | "cdr") {
    return authBlobFetch(
      `/platform-admin/billing/receipts/${encodeURIComponent(id)}/cancellation/download/${kind}`,
    );
  },
  download(id: string, kind: "pdf" | "xml" | "cdr", owner = false) {
    return authBlobFetch(
      `${owner ? "/billing/receipts" : "/platform-admin/billing/receipts"}/${encodeURIComponent(id)}/download/${kind}`,
    );
  },
};

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

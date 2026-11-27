import { authFetch } from "@/lib/api/auth-fetch";
import type {
  ExecuteImportPayload,
  ExecuteImportResponse,
  ValidateImportPayload,
  ValidateImportResponse,
} from "@/lib/product-import/types";

export const productImportApi = {
  validate(payload: ValidateImportPayload) {
    return authFetch<ValidateImportResponse>("/products/import/validate", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 120_000,
    });
  },

  execute(payload: ExecuteImportPayload) {
    return authFetch<ExecuteImportResponse>("/products/import/execute", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 180_000,
    });
  },
};

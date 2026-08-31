import { authFetch } from "@/lib/api/auth-fetch";
import { apiRequest } from "@/lib/api/client";

export type PlanCode =
  | "prueba"
  | "basico"
  | "emprendedor"
  | "crecimiento"
  | "empresarial"
  | "pos_basico"
  | "asistencias_basico"
  | "asistencias_pro"
  | "completo_emprende"
  | "completo_empresa";
export type PlanStatus = "trial" | "active" | "expired";

export type PlanLimits = {
  users: number;
  branches: number;
  warehouses: number | null;
  products: number;
  variants: number;
  documents: number;
  documentQueries: number;
  storageBytes: number;
  attendanceEmployees: number;
  attendanceQrPoints: number;
};

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  priceMonthly: string;
  monthlyDiscountPercent: string;
  monthlyOfferPrice: string;
  annualDiscountPercent: string;
  annualPrice: string;
  pricingUpdatedAt: string;
  currency: "PEN";
  includesIgv: true;
  trialDays: number | null;
  limits: PlanLimits;
  moduleKeys: string[];
  highlights: string[];
};

export type AttendanceAddon = {
  active: boolean;
  effectiveActive: boolean;
  trial: boolean;
  employeesLimit: number;
  qrPointsLimit: number;
  effectiveEmployeesLimit: number;
  effectiveQrPointsLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  monthlyPrice: string;
  currency: "PEN";
  includesIgv: true;
};

export type AttendancePricing = {
  employeeUnitPrice: string;
  qrPointUnitPrice: string;
  annualDiscountPercent: string;
  currency: "PEN";
  includesIgv: true;
  updatedAt: string;
  updatedBy?: { id: string; name: string; email: string } | null;
};

export type AffiliateCodeValidation = {
  valid: boolean;
  code: string;
  discountPercent: string;
  reason?: "invalid" | "inactive";
  currency?: "PEN";
};

export type CurrentPlanResponse = {
  plan: PlanDefinition;
  status: PlanStatus;
  startsAt: string;
  endsAt: string | null;
  daysRemaining: number | null;
  usage: PlanLimits;
  baseLimits: PlanLimits;
  additionalLimits: PlanLimits;
  effectiveLimits: PlanLimits;
  remaining: PlanLimits;
  documentOverage: {
    count: number;
    estimatedAmount: string;
    currency: "PEN";
  };
  monthlyDiscountEligible: boolean;
  effectiveModuleKeys: string[];
  attendancePricing: AttendancePricing;
  attendance?: AttendanceAddon;
};

export const plansApi = {
  findAll() {
    return apiRequest<PlanDefinition[]>("/plans");
  },

  current() {
    return authFetch<CurrentPlanResponse>("/plans/current");
  },

  attendancePricing() {
    return apiRequest<AttendancePricing>("/plans/attendance-pricing");
  },

  validateAffiliateCode(code: string) {
    return apiRequest<AffiliateCodeValidation>(
      `/plans/affiliate-code?code=${encodeURIComponent(code)}`,
    );
  },
};

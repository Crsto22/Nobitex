import { authFetch } from "@/lib/api/auth-fetch";
import { apiRequest } from "@/lib/api/client";

export type PlanCode =
  "prueba" | "basico" | "emprendedor" | "crecimiento" | "empresarial";
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
};

export const plansApi = {
  findAll() {
    return apiRequest<PlanDefinition[]>("/plans");
  },

  current() {
    return authFetch<CurrentPlanResponse>("/plans/current");
  },
};

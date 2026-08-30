import { authBlobFetch, authFetch } from "@/lib/api/auth-fetch";
import type { PlanDefinition } from "@/lib/api/plans";

export type PlatformPlanCode =
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
export type PlatformPlanStatus = "trial" | "active" | "expired";
export type PlatformCompanyState = "activa" | "inactiva" | "suspendida";
export type PlatformAuditCategory =
  "company" | "plan" | "admin" | "subscription" | "billing" | "affiliate";
export type PlatformAuditAction =
  | "company_created"
  | "plan_changed"
  | "plan_pricing_updated"
  | "plan_limits_updated"
  | "plan_modules_updated"
  | "platform_admin_created"
  | "platform_admin_status_changed"
  | "subscription_sold"
  | "subscription_sale_cancelled"
  | "attendance_subscription_sold"
  | "attendance_subscription_cancelled"
  | "attendance_capacity_updated"
  | "overage_pricing_updated"
  | "attendance_pricing_updated"
  | "company_limits_updated"
  | "company_modules_updated"
  | "company_attendance_addon_updated"
  | "overage_closed"
  | "overage_paid"
  | "company_fiscal_data_updated"
  | "sunat_config_updated"
  | "sunat_certificate_uploaded"
  | "sunat_certificate_deleted"
  | "platform_billing_config_updated"
  | "platform_receipt_issued"
  | "platform_receipt_retried"
  | "platform_credit_note_requested"
  | "platform_extra_charge_created"
  | "affiliate_created"
  | "affiliate_updated"
  | "company_affiliated"
  | "affiliate_interrupted"
  | "affiliate_settlement_closed"
  | "affiliate_settlement_paid";
export type PlatformAuditSource =
  "registration" | "historical" | "cli" | "admin";
export type PlatformAdminUserStatus = "activo" | "inactivo" | "bloqueado";
export type PlatformSubscriptionPaymentMethod =
  "yape" | "plin" | "transferencia" | "deposito" | "efectivo" | "otro";
export type PlatformSubscriptionPaymentStatus = "pagado" | "anulado";
export type PlatformAttendanceSubscriptionStatus =
  | "activa"
  | "cancelada"
  | "vencida";
export type PlatformAttendanceSubscriptionPeriod = "mensual" | "anual";
export type PlatformDashboardDateFilter =
  "today" | "7days" | "14days" | "30days" | "month" | "year";

export type PlatformCompaniesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  plan?: PlatformPlanCode;
  state?: PlatformCompanyState;
  planStatus?: PlatformPlanStatus;
};

export type PlatformAuditQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: PlatformAuditCategory;
  action?: PlatformAuditAction;
  source?: PlatformAuditSource;
};

export type PlatformAdminUsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "activo" | "inactivo";
};

export type PlatformSubscriptionSalesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  plan?: PlatformPlanCode;
  method?: PlatformSubscriptionPaymentMethod;
  status?: PlatformSubscriptionPaymentStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type PlatformAttendanceSubscriptionsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  method?: PlatformSubscriptionPaymentMethod;
  status?: Exclude<PlatformAttendanceSubscriptionStatus, "vencida">;
  dateFrom?: string;
  dateTo?: string;
};

export type PlatformAffiliateQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "activo" | "inactivo";
  affiliateId?: string;
  period?: string;
};

export type PlatformPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PlatformCompany = {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  state: PlatformCompanyState;
  planCode: PlatformPlanCode;
  planName: string;
  planStatus: PlatformPlanStatus;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  owner: { name: string; email: string } | null;
  users: number;
  branches: number;
  attendance?: PlatformAttendanceAddon;
  monthlyDiscountEligible?: boolean;
  affiliateEligible?: boolean;
  affiliate?: null | {
    id: string;
    code: string;
    name: string;
    status: "activa" | "interrumpida" | "cancelada";
    discountPercent: string;
    commissionPercent: string;
  };
};

export type PlatformCompanyUsage = {
  id: string;
  name: string;
  document: string | null;
  state: PlatformCompanyState;
  planCode: PlatformPlanCode;
  planName: string;
  planStatus: PlatformPlanStatus;
  startsAt: string;
  endsAt: string | null;
  usage: PlatformPlanLimits;
  limits: PlatformPlanLimits;
  baseLimits: PlatformPlanLimits;
  additionalLimits: PlatformPlanLimits;
  effectiveLimits: PlatformPlanLimits;
};

export type PlatformCompanyLimits = {
  company: { id: string; name: string };
  baseLimits: PlatformPlanLimits;
  additionalLimits: PlatformPlanLimits;
  effectiveLimits: PlatformPlanLimits;
  attendance?: PlatformAttendanceAddon;
  updatedAt: string | null;
};

export type PlatformAttendanceAddon = {
  company?: { id: string; name: string };
  pricing?: PlatformAttendancePricing;
  active: boolean;
  effectiveActive: boolean;
  trial: boolean;
  employeesLimit: number;
  qrPointsLimit: number;
  effectiveEmployeesLimit: number;
  effectiveQrPointsLimit: number;
  branchesLimit: number;
  documentQueriesLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  monthlyPrice: string;
  currency: "PEN";
  includesIgv: true;
  usage?: {
    employees: number;
    qrPoints: number;
    branches?: number;
    documentQueries?: number;
  };
};

export type UpdatePlatformAttendanceAddonPayload = {
  active: boolean;
  employeesLimit: number;
  qrPointsLimit: number;
  startsAt?: string;
  endsAt?: string;
};

export type PlatformCompanyModules = {
  company: { id: string; name: string };
  planCode: PlatformPlanCode;
  baseModuleKeys: string[];
  overrideModuleKeys: Array<{ moduleKey: string; enabled: boolean }>;
  effectiveModuleKeys: string[];
  updatedAt: string | null;
};

export type PlatformOveragePricing = {
  unitPrice: string;
  currency: "PEN";
  includesIgv: true;
  updatedAt: string;
  updatedBy: { id: string; name: string; email: string } | null;
};

export type PlatformAttendancePricing = {
  employeeUnitPrice: string;
  qrPointUnitPrice: string;
  currency: "PEN";
  includesIgv: true;
  updatedAt: string;
  updatedBy: { id: string; name: string; email: string } | null;
};

export type PlatformSunatReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
};

export type PlatformCompanySunatConfig = {
  ambiente: "BETA" | "PRODUCCION";
  igvPorcentaje: string;
  activo: boolean;
  usuarioSolConfigurado: boolean;
  claveSolConfigurada: boolean;
  clientIdConfigurado: boolean;
  clientSecretConfigurado: boolean;
  certificadoConfigurado: boolean;
  certificadoPasswordConfigurado: boolean;
  certificado: {
    nombre: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    uploadedAt: string | null;
  } | null;
  updatedAt: string | null;
};

export type PlatformSunatCompany = {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  email: string | null;
  state: PlatformCompanyState;
  planCode: PlatformPlanCode;
  planName: string;
};

export type PlatformSunatCompanyDetail = PlatformSunatCompany & {
  sunat: PlatformCompanySunatConfig;
  readiness: {
    ready: boolean;
    checks: PlatformSunatReadinessCheck[];
    missing: string[];
  };
  fiscal: {
    nombreComercial: string;
    razonSocial: string | null;
    ruc: string | null;
    dni: string | null;
    direccion: string | null;
  };
};

export type PlatformSunatCompaniesResponse = {
  data: PlatformSunatCompany[];
  meta: PlatformPaginationMeta;
};

export type UpdatePlatformSunatFiscalPayload = {
  nombreComercial?: string;
  razonSocial?: string;
  ruc?: string;
  direccion?: string;
};

export type UpdatePlatformSunatConfigPayload = {
  ambiente?: "BETA" | "PRODUCCION";
  activo?: boolean;
  igvPorcentaje?: string;
  usuarioSol?: string;
  claveSol?: string;
  clientId?: string;
  clientSecret?: string;
};

export type PlatformOverageStatus = "open" | "ready" | "pendiente" | "pagado";
export type PlatformOverage = {
  company: { id: string; name: string; document: string | null };
  period: string;
  quantity: number;
  totalAmount: string;
  currency: "PEN";
  status: PlatformOverageStatus;
  liquidation: null | {
    id: string;
    paymentMethod: PlatformSubscriptionPaymentMethod | null;
    paymentMethodOther: string | null;
    paidAt: string | null;
    closedBy: { id: string; name: string; email: string } | null;
    paidBy: { id: string; name: string; email: string } | null;
    createdAt: string;
  };
};

export type PlatformOveragesResponse = {
  data: PlatformOverage[];
  meta: PlatformPaginationMeta;
  summary: { pendingAmount: string; paidAmount: string };
};

export type PlatformPlanLimits = {
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

export type PlatformCompaniesResponse = {
  data: PlatformCompany[];
  meta: PlatformPaginationMeta;
  summary: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    trials: number;
  };
};

export type PlatformCompanyUsageResponse = {
  data: PlatformCompanyUsage[];
  meta: PlatformPaginationMeta;
};

export type PlatformAuditLog = {
  id: string;
  category: PlatformAuditCategory;
  action: PlatformAuditAction;
  source: PlatformAuditSource;
  description: string;
  metadata: Record<string, unknown> | null;
  company: { id: string; name: string; document: string | null } | null;
  actor: { id: string; name: string; email: string } | null;
  createdAt: string;
};

export type PlatformAuditResponse = {
  data: PlatformAuditLog[];
  meta: PlatformPaginationMeta;
  summary: {
    total: number;
    thisMonth: number;
    companyEvents: number;
    planEvents: number;
    platformAdminEvents: number;
    subscriptionEvents: number;
    affiliateEvents: number;
    registrationEvents: number;
    historicalEvents: number;
    cliEvents: number;
    adminEvents: number;
  };
};

export type PlatformSubscriptionSale = {
  id: string;
  requestId: string;
  company: { id: string; name: string; document: string | null };
  planCode: PlatformPlanCode;
  planName: string;
  months: number;
  monthlyPrice: string;
  listAmount: string;
  discountPercent: string;
  discountAmount: string;
  affiliateCode: string | null;
  affiliateDiscountPercent: string;
  affiliateDiscountAmount: string;
  affiliateCommissionBase: string;
  affiliateCommissionPercent: string;
  affiliateCommissionAmount: string;
  totalAmount: string;
  currency: "PEN";
  includesIgv: boolean;
  paymentMethod: PlatformSubscriptionPaymentMethod;
  paymentMethodOther: string | null;
  status: PlatformSubscriptionPaymentStatus;
  previousPlanCode: PlatformPlanCode;
  previousStartsAt: string;
  previousEndsAt: string | null;
  coverageStartsAt: string;
  coverageEndsAt: string;
  resultingStartsAt: string;
  resultingEndsAt: string;
  registeredBy: { id: string; name: string; email: string } | null;
  cancelledBy: { id: string; name: string; email: string } | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  receipt: null | {
    id: string;
    type: "nota_venta" | "boleta" | "factura" | "nota_credito";
    correlativo: string;
    status: string;
  };
};

export type PlatformSubscriptionSalesResponse = {
  data: PlatformSubscriptionSale[];
  meta: PlatformPaginationMeta;
  summary: {
    paidThisMonth: number;
    cancelledThisMonth: number;
    collectedThisMonth: string;
  };
};

export type PlatformAttendanceSubscription = {
  id: string;
  requestId: string;
  company: { id: string; name: string; document: string | null };
  employeesLimit: number;
  qrPointsLimit: number;
  employeeUnitPrice: string;
  qrPointUnitPrice: string;
  period: PlatformAttendanceSubscriptionPeriod;
  monthlyAmount: string;
  totalAmount: string;
  affiliateCode: string | null;
  affiliateDiscountPercent: string;
  affiliateDiscountAmount: string;
  affiliateCommissionBase: string;
  affiliateCommissionPercent: string;
  affiliateCommissionAmount: string;
  currency: "PEN";
  includesIgv: boolean;
  paymentMethod: PlatformSubscriptionPaymentMethod;
  paymentMethodOther: string | null;
  status: PlatformAttendanceSubscriptionStatus;
  coverageStartsAt: string;
  coverageEndsAt: string;
  usage: { employees: number; qrPoints: number };
  registeredBy: { id: string; name: string; email: string } | null;
  cancelledBy: { id: string; name: string; email: string } | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type PlatformAttendanceSubscriptionsResponse = {
  data: PlatformAttendanceSubscription[];
  meta: PlatformPaginationMeta;
  summary: {
    active: number;
    cancelledThisMonth: number;
    collectedThisMonth: string;
  };
};

export type CreatePlatformSubscriptionSalePayload = {
  requestId: string;
  empresaId: string;
  planCode: Exclude<PlatformPlanCode, "prueba">;
  months: 1 | 3 | 6 | 12;
  pricingUpdatedAt: string;
  paymentMethod: PlatformSubscriptionPaymentMethod;
  paymentMethodOther?: string;
  receiptType: "nota_venta" | "boleta" | "factura";
  affiliateCode?: string;
};

export type CreatePlatformAttendanceSubscriptionPayload = {
  requestId: string;
  empresaId: string;
  employeesLimit: number;
  qrPointsLimit: number;
  period: PlatformAttendanceSubscriptionPeriod;
  startsAt?: string;
  paymentMethod: PlatformSubscriptionPaymentMethod;
  paymentMethodOther?: string;
};

export type CreatePlatformSubscriptionCheckoutPayload = {
  requestId: string;
  empresaId: string;
  paymentMethod: PlatformSubscriptionPaymentMethod;
  paymentMethodOther?: string;
  receiptType: "nota_venta" | "boleta" | "factura";
  affiliateCode?: string;
  pos?: {
    planCode: Exclude<PlatformPlanCode, "prueba">;
    months: 1 | 3 | 6 | 12;
    pricingUpdatedAt: string;
    affiliateCode?: string;
  };
  attendance?: {
    employeesLimit: number;
    qrPointsLimit: number;
    period: PlatformAttendanceSubscriptionPeriod;
    months?: 1 | 3 | 6 | 12;
    startsAt?: string;
  };
};

export type PlatformAffiliate = {
  id: string;
  code: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  discountPercent: string;
  commissionPercent: string;
  status: "activo" | "inactivo";
  companies?: number;
  generatedCommission?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAffiliatesResponse = {
  data: PlatformAffiliate[];
  meta: PlatformPaginationMeta;
  summary: { total: number; active: number; pendingCommission: string };
};

export type PlatformAffiliateCompany = {
  company: { id: string; name: string };
  affiliate: { id: string; code: string; name: string };
  status: "activa" | "interrumpida" | "cancelada";
  planCode: PlatformPlanCode;
  planEndsAt: string | null;
  startedAt: string;
  endedAt: string | null;
  reason: string | null;
};

export type PlatformAffiliateCommission = {
  id: string;
  affiliate: { id: string; code: string; name: string };
  company: { id: string; name: string };
  period: string;
  type: "venta" | "ajuste_anulacion";
  baseAmount: string;
  percent: string;
  amount: string;
  status: "pendiente" | "liquidada" | "anulada";
  settlementId: string | null;
  settlementStatus: "pendiente" | "pagada" | null;
  createdAt: string;
};

export type PlatformAffiliateSettlement = {
  id: string;
  requestId: string;
  affiliate: { id: string; code: string; name: string };
  period: string;
  count: number;
  totalAmount: string;
  status: "pendiente" | "pagada";
  paymentMethod: PlatformSubscriptionPaymentMethod | null;
  paymentReference: string | null;
  closedBy: { id: string; name: string; email: string } | null;
  paidBy: { id: string; name: string; email: string } | null;
  paidAt: string | null;
  createdAt: string;
};

export type SavePlatformAffiliatePayload = {
  code: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  discountPercent: string;
  commissionPercent: string;
  status: "activo" | "inactivo";
};

export type PlatformAdminUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  status: PlatformAdminUserStatus;
  createdAt: string;
  updatedAt: string;
};

export type PlatformAdminUsersResponse = {
  data: PlatformAdminUser[];
  meta: PlatformPaginationMeta;
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
};

export type CreatePlatformAdminPayload = {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
};

export type CreatePlatformAdminResponse = {
  user: PlatformAdminUser;
  temporaryPassword: string;
};

export type PlatformPlanPricing = PlanDefinition & {
  updatedBy: { id: string; name: string; email: string } | null;
  limitsUpdatedAt: string;
  limitsUpdatedBy: { id: string; name: string; email: string } | null;
  modulesUpdatedAt: string;
};

export type UpdatePlatformPlanPricingPayload = {
  priceMonthly: string;
  monthlyDiscountPercent: string;
  annualDiscountPercent: string;
  expectedUpdatedAt: string;
};

export type UpdatePlatformPlanLimitsPayload = PlatformPlanLimits & {
  expectedUpdatedAt: string;
};

export type UpdatePlatformPlanModulesPayload = {
  moduleKeys: string[];
  expectedUpdatedAt: string;
};

export type PlatformAdminDashboardResponse = {
  generatedAt: string;
  summary: {
    totalCompanies: number;
    companiesInPeriod: number;
    activeTrials: number;
    activeSubscriptions: number;
    expiredCompanies: number;
    totalCollected: string;
  };
  companyTrend: Array<{
    label: string;
    value: number;
  }>;
  planDistribution: Array<{
    code: PlatformPlanCode;
    name: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  recentCompanies: Array<{
    id: string;
    name: string;
    document: string | null;
    companyStatus: "activa" | "inactiva" | "suspendida";
    planCode: PlatformPlanCode;
    planName: string;
    planStatus: "trial" | "active" | "expired";
    createdAt: string;
    endsAt: string | null;
  }>;
};

export const platformAdminApi = {
  getDashboard(dateFilter: PlatformDashboardDateFilter = "month") {
    return authFetch<PlatformAdminDashboardResponse>(
      `/platform-admin/dashboard?dateFilter=${dateFilter}`,
    );
  },

  findCompanies(query: PlatformCompaniesQuery = {}) {
    return authFetch<PlatformCompaniesResponse>(
      buildPlatformCompaniesPath("/platform-admin/companies", query),
    );
  },

  getCompany(id: string) {
    return authFetch<PlatformCompany>(
      `/platform-admin/companies/${encodeURIComponent(id)}`,
    );
  },

  async findCompanyUsage(query: PlatformCompaniesQuery = {}) {
    const result = await authFetch<PlatformCompanyUsageResponse>(
      buildPlatformCompaniesPath("/platform-admin/companies/usage", query),
    );
    return { ...result, data: result.data.map(normalizeCompanyUsage) };
  },

  async getCompanyLimits(id: string) {
    return normalizeCompanyLimits(
      await authFetch<PlatformCompanyLimits>(
        `/platform-admin/companies/${encodeURIComponent(id)}/limits`,
      ),
    );
  },

  async updateCompanyLimits(id: string, limits: PlatformPlanLimits) {
    return normalizeCompanyLimits(
      await authFetch<PlatformCompanyLimits>(
        `/platform-admin/companies/${encodeURIComponent(id)}/limits`,
        {
          method: "PATCH",
          body: JSON.stringify(limits),
        },
      ),
    );
  },

  getCompanyAttendanceAddon(id: string) {
    return authFetch<PlatformAttendanceAddon>(
      `/platform-admin/companies/${encodeURIComponent(id)}/attendance-addon`,
    );
  },

  updateCompanyAttendanceAddon(
    id: string,
    payload: UpdatePlatformAttendanceAddonPayload,
  ) {
    return authFetch<PlatformAttendanceAddon>(
      `/platform-admin/companies/${encodeURIComponent(id)}/attendance-addon`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  updateCompanyAttendanceCapacity(
    id: string,
    payload: {
      employeesLimit: number;
      qrPointsLimit: number;
      branchesLimit: number;
    },
  ) {
    return authFetch<PlatformAttendanceAddon>(
      `/platform-admin/companies/${encodeURIComponent(id)}/attendance-capacity`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  getAttendancePricing() {
    return authFetch<PlatformAttendancePricing>(
      "/platform-admin/attendance-pricing",
    );
  },

  updateAttendancePricing(payload: {
    employeeUnitPrice: string;
    qrPointUnitPrice: string;
  }) {
    return authFetch<PlatformAttendancePricing>(
      "/platform-admin/attendance-pricing",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  getCompanyModules(id: string) {
    return authFetch<PlatformCompanyModules>(
      `/platform-admin/companies/${encodeURIComponent(id)}/modules`,
    );
  },

  updateCompanyModules(id: string, moduleKeys: string[]) {
    return authFetch<PlatformCompanyModules>(
      `/platform-admin/companies/${encodeURIComponent(id)}/modules`,
      {
        method: "PATCH",
        body: JSON.stringify({ moduleKeys }),
      },
    );
  },

  findUsers(query: PlatformAdminUsersQuery = {}) {
    return authFetch<PlatformAdminUsersResponse>(
      buildPlatformUsersPath("/platform-admin/users", query),
    );
  },

  createUser(payload: CreatePlatformAdminPayload) {
    return authFetch<CreatePlatformAdminResponse>("/platform-admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateUserStatus(id: string, status: "activo" | "inactivo") {
    return authFetch<PlatformAdminUser>(
      `/platform-admin/users/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ estado: status }),
      },
    );
  },

  async findPlanPricing() {
    const plans = await authFetch<PlatformPlanPricing[]>(
      "/platform-admin/plans/pricing",
    );
    return plans.map((plan) => ({
      ...plan,
      limits: normalizePlanLimits(plan.limits),
    }));
  },

  updatePlanPricing(
    code: Exclude<PlatformPlanCode, "prueba">,
    payload: UpdatePlatformPlanPricingPayload,
  ) {
    return authFetch<PlatformPlanPricing>(
      `/platform-admin/plans/${encodeURIComponent(code)}/pricing`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  updatePlanLimits(
    code: PlatformPlanCode,
    payload: UpdatePlatformPlanLimitsPayload,
  ) {
    return authFetch<PlatformPlanPricing>(
      `/platform-admin/plans/${encodeURIComponent(code)}/limits`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  updatePlanModules(
    code: PlatformPlanCode,
    payload: UpdatePlatformPlanModulesPayload,
  ) {
    return authFetch<{ moduleKeys: string[]; modulesUpdatedAt: string }>(
      `/platform-admin/plans/${encodeURIComponent(code)}/modules`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  getOveragePricing() {
    return authFetch<PlatformOveragePricing>(
      "/platform-admin/plans/overage-pricing",
    );
  },

  findSunatCompanies(
    query: { page?: number; limit?: number; search?: string } = {},
  ) {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search?.trim()) params.set("search", query.search.trim());

    return authFetch<PlatformSunatCompaniesResponse>(
      `/platform-admin/sunat/companies${params.size ? `?${params}` : ""}`,
    );
  },

  getSunatCompany(id: string) {
    return authFetch<PlatformSunatCompanyDetail>(
      `/platform-admin/sunat/companies/${encodeURIComponent(id)}`,
    );
  },

  updateSunatFiscal(id: string, payload: UpdatePlatformSunatFiscalPayload) {
    return authFetch<PlatformSunatCompanyDetail>(
      `/platform-admin/sunat/companies/${encodeURIComponent(id)}/fiscal`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
  },

  updateSunatConfig(id: string, payload: UpdatePlatformSunatConfigPayload) {
    return authFetch<PlatformSunatCompanyDetail>(
      `/platform-admin/sunat/companies/${encodeURIComponent(id)}/config`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
  },

  uploadSunatCertificate(id: string, file: File, certificatePassword: string) {
    const body = new FormData();
    body.append("certificate", file);
    body.append("certificatePassword", certificatePassword);

    return authFetch<PlatformSunatCompanyDetail>(
      `/platform-admin/sunat/companies/${encodeURIComponent(id)}/certificate`,
      { method: "POST", body },
    );
  },

  deleteSunatCertificate(id: string) {
    return authFetch<PlatformSunatCompanyDetail>(
      `/platform-admin/sunat/companies/${encodeURIComponent(id)}/certificate`,
      { method: "DELETE" },
    );
  },

  updateOveragePricing(payload: {
    unitPrice: string;
    expectedUpdatedAt: string;
  }) {
    return authFetch<PlatformOveragePricing>(
      "/platform-admin/plans/overage-pricing",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  findOverages(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      period?: string;
      status?: PlatformOverageStatus;
    } = {},
  ) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(
      ([key, value]) => value && params.set(key, String(value)),
    );
    return authFetch<PlatformOveragesResponse>(
      `/platform-admin/subscriptions/overages${params.size ? `?${params}` : ""}`,
    );
  },

  closeOverage(companyId: string, period: string) {
    return authFetch<PlatformOverage["liquidation"]>(
      "/platform-admin/subscriptions/overages/close",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          empresaId: companyId,
          period,
        }),
      },
    );
  },

  payOverage(
    id: string,
    paymentMethod: PlatformSubscriptionPaymentMethod,
    receiptType: "nota_venta" | "boleta" | "factura",
    paymentMethodOther?: string,
  ) {
    return authFetch<PlatformOverage["liquidation"]>(
      `/platform-admin/subscriptions/overages/${encodeURIComponent(id)}/pay`,
      {
        method: "POST",
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          paymentMethod,
          paymentMethodOther,
          receiptType,
        }),
      },
    );
  },

  findSubscriptionSales(query: PlatformSubscriptionSalesQuery = {}) {
    return authFetch<PlatformSubscriptionSalesResponse>(
      buildPlatformSubscriptionSalesPath(
        "/platform-admin/subscriptions/sales",
        query,
      ),
    );
  },

  createSubscriptionSale(payload: CreatePlatformSubscriptionSalePayload) {
    return authFetch<{
      sale: PlatformSubscriptionSale;
      idempotent: boolean;
    }>("/platform-admin/subscriptions/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createSubscriptionCheckout(payload: CreatePlatformSubscriptionCheckoutPayload) {
    return authFetch<{
      sale: PlatformSubscriptionSale | null;
      attendance: PlatformAttendanceSubscription | null;
      receipt: null | {
        id: string;
        type: "nota_venta" | "boleta" | "factura" | "nota_credito";
        correlativo: string;
        status: string;
      };
      idempotent: boolean;
    }>("/platform-admin/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  cancelSubscriptionSale(id: string, reason: string) {
    return authFetch<PlatformSubscriptionSale>(
      `/platform-admin/subscriptions/sales/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },

  findAttendanceSubscriptions(
    query: PlatformAttendanceSubscriptionsQuery = {},
  ) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(
      ([key, value]) => value && params.set(key, String(value)),
    );
    return authFetch<PlatformAttendanceSubscriptionsResponse>(
      `/platform-admin/subscriptions/attendance${params.size ? `?${params}` : ""}`,
    );
  },

  createAttendanceSubscription(
    payload: CreatePlatformAttendanceSubscriptionPayload,
  ) {
    return authFetch<{
      subscription: PlatformAttendanceSubscription;
      idempotent: boolean;
    }>("/platform-admin/subscriptions/attendance", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  cancelAttendanceSubscription(id: string, reason: string) {
    return authFetch<PlatformAttendanceSubscription>(
      `/platform-admin/subscriptions/attendance/${encodeURIComponent(id)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },

  findAffiliates(query: PlatformAffiliateQuery = {}) {
    return authFetch<PlatformAffiliatesResponse>(
      buildAffiliatePath("/platform-admin/affiliates", query),
    );
  },

  getAffiliate(id: string) {
    return authFetch<PlatformAffiliate>(
      `/platform-admin/affiliates/${encodeURIComponent(id)}`,
    );
  },

  createAffiliate(payload: SavePlatformAffiliatePayload) {
    return authFetch<PlatformAffiliate>("/platform-admin/affiliates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAffiliate(id: string, payload: SavePlatformAffiliatePayload) {
    return authFetch<PlatformAffiliate>(
      `/platform-admin/affiliates/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
  },

  validateAffiliateCode(companyId: string, code: string) {
    const params = new URLSearchParams({ companyId, code });
    return authFetch<{
      id: string;
      code: string;
      discountPercent: string;
      commissionPercent: string;
      appliesDiscount: boolean;
    }>(`/platform-admin/affiliates/validate?${params}`);
  },

  findAffiliateCompanies(query: PlatformAffiliateQuery = {}) {
    return authFetch<{
      data: PlatformAffiliateCompany[];
      meta: PlatformPaginationMeta;
    }>(buildAffiliatePath("/platform-admin/affiliates/companies", query));
  },

  findAffiliateCommissions(query: PlatformAffiliateQuery = {}) {
    return authFetch<{
      data: PlatformAffiliateCommission[];
      meta: PlatformPaginationMeta;
      summary: { pending: string; liquidated: string };
    }>(buildAffiliatePath("/platform-admin/affiliates/commissions", query));
  },

  findAffiliateSettlements(query: PlatformAffiliateQuery = {}) {
    return authFetch<{
      data: PlatformAffiliateSettlement[];
      meta: PlatformPaginationMeta;
    }>(buildAffiliatePath("/platform-admin/affiliates/settlements", query));
  },

  closeAffiliateSettlement(affiliateId: string, period: string) {
    return authFetch<PlatformAffiliateSettlement>(
      "/platform-admin/affiliates/settlements/close",
      {
        method: "POST",
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          affiliateId,
          period,
        }),
      },
    );
  },

  payAffiliateSettlement(
    id: string,
    paymentMethod: PlatformSubscriptionPaymentMethod,
    reference: string,
  ) {
    return authFetch<PlatformAffiliateSettlement>(
      `/platform-admin/affiliates/settlements/${encodeURIComponent(id)}/pay`,
      {
        method: "POST",
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          paymentMethod,
          reference,
        }),
      },
    );
  },

  downloadAffiliateSettlement(id: string) {
    return authBlobFetch(
      `/platform-admin/affiliates/settlements/${encodeURIComponent(id)}/pdf`,
    );
  },

  findPlanChanges(query: PlatformAuditQuery = {}) {
    return authFetch<PlatformAuditResponse>(
      buildPlatformAuditPath("/platform-admin/audit/plan-changes", query),
    );
  },

  findActivity(query: PlatformAuditQuery = {}) {
    return authFetch<PlatformAuditResponse>(
      buildPlatformAuditPath("/platform-admin/audit/activity", query),
    );
  },
};

function normalizePlanLimits(limits: PlatformPlanLimits): PlatformPlanLimits {
  return {
    ...limits,
    warehouses: limits.warehouses === undefined ? 0 : limits.warehouses,
    documentQueries: limits.documentQueries ?? 0,
    attendanceEmployees: limits.attendanceEmployees ?? 0,
    attendanceQrPoints: limits.attendanceQrPoints ?? 0,
  };
}

function normalizeCompanyUsage(
  company: PlatformCompanyUsage,
): PlatformCompanyUsage {
  return {
    ...company,
    usage: normalizePlanLimits(company.usage),
    limits: normalizePlanLimits(company.limits),
    baseLimits: normalizePlanLimits(company.baseLimits),
    additionalLimits: normalizePlanLimits(company.additionalLimits),
    effectiveLimits: normalizePlanLimits(company.effectiveLimits),
  };
}

function normalizeCompanyLimits(
  company: PlatformCompanyLimits,
): PlatformCompanyLimits {
  return {
    ...company,
    baseLimits: normalizePlanLimits(company.baseLimits),
    additionalLimits: normalizePlanLimits(company.additionalLimits),
    effectiveLimits: normalizePlanLimits(company.effectiveLimits),
  };
}

function buildPlatformCompaniesPath(
  path: string,
  query: PlatformCompaniesQuery,
) {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.plan) params.set("plan", query.plan);
  if (query.state) params.set("state", query.state);
  if (query.planStatus) params.set("planStatus", query.planStatus);

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildPlatformAuditPath(path: string, query: PlatformAuditQuery) {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.category) params.set("category", query.category);
  if (query.action) params.set("action", query.action);
  if (query.source) params.set("source", query.source);

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildPlatformUsersPath(path: string, query: PlatformAdminUsersQuery) {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildPlatformSubscriptionSalesPath(
  path: string,
  query: PlatformSubscriptionSalesQuery,
) {
  const params = new URLSearchParams();

  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.plan) params.set("plan", query.plan);
  if (query.method) params.set("method", query.method);
  if (query.status) params.set("status", query.status);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildAffiliatePath(path: string, query: PlatformAffiliateQuery) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.affiliateId) params.set("affiliateId", query.affiliateId);
  if (query.period) params.set("period", query.period);
  return params.size ? `${path}?${params}` : path;
}

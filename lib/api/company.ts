import { authFetch } from "@/lib/api/auth-fetch";

export type CompanyCatalogProfile =
  "ropa" | "calzado" | "ropa_calzado" | "otros";

export type Company = {
  id: string;
  nombreComercial: string;
  razonSocial: string | null;
  ruc: string | null;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  logoUrl: string | null;
  comoConocio: string | null;
  comoConocioOtro: string | null;
  estado: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateCompanyPayload = {
  nombreComercial?: string;
  razonSocial?: string;
  ruc?: string;
  dni?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  comoConocio?: string;
  comoConocioOtro?: string;
};

export type CreateCompanyPayload = {
  productMode: "pos" | "attendance" | "both";
  catalogProfile: CompanyCatalogProfile;
  nombreComercial: string;
  telefonoEmpresa: string;
  comoConocio: string;
  razonSocial?: string;
  ruc?: string;
  dni?: string;
  emailEmpresa?: string;
  direccion?: string;
};

export type CompanySetupStatus = {
  hasActiveBranch: boolean;
  requiresBranch: boolean;
};

export type CreateCompanyResponse = {
  accessToken?: string;
  token?: string;
  usuario?: {
    id: string;
    nombre?: string;
    apellido?: string | null;
    email?: string;
    roles?: string[];
  };
  empresa?: {
    id: string;
    nombreComercial?: string;
  };
};

export type SunatAmbiente = "BETA" | "PRODUCCION";

export type SunatCertificateInfo = {
  nombre: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
};

export type SunatConfig = {
  id?: string;
  empresaId?: string;
  ambiente: SunatAmbiente;
  igvPorcentaje: string;
  activo: boolean;
  usuarioSolConfigurado: boolean;
  claveSolConfigurada: boolean;
  clientIdConfigurado: boolean;
  clientSecretConfigurado: boolean;
  certificadoConfigurado: boolean;
  certificado: SunatCertificateInfo | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateSunatConfigPayload = {
  ambiente?: SunatAmbiente;
  usuarioSol?: string;
  claveSol?: string;
  clientId?: string;
  clientSecret?: string;
  igvPorcentaje?: string;
  activo?: boolean;
};

export const companyApi = {
  async getCompany() {
    return authFetch<Company>("/company");
  },

  async getSetupStatus() {
    return authFetch<CompanySetupStatus>("/company/setup-status");
  },

  async updateCompany(payload: UpdateCompanyPayload) {
    return authFetch<Company>("/company", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async uploadLogo(file: File) {
    const formData = new FormData();
    formData.append("logo", file);

    return authFetch<Company>("/company/logo", {
      method: "POST",
      body: formData,
    });
  },

  async getSunatConfig() {
    return authFetch<SunatConfig>("/company/sunat-config");
  },

  async updateSunatConfig(payload: UpdateSunatConfigPayload) {
    return authFetch<SunatConfig>("/company/sunat-config", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async uploadSunatCertificate(file: File, certificatePassword: string) {
    const formData = new FormData();
    formData.append("certificate", file);
    formData.append("certificatePassword", certificatePassword);

    return authFetch<SunatConfig>("/company/sunat-config/certificate", {
      method: "POST",
      body: formData,
    });
  },

  async deleteSunatCertificate() {
    return authFetch<SunatConfig>("/company/sunat-config/certificate", {
      method: "DELETE",
    });
  },

  createCompany(payload: CreateCompanyPayload, onboardingToken: string) {
    return authFetch<CreateCompanyResponse>("/auth/create-company", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${onboardingToken}`,
      },
      body: JSON.stringify(payload),
    });
  },
};

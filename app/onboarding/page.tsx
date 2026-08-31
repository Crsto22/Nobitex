"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BuildingsIcon,
  CheckCircleIcon,
  DatabaseIcon,
  MapPinIcon,
  PackageIcon,
  QrCodeIcon,
  StorefrontIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";

import { LoadingScreen } from "@/components/loading-screen";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { UbigeoSelect } from "@/components/ui/ubigeo-select";
import { branchesApi, type BranchType } from "@/lib/api/branches";
import { brandsApi } from "@/lib/api/brands";
import { categoriesApi } from "@/lib/api/categories";
import {
  plansApi,
  type AttendancePricing,
  type PlanDefinition,
} from "@/lib/api/plans";
import { useAuth } from "@/lib/auth/auth-provider";
import { getUserDisplayName } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/intl";
import { getProductModeFromModuleKeys } from "@/lib/navigation/product-mode";

type OnboardingStage =
  | "pos-plan"
  | "attendance-plan"
  | "branch"
  | "catalog"
  | "product";
type CatalogKind = "category" | "brand";

const initialBranch = {
  nombre: "",
  ubigeo: "",
  distrito: "",
  direccion: "",
};

const includedAttendanceEmployees = 5;
const includedAttendanceQrPoints = 1;

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const {
    user,
    companyInfo,
    currentPlan,
    setupStatus,
    isLoading,
    isSetupLoading,
    isAuthenticated,
    refreshSetupStatus,
    logout,
  } = useAuth();
  const [stage, setStage] = useState<OnboardingStage>("pos-plan");
  const [branchCreated, setBranchCreated] = useState(false);
  const [branch, setBranch] = useState(initialBranch);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchError, setBranchError] = useState("");
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [attendancePricing, setAttendancePricing] =
    useState<AttendancePricing | null>(null);
  const [requestedEmployees, setRequestedEmployees] = useState(0);
  const [requestedQrPoints, setRequestedQrPoints] = useState(0);
  const [catalogValues, setCatalogValues] = useState({
    category: "",
    brand: "",
  });
  const [catalogCreated, setCatalogCreated] = useState<
    Record<CatalogKind, string[]>
  >({
    category: [],
    brand: [],
  });
  const [savingCatalog, setSavingCatalog] = useState<CatalogKind | null>(null);

  const isOwner = user?.roles.includes("OWNER") ?? false;
  const isSuperAdmin = user?.roles.includes("SUPERADMIN") ?? false;
  const companyName =
    companyInfo?.nombreComercial ?? user?.empresaNombreComercial ?? "Mi empresa";
  const moduleKeys = [
    ...(user?.moduleKeys ?? []),
    ...(currentPlan?.effectiveModuleKeys ?? []),
  ];
  const productMode = getProductModeFromModuleKeys(moduleKeys);
  const flowKind = productMode.attendanceOnly
    ? "attendance"
    : productMode.both
      ? "both"
      : "pos";
  const stageFlow = getStageFlow(flowKind);
  const activeStage = stageFlow.includes(stage) ? stage : stageFlow[0];
  const currentStep = Math.max(stageFlow.indexOf(activeStage) + 1, 1);
  const branchType: BranchType = productMode.attendanceOnly
    ? "asistencia"
    : "tienda";
  const setupCompleted = productMode.attendanceOnly
    ? Boolean(setupStatus?.hasAnyActiveBranch || setupStatus?.hasActiveAttendanceBranch)
    : Boolean(setupStatus && !setupStatus.requiresBranch);
  const isExpired =
    currentPlan?.status === "expired" || user?.planStatus === "expired";

  useEffect(() => {
    let mounted = true;

    void Promise.all([plansApi.findAll(), plansApi.attendancePricing()])
      .then(([catalog, pricing]) => {
        if (!mounted) return;
        setPlans(catalog.filter(isPosPlan));
        setAttendancePricing(pricing);
      })
      .catch(() => {
        if (!mounted) return;
        showToast({
          title: "No se pudo cargar planes",
          description: "Podras continuar con la prueba y solicitar planes despues.",
          variant: "error",
        });
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (isLoading || isSetupLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isSuperAdmin) {
      router.replace("/superadmin");
      return;
    }
    if (isExpired) {
      router.replace(
        isOwner
          ? productMode.attendanceOnly
            ? "/asistencias/plan"
            : "/configuracion/plan"
          : "/configuracion/mi-cuenta",
      );
      return;
    }
    if (setupCompleted && !branchCreated) {
      router.replace(
        productMode.attendanceOnly ? "/asistencias/dashboard" : "/dashboard",
      );
    }
  }, [
    branchCreated,
    isAuthenticated,
    isExpired,
    isLoading,
    isOwner,
    isSetupLoading,
    isSuperAdmin,
    productMode.attendanceOnly,
    router,
    setupCompleted,
    activeStage,
  ]);

  if (isLoading || isSetupLoading || !isAuthenticated) {
    return <LoadingScreen />;
  }

  if (!setupStatus) {
    return (
      <CenteredState
        title="No pudimos verificar la configuracion"
        action="Reintentar"
        onAction={() => void refreshSetupStatus()}
      />
    );
  }

  if (!isOwner && setupStatus.requiresBranch) {
    return (
      <CenteredState
        title="La empresa aun no tiene una sucursal"
        description="El propietario debe completar la configuracion inicial para habilitar el sistema."
        icon={<UsersIcon size={28} weight="fill" />}
        action="Cerrar sesion"
        onAction={() => void logout()}
      />
    );
  }

  const goAfterPosPlan = () => {
    setStage(flowKind === "both" ? "attendance-plan" : "branch");
  };

  const goAfterAttendancePlan = () => {
    setStage("branch");
  };

  const createBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBranchError("");

    if (!branch.nombre.trim() || !branch.ubigeo || !branch.direccion.trim()) {
      setBranchError("Completa nombre, ubigeo y direccion.");
      return;
    }

    setIsSavingBranch(true);
    try {
      await branchesApi.create({
        ...branch,
        tipo: branchType,
        nombre: branch.nombre.trim(),
        direccion: branch.direccion.trim(),
        estado: "activo",
        esPrincipal: branchType === "tienda",
        modoCajaHabilitado: false,
      });
      setBranchCreated(true);
      await refreshSetupStatus();
      showToast({
        title: branchType === "asistencia" ? "Sede creada" : "Sucursal creada",
        description:
          branchType === "asistencia"
            ? "Ya puedes usar el dashboard de asistencias."
            : "Tu empresa ya tiene una sucursal principal.",
        variant: "success",
      });
      if (productMode.attendanceOnly) {
        router.replace("/asistencias/dashboard");
        return;
      }
      setStage("catalog");
    } catch (error) {
      setBranchError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la sucursal.",
      );
    } finally {
      setIsSavingBranch(false);
    }
  };

  const createCatalog = async (kind: CatalogKind) => {
    const name = catalogValues[kind].trim();
    if (!name) return;

    setSavingCatalog(kind);
    try {
      if (kind === "category") {
        await categoriesApi.create({ nombre: name, activo: true });
      } else {
        await brandsApi.create({ nombre: name, activo: true });
      }

      setCatalogCreated((current) => ({
        ...current,
        [kind]: [...current[kind], name],
      }));
      setCatalogValues((current) => ({ ...current, [kind]: "" }));
      showToast({
        title: "Registro creado",
        description: `${name} ya esta disponible en tu catalogo.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo crear",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setSavingCatalog(null);
    }
  };

  return (
    <main className="min-h-dvh overflow-y-auto bg-[var(--color-background)] px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Image
            src="/Logo/Nuvex.png"
            alt="Nuvex"
            width={142}
            height={44}
            className="h-10 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2">
            {stageFlow.map((item, index) => (
              <span
                key={item}
                className={`h-2.5 rounded-full transition-colors ${
                  activeStage === item
                    ? "w-8 bg-[var(--color-primary)]"
                    : index < currentStep - 1
                      ? "w-2.5 bg-[#18b981]"
                      : "w-2.5 bg-[var(--color-border)]"
                }`}
              />
            ))}
          </div>
        </header>

        <section className="mb-5 rounded-[8px] bg-[var(--color-card)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-circular-bold text-[var(--color-primary)]">
                Paso {currentStep} de {stageFlow.length}
              </p>
              <h1 className="mt-1 text-2xl font-circular-bold text-[var(--color-text)] sm:text-3xl text-fixed-2xl">
                Bienvenido, {getUserDisplayName(user)}
              </h1>
            </div>
            <div
              className="nuvex-mascot nuvex-mascot--happy shrink-0 self-center"
              aria-hidden="true"
            />
          </div>
        </section>

        {activeStage === "pos-plan" ? (
          <PosPlanStep
            plans={plans}
            companyName={companyName}
            onUseTrial={goAfterPosPlan}
          />
        ) : null}

        {activeStage === "attendance-plan" ? (
          <AttendancePlanStep
            companyName={companyName}
            pricing={attendancePricing}
            employees={requestedEmployees}
            qrPoints={requestedQrPoints}
            onEmployeesChange={setRequestedEmployees}
            onQrPointsChange={setRequestedQrPoints}
            onUseTrial={goAfterAttendancePlan}
          />
        ) : null}

        {activeStage === "branch" ? (
          <form
            onSubmit={createBranch}
            className="onboarding-step rounded-[8px] bg-[var(--color-card)] p-5 shadow-sm sm:p-6"
          >
            <SectionTitle
              icon={<BuildingsIcon size={22} weight="fill" />}
              title={
                branchType === "asistencia"
                  ? "Crea tu primera sede de asistencia"
                  : "Registra tu primera sucursal"
              }
              badge="Obligatorio"
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label={
                  branchType === "asistencia"
                    ? "Nombre de la sede"
                    : "Nombre de la sucursal"
                }
                value={branch.nombre}
                placeholder={
                  branchType === "asistencia"
                    ? "Sede principal"
                    : "Sucursal principal"
                }
                onChange={(value) =>
                  setBranch((current) => ({ ...current, nombre: value }))
                }
              />
              <div className="block">
                <span className="mb-2 block text-sm text-[var(--color-muted-foreground)]">
                  Tipo
                </span>
                <span className="flex h-11 w-full items-center rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)]">
                  {branchType === "asistencia" ? "Asistencia" : "Tienda POS"}
                </span>
              </div>
              <UbigeoSelect
                value={branch.ubigeo}
                onSelect={(item) =>
                  setBranch((current) => ({
                    ...current,
                    ubigeo: item.ubigeo,
                    distrito: item.distrito,
                  }))
                }
              />
              <Field
                label="Direccion"
                value={branch.direccion}
                placeholder="Av. Principal 123"
                onChange={(value) =>
                  setBranch((current) => ({ ...current, direccion: value }))
                }
                icon={<MapPinIcon size={16} />}
              />
            </div>
            {branchError ? (
              <p className="mt-4 text-sm text-[#dc2626]">{branchError}</p>
            ) : null}
            <div className="mt-6 flex justify-end">
              <PrimaryButton disabled={isSavingBranch}>
                {isSavingBranch ? "Creando..." : "Crear y continuar"}
              </PrimaryButton>
            </div>
          </form>
        ) : null}

        {activeStage === "catalog" ? (
          <section className="onboarding-step rounded-[8px] bg-[var(--color-card)] p-5 shadow-sm sm:p-6">
            <SectionTitle
              icon={<PackageIcon size={22} weight="fill" />}
              title="Prepara tu catalogo"
              badge="Opcional"
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <CatalogCard
                title="Categoria"
                icon={<TagIcon size={19} weight="fill" />}
                value={catalogValues.category}
                created={catalogCreated.category}
                saving={savingCatalog === "category"}
                onChange={(value) =>
                  setCatalogValues((current) => ({
                    ...current,
                    category: value,
                  }))
                }
                onCreate={() => void createCatalog("category")}
              />
              <CatalogCard
                title="Marca"
                icon={<PackageIcon size={19} weight="fill" />}
                value={catalogValues.brand}
                created={catalogCreated.brand}
                saving={savingCatalog === "brand"}
                onChange={(value) =>
                  setCatalogValues((current) => ({ ...current, brand: value }))
                }
                onCreate={() => void createCatalog("brand")}
              />
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setStage("product")}
                className="h-11 rounded-[14px] px-5 text-sm font-circular-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
              >
                Omitir por ahora
              </button>
              <PrimaryButton type="button" onClick={() => setStage("product")}>
                Continuar
              </PrimaryButton>
            </div>
          </section>
        ) : null}

        {activeStage === "product" ? (
          <section className="onboarding-step rounded-[8px] bg-[var(--color-card)] p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[8px] bg-[#e8f1ff] text-[#2563eb]">
              <PackageIcon size={28} weight="fill" />
            </div>
            <h2 className="mt-4 text-xl font-circular-bold text-[var(--color-text)]">
              Crea tu primer producto
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="h-11 rounded-[14px] px-5 text-sm font-circular-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
              >
                Ir al dashboard
              </button>
              <PrimaryButton
                type="button"
                onClick={() =>
                  router.push("/catalogo/productos/crear?onboarding=1")
                }
              >
                Crear mi primer producto
              </PrimaryButton>
            </div>
          </section>
        ) : null}
      </div>
      <style jsx>{`
        .onboarding-step {
          animation: onboarding-step-in 280ms ease-out;
        }

        @keyframes onboarding-step-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .onboarding-step {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

function PosPlanStep({
  plans,
  companyName,
  onUseTrial,
}: {
  plans: PlanDefinition[];
  companyName?: string | null;
  onUseTrial: () => void;
}) {
  return (
    <section className="onboarding-step rounded-[8px] bg-[var(--color-card)] p-5 shadow-sm sm:p-6">
      <SectionTitle
        icon={<StorefrontIcon size={22} weight="fill" />}
        title="Elige tu plan POS"
        badge="Primer paso"
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <PlanChoiceCard
          title="Prueba"
          description="Conoce todas las funciones de Nuvex durante 7 dias."
          price="S/ 0.00"
          current
          color="#2563eb"
          capabilities={[
            ["Tiendas", "1"],
            ["Almacenes", "5"],
            ["Usuarios", "1"],
            ["Productos", "50"],
            ["Comprobantes", "100 / prueba"],
            ["Consultas DNI/RUC", "20 / prueba"],
          ]}
          features={["Ventas POS", "Caja", "Catalogo, stock y Kardex"]}
          action={
            <PrimaryButton type="button" onClick={onUseTrial}>
              7 dias de prueba
            </PrimaryButton>
          }
        />
        {plans.slice(0, 4).map((plan, index) => (
          <PlanChoiceCard
            key={plan.code}
            title={plan.name}
            description={getPlanDescription(plan.code)}
            price={formatCurrency(plan.priceMonthly)}
            period="/ mes"
            popular={plan.code === "emprendedor"}
            color={["#14b8a6", "#10b981", "#f59e0b", "#8b5cf6"][index] ?? "#14b8a6"}
            capabilities={getPosCapabilities(plan)}
            features={getPosFeatures(plan)}
            action={
              <WhatsAppButton
                href={buildWhatsAppUrl([
                  "Hola, quiero solicitar un plan POS para Nuvex.",
                  `Empresa: ${companyName ?? "-"}`,
                  `Plan: ${plan.name}`,
                  `Precio mensual: ${formatCurrency(plan.priceMonthly)}`,
                ])}
              />
            }
          />
        ))}
      </div>
    </section>
  );
}

function AttendancePlanStep({
  companyName,
  pricing,
  employees,
  qrPoints,
  onEmployeesChange,
  onQrPointsChange,
  onUseTrial,
}: {
  companyName?: string | null;
  pricing: AttendancePricing | null;
  employees: number;
  qrPoints: number;
  onEmployeesChange: (value: number) => void;
  onQrPointsChange: (value: number) => void;
  onUseTrial: () => void;
}) {
  const employeePrice = Number(pricing?.employeeUnitPrice ?? 0);
  const qrPrice = Number(pricing?.qrPointUnitPrice ?? 0);
  const total = employees * employeePrice + qrPoints * qrPrice;

  return (
    <section className="onboarding-step rounded-[8px] bg-[var(--color-card)] p-5 shadow-sm sm:p-6">
      <SectionTitle
        icon={<QrCodeIcon size={22} weight="fill" />}
        title="Elige tu plan de asistencias"
        badge="Asistencias"
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <PlanChoiceCard
          title="Prueba"
          description="Controla tus primeras marcaciones sin costo inicial."
          price="S/ 0.00"
          current
          color="#14b8a6"
          capabilities={[
            ["Trabajadores", String(includedAttendanceEmployees)],
            ["Puntos QR", String(includedAttendanceQrPoints)],
            ["Consultas DNI/RUC", "20 / prueba"],
          ]}
          features={["Marcaje QR", "Dashboard de asistencia", "Reportes"]}
          action={
            <PrimaryButton type="button" onClick={onUseTrial}>
              7 dias de prueba
            </PrimaryButton>
          }
        />

        <div className="rounded-[8px] bg-[var(--color-input-bg)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-circular-bold text-[var(--color-text)]">
                Solicitar mayor capacidad
              </h3>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Puedes seguir con la prueba mientras atendemos tu solicitud.
              </p>
            </div>
            <span className="text-xl font-circular-bold text-[var(--color-primary)]">
              {formatCurrency(total)}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <QuantityInput
              label="Trabajadores"
              value={employees}
              onChange={onEmployeesChange}
            />
            <QuantityInput
              label="Puntos QR"
              value={qrPoints}
              onChange={onQrPointsChange}
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Las sedes incluidas seran iguales a los puntos QR solicitados.
            </p>
            <WhatsAppButton
              disabled={total <= 0}
              href={buildWhatsAppUrl([
                "Hola, quiero solicitar un plan de asistencias para Nuvex.",
                `Empresa: ${companyName ?? "-"}`,
                `Agregar trabajadores: ${employees}`,
                `Agregar puntos QR: ${qrPoints}`,
                `Sedes incluidas por puntos QR: ${qrPoints}`,
                `Total mensual estimado: ${formatCurrency(total)}`,
              ])}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuantityInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const update = (next: number) => onChange(Math.max(0, next));

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className="flex h-11 overflow-hidden rounded-[14px] bg-[var(--color-card)]">
        <button
          type="button"
          onClick={() => update(value - 1)}
          className="w-11 text-lg font-circular-bold text-[var(--color-primary)] hover:bg-[var(--color-button-hover)]"
        >
          -
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => update(Number(event.target.value))}
          className="min-w-0 flex-1 border-0 bg-transparent text-center text-sm font-circular-bold text-[var(--color-text)] outline-none"
        />
        <button
          type="button"
          onClick={() => update(value + 1)}
          className="w-11 text-lg font-circular-bold text-[var(--color-primary)] hover:bg-[var(--color-button-hover)]"
        >
          +
        </button>
      </span>
    </label>
  );
}

function PlanChoiceCard({
  title,
  description,
  price,
  period,
  current,
  popular,
  color = "#14b8a6",
  capabilities,
  features,
  action,
}: {
  title: string;
  description?: string;
  price: string;
  period?: string;
  current?: boolean;
  popular?: boolean;
  color?: string;
  capabilities: [string, string][];
  features: string[];
  action: ReactNode;
}) {
  return (
    <article
      className={`relative flex min-h-[560px] flex-col rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm ring-1 ${
        popular ? "ring-2 ring-[var(--color-primary)]" : "ring-[var(--color-border)]"
      }`}
    >
      {popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-1 text-[10px] font-circular-bold text-white">
          Mas popular
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid size-11 place-items-center rounded-[12px]"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <TagIcon size={20} weight="fill" />
        </span>
        {current ? (
          <span className="rounded-full bg-[#10b981]/10 px-3 py-1 text-[10px] font-circular-bold text-[#059669]">
            Plan actual
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-lg font-circular-bold text-[var(--color-text)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--color-muted-foreground)]">
          {description}
        </p>
      ) : null}
      <p className="mt-2 text-2xl font-circular-bold text-[var(--color-text)]">
        {price}
        {period ? (
          <span className="ml-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
            {period}
          </span>
        ) : null}
      </p>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="mb-3 text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
          CAPACIDAD INCLUIDA
        </p>
        <div className="space-y-2">
          {capabilities.map(([label, value]) => (
            <p key={label} className="flex items-center gap-2 text-[11px]">
              <DatabaseIcon
                size={14}
                weight="fill"
                className="text-[var(--color-muted-foreground)]"
              />
              <span className="min-w-0 flex-1 text-[var(--color-muted-foreground)]">
                {label}
              </span>
              <span className="font-circular-bold text-[var(--color-text)]">
                {value}
              </span>
            </p>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="mb-3 text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
          FUNCIONALIDADES
        </p>
        <div className="space-y-2">
          {features.map((item) => (
            <p key={item} className="flex items-start gap-2 text-[11px] leading-4 text-[var(--color-text)]">
            <CheckCircleIcon
              size={14}
              weight="fill"
              className="mt-px shrink-0 text-[#10b981]"
            />
            {item}
          </p>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-5">{action}</div>
    </article>
  );
}

function WhatsAppButton({
  href,
  disabled,
}: {
  href: string;
  disabled?: boolean;
}) {
  return (
    <a
      href={disabled ? undefined : href}
      target="_blank"
      rel="noreferrer"
      aria-disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-circular-bold text-white ${
        disabled
          ? "pointer-events-none bg-[#94a3b8]"
          : "bg-[#16a34a] hover:bg-[#15803d]"
      }`}
    >
      <Image
        src="/svg/redes-sociales/whatsapp.svg"
        alt=""
        width={18}
        height={18}
        className="h-4 w-4"
      />
      Solicitar por WhatsApp
    </a>
  );
}

function SectionTitle({
  icon,
  title,
  badge,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#e8f1ff] text-[#2563eb]">
        {icon}
      </span>
      <h2 className="text-lg font-circular-bold text-[var(--color-text)]">
        {title}
      </h2>
      <span className="rounded-full bg-[var(--color-input-bg)] px-3 py-1 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
        {badge}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  icon,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon?: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <span className="relative block">
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">
            {icon}
          </span>
        ) : null}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-[16px] border-0 bg-[var(--color-input-bg)] pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 ${icon ? "pl-10" : "pl-4"}`}
        />
      </span>
    </label>
  );
}

function CatalogCard({
  title,
  icon,
  value,
  created,
  saving,
  extra,
  onChange,
  onCreate,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  created: string[];
  saving: boolean;
  extra?: ReactNode;
  onChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-[8px] bg-[var(--color-input-bg)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-circular-bold text-[var(--color-text)]">
        <span className="text-[var(--color-primary)]">{icon}</span>
        {title}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCreate();
            }
          }}
          placeholder={`Nombre de ${title.toLowerCase()}`}
          className="h-10 min-w-0 flex-1 rounded-[12px] border-0 bg-[var(--color-card)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        {extra}
        <button
          type="button"
          disabled={!value.trim() || saving}
          onClick={onCreate}
          className="h-10 rounded-[12px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white disabled:opacity-40"
        >
          {saving ? "..." : "Agregar"}
        </button>
      </div>
      {created.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {created.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-[#ddf8ee] px-2.5 py-1 text-xs font-circular-bold text-[#087f5b]"
            >
              <CheckCircleIcon size={13} weight="fill" /> {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-11 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function CenteredState({
  title,
  description,
  icon,
  action,
  onAction,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action: string;
  onAction: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md rounded-[8px] bg-[var(--color-card)] p-7 text-center shadow-sm">
        {icon ? (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[8px] bg-[#fff4e6] text-[#f59f00]">
            {icon}
          </div>
        ) : null}
        <h1 className="text-xl font-circular-bold text-[var(--color-text)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            {description}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-11 rounded-[14px] bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white"
        >
          {action}
        </button>
      </div>
    </main>
  );
}

function getStageFlow(kind: "pos" | "attendance" | "both"): OnboardingStage[] {
  if (kind === "attendance") return ["attendance-plan", "branch"];
  if (kind === "both") {
    return ["pos-plan", "attendance-plan", "branch", "catalog", "product"];
  }
  return ["pos-plan", "branch", "catalog", "product"];
}

function isPosPlan(plan: PlanDefinition) {
  return ![
    "prueba",
    "asistencias_basico",
    "asistencias_pro",
    "completo_emprende",
    "completo_empresa",
  ].includes(plan.code);
}

function getPosCapabilities(plan: PlanDefinition): [string, string][] {
  return [
    ["Tiendas", formatPlanLimit(plan.limits.branches)],
    ["Almacenes", formatPlanLimit(plan.limits.warehouses)],
    ["Usuarios", formatPlanLimit(plan.limits.users)],
    ["Productos", formatPlanLimit(plan.limits.products)],
    ["Comprobantes", `${formatPlanLimit(plan.limits.documents)} / mes`],
    ["Consultas DNI/RUC", `${formatPlanLimit(plan.limits.documentQueries)} / mes`],
    ["Imagenes de productos", formatBytes(plan.limits.storageBytes)],
  ];
}

function getPosFeatures(plan: PlanDefinition): string[] {
  const features = [
    ["Facturacion electronica", "comprobantes"],
    ["Ventas POS", "ventas-pos"],
    ["Caja", "caja"],
    ["Cotizaciones y clientes", "cotizaciones"],
    ["Catalogo, stock y Kardex", "stock-kardex"],
    ["Administracion de usuarios", "usuarios"],
    ["Reportes de ventas y productos", "reportes-ventas"],
  ] as const;

  const included = features
    .filter(([, moduleKey]) => plan.moduleKeys.includes(moduleKey))
    .map(([label]) => label);

  return [
    ...included,
    plan.code === "empresarial" ? "Soporte prioritario" : "Soporte estandar",
  ];
}

function getPlanDescription(code: PlanDefinition["code"]) {
  return {
    basico: "Para una tienda que empieza a ordenar sus ventas e inventario.",
    emprendedor: "Para negocios en crecimiento con equipo y mas capacidad.",
    crecimiento: "Para operaciones consolidadas que necesitan control total.",
    empresarial: "Para empresas con alto volumen y multiples tiendas.",
    pos_basico: "Para una tienda que empieza a vender con POS.",
    prueba: "Conoce Nuvex antes de elegir un plan.",
    asistencias_basico: "Plan anterior de asistencias.",
    asistencias_pro: "Plan anterior de asistencias.",
    completo_emprende: "Plan anterior combinado.",
    completo_empresa: "Plan anterior combinado.",
  }[code];
}

function formatPlanLimit(value: number | null) {
  if (value === null || value < 0) return "Ilimitado";
  return value.toLocaleString("es-PE");
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function buildWhatsAppUrl(lines: string[]) {
  const phone = (process.env.NEXT_PUBLIC_NUVEX_WHATSAPP ?? "").replace(
    /\D/g,
    "",
  );
  const text = encodeURIComponent(lines.filter(Boolean).join("\n"));
  return phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}

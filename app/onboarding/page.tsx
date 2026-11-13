"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  BuildingsIcon,
  CheckCircleIcon,
  HouseIcon,
  MapPinIcon,
  PackageIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";

import { LoadingScreen } from "@/components/loading-screen";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { UbigeoSelect } from "@/components/ui/ubigeo-select";
import { branchesApi, type BranchType } from "@/lib/api/branches";
import { brandsApi } from "@/lib/api/brands";
import { categoriesApi } from "@/lib/api/categories";
import { useAuth } from "@/lib/auth/auth-provider";
import { getUserDisplayName } from "@/lib/auth/session";
import { getProductModeFromModuleKeys } from "@/lib/navigation/product-mode";

type OnboardingStage = "branch" | "catalog" | "product";
type CatalogKind = "category" | "brand";

const initialBranch = {
  nombre: "",
  ubigeo: "",
  distrito: "",
  direccion: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useSystemToast();
  const {
    user,
    currentPlan,
    setupStatus,
    isLoading,
    isSetupLoading,
    isAuthenticated,
    refreshSetupStatus,
    logout,
  } = useAuth();
  const [stage, setStage] = useState<OnboardingStage>("branch");
  const [branchCreated, setBranchCreated] = useState(false);
  const [branch, setBranch] = useState(initialBranch);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchError, setBranchError] = useState("");
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
      await refreshSetupStatus({ force: true });
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
    <main className="min-h-dvh bg-[var(--color-sidebar-bg)]">
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(380px,480px)]">
        <section className="flex min-h-dvh flex-col bg-[var(--color-sidebar-bg)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 flex w-full items-center justify-between gap-4">
            <div className="lg:hidden">
              <Image
                src="/Logo/logopng.webp"
                alt="Nuvex"
                width={96}
                height={22}
                className="h-auto w-24"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
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
            <Link
              href="https://nuvex.pe"
              target="_blank"
              rel="noreferrer"
              aria-label="Ir a nuvex.pe"
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              <HouseIcon size={20} weight="bold" />
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
            <section className="mb-1 rounded-2xl p-5 sm:p-6">
              <div>
                <p className="text-xs font-circular-regular text-[var(--color-primary)]">
                  Paso {currentStep} de {stageFlow.length}
                </p>
                <h1 className="mt-1 text-2xl font-medium text-[var(--color-text)] text-fixed-xl">
                  Bienvenido, {getUserDisplayName(user)}
                </h1>
              </div>
            </section>

            {activeStage === "branch" ? (
          <form
            onSubmit={createBranch}
            className="onboarding-step rounded-2xl p-5 sm:p-6"
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
              <div className="sm:col-span-2">
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
          <section className="onboarding-step rounded-2xl p-5 sm:p-6">
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
                className="h-11 rounded-2xl px-5 text-sm font-circular-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
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
          <section className="onboarding-step rounded-2xl p-6 text-center sm:p-10">
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
                className="h-11 rounded-2xl px-5 text-sm font-circular-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
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
        </section>

        <aside className="login-dots-bg relative hidden min-h-dvh flex-col overflow-hidden bg-[#f6f2f1] px-8 py-10 lg:sticky lg:top-0 lg:flex xl:px-10">
          <div className="flex w-full shrink-0 items-center justify-start">
            <Image
              src="/Logo/nuvex_logo.svg"
              alt="Nuvex"
              width={160}
              height={54}
              className="h-auto w-[160px]"
              priority
            />
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Image
              src="/img/onboarding.webp"
              alt="Onboarding"
              width={520}
              height={520}
              className="h-auto w-full max-w-[420px] object-contain"
              priority
            />
          </div>
        </aside>
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
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        {icon}
      </span>
      <h2 className="text-lg font-medium text-[var(--color-text)]">
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
          className={`h-11 w-full rounded-2xl border-0 bg-white pr-4 text-sm text-[var(--color-primary)] ring-1 ring-[var(--color-sidebar-action-bg)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 ${icon ? "pl-10" : "pl-4"}`}
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
    <div className="rounded-2xl p-4">
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
          className="h-10 min-w-0 flex-1 rounded-2xl border-0 bg-white px-3 text-sm text-[var(--color-primary)] ring-1 ring-[var(--color-sidebar-action-bg)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
        {extra}
        <button
          type="button"
          disabled={!value.trim() || saving}
          onClick={onCreate}
          className="h-10 rounded-2xl bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white disabled:opacity-40"
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
      className="h-11 rounded-2xl bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-sidebar-bg)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center ring-1 ring-[var(--color-sidebar-action-bg)]">
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
          className="mt-5 h-11 rounded-2xl bg-[var(--color-primary)] px-6 text-sm font-circular-bold text-white"
        >
          {action}
        </button>
      </div>
    </main>
  );
}

function getStageFlow(kind: "pos" | "attendance" | "both"): OnboardingStage[] {
  if (kind === "attendance") return ["branch"];
  return ["branch", "catalog", "product"];
}


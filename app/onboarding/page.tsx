"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BuildingsIcon,
  CheckCircleIcon,
  MapPinIcon,
  PackageIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";

import { LoadingScreen } from "@/components/loading-screen";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { branchesApi } from "@/lib/api/branches";
import { brandsApi } from "@/lib/api/brands";
import { categoriesApi } from "@/lib/api/categories";
import { useAuth } from "@/lib/auth/auth-provider";
import { getUserDisplayName } from "@/lib/auth/session";
import { UbigeoSelect } from "@/components/ui/ubigeo-select";

type Step = 1 | 2 | 3;
type CatalogKind = "category" | "brand";

const initialBranch = {
  nombre: "",
  tipo: "tienda" as const,
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
  const [step, setStep] = useState<Step>(1);
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
  const moduleKeys = user?.moduleKeys ?? currentPlan?.effectiveModuleKeys ?? [];
  const hasAttendanceModules = moduleKeys.some((key) =>
    key.startsWith("asistencias-"),
  );
  const hasPosModules = moduleKeys.some((key) =>
    ["dashboard", "ventas-pos", "productos", "caja"].includes(key),
  );
  const attendanceOnly = hasAttendanceModules && !hasPosModules;
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
        isOwner ? "/configuracion/plan" : "/configuracion/mi-cuenta",
      );
      return;
    }
    if (attendanceOnly) {
      router.replace("/asistencias/configuracion");
      return;
    }
    if (setupStatus && !setupStatus.requiresBranch && !branchCreated) {
      router.replace("/dashboard");
    }
  }, [
    attendanceOnly,
    branchCreated,
    isAuthenticated,
    isExpired,
    isLoading,
    isOwner,
    isSetupLoading,
    isSuperAdmin,
    router,
    setupStatus,
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
        nombre: branch.nombre.trim(),
        direccion: branch.direccion.trim(),
        estado: "activo",
        esPrincipal: true,
      });
      setBranchCreated(true);
      setStep(2);
      await refreshSetupStatus();
      showToast({
        title: "Sucursal creada",
        description: "Tu empresa ya tiene una sucursal principal.",
        variant: "success",
      });
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
            {[1, 2, 3].map((item) => (
              <span
                key={item}
                className={`h-2.5 rounded-full transition-colors ${
                  step === item
                    ? "w-8 bg-[var(--color-primary)]"
                    : item < step
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
                Paso {step} de 3
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

        {step === 1 ? (
          <form
            onSubmit={createBranch}
            className="onboarding-step rounded-[8px] bg-[var(--color-card)] p-5 shadow-sm sm:p-6"
          >
            <SectionTitle
              icon={<BuildingsIcon size={22} weight="fill" />}
              title="Registra tu primera sucursal"
              badge="Obligatorio"
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre de la sucursal"
                value={branch.nombre}
                placeholder="Sucursal principal"
                onChange={(value) =>
                  setBranch((current) => ({ ...current, nombre: value }))
                }
              />
              <div className="block">
                <span className="mb-2 block text-sm text-[var(--color-muted-foreground)]">
                  Tipo de sucursal
                </span>
                <span className="flex h-11 w-full items-center rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)]">
                  Tienda
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
                {isSavingBranch ? "Creando sucursal..." : "Crear y continuar"}
              </PrimaryButton>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
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
                onClick={() => setStep(3)}
                className="h-11 rounded-[14px] px-5 text-sm font-circular-bold text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]"
              >
                Omitir por ahora
              </button>
              <PrimaryButton type="button" onClick={() => setStep(3)}>
                Continuar
              </PrimaryButton>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
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

"use client";

import type { FormEvent, HTMLInputTypeAttribute, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  CaretDownIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  IdentificationCardIcon,
  KeyIcon,
  PackageIcon,
  SneakerIcon,
  ShoppingCartSimpleIcon,
  TShirtIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";

import { useSystemToast } from "@/components/SystemToast/system-toast";
import { TurnstileWidget } from "@/components/Turnstile/turnstile-widget";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { companyApi, type CompanyCatalogProfile } from "@/lib/api/company";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  ONBOARDING_TOKEN_STORAGE_KEY,
  ONBOARDING_USER_STORAGE_KEY,
} from "@/lib/auth/session";

const steps = ["Cuenta", "Verifica", "Empresa"];

const passwordRequirements = [
  {
    label: "Minimo 8 caracteres",
    test: (password: string) => password.length >= 8,
  },
  {
    label: "Una letra mayuscula",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: "Una letra minuscula",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: "Un numero",
    test: (password: string) => /\d/.test(password),
  },
];

const discoveryOptions = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["google", "Google"],
  ["whatsapp", "WhatsApp"],
  ["recomendacion", "Recomendacion"],
  ["otro", "Otro"],
] as const;

const catalogProfileOptions = [
  {
    value: "ropa",
    label: "Ropa",
    description: "Tallas XS a XXL",
    icon: TShirtIcon,
  },
  {
    value: "calzado",
    label: "Calzado",
    description: "Tallas 24 a 48",
    icon: SneakerIcon,
  },
  {
    value: "ropa_calzado",
    label: "Ropa y calzado",
    description: "Ambos catálogos",
    icon: ShoppingCartSimpleIcon,
  },
  {
    value: "otros",
    label: "Otros",
    description: "Configúralo después",
    icon: PackageIcon,
  },
] as const;

const activationItems = [
  "Registrando empresa",
  "Creando tu catalogo de productos",
  "Configurando tu interfaz",
  "Activando modulo de ventas",
  "Preparando acceso",
];

const activationIntervalMs = 220;

type AccountFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
};

type CompanyFormData = {
  catalogProfile: CompanyCatalogProfile | "";
  nombreComercial: string;
  noCuentaConRuc: boolean;
  razonSocial: string;
  ruc: string;
  dni: string;
  telefonoEmpresa: string;
  emailEmpresa: string;
  direccion: string;
  comoConocio: string;
};

export function RegisterPage() {
  const router = useRouter();
  const { completeAuth } = useAuth();
  const { showToast } = useSystemToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [activationProgress, setActivationProgress] = useState(0);
  const [passwordError, setPasswordError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const onboardingTokenRef = useRef("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    confirmPassword: false,
  });
  const [focusedPasswordField, setFocusedPasswordField] = useState<
    "password" | "confirmPassword" | null
  >(null);
  const [accountData, setAccountData] = useState<AccountFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
  });
  const [companyData, setCompanyData] = useState<CompanyFormData>({
    catalogProfile: "",
    nombreComercial: "",
    noCuentaConRuc: false,
    razonSocial: "",
    ruc: "",
    dni: "",
    telefonoEmpresa: "",
    emailEmpresa: "",
    direccion: "",
    comoConocio: "instagram",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const isActivating = isComplete;
  const isCompanyStep = currentStep === 2 && !isComplete;
  const isPasswordValid = passwordRequirements.every((requirement) =>
    requirement.test(accountData.password),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const token = window.sessionStorage.getItem(ONBOARDING_TOKEN_STORAGE_KEY);
      const rawUser = window.sessionStorage.getItem(
        ONBOARDING_USER_STORAGE_KEY,
      );
      if (!token || !rawUser) {
        return;
      }

      try {
        const user = JSON.parse(rawUser) as {
          nombre?: string;
          apellido?: string | null;
          email?: string;
        };
        onboardingTokenRef.current = token;
        setAccountData((current) => ({
          ...current,
          firstName: user.nombre ?? "",
          lastName: user.apellido ?? "",
          email: user.email ?? "",
        }));
        setCurrentStep(2);
      } catch {
        window.sessionStorage.removeItem(ONBOARDING_USER_STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const togglePasswordVisibility = (name: keyof typeof visiblePasswords) => {
    setVisiblePasswords((currentValue) => ({
      ...currentValue,
      [name]: !currentValue[name],
    }));
  };

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    let progress = 0;
    const intervalId = window.setInterval(() => {
      progress = Math.min(progress + 1, 100);
      setActivationProgress(progress);
      if (progress >= 100) {
        window.clearInterval(intervalId);
      }
    }, activationIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [isComplete]);

  useEffect(() => {
    if (activationProgress < 100) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.push("/onboarding");
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [activationProgress, router]);

  const updateAccountValue = (name: keyof AccountFormData, value: string) => {
    setAccountData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
    if (name === "password" || name === "confirmPassword") {
      setPasswordError("");
    }
  };

  const updateCompanyValue = (
    name: keyof CompanyFormData,
    value: string | boolean,
  ) => {
    setCompanyData((currentData) => {
      if (name === "noCuentaConRuc" && value === true) {
        return {
          ...currentData,
          noCuentaConRuc: true,
          razonSocial: "",
          ruc: "",
        };
      }

      if (name === "noCuentaConRuc" && value === false) {
        return {
          ...currentData,
          noCuentaConRuc: false,
          dni: "",
        };
      }

      return {
        ...currentData,
        [name]: value,
      };
    });
  };

  const handleNext = async () => {
    if (!formRef.current?.reportValidity()) {
      return;
    }

    if (currentStep === 0 && !isPasswordValid) {
      setPasswordError(
        "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula y un numero.",
      );
      return;
    }

    if (currentStep === 0 && !turnstileToken) {
      showToast({
        title: "Verificacion requerida",
        description: "Completa la verificacion de seguridad para continuar.",
        variant: "warning",
      });
      return;
    }

    if (
      currentStep === 0 &&
      accountData.password !== accountData.confirmPassword
    ) {
      setPasswordError("Las contrasenas no coinciden.");
      return;
    }

    setPasswordError("");
    setIsSubmitting(true);

    try {
      if (currentStep === 0) {
        await authApi.register({
          turnstileToken,
          nombre: accountData.firstName,
          apellido: accountData.lastName,
          email: accountData.email,
          password: accountData.password,
          confirmarPassword: accountData.confirmPassword,
        });
        setTurnstileToken("");
        showToast({
          title: "Codigo enviado",
          description: "Revisa tu correo para continuar con la verificacion.",
          variant: "success",
        });
      }

      if (currentStep === 1) {
        const response = await authApi.verifyEmail({
          email: accountData.email,
          codigo: accountData.verificationCode,
        });

        window.sessionStorage.setItem(
          ONBOARDING_TOKEN_STORAGE_KEY,
          response.onboardingToken,
        );
        onboardingTokenRef.current = response.onboardingToken;
        showToast({
          title: "Correo verificado",
          description: "Ahora completa los datos de tu empresa.",
          variant: "success",
        });
      }

      setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    } catch (error) {
      if (currentStep === 0) setTurnstileResetKey((value) => value + 1);
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar la solicitud.";
      showToast({
        title: "No se pudo continuar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const catalogProfile = companyData.catalogProfile;
    if (!catalogProfile) {
      showToast({
        title: "Selecciona qué productos venderás",
        description: "Elige ropa, calzado, ambos u otros.",
        variant: "warning",
      });
      return;
    }

    if (!formRef.current?.reportValidity()) {
      return;
    }

    const token =
      onboardingTokenRef.current ||
      window.sessionStorage.getItem(ONBOARDING_TOKEN_STORAGE_KEY) ||
      "";

    if (!token) {
      const message =
        "No encontramos el token de verificacion. Verifica tu correo nuevamente.";
      showToast({
        title: "Verificacion requerida",
        description: message,
        variant: "warning",
      });
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await companyApi.createCompany(
        {
          catalogProfile,
          nombreComercial: companyData.nombreComercial,
          telefonoEmpresa: companyData.telefonoEmpresa,
          comoConocio: companyData.comoConocio,
          razonSocial: companyData.noCuentaConRuc
            ? undefined
            : companyData.razonSocial || undefined,
          ruc: companyData.noCuentaConRuc
            ? undefined
            : companyData.ruc || undefined,
          dni: companyData.noCuentaConRuc
            ? companyData.dni || undefined
            : undefined,
          emailEmpresa: companyData.emailEmpresa || undefined,
          direccion: companyData.direccion || undefined,
        },
        token,
      );
      completeAuth(response);
      window.sessionStorage.removeItem(ONBOARDING_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(ONBOARDING_USER_STORAGE_KEY);
      setActivationProgress(0);
      setIsComplete(true);
      showToast({
        title: "Empresa registrada",
        description: "Estamos activando tu entorno de ventas.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la empresa.";
      showToast({
        title: "No se pudo crear la empresa",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh overflow-y-auto bg-[#f3f5fb]">
      <section
        className={`login-form-motion relative grid min-h-dvh overflow-hidden bg-white transition-[grid-template-columns] duration-500 ease-out ${
          isCompanyStep || isActivating
            ? "lg:grid-cols-[0_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_minmax(620px,720px)]"
        }`}
      >
        <div
          className={`relative z-10 hidden min-h-dvh items-center justify-center overflow-hidden bg-[#f3f5fb] px-8 py-10 transition-colors duration-500 ease-out lg:flex xl:px-12 ${
            isCompanyStep || isActivating
              ? "pointer-events-none -translate-x-full opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          <Image
            src="/Logo/nuvex_logo.svg"
            alt="Nuvex"
            width={330}
            height={110}
            className="h-auto w-[330px] max-w-[330px]"
            priority
          />
        </div>

        <div
          className={`relative z-10 flex min-h-dvh flex-col overflow-hidden px-5 py-6 transition-colors duration-500 ease-out sm:px-8 lg:max-h-dvh lg:py-7 ${
            isActivating
              ? "lg:px-10 xl:px-10"
              : isCompanyStep
                ? "lg:px-12 xl:px-16"
                : "lg:px-14 xl:px-20"
          }`}
        >
          <div className="mb-4 flex w-full justify-start lg:hidden">
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
          <div
            className={`register-form-scroll flex max-h-[calc(100dvh-6rem)] w-full flex-col overflow-y-auto pr-2 transition-[max-width] duration-500 ease-out lg:max-h-[calc(100dvh-3rem)] ${
              isActivating
                ? "m-auto max-w-[560px]"
                : isCompanyStep
                  ? "mx-auto max-w-7xl"
                  : "m-auto max-w-[560px]"
            }`}
          >
            {isComplete ? (
              <ActivationScreen progress={activationProgress} />
            ) : (
              <>
                <form
                  ref={formRef}
                  className="space-y-4 xl:space-y-5"
                  onSubmit={handleSubmit}
                >
                  <div>
                    <h1 className="mt-3 text-3xl font-black text-[var(--color-primary)] sm:text-4xl text-fixed-3xl">
                      Crea tu cuenta
                    </h1>
                    <p className="mt-2 max-w-[480px] text-sm font-circular-regular leading-6 text-[#525b75]">
                      Completa tus datos para registrar tu acceso en Nuvex.
                    </p>
                    <StepProgress currentStep={currentStep} steps={steps} />
                  </div>

                  <div
                    key={currentStep}
                    className="login-form-motion space-y-4 xl:space-y-5"
                  >
                    {currentStep === 0 && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <RegisterInput
                            id="first-name"
                            label="Nombre"
                            name="firstName"
                            value={accountData.firstName}
                            onValueChange={(value) =>
                              updateAccountValue("firstName", value)
                            }
                            placeholder="Alex"
                            autoComplete="given-name"
                            icon={<UserIcon size={24} weight="fill" />}
                          />
                          <RegisterInput
                            id="last-name"
                            label="Apellido"
                            name="lastName"
                            value={accountData.lastName}
                            onValueChange={(value) =>
                              updateAccountValue("lastName", value)
                            }
                            placeholder="Gomez"
                            autoComplete="family-name"
                            icon={
                              <IdentificationCardIcon size={24} weight="fill" />
                            }
                          />
                        </div>

                        <RegisterInput
                          id="email"
                          label="Correo electronico"
                          name="email"
                          value={accountData.email}
                          onValueChange={(value) =>
                            updateAccountValue("email", value)
                          }
                          type="email"
                          placeholder="alex@email.com"
                          autoComplete="email"
                          icon={<EnvelopeSimpleIcon size={24} weight="fill" />}
                        />
                        <RegisterInput
                          id="password"
                          label="Contrasena"
                          name="password"
                          value={accountData.password}
                          onValueChange={(value) =>
                            updateAccountValue("password", value)
                          }
                          type={visiblePasswords.password ? "text" : "password"}
                          placeholder="Ingresa tu contrasena"
                          autoComplete="new-password"
                          endAdornment={
                            <PasswordAdornment
                              isVisible={visiblePasswords.password}
                              showToggle={
                                focusedPasswordField === "password" ||
                                accountData.password.length > 0
                              }
                              onClick={() =>
                                togglePasswordVisibility("password")
                              }
                            />
                          }
                          onBlur={() => setFocusedPasswordField(null)}
                          onFocus={() => setFocusedPasswordField("password")}
                        />
                        <RegisterInput
                          id="confirm-password"
                          label="Confirmar contrasena"
                          name="confirmPassword"
                          value={accountData.confirmPassword}
                          onValueChange={(value) =>
                            updateAccountValue("confirmPassword", value)
                          }
                          type={
                            visiblePasswords.confirmPassword
                              ? "text"
                              : "password"
                          }
                          placeholder="Confirma tu contrasena"
                          autoComplete="new-password"
                          endAdornment={
                            <PasswordAdornment
                              isVisible={visiblePasswords.confirmPassword}
                              showToggle={
                                focusedPasswordField === "confirmPassword" ||
                                accountData.confirmPassword.length > 0
                              }
                              onClick={() =>
                                togglePasswordVisibility("confirmPassword")
                              }
                            />
                          }
                          onBlur={() => setFocusedPasswordField(null)}
                          onFocus={() =>
                            setFocusedPasswordField("confirmPassword")
                          }
                        />

                        <PasswordRules password={accountData.password} />

                        {passwordError && (
                          <p className="text-sm font-circular-regular text-[#d9480f]">
                            {passwordError}
                          </p>
                        )}

                        <TurnstileWidget
                          action="register"
                          onTokenChange={setTurnstileToken}
                          resetKey={turnstileResetKey}
                        />
                      </>
                    )}

                    {currentStep === 1 && (
                      <div className="rounded-2xl bg-[#f1f4f9] px-5 py-6 ring-1 ring-[#edf1f6]">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center text-[var(--color-secondary)]">
                          <EnvelopeSimpleIcon size={38} weight="fill" />
                        </div>
                        <h2 className="mt-4 text-center text-2xl font-black text-[var(--color-primary)] text-fixed-2xl">
                          Verifica tu email
                        </h2>
                        <p className="mx-auto mt-2 max-w-[360px] text-center text-sm font-circular-regular leading-6 text-[#525b75]">
                          Ingresa el codigo de 6 digitos que enviamos a tu
                          correo
                        </p>
                        <input
                          id="verification-code"
                          name="verificationCode"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={accountData.verificationCode}
                          onChange={(event) =>
                            updateAccountValue(
                              "verificationCode",
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="000000"
                          aria-label="000000"
                          required
                          className="font-heading mt-5 h-12 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-center text-lg font-black tracking-[0.35em] text-[var(--color-primary)] outline-none transition placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                        />
                        <p className="mt-3 text-center text-xs font-circular-regular text-[#7b849b]">
                          Enviado a {accountData.email}
                        </p>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <CompanyStep
                        companyData={companyData}
                        updateCompanyValue={updateCompanyValue}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    {currentStep > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => setCurrentStep((step) => step - 1)}
                        className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                      >
                        Atras
                      </Button>
                    )}

                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        disabled={
                          isSubmitting || (currentStep === 0 && !turnstileToken)
                        }
                        onClick={handleNext}
                        className="h-11 flex-1 rounded-[14px] bg-[#ff7417] text-sm font-black text-white shadow-[0_8px_18px_rgba(255,116,23,0.3)] hover:bg-[#f2670a]"
                      >
                        {getActionLabel(currentStep, isSubmitting)}
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting || !companyData.catalogProfile}
                        className="h-11 flex-1 rounded-[14px] bg-[#ff7417] text-sm font-black text-white shadow-[0_8px_18px_rgba(255,116,23,0.3)] hover:bg-[#f2670a]"
                      >
                        {isSubmitting
                          ? "Creando empresa..."
                          : "Crear tu cuenta gratis 7 dias"}
                      </Button>
                    )}
                  </div>

                  <div className="pt-1 text-center text-xs font-circular-regula text-[#7b849b]">
                    {isComplete ? "Volver a " : "Ya tienes una cuenta, "}
                    <Link
                      href="/login"
                      className="text-[var(--color-secondary)] underline-offset-4 hover:underline"
                    >
                      Iniciar sesion
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function getActionLabel(currentStep: number, isSubmitting: boolean) {
  if (!isSubmitting) {
    return "Continuar";
  }

  return currentStep === 0 ? "Enviando..." : "Verificando...";
}

function ActivationScreen({ progress }: { progress: number }) {
  const isReady = progress >= 100;
  const completedItems = Math.floor((progress / 100) * activationItems.length);
  const activeIndex = Math.min(completedItems, activationItems.length - 1);

  return (
    <div className="login-form-motion flex min-h-[calc(100dvh-3rem)] flex-col justify-center py-8">
      <div className="mx-auto w-full max-w-[420px] text-center">
        <h2 className="text-2xl font-black text-[var(--color-primary)] text-fixed-2xl">
          {isReady ? "Tu tienda esta lista!" : "Activando ventas"}
        </h2>
        {!isReady && (
          <p className="mt-2 text-sm font-circular-regular text-[#525b75]">
            Conectando modulos de inventario...
          </p>
        )}

        <div className="mt-8">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-input-bg)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs font-black text-[var(--color-primary)]">
            {progress}%
          </p>
        </div>

        <div className="mt-8 space-y-4 text-left">
          {activationItems.map((item, index) => {
            const isDone = progress >= 100 || index < completedItems;
            const isActive = !isReady && index === activeIndex;

            return (
              <div
                key={item}
                className="flex items-center gap-3 text-sm font-circular-regular text-[var(--color-text)]"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-input-bg)] text-[var(--color-primary)]"
                  }`}
                >
                  {isDone ? (
                    <CheckCircleIcon size={18} weight="fill" />
                  ) : isActive ? (
                    <span className="flex gap-0.5">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--color-primary)]" />
                      <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--color-primary)] [animation-delay:120ms]" />
                      <span className="h-1 w-1 animate-pulse rounded-full bg-[var(--color-primary)] [animation-delay:240ms]" />
                    </span>
                  ) : null}
                </span>
                <span>{item}</span>
              </div>
            );
          })}
        </div>

        {isReady && (
          <div className="mt-8">
            <p className="text-sm font-circular-regular text-[#525b75]">
              Todo listo. Estamos entrando a tu sistema.
            </p>
            <p className="mt-3 text-xs font-circular-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
              Redirigiendo...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepProgress({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: string[];
}) {
  const progress = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="mt-6 xl:mt-7">
      <div className="relative px-2 pt-5">
        <div className="absolute left-6 right-6 top-8 h-2 rounded-full border border-[var(--color-border)] bg-[var(--color-input-bg)]" />
        <div
          className="register-progress-fill absolute left-6 top-8 h-2 rounded-full bg-[var(--color-primary)] transition-[width] duration-500 ease-out"
          style={{ width: `calc((100% - 3rem) * ${progress / 100})` }}
        />

        <div className="relative z-10 flex items-start justify-between">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isDone = currentStep > index;
            const isReached = isActive || isDone;

            return (
              <div
                key={step}
                className="flex w-20 flex-col items-center text-center"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-4 border-white text-xs font-black shadow-[0_4px_12px_rgba(16,29,105,0.14)] transition-colors duration-300 ${
                    isReached
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]"
                  } ${isActive ? "scale-110 ring-4 ring-[var(--color-primary)]/10" : ""}`}
                >
                  {isDone ? (
                    <CheckCircleIcon size={18} weight="fill" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`mt-2 text-[11px] font-circular-bold transition-colors ${
                    isReached
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PasswordRules({ password }: { password: string }) {
  return (
    <div className="grid gap-2 rounded-[16px] bg-[var(--color-input-bg)] p-3 sm:grid-cols-2">
      {passwordRequirements.map((requirement) => {
        const isValid = requirement.test(password);

        return (
          <div
            key={requirement.label}
            className={`flex items-center gap-2 text-xs font-circular-regular ${
              isValid
                ? "text-[var(--color-text)]"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                isValid
                  ? "bg-[#ff7417] text-white"
                  : "bg-[var(--color-card)] ring-1 ring-[var(--color-border)]"
              }`}
            >
              {isValid && <CheckCircleIcon size={16} weight="fill" />}
            </span>
            {requirement.label}
          </div>
        );
      })}
    </div>
  );
}

type CompanyStepProps = {
  companyData: CompanyFormData;
  updateCompanyValue: (
    name: keyof CompanyFormData,
    value: string | boolean,
  ) => void;
};

function CompanyStep({ companyData, updateCompanyValue }: CompanyStepProps) {
  return (
    <>
      <fieldset>
        <legend className="text-sm font-circular-bold text-[var(--color-text)]">
          ¿Qué productos venderás?
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catalogProfileOptions.map((option) => {
            const selected = companyData.catalogProfile === option.value;
            const Icon = option.icon;

            return (
              <label
                key={option.value}
                className={`relative flex min-h-24 cursor-pointer items-center gap-3 rounded-[14px] p-4 transition-colors ${
                  selected
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                }`}
              >
                <input
                  type="radio"
                  name="catalogProfile"
                  value={option.value}
                  checked={selected}
                  onChange={() =>
                    updateCompanyValue("catalogProfile", option.value)
                  }
                  className="sr-only"
                />
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    selected
                      ? "bg-white/15"
                      : "bg-[var(--color-card)] text-[var(--color-primary)]"
                  }`}
                >
                  <Icon size={22} weight="fill" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-circular-bold">
                    {option.label}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${
                      selected
                        ? "text-white/75"
                        : "text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {option.description}
                  </span>
                </span>
                {selected && (
                  <CheckCircleIcon
                    size={18}
                    weight="fill"
                    className="absolute right-3 top-3"
                  />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <RegisterInput
          id="business-name"
          label="Nombre comercial"
          name="nombreComercial"
          value={companyData.nombreComercial}
          onValueChange={(value) =>
            updateCompanyValue("nombreComercial", value)
          }
          placeholder="Mi tienda"
          icon={<IdentificationCardIcon size={24} weight="fill" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <RegisterInput
          id="business-phone"
          label="Telefono empresa"
          name="telefonoEmpresa"
          value={companyData.telefonoEmpresa}
          onValueChange={(value) =>
            updateCompanyValue(
              "telefonoEmpresa",
              value.replace(/\D/g, "").slice(0, 15),
            )
          }
          placeholder="999999999"
          inputMode="tel"
          icon={<UserIcon size={24} weight="fill" />}
        />
        <RegisterInput
          id="business-email"
          label="Correo empresa"
          name="emailEmpresa"
          value={companyData.emailEmpresa}
          onValueChange={(value) => updateCompanyValue("emailEmpresa", value)}
          type="email"
          placeholder="empresa@correo.com"
          required={false}
          icon={<EnvelopeSimpleIcon size={24} weight="fill" />}
        />
      </div>

      <label
        className={`flex cursor-pointer items-center gap-3 rounded-[16px] bg-[var(--color-input-bg)] px-4 py-3 text-sm font-circular-bold transition-colors hover:bg-[var(--color-button-hover)] ${
          companyData.noCuentaConRuc
            ? "text-[var(--color-sidebar-active)]"
            : "text-[var(--color-text)]"
        }`}
      >
        <input
          type="checkbox"
          checked={companyData.noCuentaConRuc}
          onChange={(event) =>
            updateCompanyValue("noCuentaConRuc", event.target.checked)
          }
          className="sr-only"
        />
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
            companyData.noCuentaConRuc
              ? "bg-[#ff7417] text-white"
              : "bg-[var(--color-card)] ring-1 ring-[var(--color-border)]"
          }`}
        >
          {companyData.noCuentaConRuc && (
            <CheckCircleIcon size={17} weight="fill" />
          )}
        </span>
        No cuento con RUC
      </label>

      {!companyData.noCuentaConRuc && (
        <div className="grid gap-4 sm:grid-cols-2">
          <RegisterInput
            id="business-social-name"
            label="Razon social"
            name="razonSocial"
            value={companyData.razonSocial}
            onValueChange={(value) => updateCompanyValue("razonSocial", value)}
            placeholder="Mi Empresa S.A.C."
            required={false}
            icon={<IdentificationCardIcon size={24} weight="fill" />}
          />
          <RegisterInput
            id="business-ruc"
            label="RUC"
            name="ruc"
            value={companyData.ruc}
            onValueChange={(value) =>
              updateCompanyValue("ruc", value.replace(/\D/g, "").slice(0, 11))
            }
            placeholder="20600000001"
            minLength={11}
            maxLength={11}
            pattern="\d{11}"
            inputMode="numeric"
            icon={<IdentificationCardIcon size={24} weight="fill" />}
          />
        </div>
      )}

      {companyData.noCuentaConRuc && (
        <RegisterInput
          id="business-dni"
          label="DNI"
          name="dni"
          value={companyData.dni}
          onValueChange={(value) =>
            updateCompanyValue("dni", value.replace(/\D/g, "").slice(0, 8))
          }
          placeholder="12345678"
          minLength={8}
          maxLength={8}
          pattern="\d{8}"
          inputMode="numeric"
          icon={<IdentificationCardIcon size={24} weight="fill" />}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <RegisterInput
          id="business-address"
          label="Direccion"
          name="direccion"
          value={companyData.direccion}
          onValueChange={(value) => updateCompanyValue("direccion", value)}
          placeholder="Lima, Peru"
          required={false}
          icon={<IdentificationCardIcon size={24} weight="fill" />}
        />

        <RegisterSelect
          id="business-source"
          label="Como nos conociste"
          value={companyData.comoConocio}
          onValueChange={(value) => updateCompanyValue("comoConocio", value)}
          options={discoveryOptions}
        />
      </div>
    </>
  );
}

type RegisterSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
};

function RegisterSelect({
  id,
  label,
  value,
  onValueChange,
  options,
}: RegisterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 240,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentOption = options.find(([optionValue]) => optionValue === value);

  const updateMenuPosition = () => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const opensBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(
      140,
      Math.min(260, opensBelow ? spaceBelow : spaceAbove),
    );

    setMenuStyle({
      left: rect.left,
      top: opensBelow ? rect.bottom + gap : rect.top - maxHeight - gap,
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
        {label}
      </label>
      <div>
        <button
          id={id}
          ref={buttonRef}
          type="button"
          onClick={() => {
            updateMenuPosition();
            setIsOpen((currentValue) => !currentValue);
          }}
          className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-left text-sm font-circular-regular text-[var(--color-input-text)] outline-none transition-colors hover:bg-[var(--color-button-hover)] focus:ring-2 focus:ring-[var(--color-primary)]/20 xl:h-12"
        >
          <span className="min-w-0 truncate">{currentOption?.[1]}</span>
          <CaretDownIcon
            size={16}
            weight="bold"
            className={`shrink-0 text-[var(--color-muted-foreground)] transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen &&
          createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] overflow-y-auto rounded-xl bg-[var(--color-card)] p-1 shadow-[0_16px_40px_rgba(16,29,105,0.18)] ring-1 ring-[var(--color-border)]"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width,
                maxHeight: menuStyle.maxHeight,
              }}
            >
              {options.map(([optionValue, labelText]) => {
                const isSelected = value === optionValue;

                return (
                  <button
                    key={optionValue}
                    type="button"
                    onClick={() => {
                      onValueChange(optionValue);
                      setIsOpen(false);
                    }}
                    className={`font-circular-regular flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-bold transition-colors ${
                      isSelected
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                    }`}
                  >
                    <span className="min-w-0 truncate">{labelText}</span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}

type RegisterInputProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  icon?: ReactNode;
  endAdornment?: ReactNode;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  onBlur?: () => void;
  onFocus?: () => void;
};

function RegisterInput({
  id,
  label,
  name,
  value,
  onValueChange,
  icon,
  endAdornment,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
  inputMode,
  minLength,
  maxLength,
  pattern,
  onBlur,
  onFocus,
}: RegisterInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
      >
        {label}
      </label>
      <div className="flex overflow-hidden rounded-[16px] bg-[var(--color-input-bg)] transition-colors hover:bg-[var(--color-button-hover)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          inputMode={inputMode}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
          onBlur={onBlur}
          onFocus={onFocus}
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] xl:h-12"
        />
        {endAdornment
          ? endAdornment
          : icon && (
              <div className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] xl:h-10 xl:w-10">
                {icon}
              </div>
            )}
      </div>
    </div>
  );
}

function PasswordAdornment({
  isVisible,
  showToggle,
  onClick,
}: {
  isVisible: boolean;
  showToggle: boolean;
  onClick: () => void;
}) {
  if (!showToggle) {
    return (
      <div className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] xl:h-10 xl:w-10">
        <KeyIcon size={24} weight="fill" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="m-1 flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-secondary)] transition hover:text-[#ef6a12] xl:h-10 xl:w-10"
      aria-label={isVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
    >
      {isVisible ? (
        <EyeSlashIcon size={24} weight="fill" />
      ) : (
        <EyeIcon size={24} weight="fill" />
      )}
    </button>
  );
}

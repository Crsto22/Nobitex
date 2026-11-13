"use client";

import type { FormEvent, HTMLInputTypeAttribute, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  FacebookLogoIcon,
  GoogleLogoIcon,
  HouseIcon,
  IdentificationCardIcon,
  InstagramLogoIcon,
  KeyIcon,
  ShareNetworkIcon,
  TiktokLogoIcon,
  UserIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/ssr";

import { useSystemToast } from "@/components/SystemToast/system-toast";
import { TurnstileWidget } from "@/components/Turnstile/turnstile-widget";
import { trackMetaEvent } from "@/components/analytics/meta-pixel";
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
  {
    value: "instagram",
    label: "Instagram",
    icon: InstagramLogoIcon,
    color: "#E4405F",
  },
  {
    value: "tiktok",
    label: "TikTok",
    icon: TiktokLogoIcon,
    color: "#010101",
  },
  {
    value: "facebook",
    label: "Facebook",
    icon: FacebookLogoIcon,
    color: "#1877F2",
  },
  {
    value: "youtube",
    label: "YouTube",
    icon: YoutubeLogoIcon,
    color: "#FF0000",
  },
  {
    value: "google",
    label: "Google",
    icon: GoogleLogoIcon,
    color: "#4285F4",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: WhatsappLogoIcon,
    color: "#25D366",
  },
  {
    value: "recomendacion",
    label: "Recomendación",
    icon: ShareNetworkIcon,
    color: "#101d69",
  },
] as const;

const catalogProfileOptions = [
  {
    value: "ropa",
    label: "Ropa",
    description: "Tallas XS a XXL",
    image: "/img/ropa.png",
  },
  {
    value: "calzado",
    label: "Calzado",
    description: "Tallas 24 a 48",
    image: "/img/zapatilla.png",
  },
  {
    value: "otros",
    label: "Otros",
    description: "Configúralo después",
    image: "/img/bodega.png",
  },
] as const;

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
  productMode: ProductMode | "";
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

type ProductMode = "pos" | "attendance" | "both";

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
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
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
    productMode: "pos",
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
  }, [activationProgress, companyData.productMode, router]);

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

      if (name === "productMode") {
        return {
          ...currentData,
          productMode: value as ProductMode,
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

    if (currentStep === 0 && !acceptedLegalTerms) {
      showToast({
        title: "Aceptación requerida",
        description:
          "Acepta los Términos y Condiciones y la Política de Privacidad para continuar.",
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
          acceptedLegalTerms,
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

    const productMode: ProductMode = "pos";

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
          productMode,
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
      trackMetaEvent("CompleteRegistration", {
        content_name: "nuvex_trial",
        status: "completed",
      });
      window.sessionStorage.removeItem(ONBOARDING_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(ONBOARDING_USER_STORAGE_KEY);
      setActivationProgress(0);
      setIsComplete(true);
      showToast({
        title: "Empresa registrada",
        description: "Estamos activando tu entorno.",
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
      <section className="login-form-motion relative grid min-h-dvh overflow-hidden bg-[var(--color-sidebar-bg)] lg:grid-cols-[minmax(0,1fr)_minmax(580px,820px)]">
        <div className="login-dots-bg relative z-10 hidden min-h-dvh flex-col overflow-hidden bg-[#f6f2f1] px-8 py-10 lg:flex xl:px-12">
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
              src="/img/login.webp"
              alt="Login"
              width={520}
              height={520}
              className="h-auto w-full max-w-[420px] object-contain"
              priority
            />
          </div>
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
          <div className="mb-4 flex w-full items-center justify-between">
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
          <div
            className={`register-form-scroll flex max-h-[calc(100dvh-6rem)] w-full flex-col overflow-y-auto pr-2 transition-[max-width] duration-500 ease-out lg:max-h-[calc(100dvh-7rem)] ${
              isActivating
                ? "m-auto max-w-[560px]"
                : isCompanyStep
                  ? "mx-auto max-w-7xl"
                  : "m-auto max-w-[560px]"
            }`}
          >
            {isComplete ? (
              <ActivationScreen
                progress={activationProgress}
                productMode={companyData.productMode || "pos"}
              />
            ) : (
              <>
                <form
                  ref={formRef}
                  className="space-y-4 xl:space-y-5"
                  onSubmit={handleSubmit}
                >
                  <div>
                    <h1 className="mt-1 text-2xl font-semibold text-[var(--color-primary)] text-fixed-2xl">
                      Prueba Nuvex gratis 14 días
                    </h1>
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

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-1 text-sm leading-5 text-[#525b75]">
                          <input
                            type="checkbox"
                            checked={acceptedLegalTerms}
                            onChange={(event) =>
                              setAcceptedLegalTerms(event.target.checked)
                            }
                            className="mt-1 size-4 shrink-0 accent-[#101d69]"
                          />
                          <span>
                            He leído y acepto los{" "}
                            <a
                              href="https://nuvex.pe/terminos"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-circular-bold text-[var(--color-primary)] underline underline-offset-2"
                            >
                              Términos y Condiciones
                            </a>{" "}
                            y la{" "}
                            <a
                              href="https://nuvex.pe/privacidad"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-circular-bold text-[var(--color-primary)] underline underline-offset-2"
                            >
                              Política de Privacidad
                            </a>
                            .
                          </span>
                        </label>
                      </>
                    )}

                    {currentStep === 1 && (
                      <div className="text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center text-[var(--color-secondary)]">
                          <EnvelopeSimpleIcon size={38} weight="fill" />
                        </div>
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
                          className="font-heading mx-auto mt-5 block h-12 w-full max-w-[280px] rounded-2xl bg-white px-4 text-center text-lg font-black tracking-[0.35em] text-[var(--color-primary)] ring-1 ring-[var(--color-sidebar-action-bg)] outline-none transition placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
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
                        className="h-11 flex-1 rounded-2xl border-transparent bg-[var(--color-input-bg)] text-sm font-circular-regular text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
                      >
                        Atras
                      </Button>
                    )}

                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        disabled={
                          isSubmitting || (currentStep === 0 && !turnstileToken)
                            || (currentStep === 0 && !acceptedLegalTerms)
                        }
                        onClick={handleNext}
                        className="h-11 flex-1 rounded-2xl bg-[var(--color-primary)] text-sm font-circular-regular text-white hover:bg-[#0c1754]"
                      >
                        {getActionLabel(currentStep, isSubmitting)}
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting || !companyData.catalogProfile}
                        className="h-11 flex-1 rounded-2xl bg-[var(--color-primary)] text-sm font-circular-regular text-white hover:bg-[#0c1754]"
                      >
                        {isSubmitting ? "Creando empresa..." : "Crear cuenta"}
                      </Button>
                    )}
                  </div>

                  <div className="pt-1 text-center text-xs font-circular-regular text-[#7b849b]">
                    {isComplete ? "Volver a " : "Ya tienes una cuenta, "}
                    <Link
                      href="/login"
                      className="font-semibold text-[#7b83b7] underline-offset-4 transition-colors hover:text-[var(--color-primary)] hover:underline"
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

function ActivationScreen({
  progress,
  productMode,
}: {
  progress: number;
  productMode: ProductMode;
}) {
  const isReady = progress >= 100;
  const activationItems = getActivationItems(productMode);
  const copy = getActivationCopy(productMode);
  const completedItems = Math.floor((progress / 100) * activationItems.length);
  const activeIndex = Math.min(completedItems, activationItems.length - 1);

  return (
    <div className="login-form-motion flex min-h-[calc(100dvh-3rem)] flex-col justify-center py-8">
      <div className="mx-auto w-full max-w-[420px] text-center">
        <h2 className="text-2xl font-black text-[var(--color-primary)] text-fixed-2xl">
          {isReady ? copy.readyTitle : copy.loadingTitle}
        </h2>
        {!isReady && (
          <p className="mt-2 text-sm font-circular-regular text-[#525b75]">
            {copy.description}
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

function getActivationItems(productMode: ProductMode) {
  if (productMode === "attendance") {
    return [
      "Registrando empresa",
      "Activando asistencias",
      "Preparando trabajadores",
      "Configurando punto QR",
      "Preparando acceso",
    ];
  }
  if (productMode === "both") {
    return [
      "Registrando empresa",
      "Creando tu catalogo de productos",
      "Activando asistencias",
      "Configurando tu interfaz",
      "Preparando acceso",
    ];
  }
  return [
    "Registrando empresa",
    "Creando tu catalogo de productos",
    "Configurando tu interfaz",
    "Activando modulo de ventas",
    "Preparando acceso",
  ];
}

function getActivationCopy(productMode: ProductMode) {
  if (productMode === "attendance") {
    return {
      loadingTitle: "Activando asistencias",
      readyTitle: "Tus asistencias estan listas!",
      description: "Preparando trabajadores y punto QR...",
    };
  }
  if (productMode === "both") {
    return {
      loadingTitle: "Activando tu sistema",
      readyTitle: "Tu sistema esta listo!",
      description: "Conectando ventas y asistencias...",
    };
  }
  return {
    loadingTitle: "Activando ventas",
    readyTitle: "Tu tienda esta lista!",
    description: "Conectando modulos de inventario...",
  };
}

function PasswordRules({ password }: { password: string }) {
  return (
    <div className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-[var(--color-sidebar-action-bg)] sm:grid-cols-2">
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
  const showCompanyContactFields = false;
  const ropaSelected =
    companyData.catalogProfile === "ropa" ||
    companyData.catalogProfile === "ropa_calzado";
  const calzadoSelected =
    companyData.catalogProfile === "calzado" ||
    companyData.catalogProfile === "ropa_calzado";

  const toggleCatalog = (value: "ropa" | "calzado") => {
    const nextRopa = value === "ropa" ? !ropaSelected : ropaSelected;
    const nextCalzado =
      value === "calzado" ? !calzadoSelected : calzadoSelected;
    const nextCatalogProfile: CompanyCatalogProfile | "" =
      nextRopa && nextCalzado
        ? "ropa_calzado"
        : nextRopa
          ? "ropa"
          : nextCalzado
            ? "calzado"
            : "";

    updateCompanyValue("catalogProfile", nextCatalogProfile);
  };

  const otrosSelected = companyData.catalogProfile === "otros";

  const toggleOtros = () => {
    updateCompanyValue("catalogProfile", otrosSelected ? "" : "otros");
  };

  return (
    <>
      <fieldset>
        <legend className="text-sm font-circular-bold text-[var(--color-text)]">
          ¿Qué productos venderás?
        </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalogProfileOptions.map((option) => {
              const isOtros = option.value === "otros";
              const selected = isOtros
                ? otrosSelected
                : option.value === "ropa"
                  ? ropaSelected
                  : calzadoSelected;

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
                    type="checkbox"
                    name="catalogProfile"
                    value={option.value}
                    checked={selected}
                    onChange={() =>
                      isOtros ? toggleOtros() : toggleCatalog(option.value)
                    }
                    className="sr-only"
                  />
                  <Image
                    src={option.image}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 shrink-0 object-contain"
                  />
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

      <div
        className={
          showCompanyContactFields ? "grid gap-4 sm:grid-cols-2" : ""
        }
      >
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
        {showCompanyContactFields ? (
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
        ) : null}
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

      {showCompanyContactFields ? (
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
      ) : null}

      <fieldset>
        <legend className="text-sm font-circular-bold text-[var(--color-text)]">
          Como nos conociste
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {discoveryOptions.map((option) => {
            const Icon = option.icon;
            const selected = companyData.comoConocio === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateCompanyValue("comoConocio", option.value)
                }
                aria-pressed={selected}
                className={`group relative flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-all ${
                  selected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm"
                    : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-input-bg)]"
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${option.color}18`,
                    color: option.color,
                  }}
                >
                  <Icon size={20} weight="fill" />
                </span>
                <span
                  className={`text-[11px] font-circular-bold leading-tight ${
                    selected
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text)]"
                  }`}
                >
                  {option.label}
                </span>
                {selected ? (
                  <CheckCircleIcon
                    size={14}
                    weight="fill"
                    className="absolute right-1.5 top-1.5 text-[var(--color-primary)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    </>
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
      <div className="flex overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--color-sidebar-action-bg)] transition focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20">
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
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-sm text-[var(--color-primary)] outline-none placeholder:text-[var(--color-placeholder)] xl:h-12"
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

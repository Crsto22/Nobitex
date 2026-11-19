import {
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  InfoIcon,
  KeyIcon,
  PackageIcon,
  ShieldCheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

const PACKAGE_TYPES = [
  "SOBRE",
  "PAQUETE XXS",
  "PAQUETE XS",
  "PAQUETE S",
  "PAQUETE M",
  "PAQUETE L",
];

export default function ShalomProPage() {
  return (
    <DashboardShell
      headerTitle="Shalom PRO"
      headerParent={{ label: "Gestión de Envíos", href: "/entregas-pendientes" }}
    >
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e11d2e]/10 text-[#e11d2e]">
            <ShieldCheckIcon size={24} weight="fill" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-circular-bold text-[var(--color-text)]">
              Cuenta de Shalom PRO de la empresa
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              Conecta la cuenta de Shalom PRO para registrar envíos desde Nuvex. La contraseña se
              guarda cifrada en el servicio de Shalom; Nuvex no la almacena.
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-circular-bold text-amber-600">
            Sin conectar
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:p-5">
            <h3 className="text-xs font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Credenciales
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Correo de Shalom
                </span>
                <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                  <EnvelopeSimpleIcon size={16} className="text-[var(--color-muted-foreground)]" />
                  <input
                    type="email"
                    placeholder="cuenta@empresa.com"
                    className="h-11 w-full bg-transparent text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)]"
                  />
                </div>
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Contraseña
                </span>
                <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                  <KeyIcon size={16} className="text-[var(--color-muted-foreground)]" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="h-11 w-full bg-transparent text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)]"
                  />
                </div>
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Paquete por defecto
                </span>
                <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                  <PackageIcon size={16} className="text-[var(--color-muted-foreground)]" />
                  <select
                    defaultValue="PAQUETE S"
                    className="h-11 w-full bg-transparent text-sm text-[var(--color-input-text)] outline-none"
                  >
                    {PACKAGE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  Agencia de origen
                </span>
                <input
                  placeholder="Se toma de Configuración → Envíos"
                  disabled
                  className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-muted-foreground)] outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                className="h-11 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-circular-bold text-white opacity-50"
              >
                Guardar y conectar
              </button>
              <button
                type="button"
                disabled
                className="h-11 rounded-[14px] bg-[var(--color-input-bg)] px-5 text-sm font-circular-bold text-[var(--color-text)] opacity-50"
              >
                Validar credenciales
              </button>
              <span className="text-[11px] text-[var(--color-muted-foreground)]">
                Disponible en la siguiente fase
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <h3 className="text-xs font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Estado del servicio
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-[var(--color-muted-foreground)]">
                <li className="flex items-center gap-2">
                  <WarningCircleIcon size={16} className="text-amber-500" />
                  Cuenta sin conectar
                </li>
                <li className="flex items-center gap-2">
                  <InfoIcon size={16} />
                  Sin sesión activa de Shalom
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <h3 className="text-xs font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Cómo funciona
              </h3>
              <ol className="mt-3 space-y-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
                <li className="flex gap-2">
                  <span className="text-[var(--color-primary)]">1.</span>
                  Ingresa el correo y la contraseña de Shalom PRO.
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-primary)]">2.</span>
                  El servicio valida el acceso y guarda la sesión cifrada.
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--color-primary)]">3.</span>
                  En Entregas y envíos aparecerá el botón “Registrar en Shalom”.
                </li>
              </ol>
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#059669]/10 p-2 text-[11px] leading-4 text-[#047857]">
                <CheckCircleIcon size={15} weight="fill" className="mt-0.5 shrink-0" />
                Las credenciales viajan por HTTPS y se guardan cifradas (AES-256-GCM) en el
                servicio de Shalom.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

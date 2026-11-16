"use client";

import {
  BarcodeIcon,
  PackageIcon,
  RulerIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/ssr";
import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Select } from "@/components/ui/select";
import {
  salesApi,
  type ShalomExportMode,
  type ShalomExportSettings,
  type ShalomPackageType,
} from "@/lib/api/sales";
import { cn } from "@/lib/utils";

const PACKAGE_TYPES: ShalomPackageType[] = [
  "SOBRE",
  "PAQUETE XXS",
  "PAQUETE XS",
  "PAQUETE S",
  "PAQUETE M",
  "PAQUETE L",
];

/**
 * Medidas por defecto que Shalom aplica a cada mercaderia.
 * Solo son informativas: en el Excel basta con el nombre del paquete.
 */
const PACKAGE_DEFAULT_SIZES: Record<
  ShalomPackageType,
  { alto: number; ancho: number; largo: number; peso: number }
> = {
  SOBRE: { alto: 0.1, ancho: 0.1, largo: 0.15, peso: 0 },
  "PAQUETE XXS": { alto: 0.15, ancho: 0.1, largo: 0.1, peso: 0.25 },
  "PAQUETE XS": { alto: 0.2, ancho: 0.15, largo: 0.12, peso: 0.5 },
  "PAQUETE S": { alto: 0.3, ancho: 0.3, largo: 0.12, peso: 2 },
  "PAQUETE M": { alto: 0.3, ancho: 0.24, largo: 0.2, peso: 5 },
  "PAQUETE L": { alto: 0.42, ancho: 0.3, largo: 0.23, peso: 10 },
};

const MODES: Array<{
  value: ShalomExportMode;
  label: string;
  description: string;
  icon: typeof PackageIcon;
}> = [
  {
    value: "ninguno",
    label: "Sin relleno",
    description: "Se descarga como hasta ahora",
    icon: BarcodeIcon,
  },
  {
    value: "mercaderia",
    label: "Por mercadería",
    description: "Rellena solo la mercadería",
    icon: PackageIcon,
  },
  {
    value: "medidas",
    label: "Por medidas",
    description: "Rellena alto, ancho, largo y peso",
    icon: RulerIcon,
  },
];

const emptySettings: ShalomExportSettings = {
  origen: null,
  modo: "ninguno",
  mercaderia: null,
  alto: null,
  ancho: null,
  largo: null,
  peso: null,
};

export function ShalomExportSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: ShalomExportSettings) => void;
}) {
  const toast = useSystemToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [origins, setOrigins] = useState<string[]>([]);
  const [origen, setOrigen] = useState("");
  const [modo, setModo] = useState<ShalomExportMode>("ninguno");
  const [mercaderia, setMercaderia] = useState<ShalomPackageType | "">("");
  const [alto, setAlto] = useState("");
  const [ancho, setAncho] = useState("");
  const [largo, setLargo] = useState("");
  const [peso, setPeso] = useState("");

  const applySettings = (settings: ShalomExportSettings) => {
    setOrigen(settings.origen ?? "");
    setModo(settings.modo);
    setMercaderia(settings.mercaderia ?? "");
    setAlto(settings.alto === null ? "" : String(settings.alto));
    setAncho(settings.ancho === null ? "" : String(settings.ancho));
    setLargo(settings.largo === null ? "" : String(settings.largo));
    setPeso(settings.peso === null ? "" : String(settings.peso));
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    Promise.all([
      salesApi.getShalomExportSettings(),
      salesApi.getShalomExportOrigins(),
    ])
      .then(([settings, list]) => {
        if (!active) return;
        applySettings(settings ?? emptySettings);
        setOrigins(list.data ?? []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.showToast({
          title: "No se pudieron cargar los ajustes",
          description:
            error instanceof Error ? error.message : "Intenta nuevamente.",
          variant: "error",
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const origenOptions = useMemo(
    () => [
      { value: "", label: "Sin origen" },
      ...origins.map((name) => ({ value: name, label: name })),
    ],
    [origins],
  );

  const parseNumber = (value: string) => {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const save = async () => {
    if (isSaving) return;

    if (modo === "mercaderia" && !mercaderia) {
      toast.showToast({
        title: "Selecciona la mercadería",
        description: "Elige el tipo de paquete que se usará en el formato.",
        variant: "error",
      });
      return;
    }

    const payload: ShalomExportSettings = {
      origen: origen || null,
      modo,
      mercaderia: modo === "mercaderia" ? (mercaderia as ShalomPackageType) : null,
      alto: modo === "medidas" ? parseNumber(alto) : null,
      ancho: modo === "medidas" ? parseNumber(ancho) : null,
      largo: modo === "medidas" ? parseNumber(largo) : null,
      peso: modo === "medidas" ? parseNumber(peso) : null,
    };

    if (
      modo === "medidas" &&
      (payload.alto === null ||
        payload.ancho === null ||
        payload.largo === null ||
        payload.peso === null ||
        payload.alto <= 0 ||
        payload.ancho <= 0 ||
        payload.largo <= 0 ||
        payload.peso < 0)
    ) {
      toast.showToast({
        title: "Completa las medidas",
        description:
          "Alto, ancho y largo deben ser mayores a 0. El peso puede ser 0.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await salesApi.updateShalomExportSettings(payload);
      toast.showToast({
        title: "Ajustes guardados",
        description: "Se aplicarán la próxima vez que exportes a Shalom.",
        variant: "success",
      });
      onSaved?.(saved);
      onClose();
    } catch (error: unknown) {
      toast.showToast({
        title: "No se pudieron guardar los ajustes",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustes de exportación Shalom"
      size="lg"
    >
      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Origen
          </span>
          <Select
            value={origen}
            onChange={setOrigen}
            options={origenOptions}
            placeholder="Sin origen"
            searchable
            ariaLabel="Origen"
            fixedMenu
          />
          <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
            Se escribe en la columna ORIGEN de todas las filas.
          </p>
        </div>

        <div>
          <span className="mb-2 block text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            Relleno automático
          </span>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((option) => {
              const active = modo === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setModo(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col gap-1 rounded-[14px] border-2 px-3 py-3 text-left transition-colors",
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40",
                  )}
                >
                  <Icon
                    size={20}
                    weight={active ? "fill" : "regular"}
                    className={cn(
                      active
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-muted-foreground)]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-circular-bold",
                      active
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-text)]",
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="text-[10px] leading-tight text-[var(--color-muted-foreground)]">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {modo === "mercaderia" ? (
          <div>
            <span className="mb-2 block text-[11px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
              Mercadería
            </span>
            <Select
              value={mercaderia}
              onChange={(value) => setMercaderia(value as ShalomPackageType)}
              options={PACKAGE_TYPES.map((type) => ({
                value: type,
                label: type,
              }))}
              placeholder="Seleccionar"
              ariaLabel="Mercadería"
              fixedMenu
            />
            <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
              Solo se escribe el nombre en la columna MERCADERIA. Shalom
              calcula alto, ancho, largo y peso por defecto.
            </p>
            {mercaderia ? (
              <p className="mt-2 rounded-[10px] bg-[var(--color-input-bg)] px-3 py-2 text-xs font-circular-bold text-[var(--color-primary)]">
                {mercaderia}: {PACKAGE_DEFAULT_SIZES[mercaderia].alto} ×{" "}
                {PACKAGE_DEFAULT_SIZES[mercaderia].ancho} ×{" "}
                {PACKAGE_DEFAULT_SIZES[mercaderia].largo} m ·{" "}
                {PACKAGE_DEFAULT_SIZES[mercaderia].peso} kg (referencia Shalom)
              </p>
            ) : null}
          </div>
        ) : null}

        {modo === "medidas" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Alto (m)", value: alto, onChange: setAlto },
              { label: "Ancho (m)", value: ancho, onChange: setAncho },
              { label: "Largo (m)", value: largo, onChange: setLargo },
              { label: "Peso (kg)", value: peso, onChange: setPeso },
            ].map((field) => (
              <label key={field.label} className="min-w-0">
                <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                  {field.label}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </label>
            ))}
          </div>
        ) : null}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving || isLoading}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving || isLoading ? (
              <SpinnerGapIcon size={17} className="animate-spin" />
            ) : null}
            Guardar ajustes
          </button>
        </div>
      </div>
    </Modal>
  );
}

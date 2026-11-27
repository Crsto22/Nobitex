"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  InfoIcon,
  KeyIcon,
  MapPinIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
} from "@/lib/icons";

import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import {
  salesApi,
  type BulkRegisterShalomResponse,
  type ShalomExportSettings,
  type ShalomPackageType,
  type VentaResponse,
} from "@/lib/api/sales";
import { generateSecurityKey, securityKeyIssue } from "@/lib/shalom/security-key";
import { cn } from "@/lib/utils";

const MAX_BULK = 50;
const MAX_PER_RECIPIENT = 10;

const PACKAGE_TYPES: ShalomPackageType[] = [
  "SOBRE",
  "PAQUETE XXS",
  "PAQUETE XS",
  "PAQUETE S",
  "PAQUETE M",
  "PAQUETE L",
];

type ShalomBulkModalProps = {
  isOpen: boolean;
  sales: VentaResponse[];
  defaultPackageType?: ShalomPackageType;
  onClose: () => void;
  onCompleted: (result: BulkRegisterShalomResponse) => void;
};

export function ShalomBulkModal({
  isOpen,
  sales,
  defaultPackageType = "PAQUETE S",
  onClose,
  onCompleted,
}: ShalomBulkModalProps) {
  const toast = useSystemToast();
  const [securityKey, setSecurityKey] = useState("");
  const [packageType, setPackageType] =
    useState<ShalomPackageType>(defaultPackageType);
  const [accepted, setAccepted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<ShalomExportSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [result, setResult] = useState<BulkRegisterShalomResponse | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecurityKey("");
    setPackageType(defaultPackageType);
    setAccepted(false);
    setResult(null);
    setIsLoadingSettings(true);

    salesApi
      .getShalomExportSettings()
      .then((data) => {
        if (isOpen) setSettings(data);
      })
      .catch(() => {
        if (isOpen) setSettings(null);
      })
      .finally(() => {
        if (isOpen) setIsLoadingSettings(false);
      });
  }, [isOpen, defaultPackageType]);

  const documents = useMemo(() => {
    const map = new Map<string, number>();
    for (const sale of sales) {
      const document = sale.envio?.dni?.trim();
      if (!document) continue;
      map.set(document, (map.get(document) ?? 0) + 1);
    }
    return map;
  }, [sales]);

  const overLimit = useMemo(
    () =>
      [...documents.entries()].filter(
        ([, total]) => total > MAX_PER_RECIPIENT,
      ),
    [documents],
  );

  const tooMany = sales.length > MAX_BULK;
  const keyIssue = securityKey ? securityKeyIssue(securityKey) : null;
  const missingOrigin = !isLoadingSettings && !settings?.origen;

  const canSubmit =
    !isSaving &&
    !result &&
    !isLoadingSettings &&
    sales.length > 0 &&
    !tooMany &&
    overLimit.length === 0 &&
    !missingOrigin &&
    accepted &&
    securityKey.length === 4 &&
    !keyIssue;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const response = await salesApi.registerShalomBulk({
        publicIds: sales.map((sale) => sale.publicId),
        securityKey,
        packageType,
      });
      setResult(response);
      onCompleted(response);
      toast.showToast({
        title: `${response.totals.ok} envío(s) en cola`,
        description:
          response.totals.failed > 0
            ? `${response.totals.failed} no se pudieron registrar`
            : "Shalom los procesará en segundo plano.",
        variant: response.totals.failed > 0 ? "info" : "success",
      });
    } catch (error) {
      toast.showToast({
        title: "No se pudo registrar el lote",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const correlativoById = useMemo(
    () => new Map(sales.map((sale) => [sale.publicId, sale.correlativo])),
    [sales],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registro masivo Shalom"
      description="Revisa los datos antes de enviar · máximo 50 pedidos"
      size="xl"
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-[#059669]/10 px-3 py-1.5 text-sm font-circular-bold text-[#047857]">
              <CheckCircleIcon size={18} weight="fill" />
              {result.totals.ok} en cola
            </span>
            {result.totals.failed > 0 ? (
              <span className="flex items-center gap-2 rounded-full bg-[#dc2626]/10 px-3 py-1.5 text-sm font-circular-bold text-[#b91c1c]">
                <WarningCircleIcon size={18} weight="fill" />
                {result.totals.failed} fallaron
              </span>
            ) : null}
          </div>

          {result.totals.failed > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {result.results
                .filter((item) => !item.ok)
                .map((item) => (
                  <div
                    key={item.publicId}
                    className="rounded-[12px] bg-[#dc2626]/5 p-2.5 ring-1 ring-[#dc2626]/10"
                  >
                    <p className="text-xs font-circular-bold text-[var(--color-text)]">
                      {correlativoById.get(item.publicId) ?? item.publicId}
                    </p>
                    <p className="text-[11px] text-[#b91c1c]">{item.error}</p>
                  </div>
                ))}
            </div>
          ) : null}

          <p className="rounded-[12px] bg-[#f59e0b]/10 p-3 text-[11px] leading-4 text-[#b45309]">
            Tienes 24 horas para llevar los paquetes a Shalom. Las filas se
            actualizarán solas cuando Shalom confirme la recepción.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[#f59e0b]/10 px-3 py-2.5 text-[11px] leading-4 text-[#b45309]">
            <span className="flex items-start gap-2">
              <InfoIcon size={15} className="mt-0.5 shrink-0" />
              Los registros usarán una misma clave de retiro para todo el lote.
              Tienes 24 horas para llevar los paquetes a Shalom.
            </span>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-circular-bold text-[var(--color-text)]">
                {sales.length} pedido(s) seleccionado(s)
              </p>
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                Límite: {MAX_BULK} por lote · {MAX_PER_RECIPIENT} por
                destinatario
              </span>
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {sales.map((sale, index) => {
                const document = sale.envio?.dni?.trim();
                const count = document ? (documents.get(document) ?? 0) : 0;
                const exceeds = count > MAX_PER_RECIPIENT;

                return (
                  <div
                    key={sale.publicId}
                    className={cn(
                      "rounded-[12px] bg-[var(--color-input-bg)] p-2.5",
                      exceeds && "ring-1 ring-[#dc2626]/30",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-card)] text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-circular-bold text-[var(--color-text)]">
                          {sale.correlativo} ·{" "}
                          {sale.envio?.nombreCompleto ||
                            sale.cliente?.nombre ||
                            "Cliente"}
                        </p>
                        <p className="flex items-center gap-1 truncate text-[11px] text-[var(--color-muted-foreground)]">
                          <MapPinIcon size={11} className="shrink-0" />
                          {sale.envio?.agenciaNombre ?? "Sin agencia"}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted-foreground)]">
                          {document
                            ? `${sale.envio?.tipoDocumento ?? "DNI"} ${document}`
                            : "Sin documento"}
                          {exceeds ? ` · ${count} envíos de este destinatario` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {tooMany ? (
            <p className="flex items-start gap-2 rounded-[12px] bg-[#dc2626]/10 p-2.5 text-[11px] leading-4 text-[#b91c1c]">
              <WarningCircleIcon size={15} className="mt-0.5 shrink-0" />
              El lote admite hasta {MAX_BULK} envíos. Quita{" "}
              {sales.length - MAX_BULK} de la selección.
            </p>
          ) : null}

          {overLimit.length > 0 ? (
            <p className="flex items-start gap-2 rounded-[12px] bg-[#dc2626]/10 p-2.5 text-[11px] leading-4 text-[#b91c1c]">
              <WarningCircleIcon size={15} className="mt-0.5 shrink-0" />
              Máximo {MAX_PER_RECIPIENT} envíos por destinatario en un lote:{" "}
              {overLimit
                .map(([document, total]) => `${document} (${total})`)
                .join(", ")}
              . Divide el lote.
            </p>
          ) : null}

          {missingOrigin ? (
            <p className="flex items-start gap-2 rounded-[12px] bg-[#f59e0b]/10 p-2.5 text-[11px] leading-4 text-[#b45309]">
              <WarningCircleIcon size={15} className="mt-0.5 shrink-0" />
              Falta la agencia de origen. Configúrala en Configuración →
              Shalom PRO.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="min-w-0">
              <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                Clave global de retiro
              </span>
              <div className="flex items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
                <KeyIcon
                  size={16}
                  className="shrink-0 text-[var(--color-muted-foreground)]"
                />
                <input
                  value={securityKey}
                  onChange={(event) =>
                    setSecurityKey(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="4 dígitos"
                  aria-label="Clave global de retiro"
                  className="h-11 w-full bg-transparent text-sm tracking-[0.35em] text-[var(--color-input-text)] outline-none placeholder:tracking-normal placeholder:text-[var(--color-placeholder)]"
                />
                <button
                  type="button"
                  onClick={() => setSecurityKey(generateSecurityKey())}
                  className="shrink-0 rounded-full bg-[var(--color-card)] px-3 py-1.5 text-[11px] font-circular-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-button-hover)]"
                >
                  Generar PIN
                </button>
              </div>
              <span className="mt-1 block text-[10px] leading-4 text-[var(--color-muted-foreground)]">
                {keyIssue ??
                  "Se aplicará a todos los envíos del lote. No uses 1234 ni 1111."}
              </span>
            </label>

            <label className="min-w-0">
              <span className="mb-1.5 block text-[10px] font-circular-bold uppercase text-[var(--color-muted-foreground)]">
                Tamaño del paquete
              </span>
              <select
                value={packageType}
                onChange={(event) =>
                  setPackageType(event.target.value as ShalomPackageType)
                }
                className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none"
              >
                {PACKAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="rounded-[12px] bg-[var(--color-input-bg)] px-3 py-2 text-[11px] text-[var(--color-muted-foreground)]">
            Origen:{" "}
            <span className="font-circular-bold text-[var(--color-text)]">
              {settings?.origen ?? "sin configurar"}
            </span>
          </p>

          <label className="flex items-start gap-2 text-[11px] leading-4 text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-0.5 size-4 shrink-0"
            />
            Revisé los destinatarios, las agencias y la clave global del lote.
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-11 flex-1 rounded-[14px] bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <SpinnerGapIcon size={17} className="animate-spin" />
              ) : null}
              Registrar {sales.length} pedido(s) en Shalom
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

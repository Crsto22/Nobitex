"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BuildingsIcon,
  CheckCircleIcon,
  CrosshairIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  QrCodeIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { QrPreviewModal } from "@/components/Asistencias/qr-preview-modal";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import {
  attendanceQrPointsApi,
  type QrPoint,
  type QrPointPayload,
  type QrPointStatus,
  type QrPointType,
} from "@/lib/api/attendance-qr-points";
import { branchesApi, type Branch } from "@/lib/api/branches";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const pageSize = defaultPageSize;

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

type StatusFilter = "todos" | QrPointStatus;

type QrPointForm = {
  nombre: string;
  sucursalId: string;
  latitud: string;
  longitud: string;
  precisionMetros: string;
  radioMetros: string;
  tipoQr: QrPointType;
  refreshSeconds: string;
  estado: QrPointStatus;
};

const defaultForm: QrPointForm = {
  nombre: "",
  sucursalId: "",
  latitud: "",
  longitud: "",
  precisionMetros: "",
  radioMetros: "100",
  tipoQr: "normal",
  refreshSeconds: "20",
  estado: "activo",
};

function pointToForm(point?: QrPoint | null): QrPointForm {
  if (!point) return defaultForm;

  return {
    nombre: point.nombre,
    sucursalId: point.sucursalId,
    latitud: String(point.latitud),
    longitud: String(point.longitud),
    precisionMetros:
      point.precisionMetros === null ? "" : String(point.precisionMetros),
    radioMetros: String(point.radioMetros),
    tipoQr: point.tipoQr,
    refreshSeconds: String(point.refreshSeconds),
    estado: point.estado,
  };
}

export default function AsistenciasPuntosQrPage() {
  const { showToast } = useSystemToast();
  const [points, setPoints] = useState<QrPoint[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
    branchesWithQrTotal: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workingPointId, setWorkingPointId] = useState("");
  const [deletePoint, setDeletePoint] = useState<QrPoint | null>(null);
  const [editingPoint, setEditingPoint] = useState<QrPoint | null>(null);
  const [viewingPoint, setViewingPoint] = useState<QrPoint | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadPoints = useCallback(async () => {
    return attendanceQrPointsApi.findAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      estado: selectedStatus === "todos" ? undefined : selectedStatus,
    });
  }, [currentPage, searchTerm, selectedStatus]);

  useEffect(() => {
    let isMounted = true;

    branchesApi
      .findAll({ estado: "activo", limit: 100 })
      .then((response) => {
        if (isMounted) setBranches(response.data);
      })
      .catch(() => {
        if (isMounted) setBranches([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      loadPoints()
        .then((response) => {
          if (!isMounted) return;
          setPoints(response.data);
          setMeta(response.meta);
        })
        .catch((error) => {
          if (!isMounted) return;
          showToast({
            title: "Error al cargar puntos QR",
            description:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar puntos QR.",
            variant: "error",
          });
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadPoints, showToast]);

  const refreshPoints = async () => {
    const response = await loadPoints();
    setPoints(response.data);
    setMeta(response.meta);
  };

  const openCreateForm = () => {
    setEditingPoint(null);
    setIsFormOpen(true);
  };

  const openEditForm = (point: QrPoint) => {
    setEditingPoint(point);
    setIsFormOpen(true);
  };

  const handleStatusToggle = async (point: QrPoint) => {
    if (workingPointId) return;

    const nextStatus = point.estado === "activo" ? "inactivo" : "activo";
    setWorkingPointId(point.id);

    try {
      await attendanceQrPointsApi.updateStatus(point.id, nextStatus);
      await refreshPoints();
      showToast({
        title:
          nextStatus === "activo" ? "Punto QR activado" : "Punto QR inactivado",
        description: `${point.nombre} fue actualizado.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo actualizar",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setWorkingPointId("");
    }
  };

  const confirmDeletePoint = async () => {
    if (!deletePoint || workingPointId) return;

    setWorkingPointId(deletePoint.id);

    try {
      await attendanceQrPointsApi.remove(deletePoint.id);
      await refreshPoints();
      showToast({
        title: "Punto QR inactivado",
        description: `${deletePoint.nombre} fue dado de baja.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo inactivar",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setWorkingPointId("");
      setDeletePoint(null);
    }
  };

  return (
    <DashboardShell headerTitle="Puntos QR">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            icon={<QrCodeIcon size={22} weight="fill" />}
            label="Total puntos"
            value={meta.total}
            tone="primary"
          />
          <MetricCard
            icon={<CheckCircleIcon size={22} weight="fill" />}
            label="Activos"
            value={meta.activeTotal}
            tone="success"
          />
          <MetricCard
            icon={<WarningCircleIcon size={22} weight="fill" />}
            label="Inactivos"
            value={meta.inactiveTotal}
            tone="warning"
          />
          <MetricCard
            icon={<BuildingsIcon size={22} weight="fill" />}
            label="Sedes con QR"
            value={meta.branchesWithQrTotal}
            tone="neutral"
          />
        </div>

        <div className="sticky -top-4 z-30 -mx-4 grid grid-cols-2 gap-3 bg-white px-4 py-2 lg:-mx-6 lg:flex lg:items-center lg:px-6 dark:bg-[var(--color-background)]">
          <label className="relative col-span-2 lg:flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder="Buscar punto o sede..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pl-11 pr-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </label>

          <DropdownFilter
            value={selectedStatus}
            label={
              selectedStatus === "todos"
                ? "Estado"
                : statusConfig[selectedStatus].label
            }
            options={statusOptions}
            isOpen={isStatusOpen}
            onToggle={() => setIsStatusOpen(!isStatusOpen)}
            onSelect={(value) => {
              setSelectedStatus(value as StatusFilter);
              setCurrentPage(1);
              setIsStatusOpen(false);
            }}
          />

          <button
            type="button"
            onClick={openCreateForm}
            className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white transition-colors hover:bg-[var(--color-primary)]/90 lg:w-auto lg:px-5"
          >
            <PlusIcon size={16} weight="bold" />
            Nuevo punto QR
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 pb-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))}
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
            <div className="text-center">
              <QrCodeIcon
                size={48}
                weight="light"
                className="mx-auto text-[var(--color-muted-foreground)]"
              />
              <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                No hay puntos QR
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Crea el primer punto QR enlazado a una sucursal o sede.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {points.map((point) => (
              <QrPointRow
                key={point.id}
                point={point}
                isWorking={workingPointId === point.id}
                onView={() => setViewingPoint(point)}
                onEdit={() => openEditForm(point)}
                onStatusToggle={() => handleStatusToggle(point)}
                onDelete={() => setDeletePoint(point)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {points.length} de {meta.total} puntos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-circular-bold text-white">
              {meta.page}
            </span>
            <button
              type="button"
              disabled={currentPage >= meta.totalPages || isLoading}
              onClick={() =>
                setCurrentPage((page) => Math.min(meta.totalPages, page + 1))
              }
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <QrPointFormModal
          point={editingPoint}
          branches={branches}
          onClose={() => setIsFormOpen(false)}
          onSaved={async () => {
            setIsFormOpen(false);
            await refreshPoints();
          }}
        />
      ) : null}

      {viewingPoint ? (
        <QrPreviewModal
          point={viewingPoint}
          onClose={() => setViewingPoint(null)}
        />
      ) : null}

      <ConfirmDialog
        isOpen={deletePoint !== null}
        onClose={() => setDeletePoint(null)}
        onConfirm={confirmDeletePoint}
        title="Inactivar punto QR"
        description="El punto QR pasara a estado inactivo."
        itemName={deletePoint?.nombre}
        confirmLabel="Inactivar"
      />
    </DashboardShell>
  );
}

function QrPointRow({
  point,
  isWorking,
  onView,
  onEdit,
  onStatusToggle,
  onDelete,
}: {
  point: QrPoint;
  isWorking: boolean;
  onView: () => void;
  onEdit: () => void;
  onStatusToggle: () => void;
  onDelete: () => void;
}) {
  const status = statusConfig[point.estado];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[1.1fr_1fr_1fr_.7fr_.9fr] md:items-center md:gap-3 md:gap-y-0 xl:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-border)]">
          <QrCodeIcon size={22} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--color-text)]">
            {point.nombre}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)] font-circular-regular">
            Radio {point.radioMetros} m
          </p>
          <p className="truncate text-xs font-circular-bold text-[var(--color-primary)]">
            {point.tipoQr === "dinamico"
              ? `Dinamico · ${point.refreshSeconds}s`
              : "Normal"}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Sucursal / sede
        </p>
        <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
          {point.sucursal.nombre}
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-circular-bold text-[var(--color-primary)]">
            {branchTypeLabel(point.sucursal.tipo)}
          </span>
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {point.sucursal.distrito}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          {formatCoordinate(point.latitud)}, {formatCoordinate(point.longitud)}
        </p>
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          Precision {point.precisionMetros ?? "-"} m
        </p>
      </div>

      <div className="flex justify-end md:justify-center">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-circular-bold",
            status.bg,
            status.text,
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-1 justify-end md:justify-end">
        <IconButton label="Ver QR" disabled={isWorking} onClick={onView}>
          <EyeIcon size={16} />
        </IconButton>
        <IconButton label="Editar" disabled={isWorking} onClick={onEdit}>
          <PencilSimpleIcon size={16} />
        </IconButton>
        <IconButton
          label={point.estado === "activo" ? "Inactivar" : "Activar"}
          disabled={isWorking}
          onClick={onStatusToggle}
        >
          <PowerIcon size={16} />
        </IconButton>
        <IconButton
          label="Inactivar"
          disabled={isWorking}
          onClick={onDelete}
          danger
        >
          <TrashIcon size={16} />
        </IconButton>
      </div>
    </div>
  );
}

function QrPointFormModal({
  point,
  branches,
  onClose,
  onSaved,
}: {
  point: QrPoint | null;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useSystemToast();
  const [form, setForm] = useState<QrPointForm>(() => ({
    ...pointToForm(point),
    sucursalId: point?.sucursalId ?? branches[0]?.id ?? "",
  }));
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const isEditing = Boolean(point);

  const closeModal = () => {
    if (isSubmitting || isLocating) return;
    onClose();
  };

  const setField = (field: keyof QrPointForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError("Tu navegador no permite geolocalizacion.");
      return;
    }

    setFormError("");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitud: String(position.coords.latitude),
          longitud: String(position.coords.longitude),
          precisionMetros: String(Math.round(position.coords.accuracy)),
        }));
        setIsLocating(false);
      },
      () => {
        setFormError("No se pudo obtener la ubicacion.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const payload = buildPayload(form);
    const validationError = validateForm(payload);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (point) {
        await attendanceQrPointsApi.update(point.id, payload);
      } else {
        await attendanceQrPointsApi.create(payload);
      }

      showToast({
        title: point ? "Punto QR actualizado" : "Punto QR creado",
        description: "Los datos fueron guardados correctamente.",
        variant: "success",
      });
      await onSaved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el punto QR.";
      setFormError(message);
      showToast({
        title: "No se pudo guardar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={closeModal}
      title={point ? "Editar punto QR" : "Nuevo punto QR"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <InputField
            id="qr-point-name"
            label="Nombre del punto"
            value={form.nombre}
            disabled={isSubmitting || isLocating}
            onChange={(value) => setField("nombre", value)}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Sucursal / sede del QR
            </span>
            <NativeSelect
              value={form.sucursalId}
              disabled={isSubmitting || isLocating}
              onChange={(event) => setField("sucursalId", event.target.value)}
              className="h-11 w-full rounded-[14px] border-0 bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option value="">Seleccionar sucursal o sede</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.nombre} · {branchTypeLabel(branch.tipo)}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <Button
          type="button"
          onClick={useCurrentLocation}
          disabled={isSubmitting || isLocating}
          className="h-11 rounded-[14px] bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white hover:opacity-90"
        >
          <CrosshairIcon size={18} weight="bold" />
          {isLocating ? "Obteniendo ubicacion..." : "Usar ubicacion actual"}
        </Button>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <InputField
            id="qr-point-latitude"
            label="Latitud"
            type="number"
            value={form.latitud}
            disabled={isSubmitting || isLocating}
            onChange={(value) => setField("latitud", value)}
            step="any"
          />
          <InputField
            id="qr-point-longitude"
            label="Longitud"
            type="number"
            value={form.longitud}
            disabled={isSubmitting || isLocating}
            onChange={(value) => setField("longitud", value)}
            step="any"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <InputField
            id="qr-point-accuracy"
            label="Precision metros"
            type="number"
            value={form.precisionMetros}
            disabled={isSubmitting || isLocating}
            onChange={(value) => setField("precisionMetros", value)}
          />
          <InputField
            id="qr-point-radius"
            label="Radio permitido metros"
            type="number"
            value={form.radioMetros}
            disabled={isSubmitting || isLocating}
            onChange={(value) => setField("radioMetros", value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Tipo de QR
            </span>
            <NativeSelect
              value={form.tipoQr}
              disabled={isSubmitting || isLocating}
              onChange={(event) =>
                setField("tipoQr", event.target.value as QrPointType)
              }
              className="h-11 w-full rounded-[14px] border-0 bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option value="normal">QR normal</option>
              <option value="dinamico">QR dinamico</option>
            </NativeSelect>
          </label>

          {form.tipoQr === "dinamico" ? (
            <InputField
              id="qr-point-refresh"
              label="Cambiar cada segundos"
              type="number"
              value={form.refreshSeconds}
              disabled={isSubmitting || isLocating}
              onChange={(value) => setField("refreshSeconds", value)}
              min="20"
            />
          ) : null}
        </div>

        {isEditing ? (
          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Estado
            </span>
            <NativeSelect
              value={form.estado}
              disabled={isSubmitting || isLocating}
              onChange={(event) =>
                setField("estado", event.target.value as QrPointStatus)
              }
              className="h-11 w-full rounded-[14px] border-0 bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </NativeSelect>
          </label>
        ) : null}

        {formError ? (
          <p className="text-sm font-circular-regular text-[#d9480f]">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={closeModal}
            disabled={isSubmitting || isLocating}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLocating}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSubmitting ? "Guardando..." : "Guardar punto QR"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function buildPayload(form: QrPointForm): QrPointPayload {
  return {
    nombre: form.nombre.trim(),
    sucursalId: form.sucursalId,
    latitud: Number(form.latitud),
    longitud: Number(form.longitud),
    precisionMetros: form.precisionMetros ? Number(form.precisionMetros) : null,
    radioMetros: form.radioMetros ? Number(form.radioMetros) : 100,
    tipoQr: form.tipoQr,
    refreshSeconds:
      form.tipoQr === "dinamico" && form.refreshSeconds
        ? Number(form.refreshSeconds)
        : 20,
    estado: form.estado,
  };
}

function validateForm(payload: QrPointPayload) {
  if (!payload.nombre) return "Ingresa el nombre del punto QR.";
  if (!payload.sucursalId) return "Selecciona una sucursal.";
  if (
    !Number.isFinite(payload.latitud) ||
    payload.latitud < -90 ||
    payload.latitud > 90
  ) {
    return "Ingresa una latitud valida.";
  }
  if (
    !Number.isFinite(payload.longitud) ||
    payload.longitud < -180 ||
    payload.longitud > 180
  ) {
    return "Ingresa una longitud valida.";
  }
  if (
    payload.precisionMetros !== null &&
    payload.precisionMetros !== undefined &&
    (!Number.isFinite(payload.precisionMetros) || payload.precisionMetros < 0)
  ) {
    return "Ingresa una precision valida.";
  }
  if (
    !payload.radioMetros ||
    payload.radioMetros < 10 ||
    payload.radioMetros > 1000
  ) {
    return "El radio debe estar entre 10 y 1000 metros.";
  }
  if (
    payload.tipoQr === "dinamico" &&
    (!payload.refreshSeconds || payload.refreshSeconds < 20)
  ) {
    return "El QR dinamico debe cambiar como minimo cada 20 segundos.";
  }
  return null;
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function branchTypeLabel(tipo: Branch["tipo"]) {
  if (tipo === "tienda") return "POS";
  if (tipo === "almacen") return "Almacen";
  return "Asistencia";
}

function InputField({
  id,
  label,
  value,
  onChange,
  disabled,
  type = "text",
  step,
  min,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {label}
      </span>
      <input
        id={id}
        type={type}
        step={step}
        min={min}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-70"
      />
    </label>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
  danger = false,
}: {
  label: string;
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "text-[#ef4444]" : "text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "neutral";
}) {
  const toneClasses = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    warning: "bg-[#f59f00]/10 text-[#d97706]",
    neutral: "bg-[var(--color-input-bg)] text-[var(--color-text)]",
  }[tone];

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            toneClasses,
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)] font-circular-regular">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DropdownFilter({
  value,
  label,
  options,
  isOpen,
  onToggle,
  onSelect,
}: {
  value: string;
  label: string;
  options: { label: string; value: StatusFilter }[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: StatusFilter) => void;
}) {
  return (
    <div className="relative min-w-0 lg:w-[160px]">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
      >
        <span className="truncate">{label}</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-full rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-circular-regular transition-colors",
                value === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

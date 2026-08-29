"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { employeesApi, type Employee } from "@/lib/api/employees";
import {
  shiftsApi,
  type Shift,
  type ShiftPayload,
  type ShiftStatus,
} from "@/lib/api/shifts";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const pageSize = defaultPageSize;

const weekDays = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mie" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sab" },
  { value: 7, label: "Dom" },
];

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

type StatusFilter = "todos" | ShiftStatus;

type ShiftForm = {
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  diasLaborables: number[];
  estado: ShiftStatus;
};

const defaultForm: ShiftForm = {
  nombre: "",
  horaEntrada: "09:00",
  horaSalida: "18:00",
  diasLaborables: [1, 2, 3, 4, 5],
  estado: "activo",
};

function shiftToForm(shift?: Shift | null): ShiftForm {
  if (!shift) return defaultForm;

  return {
    nombre: shift.nombre,
    horaEntrada: shift.horaEntrada,
    horaSalida: shift.horaSalida,
    diasLaborables: shift.diasLaborables,
    estado: shift.estado,
  };
}

export default function AsistenciasTurnosPage() {
  const { showToast } = useSystemToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
    assignedEmployeesTotal: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workingShiftId, setWorkingShiftId] = useState("");
  const [deleteShift, setDeleteShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [assigningShift, setAssigningShift] = useState<Shift | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadShifts = useCallback(async () => {
    return shiftsApi.findAll({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      estado: selectedStatus === "todos" ? undefined : selectedStatus,
    });
  }, [currentPage, searchTerm, selectedStatus]);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      loadShifts()
        .then((response) => {
          if (!isMounted) return;
          setShifts(response.data);
          setMeta(response.meta);
        })
        .catch((error) => {
          if (!isMounted) return;
          showToast({
            title: "Error al cargar turnos",
            description:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar turnos.",
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
  }, [loadShifts, showToast]);

  const refreshShifts = async () => {
    const response = await loadShifts();
    setShifts(response.data);
    setMeta(response.meta);
  };

  const openCreateForm = () => {
    setEditingShift(null);
    setIsFormOpen(true);
  };

  const openEditForm = (shift: Shift) => {
    setEditingShift(shift);
    setIsFormOpen(true);
  };

  const handleStatusToggle = async (shift: Shift) => {
    if (workingShiftId) return;

    const nextStatus = shift.estado === "activo" ? "inactivo" : "activo";
    setWorkingShiftId(shift.id);

    try {
      await shiftsApi.updateStatus(shift.id, nextStatus);
      await refreshShifts();
      showToast({
        title: nextStatus === "activo" ? "Turno activado" : "Turno inactivado",
        description: `${shift.nombre} fue actualizado.`,
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
      setWorkingShiftId("");
    }
  };

  const confirmDeleteShift = async () => {
    if (!deleteShift || workingShiftId) return;

    setWorkingShiftId(deleteShift.id);

    try {
      await shiftsApi.remove(deleteShift.id);
      await refreshShifts();
      showToast({
        title: "Turno inactivado",
        description: `${deleteShift.nombre} fue dado de baja.`,
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
      setWorkingShiftId("");
      setDeleteShift(null);
    }
  };

  return (
    <DashboardShell headerTitle="Turnos">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            icon={<CalendarBlankIcon size={22} weight="fill" />}
            label="Total turnos"
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
            icon={<UsersThreeIcon size={22} weight="fill" />}
            label="Asignados"
            value={meta.assignedEmployeesTotal}
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
              placeholder="Buscar por nombre, horario o dias..."
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
            Nuevo turno
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
        ) : shifts.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
            <div className="text-center">
              <CalendarBlankIcon
                size={48}
                weight="light"
                className="mx-auto text-[var(--color-muted-foreground)]"
              />
              <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                No hay turnos
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Crea el primer horario para asignarlo al personal.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {shifts.map((shift) => (
              <ShiftRow
                key={shift.id}
                shift={shift}
                isWorking={workingShiftId === shift.id}
                onEdit={() => openEditForm(shift)}
                onAssign={() => setAssigningShift(shift)}
                onStatusToggle={() => handleStatusToggle(shift)}
                onDelete={() => setDeleteShift(shift)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {shifts.length} de {meta.total} turnos
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
        <ShiftFormModal
          shift={editingShift}
          onClose={() => setIsFormOpen(false)}
          onSaved={async () => {
            setIsFormOpen(false);
            await refreshShifts();
          }}
        />
      ) : null}

      {assigningShift ? (
        <AssignEmployeesModal
          shift={assigningShift}
          onClose={() => setAssigningShift(null)}
          onSaved={async () => {
            setAssigningShift(null);
            await refreshShifts();
          }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={deleteShift !== null}
        onClose={() => setDeleteShift(null)}
        onConfirm={confirmDeleteShift}
        title="Inactivar turno"
        description="El turno pasara a estado inactivo."
        itemName={deleteShift?.nombre}
        confirmLabel="Inactivar"
      />
    </DashboardShell>
  );
}

function ShiftRow({
  shift,
  isWorking,
  onEdit,
  onAssign,
  onStatusToggle,
  onDelete,
}: {
  shift: Shift;
  isWorking: boolean;
  onEdit: () => void;
  onAssign: () => void;
  onStatusToggle: () => void;
  onDelete: () => void;
}) {
  const status = statusConfig[shift.estado];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[1.2fr_1fr_1.2fr_.7fr_.9fr] md:items-center md:gap-3 md:gap-y-0 xl:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-border)]">
          <CalendarBlankIcon size={22} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--color-text)]">
            {shift.nombre}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)] font-circular-regular">
            {shift.assignedEmployeesTotal} trabajadores asignados
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Horario
        </p>
        <p className="text-sm font-circular-bold text-[var(--color-text)]">
          {shift.horaEntrada} - {shift.horaSalida}
        </p>
      </div>

      <div
        className="flex flex-wrap gap-1"
        title={formatDays(shift.diasLaborables)}
      >
        {weekDays
          .filter((day) => shift.diasLaborables.includes(day.value))
          .map((day) => (
            <span
              key={day.value}
              className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-[11px] font-circular-bold text-[var(--color-primary)]"
            >
              {day.label}
            </span>
          ))}
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
        <IconButton
          label="Asignar personal"
          disabled={isWorking}
          onClick={onAssign}
        >
          <UsersThreeIcon size={16} />
        </IconButton>
        <IconButton label="Editar" disabled={isWorking} onClick={onEdit}>
          <PencilSimpleIcon size={16} />
        </IconButton>
        <IconButton
          label={shift.estado === "activo" ? "Inactivar" : "Activar"}
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

function ShiftFormModal({
  shift,
  onClose,
  onSaved,
}: {
  shift: Shift | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useSystemToast();
  const [form, setForm] = useState<ShiftForm>(() => shiftToForm(shift));
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(shift);

  const closeModal = () => {
    if (isSubmitting) return;
    onClose();
  };

  const setField = (field: keyof ShiftForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleDay = (day: number) => {
    setForm((current) => ({
      ...current,
      diasLaborables: current.diasLaborables.includes(day)
        ? current.diasLaborables.filter((value) => value !== day)
        : [...current.diasLaborables, day].sort((left, right) => left - right),
    }));
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
      if (shift) {
        await shiftsApi.update(shift.id, payload);
      } else {
        await shiftsApi.create(payload);
      }

      showToast({
        title: shift ? "Turno actualizado" : "Turno creado",
        description: "Los datos fueron guardados correctamente.",
        variant: "success",
      });
      await onSaved();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el turno.";
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
      title={shift ? "Editar turno" : "Nuevo turno"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          id="shift-name"
          label="Nombre del turno"
          value={form.nombre}
          disabled={isSubmitting}
          onChange={(value) => setField("nombre", value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <InputField
            id="shift-start"
            label="Hora entrada"
            type="time"
            value={form.horaEntrada}
            disabled={isSubmitting}
            onChange={(value) => setField("horaEntrada", value)}
          />
          <InputField
            id="shift-end"
            label="Hora salida"
            type="time"
            value={form.horaSalida}
            disabled={isSubmitting}
            onChange={(value) => setField("horaSalida", value)}
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
            Dias laborables
          </span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {weekDays.map((day) => {
              const selected = form.diasLaborables.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "h-10 rounded-[12px] text-xs font-circular-bold transition-colors",
                    selected
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {isEditing ? (
          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Estado
            </span>
            <NativeSelect
              value={form.estado}
              disabled={isSubmitting}
              onChange={(event) =>
                setField("estado", event.target.value as ShiftStatus)
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
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSubmitting ? "Guardando..." : "Guardar turno"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignEmployeesModal({
  shift,
  onClose,
  onSaved,
}: {
  shift: Shift;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useSystemToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let isMounted = true;

    employeesApi
      .findAll({ estado: "activo", limit: 100 })
      .then((response) => {
        if (!isMounted) return;
        setEmployees(response.data);
        setSelectedIds(
          response.data
            .filter((employee) => employee.turnoId === shift.id)
            .map((employee) => employee.id),
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el personal.";
        setFormError(message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [shift.id]);

  const filteredEmployees = employees.filter((employee) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;

    return [
      employee.nombres,
      employee.apellidoPaterno ?? "",
      employee.apellidoMaterno ?? "",
      employee.numeroDocumento,
      employee.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const toggleEmployee = (employeeId: string) => {
    setSelectedIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  };

  const handleSubmit = async () => {
    setFormError("");
    setIsSubmitting(true);

    try {
      await shiftsApi.assignEmployees(shift.id, selectedIds);
      showToast({
        title: "Personal asignado",
        description: "El turno fue actualizado correctamente.",
        variant: "success",
      });
      await onSaved();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo asignar el personal.";
      setFormError(message);
      showToast({
        title: "No se pudo asignar",
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
      onClose={onClose}
      title={`Asignar personal: ${shift.nombre}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex h-11 items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
          <MagnifyingGlassIcon
            size={18}
            className="shrink-0 text-[var(--color-muted-foreground)]"
          />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar trabajador..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)]"
          />
        </div>

        <div className="content-scrollbar max-h-[360px] space-y-2 overflow-y-auto">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-[14px] bg-[var(--color-input-bg)]"
                />
              ))
            : filteredEmployees.map((employee) => {
                const selected = selectedIds.includes(employee.id);
                return (
                  <label
                    key={employee.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[14px] p-3 ring-1 transition-colors",
                      selected
                        ? "bg-[var(--color-primary)]/10 ring-[var(--color-primary)]/30"
                        : "bg-[var(--color-background)] ring-[var(--color-border)] hover:bg-[var(--color-input-bg)]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={isSubmitting}
                      onChange={() => toggleEmployee(employee.id)}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-circular-bold text-[var(--color-text)]">
                        {getEmployeeName(employee)}
                      </span>
                      <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                        {employee.numeroDocumento} - {employee.email}
                      </span>
                    </span>
                  </label>
                );
              })}

          {!isLoading && filteredEmployees.length === 0 ? (
            <div className="rounded-[14px] bg-[var(--color-input-bg)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
              No hay trabajadores activos para mostrar.
            </div>
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm font-circular-regular text-[#d9480f]">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSubmitting ? "Guardando..." : "Guardar asignacion"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function buildPayload(form: ShiftForm): ShiftPayload {
  return {
    nombre: form.nombre.trim(),
    horaEntrada: form.horaEntrada,
    horaSalida: form.horaSalida,
    diasLaborables: form.diasLaborables,
    estado: form.estado,
  };
}

function validateForm(payload: ShiftPayload) {
  if (!payload.nombre) return "Ingresa el nombre del turno.";
  if (!/^\d{2}:\d{2}$/.test(payload.horaEntrada)) {
    return "Ingresa la hora de entrada.";
  }
  if (!/^\d{2}:\d{2}$/.test(payload.horaSalida)) {
    return "Ingresa la hora de salida.";
  }
  if (payload.horaSalida <= payload.horaEntrada) {
    return "La salida debe ser mayor a la entrada.";
  }
  if (!payload.diasLaborables.length) return "Selecciona dias laborables.";
  return null;
}

function getEmployeeName(employee: Employee) {
  return [employee.nombres, employee.apellidoPaterno, employee.apellidoMaterno]
    .filter(Boolean)
    .join(" ");
}

function formatDays(days: number[]) {
  return weekDays
    .filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(", ");
}

function InputField({
  id,
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {label}
      </span>
      <input
        id={id}
        type={type}
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

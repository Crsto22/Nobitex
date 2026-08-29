"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CheckCircleIcon,
  CopyIcon,
  DeviceMobileIcon,
  DotsThreeVerticalIcon,
  IdentificationCardIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  UserCircleIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import {
  employeesApi,
  type Employee,
  type EmployeeDocumentType,
  type EmployeePayload,
  type EmployeeStatus,
} from "@/lib/api/employees";
import { shiftsApi, type Shift } from "@/lib/api/shifts";
import { formatDate } from "@/lib/intl";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const pageSize = defaultPageSize;

const documentLabels: Record<EmployeeDocumentType, string> = {
  dni: "DNI",
  carnet_extranjeria: "Carnet de extranjeria",
  otro: "Otro",
};

const statusConfig = {
  activo: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  inactivo: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

const accessStatusConfig = {
  pendiente: { label: "Pendiente", className: "bg-[#f59e0b]/10 text-[#d97706]" },
  activado: { label: "Activado", className: "bg-[#10b981]/10 text-[#059669]" },
  expirado: { label: "Expirado", className: "bg-[#ef4444]/10 text-[#dc2626]" },
};

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

type StatusFilter = "todos" | EmployeeStatus;

type EmployeeForm = {
  tipoDocumento: EmployeeDocumentType;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  turnoId: string;
  estado: EmployeeStatus;
};

const defaultForm: EmployeeForm = {
  tipoDocumento: "dni",
  numeroDocumento: "",
  nombres: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  email: "",
  telefono: "",
  turnoId: "",
  estado: "activo",
};

function employeeToForm(employee?: Employee | null): EmployeeForm {
  if (!employee) return defaultForm;

  return {
    tipoDocumento: employee.tipoDocumento,
    numeroDocumento: employee.numeroDocumento,
    nombres: employee.nombres,
    apellidoPaterno: employee.apellidoPaterno ?? "",
    apellidoMaterno: employee.apellidoMaterno ?? "",
    email: employee.email,
    telefono: employee.telefono,
    turnoId: employee.turnoId ?? "",
    estado: employee.estado,
  };
}

export default function AsistenciasPersonalPage() {
  const { showToast } = useSystemToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    activeTotal: 0,
    inactiveTotal: 0,
    dniTotal: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workingEmployeeId, setWorkingEmployeeId] = useState("");
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [resetDeviceEmployee, setResetDeviceEmployee] =
    useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [accessEmployee, setAccessEmployee] = useState<Employee | null>(null);
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadEmployees = useCallback(async () => {
    return employeesApi.findAll({
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

      loadEmployees()
        .then((response) => {
          if (!isMounted) return;
          setEmployees(response.data);
          setMeta(response.meta);
        })
        .catch((error) => {
          if (!isMounted) return;
          showToast({
            title: "Error al cargar trabajadores",
            description:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar trabajadores.",
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
  }, [loadEmployees, showToast]);

  useEffect(() => {
    let isMounted = true;

    shiftsApi
      .findAll({ estado: "activo", limit: 100 })
      .then((response) => {
        if (isMounted) setActiveShifts(response.data);
      })
      .catch(() => {
        if (isMounted) setActiveShifts([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshEmployees = async () => {
    const response = await loadEmployees();
    setEmployees(response.data);
    setMeta(response.meta);
  };

  const handleStatusToggle = async (employee: Employee) => {
    if (workingEmployeeId) return;

    const nextStatus = employee.estado === "activo" ? "inactivo" : "activo";
    setWorkingEmployeeId(employee.id);

    try {
      await employeesApi.updateStatus(employee.id, nextStatus);
      await refreshEmployees();
      showToast({
        title:
          nextStatus === "activo"
            ? "Trabajador activado"
            : "Trabajador desactivado",
        description: `${employee.nombres} fue actualizado.`,
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
      setWorkingEmployeeId("");
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!deleteEmployee || workingEmployeeId) return;

    setWorkingEmployeeId(deleteEmployee.id);

    try {
      await employeesApi.remove(deleteEmployee.id);
      await refreshEmployees();
      showToast({
        title: "Trabajador desactivado",
        description: `${deleteEmployee.nombres} fue dado de baja.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo desactivar",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setWorkingEmployeeId("");
      setDeleteEmployee(null);
    }
  };

  const openCreateForm = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const openEditForm = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const copyActivationUrl = async (employee: Employee) => {
    if (!employee.activationUrl) return;
    await navigator.clipboard.writeText(employee.activationUrl);
    showToast({
      title: "Enlace copiado",
      description:
        employee.accessStatus === "activado"
          ? "Envialo al trabajador para cambiar su PIN."
          : "Envialo al trabajador para crear su PIN.",
      variant: "success",
    });
  };

  const generateAccessToken = async (employee: Employee) => {
    if (workingEmployeeId) return;
    setWorkingEmployeeId(employee.id);

    try {
      const response = await employeesApi.generateAccessToken(employee.id);
      setAccessEmployee(response);
      await refreshEmployees();
      showToast({
        title:
          employee.accessStatus === "activado"
            ? "Enlace para nueva contraseña generado"
            : "Enlace generado",
        description: "Copia el enlace y compartelo con el trabajador.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo generar el enlace",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setWorkingEmployeeId("");
    }
  };

  const confirmResetDevice = async () => {
    if (!resetDeviceEmployee || workingEmployeeId) return;

    setWorkingEmployeeId(resetDeviceEmployee.id);
    try {
      await employeesApi.resetDevice(resetDeviceEmployee.id);
      await refreshEmployees();
      showToast({
        title: "Dispositivo borrado",
        description: `${resetDeviceEmployee.nombres} podra registrar un nuevo dispositivo.`,
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo borrar el dispositivo",
        description:
          error instanceof Error ? error.message : "Intentalo nuevamente.",
        variant: "error",
      });
    } finally {
      setWorkingEmployeeId("");
      setResetDeviceEmployee(null);
    }
  };

  return (
    <DashboardShell headerTitle="Personal">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <MetricCard
            icon={<UsersThreeIcon size={22} weight="fill" />}
            label="Total trabajadores"
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
            icon={<IdentificationCardIcon size={22} weight="fill" />}
            label="DNI registrados"
            value={meta.dniTotal}
            tone="danger"
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
              placeholder="Buscar por nombre, documento, email o celular..."
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
            Nuevo trabajador
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
        ) : employees.length === 0 ? (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
            <div className="text-center">
              <UserCircleIcon
                size={48}
                weight="light"
                className="mx-auto text-[var(--color-muted-foreground)]"
              />
              <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                No se encontraron trabajadores
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Crea un trabajador o ajusta los filtros.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {employees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                isWorking={workingEmployeeId === employee.id}
                isMenuOpen={openMenuId === employee.id}
                onToggleMenu={() =>
                  setOpenMenuId((current) =>
                    current === employee.id ? null : employee.id,
                  )
                }
                onCloseMenu={() => setOpenMenuId(null)}
                onEdit={() => openEditForm(employee)}
                onGenerateAccessToken={() => generateAccessToken(employee)}
                onCopyActivationUrl={() => copyActivationUrl(employee)}
                onStatusToggle={() => handleStatusToggle(employee)}
                onResetDevice={() => setResetDeviceEmployee(employee)}
                onDelete={() => setDeleteEmployee(employee)}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {employees.length} de {meta.total} trabajadores
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
        <EmployeeFormModal
          employee={editingEmployee}
          shifts={activeShifts}
          onClose={() => setIsFormOpen(false)}
          onSaved={async () => {
            await refreshEmployees();
            setIsFormOpen(false);
          }}
          onCreated={setAccessEmployee}
        />
      ) : null}

      {accessEmployee?.activationUrl ? (
        <ActivationLinkModal
          employee={accessEmployee}
          onClose={() => setAccessEmployee(null)}
          onCopy={() => copyActivationUrl(accessEmployee)}
        />
      ) : null}

      <ConfirmDialog
        isOpen={deleteEmployee !== null}
        onClose={() => setDeleteEmployee(null)}
        onConfirm={confirmDeleteEmployee}
        title="Desactivar trabajador"
        description="El trabajador pasara a estado inactivo."
        itemName={deleteEmployee ? getFullName(deleteEmployee) : undefined}
        confirmLabel="Desactivar"
      />

      <ConfirmDialog
        isOpen={resetDeviceEmployee !== null}
        onClose={() => setResetDeviceEmployee(null)}
        onConfirm={confirmResetDevice}
        title="Borrar dispositivo"
        description="El trabajador podra registrar otro celular para sus asistencias."
        itemName={
          resetDeviceEmployee ? getFullName(resetDeviceEmployee) : undefined
        }
        confirmLabel="Borrar dispositivo"
      />
    </DashboardShell>
  );
}

function EmployeeRow({
  employee,
  isWorking,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onGenerateAccessToken,
  onCopyActivationUrl,
  onStatusToggle,
  onResetDevice,
  onDelete,
}: {
  employee: Employee;
  isWorking: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onEdit: () => void;
  onGenerateAccessToken: () => void;
  onCopyActivationUrl: () => void;
  onStatusToggle: () => void;
  onResetDevice: () => void;
  onDelete: () => void;
}) {
  const status = statusConfig[employee.estado];
  const accessStatus = accessStatusConfig[employee.accessStatus];

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-colors hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:p-4 md:grid-cols-[1.1fr_0.8fr_1fr_0.55fr_0.55fr_0.5fr] md:items-center md:gap-3 md:gap-y-0 xl:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-border)]">
          <UserCircleIcon size={22} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--color-text)]">
            {getFullName(employee)}
          </p>
          <p className="truncate text-xs text-[var(--color-muted-foreground)] font-circular-regular">
            TRB-{employee.id.padStart(3, "0")} ·{" "}
            {formatDate(employee.createdAt)}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Documento
        </p>
        <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">
          {documentLabels[employee.tipoDocumento]} {employee.numeroDocumento}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm text-[var(--color-text)] font-circular-regular">
          {employee.email}
        </p>
        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
          {employee.telefono}
        </p>
        <span
          className={cn(
            "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-circular-bold",
            accessStatus.className,
          )}
        >
          Acceso: {accessStatus.label}
        </span>
        <span
          className={cn(
            "ml-1 mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-circular-bold",
            employee.deviceStatus === "registrado"
              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "bg-[#f1f5f9] text-[#64748b]",
          )}
        >
          {employee.deviceStatus === "registrado"
            ? "Dispositivo registrado"
            : "Sin dispositivo"}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] text-[var(--color-muted-foreground)]">
          Turno
        </p>
        <p className="text-xs font-circular-bold text-[var(--color-text)] font-circular-regular">
          {employee.turno ? employee.turno.nombre : "Sin turno"}
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

      <div className="relative flex justify-end md:justify-end">
        <button
          type="button"
          onClick={onToggleMenu}
          disabled={isWorking}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Más opciones"
        >
          <DotsThreeVerticalIcon size={20} weight="bold" />
        </button>
        {isMenuOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
            <MenuButton
              icon={<PencilSimpleIcon size={16} weight="bold" />}
              label="Editar"
              onClick={() => {
                onCloseMenu();
                onEdit();
              }}
            />
            {employee.activationUrl ? (
              <MenuButton
                icon={<CopyIcon size={16} weight="bold" />}
                label="Copiar enlace"
                onClick={() => {
                  onCloseMenu();
                  void onCopyActivationUrl();
                }}
              />
            ) : (
              <MenuButton
                icon={<LinkSimpleIcon size={16} weight="bold" />}
                label={
                  employee.accessStatus === "activado"
                    ? "Generar nueva contraseña"
                    : "Generar acceso"
                }
                onClick={() => {
                  onCloseMenu();
                  void onGenerateAccessToken();
                }}
              />
            )}
            <MenuButton
              icon={<DeviceMobileIcon size={16} weight="bold" />}
              label="Borrar dispositivo"
              disabled={employee.deviceStatus !== "registrado"}
              onClick={() => {
                onCloseMenu();
                onResetDevice();
              }}
            />
            <MenuButton
              icon={<PowerIcon size={16} weight="bold" />}
              label={employee.estado === "activo" ? "Desactivar" : "Activar"}
              onClick={() => {
                onCloseMenu();
                void onStatusToggle();
              }}
            />
            <MenuButton
              icon={<TrashIcon size={16} weight="bold" />}
              label="Desactivar trabajador"
              danger
              onClick={() => {
                onCloseMenu();
                onDelete();
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmployeeFormModal({
  employee,
  shifts,
  onClose,
  onSaved,
  onCreated,
}: {
  employee: Employee | null;
  shifts: Shift[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onCreated: (employee: Employee) => void;
}) {
  const { showToast } = useSystemToast();
  const [form, setForm] = useState<EmployeeForm>(() =>
    employeeToForm(employee),
  );
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const isEditing = Boolean(employee);
  const canSearchDni =
    form.tipoDocumento === "dni" && /^\d{8}$/.test(form.numeroDocumento);
  const selectableShifts =
    employee?.turno && !shifts.some((shift) => shift.id === employee.turno?.id)
      ? [
          {
            ...employee.turno,
            empresaId: "",
            diasLaborables: [],
            estado: "inactivo" as const,
            assignedEmployeesTotal: 0,
            createdAt: "",
            updatedAt: "",
          },
          ...shifts,
        ]
      : shifts;

  const setField = (field: keyof EmployeeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeModal = () => {
    if (isSubmitting || isSearchingDni) return;
    onClose();
  };

  const handleSearchDni = async () => {
    if (!canSearchDni) {
      setFormError("El DNI debe tener 8 digitos.");
      return;
    }

    setFormError("");
    setIsSearchingDni(true);

    try {
      const response = await employeesApi.consultarDni(form.numeroDocumento);
      setForm((current) =>
        current.tipoDocumento === "dni" &&
        current.numeroDocumento === response.dni
          ? {
              ...current,
              nombres: response.nombres ?? current.nombres,
              apellidoPaterno:
                response.apellidoPaterno ?? current.apellidoPaterno,
              apellidoMaterno:
                response.apellidoMaterno ?? current.apellidoMaterno,
            }
          : current,
      );
      showToast({
        title: "Datos encontrados",
        description: "Se completo la informacion del DNI.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo consultar el DNI.";
      setFormError(message);
      showToast({
        title: "No se pudo consultar",
        description: message,
        variant: "error",
      });
    } finally {
      setIsSearchingDni(false);
    }
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
      let savedEmployee: Employee;
      if (employee) {
        savedEmployee = await employeesApi.update(employee.id, payload);
      } else {
        savedEmployee = await employeesApi.create(payload);
      }
      showToast({
        title: isEditing ? "Trabajador actualizado" : "Trabajador creado",
        description: "Los datos fueron guardados.",
        variant: "success",
      });
      await onSaved();
      if (!employee && savedEmployee.activationUrl) {
        onCreated(savedEmployee);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar.";
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
      title={isEditing ? "Editar trabajador" : "Nuevo trabajador"}
      description="Datos del trabajador para asistencias."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Tipo de documento
            </span>
            <NativeSelect
              value={form.tipoDocumento}
              disabled={isSubmitting || isSearchingDni}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tipoDocumento: event.target.value as EmployeeDocumentType,
                  numeroDocumento: "",
                }))
              }
              className="h-11 w-full rounded-[14px] border-0 bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option value="dni">DNI</option>
              <option value="carnet_extranjeria">Carnet de extranjeria</option>
              <option value="otro">Otro</option>
            </NativeSelect>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Numero de documento
            </span>
            <div className="flex gap-2">
              <input
                value={form.numeroDocumento}
                maxLength={form.tipoDocumento === "dni" ? 8 : 30}
                disabled={isSubmitting || isSearchingDni}
                onChange={(event) =>
                  setField(
                    "numeroDocumento",
                    form.tipoDocumento === "dni"
                      ? event.target.value.replace(/\D/g, "").slice(0, 8)
                      : event.target.value,
                  )
                }
                className="h-11 min-w-0 flex-1 rounded-[14px] bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder={
                  form.tipoDocumento === "dni" ? "12345678" : "Documento"
                }
              />
              {form.tipoDocumento === "dni" ? (
                <button
                  type="button"
                  onClick={handleSearchDni}
                  disabled={!canSearchDni || isSubmitting || isSearchingDni}
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MagnifyingGlassIcon size={15} weight="bold" />
                  {isSearchingDni ? "Buscando..." : "Buscar DNI"}
                </button>
              ) : null}
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <InputField
            id="employee-names"
            label="Nombres"
            value={form.nombres}
            disabled={isSubmitting || isSearchingDni}
            onChange={(value) => setField("nombres", value)}
          />
          <InputField
            id="employee-last-name-1"
            label="Apellido paterno"
            value={form.apellidoPaterno}
            disabled={isSubmitting || isSearchingDni}
            onChange={(value) => setField("apellidoPaterno", value)}
          />
          <InputField
            id="employee-last-name-2"
            label="Apellido materno"
            value={form.apellidoMaterno}
            disabled={isSubmitting || isSearchingDni}
            onChange={(value) => setField("apellidoMaterno", value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <InputField
            id="employee-email"
            label="Correo"
            type="email"
            value={form.email}
            disabled={isSubmitting || isSearchingDni}
            onChange={(value) => setField("email", value)}
          />
          <InputField
            id="employee-phone"
            label="Celular"
            value={form.telefono}
            disabled={isSubmitting || isSearchingDni}
            onChange={(value) => setField("telefono", value)}
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
            Turno
          </span>
          <NativeSelect
            value={form.turnoId}
            disabled={isSubmitting || isSearchingDni}
            onChange={(event) => setField("turnoId", event.target.value)}
            className="h-11 w-full rounded-[14px] border-0 bg-[var(--color-input-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="">Sin turno</option>
            {selectableShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.nombre} ({shift.horaEntrada} - {shift.horaSalida})
              </option>
            ))}
          </NativeSelect>
        </label>

        {isEditing ? (
          <label className="block">
            <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
              Estado
            </span>
            <NativeSelect
              value={form.estado}
              disabled={isSubmitting || isSearchingDni}
              onChange={(event) =>
                setField("estado", event.target.value as EmployeeStatus)
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
            disabled={isSubmitting || isSearchingDni}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isSearchingDni}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            {isSubmitting ? "Guardando..." : "Guardar trabajador"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ActivationLinkModal({
  employee,
  onClose,
  onCopy,
}: {
  employee: Employee;
  onClose: () => void;
  onCopy: () => void;
}) {
  const isPinChange = employee.accessStatus === "activado";

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isPinChange ? "Enlace para cambiar PIN" : "Enlace de activación"}
      description={
        isPinChange
          ? "Comparte este enlace para que el trabajador cambie su PIN."
          : "Comparte este enlace para que el trabajador cree su PIN."
      }
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded-[14px] bg-[var(--color-input-bg)] p-4">
          <p className="text-sm font-circular-bold text-[var(--color-text)]">
            {getFullName(employee)}
          </p>
          <p className="mt-1 break-all text-xs text-[var(--color-muted-foreground)]">
            {employee.activationUrl}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 flex-1 rounded-[14px] border-transparent bg-[var(--color-input-bg)] text-sm font-circular-bold text-[var(--color-text)] hover:bg-[var(--color-button-hover)]"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={onCopy}
            className="h-11 flex-1 rounded-[14px] bg-[var(--color-primary)] text-sm font-circular-bold text-white hover:opacity-90"
          >
            <CopyIcon size={16} weight="bold" />
            Copiar enlace
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function buildPayload(form: EmployeeForm): EmployeePayload {
  return {
    tipoDocumento: form.tipoDocumento,
    numeroDocumento: form.numeroDocumento.trim(),
    nombres: form.nombres.trim(),
    apellidoPaterno: form.apellidoPaterno.trim() || undefined,
    apellidoMaterno: form.apellidoMaterno.trim() || undefined,
    email: form.email.trim().toLowerCase(),
    telefono: form.telefono.trim(),
    turnoId: form.turnoId || null,
    estado: form.estado,
  };
}

function validateForm(payload: EmployeePayload) {
  if (!payload.numeroDocumento) return "Ingresa el documento.";
  if (
    payload.tipoDocumento === "dni" &&
    !/^\d{8}$/.test(payload.numeroDocumento)
  ) {
    return "El DNI debe tener 8 digitos.";
  }
  if (!payload.nombres) return "Ingresa los nombres.";
  if (!payload.email) return "Ingresa el correo.";
  if (!payload.telefono) return "Ingresa el celular.";
  return null;
}

function getFullName(employee: Employee) {
  return [employee.nombres, employee.apellidoPaterno, employee.apellidoMaterno]
    .filter(Boolean)
    .join(" ");
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

function MenuButton({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular transition-colors",
        disabled
          ? "cursor-not-allowed text-[var(--color-muted-foreground)] opacity-50"
          : danger
            ? "text-[#ef4444] hover:bg-[#ef4444]/10"
            : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
      )}
    >
      {icon}
      {label}
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
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    success: "bg-[#10b981]/10 text-[#10b981]",
    warning: "bg-[#f59e0b]/10 text-[#d97706]",
    danger: "bg-[#3b82f6]/10 text-[#3b82f6]",
  }[tone];

  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            toneClass,
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
  options: { label: string; value: string }[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
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

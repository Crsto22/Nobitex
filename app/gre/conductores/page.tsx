"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon,
  TruckIcon,
  UserCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import { ConfirmDialog } from "@/components/Modal/confirm-dialog";
import { Modal } from "@/components/Modal/modal";
import { useSystemToast } from "@/components/SystemToast/system-toast";
import { Button } from "@/components/ui/button";
import {
  guiaRemisionCatalogosApi,
  type GuiaCatalogoParticipante,
  type GuiaCatalogoVehiculo,
} from "@/lib/api/guia-remision";
import { defaultPageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type Tab = "conductores" | "vehiculos";
type StatusFilter = "todos" | "activo" | "inactivo";

const pageSize = defaultPageSize;

const defaultDriverForm = {
  tipoDocumento: "1",
  numeroDocumento: "",
  nombres: "",
  apellidos: "",
  licencia: "",
  activo: true,
};

const defaultVehicleForm = {
  placa: "",
  marca: "",
  modelo: "",
  activo: true,
};

type DriverForm = typeof defaultDriverForm;
type VehicleForm = typeof defaultVehicleForm;

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
];

const statusConfig = {
  true: { label: "Activo", bg: "bg-[#10b981]", text: "text-white" },
  false: { label: "Inactivo", bg: "bg-[#6b7280]", text: "text-white" },
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

function normalizeLicense(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").slice(0, 20);
}

export default function GreConductoresPage() {
  const { showToast } = useSystemToast();
  const [activeTab, setActiveTab] = useState<Tab>("conductores");
  const [conductores, setConductores] = useState<GuiaCatalogoParticipante[]>([]);
  const [vehiculos, setVehiculos] = useState<GuiaCatalogoVehiculo[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("todos");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [driverForm, setDriverForm] = useState<DriverForm>(defaultDriverForm);
  const [vehicleForm, setVehicleForm] =
    useState<VehicleForm>(defaultVehicleForm);
  const [editingDriver, setEditingDriver] =
    useState<GuiaCatalogoParticipante | null>(null);
  const [editingVehicle, setEditingVehicle] =
    useState<GuiaCatalogoVehiculo | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [deleteDriver, setDeleteDriver] =
    useState<GuiaCatalogoParticipante | null>(null);
  const [deleteVehicle, setDeleteVehicle] =
    useState<GuiaCatalogoVehiculo | null>(null);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      const activo =
        selectedStatus === "activo"
          ? true
          : selectedStatus === "inactivo"
            ? false
            : undefined;

      const request =
        activeTab === "conductores"
          ? guiaRemisionCatalogosApi.findParticipantes({
              page,
              limit: pageSize,
              q: searchTerm,
              tipo: "conductor",
              activo,
            })
          : guiaRemisionCatalogosApi.findVehiculos({
              page,
              limit: pageSize,
              q: searchTerm,
              activo,
            });

      request
        .then((response) => {
          if (!isMounted) return;

          if (activeTab === "conductores") {
            setConductores(
              response.data as GuiaCatalogoParticipante[],
            );
          } else {
            setVehiculos(response.data as GuiaCatalogoVehiculo[]);
          }
          setMeta(response.meta);
        })
        .catch((error: unknown) => {
          if (!isMounted) return;
          showToast({
            title: "No se pudo cargar el catalogo",
            description: getErrorMessage(error, "Intentalo nuevamente."),
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
  }, [activeTab, page, searchTerm, selectedStatus, showToast]);

  const summary = useMemo(() => {
    const items = activeTab === "conductores" ? conductores : vehiculos;
    return {
      activos: items.filter((item) => item.activo).length,
      inactivos: items.filter((item) => !item.activo).length,
      total: meta.total,
    };
  }, [activeTab, conductores, meta.total, vehiculos]);

  const refreshCurrent = async (targetPage = page) => {
    const activo =
      selectedStatus === "activo"
        ? true
        : selectedStatus === "inactivo"
          ? false
          : undefined;

    if (activeTab === "conductores") {
      const response = await guiaRemisionCatalogosApi.findParticipantes({
        page: targetPage,
        limit: pageSize,
        q: searchTerm,
        tipo: "conductor",
        activo,
      });
      setConductores(response.data);
      setMeta(response.meta);
    } else {
      const response = await guiaRemisionCatalogosApi.findVehiculos({
        page: targetPage,
        limit: pageSize,
        q: searchTerm,
        activo,
      });
      setVehiculos(response.data);
      setMeta(response.meta);
    }
  };

  const openCreateDriver = () => {
    setEditingDriver(null);
    setDriverForm(defaultDriverForm);
    setFormError("");
    setIsDriverModalOpen(true);
  };

  const openCreateVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm(defaultVehicleForm);
    setFormError("");
    setIsVehicleModalOpen(true);
  };

  const openEditDriver = (driver: GuiaCatalogoParticipante) => {
    setEditingDriver(driver);
    setDriverForm({
      tipoDocumento: driver.tipoDocumento,
      numeroDocumento: driver.numeroDocumento,
      nombres: driver.nombres ?? "",
      apellidos: driver.apellidos ?? "",
      licencia: driver.licencia ?? "",
      activo: driver.activo,
    });
    setFormError("");
    setOpenMenuId(null);
    setIsDriverModalOpen(true);
  };

  const openEditVehicle = (vehicle: GuiaCatalogoVehiculo) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      placa: vehicle.placa,
      marca: vehicle.marca ?? "",
      modelo: vehicle.modelo ?? "",
      activo: vehicle.activo,
    });
    setFormError("");
    setOpenMenuId(null);
    setIsVehicleModalOpen(true);
  };

  const closeModals = () => {
    if (isSubmitting) return;
    setIsDriverModalOpen(false);
    setIsVehicleModalOpen(false);
    setEditingDriver(null);
    setEditingVehicle(null);
    setDriverForm(defaultDriverForm);
    setVehicleForm(defaultVehicleForm);
    setFormError("");
  };

  const submitDriver = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const numeroDocumento = driverForm.numeroDocumento.trim();
    const nombres = driverForm.nombres.trim();
    const apellidos = driverForm.apellidos.trim();
    const licencia = driverForm.licencia.trim();

    if (!/^\d{8}$/.test(numeroDocumento)) {
      setFormError("El DNI del conductor debe tener 8 digitos.");
      return;
    }
    if (!nombres || !apellidos || !licencia) {
      setFormError("Completa nombres, apellidos y licencia.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tipo: "conductor" as const,
        tipoDocumento: driverForm.tipoDocumento,
        numeroDocumento,
        nombres,
        apellidos,
        licencia: normalizeLicense(licencia),
        activo: driverForm.activo,
      };
      const saved = editingDriver
        ? await guiaRemisionCatalogosApi.updateParticipante(
            editingDriver.publicId,
            payload,
          )
        : await guiaRemisionCatalogosApi.createParticipante(payload);

      const targetPage = editingDriver ? page : 1;
      setPage(targetPage);
      await refreshCurrent(targetPage);
      showToast({
        title: editingDriver ? "Conductor actualizado" : "Conductor creado",
        description: `${saved.nombres ?? ""} ${saved.apellidos ?? ""}`.trim(),
        variant: "success",
      });
      closeModals();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "No se pudo guardar conductor.");
      setFormError(message);
      showToast({ title: "No se pudo guardar", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const placa = normalizePlate(vehicleForm.placa);
    if (!placa) {
      setFormError("Ingresa la placa del vehiculo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        placa,
        marca: vehicleForm.marca.trim() || undefined,
        modelo: vehicleForm.modelo.trim() || undefined,
        activo: vehicleForm.activo,
      };
      const saved = editingVehicle
        ? await guiaRemisionCatalogosApi.updateVehiculo(
            editingVehicle.publicId,
            payload,
          )
        : await guiaRemisionCatalogosApi.createVehiculo(payload);

      const targetPage = editingVehicle ? page : 1;
      setPage(targetPage);
      await refreshCurrent(targetPage);
      showToast({
        title: editingVehicle ? "Placa actualizada" : "Placa creada",
        description: saved.placa,
        variant: "success",
      });
      closeModals();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "No se pudo guardar vehiculo.");
      setFormError(message);
      showToast({ title: "No se pudo guardar", description: message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDriver = async (driver: GuiaCatalogoParticipante) => {
    setOpenMenuId(null);
    try {
      await guiaRemisionCatalogosApi.updateParticipante(driver.publicId, {
        tipo: "conductor",
        tipoDocumento: driver.tipoDocumento,
        numeroDocumento: driver.numeroDocumento,
        nombres: driver.nombres ?? "",
        apellidos: driver.apellidos ?? "",
        licencia: driver.licencia ?? "",
        activo: !driver.activo,
      });
      await refreshCurrent();
      showToast({
        title: !driver.activo ? "Conductor activado" : "Conductor inactivado",
        description: driver.numeroDocumento,
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo actualizar",
        description: getErrorMessage(error, "Intentalo nuevamente."),
        variant: "error",
      });
    }
  };

  const toggleVehicle = async (vehicle: GuiaCatalogoVehiculo) => {
    setOpenMenuId(null);
    try {
      await guiaRemisionCatalogosApi.updateVehiculo(vehicle.publicId, {
        placa: vehicle.placa,
        marca: vehicle.marca ?? undefined,
        modelo: vehicle.modelo ?? undefined,
        activo: !vehicle.activo,
      });
      await refreshCurrent();
      showToast({
        title: !vehicle.activo ? "Placa activada" : "Placa inactivada",
        description: vehicle.placa,
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo actualizar",
        description: getErrorMessage(error, "Intentalo nuevamente."),
        variant: "error",
      });
    }
  };

  const confirmDeleteDriver = async () => {
    if (!deleteDriver) return;

    try {
      await guiaRemisionCatalogosApi.removeParticipante(deleteDriver.publicId);
      const targetPage =
        conductores.length === 1 && page > 1 ? page - 1 : page;
      setPage(targetPage);
      await refreshCurrent(targetPage);
      showToast({
        title: "Conductor eliminado",
        description: "Se elimino de manera logica.",
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo eliminar",
        description: getErrorMessage(error, "Intentalo nuevamente."),
        variant: "error",
      });
    } finally {
      setDeleteDriver(null);
    }
  };

  const confirmDeleteVehicle = async () => {
    if (!deleteVehicle) return;

    try {
      await guiaRemisionCatalogosApi.removeVehiculo(deleteVehicle.publicId);
      const targetPage = vehiculos.length === 1 && page > 1 ? page - 1 : page;
      setPage(targetPage);
      await refreshCurrent(targetPage);
      showToast({
        title: "Placa eliminada",
        description: "Se elimino de manera logica.",
        variant: "success",
      });
    } catch (error: unknown) {
      showToast({
        title: "No se pudo eliminar",
        description: getErrorMessage(error, "Intentalo nuevamente."),
        variant: "error",
      });
    } finally {
      setDeleteVehicle(null);
    }
  };

  const items = activeTab === "conductores" ? conductores : vehiculos;

  return (
    <DashboardShell headerTitle="Conductores GRE">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--color-background)] p-3 transition-colors duration-200 sm:gap-4 sm:p-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <SummaryCard label="Activos" value={summary.activos} icon={CheckCircleIcon} color="text-[#10b981]" bg="bg-[#10b981]/10" />
          <SummaryCard label="Inactivos" value={summary.inactivos} icon={WarningCircleIcon} color="text-[#f59e0b]" bg="bg-[#f59e0b]/10" />
          <SummaryCard label={activeTab === "conductores" ? "Conductores" : "Placas"} value={summary.total} icon={activeTab === "conductores" ? UserCircleIcon : TruckIcon} color="text-[var(--color-primary)]" bg="bg-[#101d69]/10 dark:bg-[#fd741a]/10" />
        </div>

        <div className="flex flex-col gap-3 rounded-[16px] bg-[var(--color-card)] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 rounded-[14px] bg-[var(--color-input-bg)] p-1 sm:w-[320px]">
            {[
              { label: "Conductores", value: "conductores" as Tab, icon: UserCircleIcon },
              { label: "Placas", value: "vehiculos" as Tab, icon: TruckIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.value);
                    setPage(1);
                    setOpenMenuId(null);
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-[12px] text-sm font-circular-bold transition-colors",
                    active
                      ? "bg-[var(--color-primary)] text-white shadow-sm"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-button-hover)]",
                  )}
                >
                  <Icon size={17} weight="bold" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            size="lg"
            className="h-10 rounded-[12px] bg-[var(--color-primary)] px-4 text-white hover:bg-[var(--color-primary)]/90"
            onClick={activeTab === "conductores" ? openCreateDriver : openCreateVehicle}
          >
            <PlusIcon size={17} weight="bold" />
            {activeTab === "conductores" ? "Nuevo conductor" : "Nueva placa"}
          </Button>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 sm:flex-row sm:items-center lg:-mx-6 lg:px-6 dark:bg-[var(--color-background)]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
            />
            <input
              type="text"
              placeholder={
                activeTab === "conductores"
                  ? "Buscar por DNI, nombres, apellidos o licencia..."
                  : "Buscar por placa, marca o modelo..."
              }
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
                setOpenMenuId(null);
              }}
              className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedStatus(option.value);
                  setPage(1);
                  setOpenMenuId(null);
                }}
                className={cn(
                  "h-11 rounded-[14px] px-4 text-sm font-circular-bold transition-colors",
                  selectedStatus === option.value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-input-bg)] text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pr-1 pb-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[88px] animate-pulse rounded-[14px] bg-[var(--color-card)] shadow-[0_2px_10px_rgba(21,25,34,0.08)]"
              />
            ))
          ) : items.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[14px] bg-[var(--color-card)]">
              <div className="text-center">
                {activeTab === "conductores" ? (
                  <UserCircleIcon size={48} weight="light" className="mx-auto text-[var(--color-muted-foreground)]" />
                ) : (
                  <TruckIcon size={48} weight="light" className="mx-auto text-[var(--color-muted-foreground)]" />
                )}
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  {activeTab === "conductores"
                    ? "No se encontraron conductores"
                    : "No se encontraron placas"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Crea un registro para usarlo en guias de remision
                </p>
              </div>
            </div>
          ) : activeTab === "conductores" ? (
            conductores.map((driver) => (
              <DriverRow
                key={driver.publicId}
                driver={driver}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onEdit={openEditDriver}
                onToggle={toggleDriver}
                onDelete={setDeleteDriver}
              />
            ))
          ) : (
            vehiculos.map((vehicle) => (
              <VehicleRow
                key={vehicle.publicId}
                vehicle={vehicle}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                onEdit={openEditVehicle}
                onToggle={toggleVehicle}
                onDelete={setDeleteVehicle}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {items.length} de {meta.total} registros
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-3 text-xs font-circular-bold text-white">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-circular-regular text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page >= meta.totalPages || isLoading}
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isDriverModalOpen}
        onClose={closeModals}
        title={editingDriver ? "Editar conductor" : "Nuevo conductor"}
        size="md"
      >
        <form onSubmit={submitDriver} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="driver-dni"
              label="DNI"
              value={driverForm.numeroDocumento}
              maxLength={8}
              disabled={isSubmitting}
              onChange={(value) =>
                setDriverForm((current) => ({
                  ...current,
                  numeroDocumento: value.replace(/\D/g, "").slice(0, 8),
                }))
              }
            />
            <InputField
              id="driver-license"
              label="Licencia"
              value={driverForm.licencia}
              maxLength={20}
              disabled={isSubmitting}
              onChange={(value) =>
                setDriverForm((current) => ({
                  ...current,
                  licencia: normalizeLicense(value),
                }))
              }
            />
          </div>
          <InputField
            id="driver-names"
            label="Nombres"
            value={driverForm.nombres}
            disabled={isSubmitting}
            onChange={(value) => setDriverForm((current) => ({ ...current, nombres: value }))}
          />
          <InputField
            id="driver-lastnames"
            label="Apellidos"
            value={driverForm.apellidos}
            disabled={isSubmitting}
            onChange={(value) => setDriverForm((current) => ({ ...current, apellidos: value }))}
          />
          <ToggleField
            checked={driverForm.activo}
            disabled={isSubmitting}
            onChange={(checked) => setDriverForm((current) => ({ ...current, activo: checked }))}
          />
          {formError ? (
            <p className="rounded-[12px] bg-[#ef4444]/10 px-3 py-2 text-sm font-medium text-[#dc2626]">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeModals} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isVehicleModalOpen}
        onClose={closeModals}
        title={editingVehicle ? "Editar placa" : "Nueva placa"}
        size="md"
      >
        <form onSubmit={submitVehicle} className="space-y-4">
          <InputField
            id="vehicle-plate"
            label="Placa"
            value={vehicleForm.placa}
            maxLength={10}
            disabled={isSubmitting}
            onChange={(value) =>
              setVehicleForm((current) => ({ ...current, placa: normalizePlate(value) }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              id="vehicle-brand"
              label="Marca"
              value={vehicleForm.marca}
              disabled={isSubmitting}
              onChange={(value) => setVehicleForm((current) => ({ ...current, marca: value }))}
            />
            <InputField
              id="vehicle-model"
              label="Modelo"
              value={vehicleForm.modelo}
              disabled={isSubmitting}
              onChange={(value) => setVehicleForm((current) => ({ ...current, modelo: value }))}
            />
          </div>
          <ToggleField
            checked={vehicleForm.activo}
            disabled={isSubmitting}
            onChange={(checked) => setVehicleForm((current) => ({ ...current, activo: checked }))}
          />
          {formError ? (
            <p className="rounded-[12px] bg-[#ef4444]/10 px-3 py-2 text-sm font-medium text-[#dc2626]">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeModals} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteDriver)}
        title="Eliminar conductor"
        description="El registro quedara inactivo y no aparecera para nuevas guias."
        itemName={deleteDriver?.numeroDocumento}
        onClose={() => setDeleteDriver(null)}
        onConfirm={confirmDeleteDriver}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteVehicle)}
        title="Eliminar placa"
        description="El registro quedara inactivo y no aparecera para nuevas guias."
        itemName={deleteVehicle?.placa}
        onClose={() => setDeleteVehicle(null)}
        onConfirm={confirmDeleteVehicle}
      />
    </DashboardShell>
  );
}

function SummaryCard(props: {
  label: string;
  value: number;
  icon: typeof CheckCircleIcon;
  color: string;
  bg: string;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-2xl bg-[var(--color-sidebar-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", props.bg)}>
          <Icon size={22} weight="fill" className={props.color} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{props.label}</p>
          <p className="text-2xl font-circular-bold leading-none text-[var(--color-text)]">{props.value}</p>
        </div>
      </div>
    </div>
  );
}

function DriverRow(props: {
  driver: GuiaCatalogoParticipante;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onEdit: (driver: GuiaCatalogoParticipante) => void;
  onToggle: (driver: GuiaCatalogoParticipante) => void;
  onDelete: (driver: GuiaCatalogoParticipante) => void;
}) {
  const status = statusConfig[String(props.driver.activo) as "true" | "false"];
  const fullName = [props.driver.nombres, props.driver.apellidos]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] sm:p-4 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_40px] md:items-center md:gap-3 md:gap-y-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
          <UserCircleIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">{fullName || "Sin nombre"}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">DNI: {props.driver.numeroDocumento}</p>
        </div>
      </div>
      <InfoCell icon={IdentificationCardIcon} label="Licencia" value={props.driver.licencia ?? "-"} />
      <InfoCell icon={CheckCircleIcon} label="Documento" value={props.driver.tipoDocumento === "1" ? "DNI" : props.driver.tipoDocumento} />
      <StatusPill status={status} />
      <RowMenu
        id={props.driver.publicId}
        openMenuId={props.openMenuId}
        setOpenMenuId={props.setOpenMenuId}
        active={props.driver.activo}
        onEdit={() => props.onEdit(props.driver)}
        onToggle={() => props.onToggle(props.driver)}
        onDelete={() => props.onDelete(props.driver)}
      />
    </div>
  );
}

function VehicleRow(props: {
  vehicle: GuiaCatalogoVehiculo;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onEdit: (vehicle: GuiaCatalogoVehiculo) => void;
  onToggle: (vehicle: GuiaCatalogoVehiculo) => void;
  onDelete: (vehicle: GuiaCatalogoVehiculo) => void;
}) {
  const status = statusConfig[String(props.vehicle.activo) as "true" | "false"];
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-[14px] bg-[var(--color-card)] p-3 shadow-[0_2px_10px_rgba(21,25,34,0.12)] sm:p-4 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_40px] md:items-center md:gap-3 md:gap-y-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
          <TruckIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-circular-bold text-[var(--color-text)]">{props.vehicle.placa}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Vehiculo para GRE</p>
        </div>
      </div>
      <InfoCell icon={TruckIcon} label="Marca" value={props.vehicle.marca ?? "-"} />
      <InfoCell icon={IdentificationCardIcon} label="Modelo" value={props.vehicle.modelo ?? "-"} />
      <StatusPill status={status} />
      <RowMenu
        id={props.vehicle.publicId}
        openMenuId={props.openMenuId}
        setOpenMenuId={props.setOpenMenuId}
        active={props.vehicle.activo}
        onEdit={() => props.onEdit(props.vehicle)}
        onToggle={() => props.onToggle(props.vehicle)}
        onDelete={() => props.onDelete(props.vehicle)}
      />
    </div>
  );
}

function InfoCell(props: {
  icon: typeof IdentificationCardIcon;
  label: string;
  value: string;
}) {
  const Icon = props.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-[var(--color-muted-foreground)]" />
      <div className="min-w-0">
        <p className="text-[10px] text-[var(--color-muted-foreground)]">{props.label}</p>
        <p className="truncate text-sm text-[var(--color-text)]">{props.value}</p>
      </div>
    </div>
  );
}

function StatusPill(props: { status: { label: string; bg: string; text: string } }) {
  return (
    <span className={cn("inline-flex w-fit rounded-full px-3 py-1 text-xs font-circular-bold", props.status.bg, props.status.text)}>
      {props.status.label}
    </span>
  );
}

function RowMenu(props: {
  id: string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  active: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isOpen = props.openMenuId === props.id;
  return (
    <div className="relative flex items-center justify-end md:justify-end">
      <button
        type="button"
        onClick={() => props.setOpenMenuId(isOpen ? null : props.id)}
        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
        aria-label="Mas opciones"
      >
        <DotsThreeVerticalIcon size={20} weight="bold" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
          <MenuButton icon={PencilSimpleIcon} label="Editar" onClick={props.onEdit} />
          <MenuButton icon={PowerIcon} label={props.active ? "Inactivar" : "Activar"} onClick={props.onToggle} />
          <MenuButton icon={TrashIcon} label="Eliminar" danger onClick={props.onDelete} />
        </div>
      ) : null}
    </div>
  );
}

function MenuButton(props: {
  icon: typeof PencilSimpleIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-circular-regular transition-colors hover:bg-[var(--color-button-hover)]",
        props.danger ? "text-[#dc2626]" : "text-[var(--color-text)]",
      )}
    >
      <Icon size={16} weight="bold" />
      {props.label}
    </button>
  );
}

function InputField(props: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={props.id} className="block">
      <span className="mb-2 block text-sm font-circular-regular text-[#4e5671]">
        {props.label}
      </span>
      <input
        id={props.id}
        type="text"
        value={props.value}
        maxLength={props.maxLength}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function ToggleField(props: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[14px] bg-[var(--color-input-bg)] px-4 py-3">
      <span className="text-sm font-circular-regular text-[var(--color-text)]">
        Activo
      </span>
      <button
        type="button"
        role="switch"
        disabled={props.disabled}
        onClick={() => props.onChange(!props.checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          props.checked ? "bg-[var(--color-primary)]" : "bg-[#9ca3af]",
        )}
        aria-checked={props.checked}
        aria-label="Activo"
      >
        <span
          className={cn(
            "absolute left-0 top-1 h-4 w-4 rounded-full bg-white transition-transform",
            props.checked ? "translate-x-5" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

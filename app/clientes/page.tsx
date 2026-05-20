"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSimpleIcon,
  TrashIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  IdentificationCardIcon,
  BuildingOfficeIcon,
  CaretDownIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";

const clients = [
  {
    id: "001",
    name: "María García López",
    email: "maria.garcia@email.com",
    phone: "987 654 321",
    dni: "72345678",
    docType: "dni",
    address: "Av. Principal 123, Lima",
    purchases: 12,
    totalSpent: "S/1,250.00",
    status: "active",
  },
  {
    id: "002",
    name: "Carlos Rodríguez Pérez",
    email: "carlos.rod@email.com",
    phone: "912 345 678",
    dni: "45678901",
    docType: "dni",
    address: "Jr. Comercio 456, Arequipa",
    purchases: 8,
    totalSpent: "S/890.00",
    status: "active",
  },
  {
    id: "003",
    name: "Ana Martínez Silva",
    email: "ana.martinez@email.com",
    phone: "956 789 012",
    dni: "67890123",
    docType: "dni",
    address: "Calle Los Olivos 789, Trujillo",
    purchases: 25,
    totalSpent: "S/3,400.00",
    status: "active",
  },
  {
    id: "004",
    name: "Pedro Sánchez Torres",
    email: "pedro.sanchez@email.com",
    phone: "934 567 890",
    dni: "89012345",
    docType: "ruc",
    address: "Av. La Marina 234, Chiclayo",
    purchases: 3,
    totalSpent: "S/320.00",
    status: "inactive",
  },
  {
    id: "005",
    name: "Laura Fernández Ruiz",
    email: "laura.fernandez@email.com",
    phone: "978 901 234",
    dni: "12345678",
    docType: "dni",
    address: "Jr. Unión 567, Piura",
    purchases: 15,
    totalSpent: "S/1,800.00",
    status: "active",
  },
  {
    id: "006",
    name: "Diego Morales Castro",
    email: "diego.morales@email.com",
    phone: "945 678 901",
    dni: "34567890",
    docType: "ruc",
    address: "Av. Salaverry 890, Huancayo",
    purchases: 6,
    totalSpent: "S/670.00",
    status: "active",
  },
  {
    id: "007",
    name: "Sofía Vargas Mendoza",
    email: "sofia.vargas@email.com",
    phone: "967 890 123",
    dni: "56789012",
    docType: "dni",
    address: "Calle Real 123, Cusco",
    purchases: 20,
    totalSpent: "S/2,500.00",
    status: "active",
  },
  {
    id: "008",
    name: "Roberto Díaz Flores",
    email: "roberto.diaz@email.com",
    phone: "923 456 789",
    dni: "78901234",
    docType: "ruc",
    address: "Jr. Tacna 456, Iquitos",
    purchases: 1,
    totalSpent: "S/150.00",
    status: "inactive",
  },
];

function ClientAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)]",
        className,
      )}
    >
      <UserIcon size={28} weight="fill" className="text-white" />
    </div>
  );
}

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("todos");
  const [isDocTypeOpen, setIsDocTypeOpen] = useState(false);

  const docTypes = [
    { label: "TODOS", value: "todos" },
    { label: "DNI", value: "dni" },
    { label: "RUC", value: "ruc" },
    { label: "CARNET EXTRANJERIA", value: "carnet" },
  ];

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.dni.includes(searchTerm) ||
      client.phone.includes(searchTerm);

    return matchesSearch;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;
  const totalPurchases = clients.reduce((sum, c) => sum + c.purchases, 0);

  return (
    <DashboardShell headerTitle="Clientes">
      <div className="scrollbar-hidden flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-4 transition-colors duration-200 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                <UserIcon size={22} weight="fill" className="text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Total Clientes
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {totalClients}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10b981]/10">
                <UserIcon size={22} weight="fill" className="text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Activos
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {activeClients}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3b82f6]/10">
                <IdentificationCardIcon size={22} weight="fill" className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Compras Totales
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {totalPurchases}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl p-5 shadow-sm bg-[var(--color-sidebar-bg)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b]/10">
                <EnvelopeIcon size={22} weight="fill" className="text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  Con Email
                </p>
                <p className="text-2xl font-bold leading-none text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                  {clients.filter((c) => c.email).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky -top-4 z-30 -mx-4 flex flex-col gap-3 bg-white px-4 py-2 lg:-mx-6 lg:flex-row lg:items-center lg:justify-between lg:px-6 dark:bg-[var(--color-background)]">
          <div className="flex flex-1 items-center gap-3">
            <label className="relative flex-1">
              <MagnifyingGlassIcon
                size={18}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-placeholder)]"
              />
              <input
                type="text"
                placeholder="Buscar por nombre, email, DNI o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-[16px] bg-[var(--color-input-bg)] pr-4 pl-11 text-sm text-[var(--color-input-text)] outline-none placeholder:text-[var(--color-placeholder)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </label>

            <div className="relative w-[180px]">
              <button
                type="button"
                onClick={() => setIsDocTypeOpen(!isDocTypeOpen)}
                className="flex h-11 w-full items-center justify-between rounded-[16px] bg-[var(--color-input-bg)] px-4 text-sm font-medium text-[var(--color-input-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                <span className="truncate">{docTypes.find((d) => d.value === selectedDocType)?.label || "TODOS"}</span>
                <CaretDownIcon size={16} className="shrink-0" />
              </button>
              {isDocTypeOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-full min-w-[160px] rounded-xl bg-[var(--color-card)] p-1 shadow-lg ring-1 ring-[var(--color-border)]">
                  {docTypes.map((docType) => (
                    <button
                      key={docType.value}
                      type="button"
                      onClick={() => {
                        setSelectedDocType(docType.value);
                        setIsDocTypeOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                        selectedDocType === docType.value
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                      )}
                    >
                      <span className="truncate">{docType.label}</span>
                      {selectedDocType === docType.value && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" className="shrink-0">
                          <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,0-11.32,11.32l56,56a24,24,0,0,0,33.94,0l128-128a8,8,0,0,0-11.32-11.32Z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(17,37,58,0.16)] transition-colors hover:opacity-90"
          >
            <PlusIcon size={18} weight="bold" />
            Nuevo Cliente
          </button>
        </div>

        <div className="pr-1">
          <div className="grid gap-3">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[14px] bg-[var(--color-card)] py-16 text-center">
                <Image
                  src="/img/productos-vacio.png"
                  width={256}
                  height={256}
                  alt="No hay clientes"
                  className="h-auto w-[min(34%,70px)] max-h-[18dvh] object-contain opacity-90 sm:w-[min(38%,90px)] md:w-[min(42%,110px)] md:max-h-[24dvh] lg:w-[min(46%,120px)] lg:max-h-[26dvh] xl:w-[min(48%,130px)] xl:max-h-[28dvh]"
                />
                <p className="mt-3 text-sm font-black text-[var(--color-text)]">
                  No hay clientes
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Intenta con otros filtros de búsqueda
                </p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(21,25,34,0.12)] transition-all hover:shadow-[0_4px_16px_rgba(21,25,34,0.16)] sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3 sm:w-64">
                    <ClientAvatar />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--color-text)]">
                        {client.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)] [font-family:var(--font-circular-x-sub)]">
                        {client.docType === "ruc" ? (
                          <>
                            <BuildingOfficeIcon size={14} weight="fill" className="mr-1 inline text-[#3b82f6]" />
                            RUC: {client.dni}
                          </>
                        ) : (
                          <>
                            <IdentificationCardIcon size={14} weight="fill" className="mr-1 inline text-[#3b82f6]" />
                            DNI: {client.dni}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon size={16} className="text-[var(--color-muted-foreground)]" />
                      <span className="text-xs text-[var(--color-text)]">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon size={16} className="text-[var(--color-muted-foreground)]" />
                      <span className="text-xs text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinIcon size={16} className="text-[var(--color-muted-foreground)]" />
                      <span className="truncate text-xs text-[var(--color-text)]">
                        {client.address}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:w-64 sm:justify-end">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/51${client.phone.replace(/\s/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] transition-all hover:bg-[#20bd5a] hover:shadow-[0_4px_12px_rgba(37,211,102,0.35)]"
                        aria-label={`Enviar WhatsApp a ${client.name}`}
                      >
                        <Image src="/svg/redes-sociales/whatsapp.svg" width={20} height={20} alt="WhatsApp" />
                      </a>
                      <a
                        href={`mailto:${client.email}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6B75A] transition-all hover:bg-[#EAA12F] hover:shadow-[0_4px_12px_rgba(246,183,90,0.35)]"
                        aria-label={`Enviar correo a ${client.name}`}
                      >
                        <Image src="/svg/redes-sociales/email.svg" width={20} height={20} alt="Email" />
                      </a>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                        {client.purchases} compras
                      </p>
                      <p className="text-sm font-bold text-[var(--color-text)] [font-family:var(--font-circular-x-sub)]">
                        {client.totalSpent}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
                        aria-label={`Editar ${client.name}`}
                      >
                        <PencilSimpleIcon size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[#ff6e65]"
                        aria-label={`Eliminar ${client.name}`}
                      >
                        <TrashIcon size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Mostrando {filteredClients.length} de {totalClients} clientes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled
            >
              Anterior
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-xs font-bold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

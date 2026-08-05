"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PlusIcon,
} from "@phosphor-icons/react/ssr";

import { ClientCreateModal } from "@/components/Clients/client-create-modal";
import { Modal } from "@/components/Modal/modal";
import { Button } from "@/components/ui/button";
import { clientsApi, type Client } from "@/lib/api/clients";
import { cn } from "@/lib/utils";
import {
  GenericClientAvatar,
  UserAvatar,
} from "@/components/UserAvatar/user-avatar";

type ClientPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedClient: Client | null;
  requireRuc?: boolean;
  onSelect: (client: Client | null) => void;
};

export function ClientPickerModal({
  isOpen,
  onClose,
  selectedClient,
  requireRuc = false,
  onSelect,
}: ClientPickerModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formClient, setFormClient] = useState<Client | null | undefined>();
  const displayedClients =
    selectedClient && !clients.some((client) => client.id === selectedClient.id)
      ? [selectedClient, ...clients]
      : clients;

  const loadClients = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    try {
      const response = await clientsApi.findAll({
        page,
        limit: 8,
        search,
        estado: "activo",
        tipoDocumento: requireRuc ? "ruc" : undefined,
      });
      setClients(response.data);
      setTotalPages(response.meta.totalPages);
    } catch {
      setClients([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, page, requireRuc, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadClients(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadClients]);

  const chooseClient = (client: Client | null) => {
    onSelect(client);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={requireRuc ? "Seleccionar cliente con RUC" : "Seleccionar cliente"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] bg-[var(--color-input-bg)] px-3">
              <MagnifyingGlassIcon size={18} className="shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre o documento"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <Button type="button" onClick={() => setFormClient(null)} className="h-11 gap-2 rounded-[14px]">
              <PlusIcon size={17} weight="bold" />
              Nuevo
            </Button>
          </div>

          {!requireRuc ? (
            <button
              type="button"
              onClick={() => chooseClient(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[8px] bg-[var(--color-input-bg)] p-3 text-left",
                !selectedClient && "ring-2 ring-[var(--color-primary)]",
              )}
            >
              <GenericClientAvatar size={40} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-circular-bold">Cliente generico</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">Sin documento</span>
              </span>
              {!selectedClient ? <CheckIcon size={18} weight="bold" /> : null}
            </button>
          ) : null}

          <div className="space-y-2">
            {displayedClients.map((client) => {
              const selected = selectedClient?.id === client.id;
              return (
                <div
                  key={client.id}
                  className={cn(
                    "flex items-center gap-3 rounded-[8px] bg-[var(--color-input-bg)] p-3",
                    selected && "ring-2 ring-[var(--color-primary)]",
                  )}
                >
                  <UserAvatar
                    seed={client.id}
                    name={client.displayName}
                    size={40}
                  />
                  <button type="button" onClick={() => chooseClient(client)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-circular-bold">{client.displayName}</span>
                    <span className="text-xs uppercase text-[var(--color-muted-foreground)]">
                      {client.tipoDocumento}: {client.numeroDocumento ?? "Sin documento"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormClient(client)}
                    className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-white text-[var(--color-primary)]"
                    aria-label={`Editar ${client.displayName}`}
                  >
                    <NotePencilIcon size={17} weight="bold" />
                  </button>
                  {selected ? <CheckIcon size={18} weight="bold" /> : null}
                </div>
              );
            })}
          </div>

          {isLoading ? (
            <p className="py-5 text-center text-sm text-[var(--color-muted-foreground)]">Cargando clientes...</p>
          ) : displayedClients.length === 0 ? (
            <p className="py-5 text-center text-sm text-[var(--color-muted-foreground)]">No se encontraron clientes</p>
          ) : null}

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="h-9 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs disabled:opacity-40">Anterior</button>
              <span className="text-xs text-[var(--color-muted-foreground)]">{page} de {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="h-9 rounded-[8px] bg-[var(--color-input-bg)] px-3 text-xs disabled:opacity-40">Siguiente</button>
            </div>
          ) : null}
        </div>
      </Modal>

      {formClient !== undefined ? (
        <ClientCreateModal
          key={formClient?.id ?? "new"}
          isOpen
          client={formClient}
          onClose={() => setFormClient(undefined)}
          onCreated={(client) => {
            setFormClient(undefined);
            chooseClient(client);
          }}
        />
      ) : null}
    </>
  );
}

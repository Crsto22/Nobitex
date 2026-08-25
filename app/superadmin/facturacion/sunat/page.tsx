"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowClockwiseIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/ssr";

import { DashboardShell } from "@/components/DashboardShell/dashboard-shell";
import {
  platformAdminApi,
  type PlatformPaginationMeta,
  type PlatformSunatCompany,
} from "@/lib/api/platform-admin";
import { cn } from "@/lib/utils";

const defaultMeta: PlatformPaginationMeta = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};

export default function PlatformSunatCompaniesPage() {
  const [companies, setCompanies] = useState<PlatformSunatCompany[]>([]);
  const [meta, setMeta] = useState(defaultMeta);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await platformAdminApi.findSunatCompanies({
        page,
        limit: meta.limit,
        search: submittedSearch,
      });
      setCompanies(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar las empresas.",
      );
    } finally {
      setLoading(false);
    }
  }, [meta.limit, page, submittedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
    setPage(1);
  };

  return (
    <DashboardShell headerTitle="SUNAT por empresa">
      <div className="content-scrollbar flex h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 overflow-y-auto bg-[var(--color-background)] p-3 sm:p-4 lg:px-6 lg:py-5">
        <section className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <form onSubmit={submit} className="flex min-w-0 flex-1 gap-2">
            <div className="relative min-w-0 flex-1 md:max-w-lg">
              <MagnifyingGlassIcon
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por empresa, RUC, DNI o email"
                className="h-11 w-full rounded-xl bg-[var(--color-input-bg)] pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-circular-bold text-white disabled:opacity-60"
            >
              <MagnifyingGlassIcon size={16} weight="bold" />
              Buscar
            </button>
          </form>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Actualizar"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-input-bg)] text-[var(--color-text)] disabled:opacity-60"
          >
            <ArrowClockwiseIcon
              size={17}
              weight="bold"
              className={cn(loading && "animate-spin")}
            />
          </button>
        </section>

        {error ? (
          <p className="rounded-xl bg-[#ef4444]/10 px-4 py-3 text-sm text-[#dc2626]">
            {error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-[14px] bg-[var(--color-card)] shadow-sm">
          <div className="grid grid-cols-[1.3fr_130px_1fr_120px_88px] gap-3 border-b border-[var(--color-border)] px-4 py-3 text-xs font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            <span>Empresa</span>
            <span>Documento</span>
            <span>Email</span>
            <span>Plan</span>
            <span className="text-right">Accion</span>
          </div>

          {loading && companies.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-xl bg-[var(--color-input-bg)]"
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {companies.map((company) => (
                <article
                  key={company.id}
                  className="grid grid-cols-1 gap-2 px-4 py-3 text-sm text-[var(--color-text)] md:grid-cols-[1.3fr_130px_1fr_120px_88px] md:items-center md:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-circular-bold">{company.name}</p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {company.legalName ?? "Sin razon social"}
                    </p>
                  </div>
                  <p className="truncate">{company.document ?? "Sin documento"}</p>
                  <p className="truncate text-[var(--color-muted-foreground)]">
                    {company.email ?? "Sin email"}
                  </p>
                  <p className="truncate">{company.planName}</p>
                  <div className="flex justify-start md:justify-end">
                    <Link
                      href={`/superadmin/facturacion/sunat/${company.id}`}
                      aria-label={`Configurar SUNAT de ${company.name}`}
                      title="Configurar SUNAT"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white"
                    >
                      <GearSixIcon size={18} weight="bold" />
                    </Link>
                  </div>
                </article>
              ))}

              {!loading && companies.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
                  No hay empresas para mostrar.
                </div>
              ) : null}
            </div>
          )}
        </section>

        <footer className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-card)] px-4 py-3 text-sm text-[var(--color-muted-foreground)] shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {meta.page} de {meta.totalPages} ·{" "}
            {meta.total.toLocaleString("es-PE")} empresas
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-input-bg)] px-3 font-circular-bold text-[var(--color-text)] disabled:opacity-50"
            >
              <ArrowLeftIcon size={15} weight="bold" />
              Anterior
            </button>
            <button
              type="button"
              disabled={loading || page >= meta.totalPages}
              onClick={() =>
                setPage((current) => Math.min(meta.totalPages, current + 1))
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-input-bg)] px-3 font-circular-bold text-[var(--color-text)] disabled:opacity-50"
            >
              Siguiente
              <ArrowRightIcon size={15} weight="bold" />
            </button>
          </div>
        </footer>
      </div>
    </DashboardShell>
  );
}

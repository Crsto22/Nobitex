"use client";

import { useRef, useState } from "react";
import {
  DownloadSimpleIcon,
  FileCsvIcon,
  FileXlsIcon,
  MapPinIcon,
  UploadSimpleIcon,
  XIcon,
} from "@/lib/icons";

import { Select } from "@/components/ui/select";
import type { BranchOption } from "@/components/ProductImport/types";
import { cn } from "@/lib/utils";

const acceptedExtensions = [".xlsx", ".xls", ".csv"];
const maxFileSizeBytes = 10 * 1024 * 1024;

type UploadStepProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  branches: BranchOption[];
  branchId: string;
  onBranchChange: (branchId: string) => void;
  onDownloadTemplate: () => void;
};

export function UploadStep({
  file,
  onFileChange,
  branches,
  branchId,
  onBranchChange,
  onDownloadTemplate,
}: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const acceptFile = (candidate: File | null) => {
    if (!candidate) {
      return;
    }

    const lowerName = candidate.name.toLowerCase();
    const hasValidExtension = acceptedExtensions.some((extension) =>
      lowerName.endsWith(extension),
    );

    if (!hasValidExtension) {
      setFileError("El archivo debe ser Excel (.xlsx, .xls) o CSV (.csv).");
      return;
    }

    if (candidate.size > maxFileSizeBytes) {
      setFileError("El archivo supera el limite de 10 MB.");
      return;
    }

    setFileError(null);
    onFileChange(candidate);
  };

  const removeFile = () => {
    setFileError(null);
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const fileExtension = file?.name.split(".").pop()?.toLowerCase() ?? "";
  const FileIcon = fileExtension === "csv" ? FileCsvIcon : FileXlsIcon;

  return (
    <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-base font-circular-bold text-[var(--color-text)]">
          Subir Archivo
        </h2>
        <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
          Sube tu archivo Excel o CSV con los productos a importar
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.85fr)]">
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              acceptFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              "flex min-h-[286px] cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed px-6 py-10 text-center outline-none transition-colors",
              isDragging
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/[0.03]",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={acceptedExtensions.join(",")}
              className="hidden"
              onChange={(event) => {
                acceptFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />

            {file ? (
              <div className="flex w-full max-w-md flex-col items-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <FileIcon size={28} weight="fill" />
                </span>
                <p className="mt-4 w-full truncate text-sm font-circular-bold text-[var(--color-text)]">
                  {file.name}
                </p>
                <p className="mt-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                  {formatFileSize(file.size)} · Listo para continuar
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs font-circular-regular text-[var(--color-primary)]">
                    Haz clic para cambiar el archivo
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFile();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
                    aria-label="Quitar archivo"
                  >
                    <XIcon size={14} weight="bold" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]">
                  <UploadSimpleIcon size={24} weight="bold" />
                </span>
                <p className="mt-4 text-sm font-circular-bold text-[var(--color-text)]">
                  Arrastra tu archivo aqui o haz clic para seleccionar
                </p>
                <p className="mt-2 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                  Formatos: .xlsx, .xls, .csv (max. 5,000 filas)
                </p>
              </>
            )}
          </div>

          {fileError ? (
            <p className="mt-2 text-xs font-circular-regular text-[#dc2626]">
              {fileError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="flex items-center gap-2">
              <MapPinIcon
                size={17}
                weight="fill"
                className="text-[var(--color-muted-foreground)]"
              />
              <p className="text-sm font-circular-bold text-[var(--color-text)]">
                Ubicacion destino
              </p>
            </div>
            <p className="mt-1.5 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
              Los precios y stock se asignaran a esta tienda
            </p>
            <Select
              className="mt-3"
              value={branchId}
              onChange={onBranchChange}
              placeholder="Seleccionar tienda"
              ariaLabel="Ubicacion destino"
              options={branches.map((branch) => ({
                value: branch.id,
                label: branch.nombre,
              }))}
              searchable
            />
          </div>

          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-circular-bold text-[var(--color-text)]">
                  Plantilla de ejemplo
                </p>
                <p className="mt-1 text-xs font-circular-regular text-[var(--color-muted-foreground)]">
                  Incluye ejemplos de producto normal, con variantes y una fila
                  de servicio.
                </p>
              </div>
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-xs font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)]"
              >
                <DownloadSimpleIcon size={15} weight="bold" />
                Descargar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

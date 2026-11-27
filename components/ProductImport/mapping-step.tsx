"use client";

import {
  importFieldGroups,
  importFields,
} from "@/lib/product-import/fields";
import type { ImportFieldKey } from "@/lib/product-import/types";
import { Select } from "@/components/ui/select";

type MappingStepProps = {
  fileName: string;
  headers: string[];
  headerMapping: Record<ImportFieldKey, string>;
  rows: string[][];
  rowNumbers: number[];
  onMappingChange: (field: ImportFieldKey, header: string) => void;
};

export function MappingStep({
  fileName,
  headers,
  headerMapping,
  rows,
  rowNumbers,
  onMappingChange,
}: MappingStepProps) {
  const usage = new Map<string, ImportFieldKey[]>();

  (Object.entries(headerMapping) as Array<[ImportFieldKey, string]>).forEach(
    ([field, header]) => {
      if (!header) {
        return;
      }
      usage.set(header, [...(usage.get(header) ?? []), field]);
    },
  );

  const headerOptions = [
    { label: "No importar", value: "" },
    ...headers.map((header) => ({ label: header, value: header })),
  ];
  const previewRows = rows.slice(0, 4);

  return (
    <section className="rounded-[14px] bg-[var(--color-card)] p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-base font-circular-bold text-[var(--color-text)]">
          Mapear columnas
        </h2>
        <p className="mt-1 text-sm font-circular-regular text-[var(--color-muted-foreground)]">
          Revisa que cada columna de tu archivo apunte al campo correcto. Los
          campos con * son obligatorios.
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-5">
          {importFieldGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-[11px] font-circular-bold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                {group.label}
              </h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {group.keys.map((key) => {
                  const field = importFields.find((item) => item.key === key);
                  if (!field) {
                    return null;
                  }

                  const currentHeader = headerMapping[key];
                  const duplicates = usage.get(currentHeader) ?? [];
                  const hasDuplicate =
                    Boolean(currentHeader) && duplicates.length > 1;

                  return (
                    <div
                      key={key}
                      className="rounded-[12px] bg-[var(--color-background)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-circular-bold text-[var(--color-text)]">
                          {field.label}
                          {field.required ? (
                            <span className="ml-0.5 text-[var(--color-primary)]">
                              *
                            </span>
                          ) : null}
                        </span>
                        {field.required ? (
                          <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-circular-bold text-[var(--color-primary)]">
                            Obligatorio
                          </span>
                        ) : null}
                      </div>
                      {field.hint ? (
                        <p className="mt-1 text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                          {field.hint}
                        </p>
                      ) : null}
                      <Select
                        className="mt-2"
                        value={currentHeader}
                        onChange={(header) => onMappingChange(key, header)}
                        options={headerOptions}
                        placeholder="No importar"
                        ariaLabel={`Columna para ${field.label}`}
                        searchable
                        buttonClassName="h-10 rounded-[12px]"
                      />
                      {hasDuplicate ? (
                        <p className="mt-1 text-[11px] font-circular-regular text-[#dc2626]">
                          Esta columna tambien esta asignada a otro campo.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-[14px] border border-[var(--color-border)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-circular-bold text-[var(--color-text)]">
                  Vista del archivo
                </p>
                <p className="truncate text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                  {fileName || "productos.xlsx"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--color-input-bg)] px-2.5 py-1 text-[10px] font-circular-bold text-[var(--color-muted-foreground)]">
                {headers.length} columnas
              </span>
            </div>

            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-[var(--color-card)]">
                  <tr>
                    <th className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      #
                    </th>
                    {headers.map((header, index) => (
                      <th
                        key={`${header}-${index}`}
                        className="whitespace-nowrap border-b border-[var(--color-border)] px-3 py-2 text-[10px] font-circular-bold uppercase tracking-wide text-[var(--color-muted-foreground)]"
                      >
                        {header || `Columna ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="odd:bg-[var(--color-background)]/40"
                    >
                      <td className="border-b border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                        {rowNumbers[rowIndex] ?? rowIndex + 2}
                      </td>
                      {headers.map((_, cellIndex) => {
                        const value = row[cellIndex] ?? "";
                        return (
                          <td
                            key={`${rowIndex}-${cellIndex}`}
                            className="max-w-[180px] truncate border-b border-[var(--color-border)] px-3 py-2 text-[11px] font-circular-regular text-[var(--color-text)]"
                            title={value}
                          >
                            {value || (
                              <span className="text-[var(--color-placeholder)]">
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2">
              <p className="text-[11px] font-circular-regular text-[var(--color-muted-foreground)]">
                Se muestran las primeras {previewRows.length} filas del archivo.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

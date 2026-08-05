"use client";

import { useState } from "react";
import { CalendarInput } from "@/components/ui/calendar-input";
import { Select } from "@/components/ui/select";
import type {
  HistoryPeriod,
  HistoryPeriodValue,
} from "@/lib/history-period";

const periodOptions = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "custom", label: "Personalizado" },
];

function todayInLima() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function HistoryPeriodFilter({
  value,
  onChange,
}: {
  value: HistoryPeriodValue;
  onChange: (value: HistoryPeriodValue) => void;
}) {
  const [customMode, setCustomMode] = useState<"date" | "range">("date");

  const changePeriod = (period: string) => {
    if (period === "custom") {
      const today = todayInLima();
      onChange({ period: "custom", dateFrom: today, dateTo: today });
      return;
    }
    onChange({ period: period as HistoryPeriod, dateFrom: "", dateTo: "" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.period}
        onChange={changePeriod}
        options={periodOptions}
        ariaLabel="Periodo"
        className="w-full sm:w-44"
        buttonClassName="h-11 rounded-[16px]"
      />
      {value.period === "custom" ? (
        <>
          <div className="flex h-11 rounded-[16px] bg-[var(--color-input-bg)] p-1">
            {(["date", "range"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setCustomMode(mode);
                  if (mode === "date") {
                    onChange({ ...value, dateTo: value.dateFrom });
                  }
                }}
                className={`rounded-[12px] px-3 text-xs font-circular-bold transition-colors ${customMode === mode ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted-foreground)]"}`}
              >
                {mode === "date" ? "Fecha" : "Rango"}
              </button>
            ))}
          </div>
          <CalendarInput
            value={value.dateFrom}
            onChange={(dateFrom) =>
              onChange({
                ...value,
                dateFrom,
                dateTo: customMode === "date" ? dateFrom : value.dateTo,
              })
            }
            labelInline={customMode === "date" ? "Fecha" : "Desde"}
            className="w-full sm:w-56"
            popoverAlign="left"
          />
          {customMode === "range" ? (
            <CalendarInput
              value={value.dateTo}
              min={value.dateFrom}
              onChange={(dateTo) => onChange({ ...value, dateTo })}
              labelInline="Hasta"
              className="w-full sm:w-56"
              popoverAlign="right"
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

type CalendarInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  labelInline?: string;
  min?: string;
  max?: string;
  required?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  mode?: "date" | "month";
  popoverAlign?: "left" | "right";
};

const weekdayLabels = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const monthFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
});
const displayDateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const monthShortFormatter = new Intl.DateTimeFormat("es-PE", { month: "short" });
const monthLabels = Array.from({ length: 12 }, (_, month) =>
  monthShortFormatter.format(new Date(2026, month, 1)),
);

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateOnly(value?: string, mode: "date" | "month" = "date") {
  if (!value) {
    return null;
  }

  const [year, month, rawDay] = value.split("-").map(Number);
  const day = mode === "month" ? 1 : rawDay;
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value: string, mode: "date" | "month") {
  const date = parseDateOnly(value, mode);
  return date
    ? mode === "month"
      ? monthFormatter.format(date)
      : displayDateFormatter.format(date)
    : "";
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - mondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

export function CalendarInput({
  value,
  onChange,
  label,
  labelInline,
  min,
  max,
  required = false,
  clearable = false,
  disabled = false,
  className,
  mode = "date",
  popoverAlign = "right",
}: CalendarInputProps) {
  const selectedDate = parseDateOnly(value, mode);
  const [isOpen, setIsOpen] = useState(false);
  const controlId = useId();
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const minDate = parseDateOnly(min, mode);
  const maxDate = parseDateOnly(max, mode);
  const today = toDateOnly(new Date());
  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const goToMonth = (amount: number) => {
    setViewDate((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + amount * (mode === "month" ? 12 : 1));
      return next;
    });
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label ? (
        <label
          htmlFor={controlId}
          className="mb-2 block text-sm font-circular-regular text-[#4e5671]"
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-[var(--color-primary)]">*</span>
          ) : null}
        </label>
      ) : null}

      <div
        className={cn(
          "group flex h-11 w-full items-center gap-3 rounded-[16px] bg-[var(--color-input-bg)] px-4 text-left transition-colors focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "hover:bg-[var(--color-button-hover)]",
        )}
      >
        {labelInline ? (
          <span className="shrink-0 text-xs font-circular-bold uppercase text-[var(--color-muted-foreground)]">
            {labelInline}
            {required ? (
              <span className="ml-0.5 text-[var(--color-primary)]">*</span>
            ) : null}
          </span>
        ) : null}

        <CalendarBlankIcon
          size={18}
          weight="bold"
          className="shrink-0 text-[var(--color-muted-foreground)]"
        />

        <button
          id={controlId}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!isOpen && selectedDate) {
              setViewDate(selectedDate);
            }
            setIsOpen((current) => !current);
          }}
          aria-label={label ?? labelInline ?? "Seleccionar fecha"}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent text-left text-sm font-circular-regular text-[var(--color-input-text)] outline-none disabled:cursor-not-allowed",
            !value && "text-[var(--color-placeholder)]",
          )}
        >
          {value
            ? formatDisplayDate(value, mode)
            : mode === "month"
              ? "Periodo"
              : "Fecha"}
        </button>

        {clearable && value && !disabled ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
            aria-label="Limpiar fecha"
          >
            <XIcon size={13} weight="bold" />
          </button>
        ) : null}
      </div>

      {isOpen && !disabled ? (
        <div
          className={cn(
            "absolute top-full z-[100] mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-[20px] bg-[var(--color-card)] p-3 shadow-[0_18px_48px_rgba(15,23,42,0.2)] ring-1 ring-[var(--color-border)] animate-in fade-in zoom-in-95 duration-200",
            popoverAlign === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
              aria-label="Mes anterior"
            >
              <CaretLeftIcon size={16} weight="bold" />
            </button>
            <p className="text-sm font-circular-bold capitalize text-[var(--color-text)]">
              {mode === "month"
                ? viewDate.getFullYear()
                : monthFormatter.format(viewDate)}
            </p>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-text)]"
              aria-label="Mes siguiente"
            >
              <CaretRightIcon size={16} weight="bold" />
            </button>
          </div>

          {mode === "month" ? (
            <div className="grid grid-cols-3 gap-2">
              {monthLabels.map((month, index) => {
                const monthValue = `${viewDate.getFullYear()}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <button
                    key={monthValue}
                    type="button"
                    onClick={() => {
                      onChange(monthValue);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-[12px] text-xs font-circular-regular capitalize transition-colors",
                      value === monthValue
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    )}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          ) : (
          <div className="grid grid-cols-7 gap-1">
            {weekdayLabels.map((day) => (
              <div
                key={day}
                className="flex h-7 items-center justify-center text-[11px] font-circular-bold text-[var(--color-muted-foreground)]"
              >
                {day}
              </div>
            ))}
            {calendarDays.map((date) => {
              const dateValue = toDateOnly(date);
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = dateValue === value;
              const isToday = dateValue === today;
              const isBeforeMin = minDate ? date < minDate : false;
              const isAfterMax = maxDate ? date > maxDate : false;
              const isUnavailable = isBeforeMin || isAfterMax;

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => {
                    onChange(dateValue);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-[12px] text-sm font-circular-regular transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                    isSelected
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-button-hover)]",
                    !isCurrentMonth &&
                      !isSelected &&
                      "text-[var(--color-placeholder)]",
                    isToday &&
                      !isSelected &&
                      "ring-1 ring-[var(--color-primary)]/35",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DateTimeInput({
  value,
  onChange,
  label,
  clearable = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  clearable?: boolean;
}) {
  const date = value.slice(0, 10);
  const time = value.slice(11, 16) || "23:59";

  return (
    <div>
      {label ? (
        <p className="mb-2 text-sm font-circular-regular text-[#4e5671]">
          {label}
        </p>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <CalendarInput
          value={date}
          onChange={(nextDate) =>
            onChange(nextDate ? `${nextDate}T${time}` : "")
          }
          clearable={clearable}
        />
        <input
          type="time"
          value={time}
          disabled={!date}
          onChange={(event) => onChange(`${date}T${event.target.value}`)}
          aria-label="Hora"
          className="h-11 rounded-[16px] bg-[var(--color-input-bg)] px-3 text-sm font-circular-regular outline-none disabled:opacity-50"
        />
      </div>
    </div>
  );
}

export const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const dateShortFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeLimaFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Lima",
});

export const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export const time24Formatter = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
});

export const dateTimeFullFormatter = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
});

export const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export const numberFormatter = new Intl.NumberFormat("es-PE");

export const relativeTimeFormatter = new Intl.RelativeTimeFormat("es", {
  numeric: "auto",
});

export function formatDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatDateShort(value: string | Date) {
  return dateShortFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatCurrency(value: string | number | null) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatTime(value: string | Date) {
  return timeFormatter.format(new Date(value));
}

export function formatTime24(value: string | Date) {
  return time24Formatter.format(new Date(value));
}

function formatDateTimeFull(value: string | Date) {
  return dateTimeFullFormatter.format(new Date(value));
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

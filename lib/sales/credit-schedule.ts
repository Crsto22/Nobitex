export type CreditFrequency = "weekly" | "biweekly" | "monthly";

export type CreditInstallmentDraft = {
  numero: number;
  monto: string;
  fechaVencimiento: string;
};

export function todayKey() {
  const now = new Date();
  return dateKey(now);
}

export function tomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateKey(date);
}

export function defaultFirstDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return dateKey(date);
}

export function generateCreditSchedule(
  balance: number,
  count: number,
  firstDueDate: string,
  frequency: CreditFrequency,
): CreditInstallmentDraft[] {
  const safeCount = Math.max(1, Math.trunc(count));
  const totalCents = Math.max(0, Math.round(balance * 100));
  const baseCents = Math.floor(totalCents / safeCount);

  return Array.from({ length: safeCount }, (_, index) => {
    const cents =
      index === safeCount - 1
        ? totalCents - baseCents * (safeCount - 1)
        : baseCents;
    return {
      numero: index + 1,
      monto: (cents / 100).toFixed(2),
      fechaVencimiento: shiftDueDate(firstDueDate, frequency, index),
    };
  });
}

export function validateCreditSchedule(
  installments: CreditInstallmentDraft[],
  expectedBalance: number,
) {
  if (installments.length === 0) return "Agrega al menos una cuota.";
  const today = todayKey();
  if (installments.some((item) => item.fechaVencimiento <= today)) {
    return "Todas las cuotas deben vencer después de la fecha de emisión.";
  }
  if (installments.some((item) => Number(item.monto) <= 0)) {
    return "Todas las cuotas deben tener un importe mayor a cero.";
  }
  const totalCents = installments.reduce(
    (sum, item) => sum + Math.round(Number(item.monto) * 100),
    0,
  );
  if (totalCents !== Math.round(expectedBalance * 100)) {
    return "La suma de las cuotas debe coincidir con el saldo pendiente.";
  }
  return null;
}

function shiftDueDate(
  firstDueDate: string,
  frequency: CreditFrequency,
  index: number,
) {
  const date = parseDate(firstDueDate);
  if (frequency === "weekly") date.setDate(date.getDate() + index * 7);
  if (frequency === "biweekly") date.setDate(date.getDate() + index * 15);
  if (frequency === "monthly" && index > 0) {
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + index);
    const lastDay = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();
    date.setDate(Math.min(originalDay, lastDay));
  }
  return dateKey(date);
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

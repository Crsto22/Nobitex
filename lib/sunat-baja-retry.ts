import type { VentaSunatBajaResponse } from "@/lib/api/sales";

const RETRYABLE_ISSUE_DATE_MARKERS = [
  "2336",
  "issuedate",
  "fecha de recepcion",
] as const;

function normalizeSunatText(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function canRetrySunatBaja(baja: VentaSunatBajaResponse) {
  if (baja.estado === "error_definitivo") {
    return true;
  }

  if (baja.estado !== "rechazado") {
    return false;
  }

  const rejectionDetail = normalizeSunatText(
    [baja.codigo, baja.mensaje].filter(Boolean).join(" "),
  );

  return RETRYABLE_ISSUE_DATE_MARKERS.some((marker) =>
    rejectionDetail.includes(marker),
  );
}

import { getStoredCompanyInfo } from "@/lib/auth/session";

export function documentFileName(
  correlativo: string,
  extension = "pdf",
  suffix?: string,
) {
  const companyDocument = getStoredCompanyInfo()?.documento || "SIN-DOCUMENTO";
  const separator = correlativo.lastIndexOf("-");
  const series = separator >= 0 ? correlativo.slice(0, separator) : correlativo;
  const rawNumber = separator >= 0 ? correlativo.slice(separator + 1) : "";
  const number = /^\d+$/.test(rawNumber)
    ? rawNumber.padStart(8, "0")
    : rawNumber;
  const normalizedCorrelative = [series, number].filter(Boolean).join("-");
  const base = [companyDocument, normalizedCorrelative, suffix]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]/g, "-");

  return `${base}.${extension}`;
}

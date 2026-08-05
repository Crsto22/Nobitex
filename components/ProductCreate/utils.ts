import type { Color } from "@/lib/api/colors";
import type { CatalogColor } from "./types";

export function mergeById<T extends { id: string }>(
  primaryItems: T[],
  secondaryItems: T[],
) {
  const itemsById = new Map<string, T>();

  [...primaryItems, ...secondaryItems].forEach((item) => {
    itemsById.set(item.id, item);
  });

  return Array.from(itemsById.values());
}

export function toCatalogColor(color: Color): CatalogColor {
  return {
    id: color.id,
    label: color.nombre,
    hex: color.hex,
  };
}

export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

export function getOptionalFormString(formData: FormData, key: string) {
  const value = getFormString(formData, key);

  return value || null;
}

export function normalizeHex(hex: string) {
  const trimmedHex = hex.trim().toUpperCase();

  if (!trimmedHex) {
    return "";
  }

  return trimmedHex.startsWith("#") ? trimmedHex : `#${trimmedHex}`;
}

export function isValidHex(hex: string) {
  return /^#[0-9A-F]{6}$/i.test(normalizeHex(hex));
}

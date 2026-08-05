import type { Size } from "@/lib/api/sizes";

export type CatalogColor = {
  id: string;
  label: string;
  hex: string;
};

export type ProductVariant = {
  id: string;
  size: Size;
  color: CatalogColor;
};

export type VariantMotionState = "enter" | "visible" | "exit";

export type ProductColorImage = {
  colorId: string;
  file: File | null;
  preview: string;
  serverId?: string;
};

export type PendingColorImage = ProductColorImage & {
  colorLabel: string;
  colorHex: string;
};
